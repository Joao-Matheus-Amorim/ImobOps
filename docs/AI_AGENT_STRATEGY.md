# Estratégia do Assistente de IA — ImobOps

## 1. O que o assistente faz

O assistente de IA do ImobOps é um agente operacional. Ele entende pedidos em
linguagem natural ("liste os aluguéis em atraso", "crie um cliente PF chamado João",
"envie o lembrete de cobrança para a Daniela") e os executa chamando **tools**
tipadas que operam sobre os mesmos repositories da aplicação.

Ele não é um chatbot de respostas genéricas: é uma camada de automação sobre o
domínio, com quatro garantias inegociáveis.

## 2. As quatro regras inegociáveis

### Regra 1 — A IA herda o RLS do usuário logado

A rota `/api/ai/tools/[tool]` é chamada **com o cookie de sessão do usuário**. O
contexto da tool (`ToolContext`) é montado a partir do principal da sessão:
`{ userId, tenancyId, role }`. No modo Supabase, as queries rodam sob o JWT do
usuário e, portanto, sob a RLS. **Nunca** se usa `service_role`.

Consequência: se a RLS proíbe o usuário de ver/editar um registro, a tool falha —
exatamente como falharia se o usuário tentasse pela UI. A IA não tem superpoderes.

### Regra 2 — Confirmação obrigatória em escrita

Toda tool com efeito colateral (`create`, `edit`, `delete`) é classificada como
`effect: "write"`. Tools de escrita **não executam no primeiro turno**. Elas
retornam um `dry_run` com um **preview** legível do que vai acontecer. A execução
real só ocorre num segundo turno, com `confirm: true`.

Tools de leitura (`search_*`, `list_*`, `get_*`) têm `effect: "read"` e executam
direto, sem confirmação.

```
Turno 1 (write):  { confirm: false } → { dryRun: true, preview: "Criar cliente João (PF)." }
Turno 2 (write):  { confirm: true }  → executa e retorna o resultado
Turno 1 (read):   executa direto
```

A lógica vive em `lib/ai/confirm.ts`.

### Regra 3 — Auditoria de tudo

Cada execução (inclusive dry-runs) grava uma linha em `ai_actions`:

```ts
{
  userId, prompt, toolName, toolParams,
  dryRun, confirmed, result, error, at
}
```

A tabela é **append-only** (ver `004_audit_and_ai.sql`): há policy de `insert` e
`select`, mas nenhuma de `update`/`delete`. Ninguém reescreve o histórico.

### Regra 4 — Allowlist por papel

No MVP, **apenas o papel `admin`** pode invocar tools (`MVP_ALLOWED_ROLES =
["admin"]`). A estrutura suporta liberar outros papéis depois, ajustando
`allowedRoles` por tool em `lib/ai/guard.ts`. Além da allowlist, a tool ainda passa
por `can(principal, tool.feature, tool.action)` — a permissão normal do usuário.

## 3. Arquitetura

```
Usuário ─▶ /assistant (UI)
              │
              ├─▶ POST /api/ai/chat      ── modelo propõe tool_calls
              │      ├─ cache.ts         (Redis: cache de respostas + dedup)
              │      ├─ provider         (openai | anthropic | openrouter | mock)
              │      ├─ guard.ts         (allowlist por papel + can())
              │      └─ agent loop       (executa read tools automaticamente)
              │
              └─▶ POST /api/ai/tools/[tool]
                     ├─ guard.ts        (allowlist por papel + can())
                     ├─ confirm.ts      (dry-run / confirm; valida Zod)
                     ├─ repository       (sob RLS/tenancy do usuário)
                     ├─ audit.ts        (grava em ai_actions)
                     └─ resultado ─▶ UI
```

### Adapter LLM agnóstico

`lib/ai/adapter.ts` define a interface `LlmAdapter` com `chat()` e `chatStream()`.
Implementações:

- `openai.ts` — Chat Completions API (via `fetch`).
- `anthropic.ts` — Messages API (via `fetch`), modelo padrão `claude-opus-4-8`.
- `openrouter.ts` — OpenRouter compatível com o mesmo contrato de chat.
  - Fallback automático: se o modelo principal retorna 429 (rate limit), tenta
    até **17 modelos gratuitos** em sequência, todos com suporte a tool calling.
    A lista é mantida em `FREE_FALLBACKS` e inclui modelos como
    `qwen/qwen3-coder:free`, `meta-llama/llama-3.3-70b-instruct:free`,
    `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, etc.
  - Erros não-429 (401, 400) são propagados imediatamente sem fallback.
- `mock.ts` — ecoa "Modo mock — defina AI_PROVIDER…" quando nenhuma key existe.

O provider é escolhido por `AI_PROVIDER=openai|anthropic|openrouter`; sem env, usa o mock.
Assim o assistente funciona (em modo demonstrativo) sem nenhuma API key, e também
pode ser promovido para OpenRouter sem trocar o contrato das tools.

## 4. Cache e Deduplicação (Redis)

O módulo `lib/ai/cache.ts` adiciona três camadas de cache sobre o Upstash Redis,
reduzindo chamadas ao LLM e ao banco de dados:

### 4.1. Cache de respostas do LLM (TTL: 5 min)

Antes de chamar o modelo, o hash da requisição (messages + tools + tenancyId) é
calculado via SHA-1. Se o mesmo hash já existe no Redis, a resposta final é
devolvida sem chamar o LLM:

```
Chave: ai:cache:response:<sha1(messages + tools + tenancyId)>
Valor: { content: string, toolCalls: ToolCall[] }
TTL:   300s
```

### 4.2. Cache de resultados de tools read (TTL: 30s)

No agent loop, resultados de `effect: "read"` são cacheados por 30s. Se o modelo
pede a mesma consulta duas vezes no mesmo request, a segunda não bate no banco:

```
Chave: ai:cache:tool:<toolName>:<tenancyId>:<sha1(params)>
Valor: resultado da tool
TTL:   30s
```

### 4.3. Lock de deduplicação (TTL: 10s)

Se duas requisições idênticas chegam simultaneamente (ex.: usuário clicou duas
vezes), a primeira adquire um lock no Redis. A segunda espera até 5s pela
resposta da primeira (polling a cada 200ms). Se o timeout expira, a segunda
processa normalmente.

```
Chave: ai:lock:<hash>
Valor: "1" (NX)
TTL:   10s
```

### 4.4. Degradação graciosa

Se `UPSTASH_REDIS_REST_URL` não estiver configurada, o cache simplesmente não
opera — todas as funções retornam null/true (comportamento idêntico a antes da
implementação). Nenhuma exceção é lançada.

## 5. As tools

As tools ficam em `lib/ai/tools/`, uma por área de domínio, todas registradas em
`registry.ts`. Cada tool é declarada com Zod para os parâmetros:

```ts
defineTool({
  name: "mark_installment_paid",
  description: "Marca uma parcela como paga.",
  effect: "write",
  feature: "rentals.installments",
  action: "edit",
  schema: z.object({ installmentId: z.string(), paidAmount: z.number().positive() }),
  run: async ({ installmentId, paidAmount }, ctx) =>
    rentalsRepository.markInstallmentPaid(repoCtx(ctx), installmentId, paidAmount),
  preview: async ({ installmentId, paidAmount }) =>
    `Marcar parcela ${installmentId} como paga (${formatBRL(paidAmount)}).`,
});
```

### Catálogo de tools

- **Clientes**: `search_clients`, `get_client`, `create_client`, `update_client`,
  `add_client_tag`.
- **Imóveis**: `search_properties`, `get_property`, `create_property`,
  `update_property`, `change_property_status`.
- **Locação**: `create_rental_contract`, `generate_installments`,
  `list_installments`, `mark_installment_paid`, `upload_receipt`,
  `compute_repasse`, `list_overdue_rentals`.
- **Venda**: `create_listing`, `register_proposal`, `move_proposal`,
  `close_sale_contract`, `record_commission_payment`.
- **Condomínio**: `create_condo`, `add_unit`, `generate_condo_fees`,
  `mark_condo_fee_paid`, `register_condo_expense`, `apportion_expense`.
- **CRM**: `create_lead`, `assign_lead`, `move_lead_stage`, `log_activity`,
  `schedule_visit`.
- **WhatsApp**: `send_whatsapp_message`, `send_whatsapp_template`,
  `search_conversations`.

## 6. Validação de parâmetros

Antes de executar, `runTool` faz `tool.schema.safeParse(params)`. Parâmetros
inválidos retornam erro com a lista de problemas, sem tocar o repository. Isso
protege contra alucinações do modelo (campos faltando, tipos errados).

O schema Zod também é convertido para JSON Schema (`lib/ai/schema.ts`) e enviado ao
provider, para que o modelo saiba exatamente quais argumentos cada tool aceita.

## 7. Fluxo completo de uma chamada

### 7.1 Chat (agent loop)

1. Cliente envia `POST /api/ai/chat` com `{ messages: [...] }`.
2. Rota autentica o usuário (`getSessionUser`).
3. Filtra tools permitidas (`allowedToolsFor`).
4. Calcula hash da requisição (`cache.hashRequest`).
5. **Cache hit?** Devolve resposta cacheada sem chamar LLM.
6. **Cache miss?** Tenta lock de dedup no Redis.
   - Se lock adquirido: chama o adapter, armazena no cache, libera lock.
   - Se lock não adquirido: espera até 5s pela resposta de outra requisição.
7. O modelo retorna `{ content, toolCalls }`.
8. **Agent loop** (até 4 iterações):
   - Se `toolCalls` tem apenas **read tools**: executa cada uma, cacheia o
     resultado (30s), realimenta o modelo, repete.
   - Se `toolCalls` tem **write tool** (ou está vazio): interrompe o loop.
9. Write tools são retornadas com `requiresConfirmation: true` para a UI.
10. Read tools silenciosamente descartadas na resposta final.

### 7.2 Execução de tool (com confirmação)

1. UI busca `dry_run` em `/api/ai/tools/[tool]` com `confirm: false`.
2. Servidor valida permissão (`guard`), valida parâmetros (Zod), retorna preview.
3. UI mostra preview ao usuário.
4. Usuário confirma; UI chama com `confirm: true`.
5. Tool executa via repository sob RLS do usuário.
6. `audit.ts` registra em `ai_actions` (append-only).
7. Resultado volta ao chat.

## 8. Cobertura de testes

O sistema de IA possui **63 testes** distribuídos em **9 arquivos**:

| Arquivo | Tests | O que cobre |
|---|---|---|
| `guard.test.ts` | 6 | Permissões por role, registry sanity |
| `provider.test.ts` | 5 | Factory seleciona adapter correto |
| `mock.test.ts` | 3 | Mock adapter (chat, stream) |
| `openrouter.test.ts` | 7 | Fallback 429, erros, tool_calls, stream |
| `confirm.test.ts` | 5 | Read/write, dry-run, validação Zod |
| `audit.test.ts` | 2 | Registro append-only, isolamento tenancy |
| `cache.test.ts` | 10 | Hash estável, degradação sem Redis |
| `registry.test.ts` | 8 | Nomes únicos, schemas válidos, previews |
| `route.test.ts` | 17 | Fluxo completo: auth, validação, agent loop, cache, dedup, erros, permissões |

## 9. Segurança e LGPD

- **Minimização**: a IA só acessa o que o usuário já poderia acessar. Não há
  ampliação de privilégio.
- **Rastreabilidade**: `ai_actions` registra prompt, tool, parâmetros, se foi
  dry-run, se foi confirmado, resultado e erro — base para qualquer auditoria de
  tratamento de dados.
- **Confirmação humana**: nenhuma alteração de dado pessoal acontece sem o segundo
  turno de confirmação. O humano permanece no controle.
- **Sem treino com dados do cliente**: os adapters chamam as APIs dos provedores
  apenas para inferência. Recomenda-se usar contas/endpoints com retenção zero e
  opt-out de treino. Dados sensíveis (documentos, CPF) não devem ser enviados ao
  modelo desnecessariamente — as tools retornam o mínimo para a tarefa.
- **Append-only**: o histórico de ações de IA não pode ser apagado pela aplicação,
  garantindo integridade da trilha.
- **Provider configurável**: a imobiliária escolhe o provedor (OpenAI, Anthropic
  ou OpenRouter) conforme sua política de dados; sem provider, roda em mock e nada
  sai.

## 10. Tratamento de erros

- Tool inexistente → 404.
- Papel sem allowlist ou sem permissão → 403 (`ToolDeniedError`).
- Parâmetros inválidos → 400 com detalhes do Zod.
- Erro de execução → registrado em `ai_actions.error` e devolvido ao chat.

## 11. Evolução

- **Liberar papéis**: ajustar `allowedRoles` por tool (ex.: deixar `finance` usar
  as tools de cobrança).
- **Streaming real**: os adapters já expõem `chatStream`; basta plugar o SSE dos
  provedores.
- **Tools compostas**: orquestrar sequências (ex.: "fechar o mês" = gerar parcelas
  + calcular repasses) mantendo dry-run por etapa.
- **Memória/contexto**: anexar resumo da carteira ao system prompt para respostas
  mais ricas, sempre respeitando o escopo do usuário.

## 12. Princípio resumido

> A IA é um operador a mais — com as mesmas permissões do usuário, que sempre pede
> confirmação antes de escrever e que deixa rastro de tudo que faz.
