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
             │      (provider = openai | anthropic | mock)
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
- `mock.ts` — ecoa "Modo mock — defina AI_PROVIDER…" quando nenhuma key existe.

O provider é escolhido por `AI_PROVIDER=openai|anthropic|openrouter`; sem env, usa o mock.
Assim o assistente funciona (em modo demonstrativo) sem nenhuma API key, e também
pode ser promovido para OpenRouter sem trocar o contrato das tools.

## 4. As tools

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

## 5. Validação de parâmetros

Antes de executar, `runTool` faz `tool.schema.safeParse(params)`. Parâmetros
inválidos retornam erro com a lista de problemas, sem tocar o repository. Isso
protege contra alucinações do modelo (campos faltando, tipos errados).

O schema Zod também é convertido para JSON Schema (`lib/ai/schema.ts`) e enviado ao
provider, para que o modelo saiba exatamente quais argumentos cada tool aceita.

## 6. Fluxo completo de uma chamada

1. O admin envia uma mensagem em `/api/ai/chat`.
2. O servidor expõe ao modelo **apenas** as tools permitidas para o papel do
   usuário (`allowedToolsFor`).
3. O modelo responde com `tool_calls` (ou só texto).
4. Para cada tool call de escrita, a UI busca o `dry_run` em
   `/api/ai/tools/[tool]` com `confirm: false` e mostra o preview.
5. O admin confirma; a UI chama de novo com `confirm: true`.
6. A tool executa via repository sob o contexto do usuário; grava `ai_actions`.
7. O resultado volta ao chat.

## 7. Segurança e LGPD

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
- **Provider configurável**: a imobiliária escolhe o provedor (OpenAI ou
  Anthropic) conforme sua política de dados; sem provider, roda em mock e nada sai.

## 8. Tratamento de erros

- Tool inexistente → 404.
- Papel sem allowlist ou sem permissão → 403 (`ToolDeniedError`).
- Parâmetros inválidos → 400 com detalhes do Zod.
- Erro de execução → registrado em `ai_actions.error` e devolvido ao chat.

## 9. Evolução

- **Liberar papéis**: ajustar `allowedRoles` por tool (ex.: deixar `finance` usar
  as tools de cobrança).
- **Streaming real**: os adapters já expõem `chatStream`; basta plugar o SSE dos
  provedores.
- **Tools compostas**: orquestrar sequências (ex.: "fechar o mês" = gerar parcelas
  + calcular repasses) mantendo dry-run por etapa.
- **Memória/contexto**: anexar resumo da carteira ao system prompt para respostas
  mais ricas, sempre respeitando o escopo do usuário.

## 10. Princípio resumido

> A IA é um operador a mais — com as mesmas permissões do usuário, que sempre pede
> confirmação antes de escrever e que deixa rastro de tudo que faz.
