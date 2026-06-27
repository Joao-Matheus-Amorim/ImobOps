# Integração WhatsApp — ImobOps

## 1. Por que WhatsApp é central

No Brasil, a imobiliária vive no WhatsApp. É por ali que chega o lead ("vi o
anúncio, ainda está disponível?"), que se cobra o aluguel, que se envia o boleto e
que se confirma a visita. O ImobOps trata o WhatsApp como **canal de primeira
classe**: captação (CRM) e cobrança (financeiro) passam por ele.

## 2. Arquitetura de adapter

A integração é abstraída por uma interface, em `lib/whatsapp/adapter.ts`:

```ts
interface WhatsAppAdapter {
  sendMessage(to: string, body: string, mediaUrl?: string): Promise<{ externalId: string }>;
  sendTemplate(to: string, templateKey: string, vars: Record<string, string>): Promise<{ externalId: string }>;
  parseWebhook(payload: unknown): InboundMessage | null;
}
```

Duas implementações:

- **`evolution.ts`** — Evolution API (gateway não-oficial sobre WhatsApp Web).
   É o **default** para local/VPS e funciona em modo mock quando não há env
   configurada.
- **`meta.ts`** — WhatsApp Cloud API (Meta Business). É a via oficial de produção,
   sem QR e sem sessão de aparelho. O adapter já envia mensagem, interpreta webhook
   e faz a verificação `hub.challenge` do GET.

A escolha é feita em `lib/whatsapp/provider.ts` (`WHATSAPP_PROVIDER=meta` força a
Meta; caso contrário, Evolution).

## 3. Evolution API

A Evolution API é configurada por três variáveis:

```
EVOLUTION_API_URL=
EVOLUTION_API_TOKEN=
EVOLUTION_INSTANCE=
```

Sem elas, o `EvolutionAdapter` opera em **modo mock**: `sendMessage`/`sendTemplate`
retornam um `externalId` fake, e o app continua usável ponta a ponta (a mensagem é
persistida no store, só não sai de fato). Com elas, faz `POST` real para
`/message/sendText/{instance}`. O webhook de entrada já responde rápido e
despacha o processamento para background, evitando travar a Evolution enquanto o
banco grava a mensagem e a triagem roda.

### Recebimento (webhook)

A rota `app/api/whatsapp/webhook/route.ts`:

1. Valida a assinatura opcional (`EVOLUTION_WEBHOOK_TOKEN` no header
   `x-webhook-token`). Sem token configurado, aceita (útil em dev).
2. Responde `200` imediatamente e coloca o payload numa fila em memória do Node.
3. O worker em `services/whatsapp-service.ts` normaliza o payload com
   `adapter.parseWebhook` → `InboundMessage`.
4. O worker roda a **triagem** (`triage-bot.ts`), faz upsert da conversa, grava a
   mensagem com idempotência por `externalId` e publica evento para o inbox.
5. Atualizações de status (`messages.update`) só ajustam entrega/leitura quando a
   mensagem já existe.

### Envio (rota)

`app/api/whatsapp/send/route.ts` exige `can(principal, "whatsapp", "create")`,
envia via adapter (texto ou template) e persiste a mensagem enviada. O inbox é
atualizado via evento em memória e o frontend refaz a consulta.

## 4. O risco do banimento (e por que começamos pela Evolution)

A Evolution API automatiza o **WhatsApp Web**, que **não é o canal oficial** da
Meta para automação. Isso traz um risco real:

- **Banimento do número.** Envio em massa, mensagens não solicitadas, conteúdo
  marcado como spam pelos destinatários → a Meta pode bloquear o número.
- **Instabilidade.** Mudanças no WhatsApp Web podem quebrar o gateway.
- **Sem garantias de entrega/SLA.** É um canal "best effort".

Começamos pela Evolution mesmo assim porque:

- **Custo e fricção baixos** para a primeira imobiliária validar o produto.
- **Sem aprovação prévia de templates** (a Cloud API exige templates aprovados).
- **Velocidade de integração**: subir uma instância é questão de minutos.

Mas tratamos isso como **dívida técnica consciente**, com um plano de migração.

### Mitigações enquanto usamos Evolution

1. **Opt-in real**: só enviar para quem já tem relação (inquilino, proprietário,
   lead que iniciou contato).
2. **Volume controlado**: cadência humana, sem disparos em massa.
3. **Templates de qualidade**: mensagens claras, com identificação da imobiliária e
   opção de não receber.
4. **Número dedicado**: separar o número de automação do número pessoal.
5. **Monitorar reputação**: acompanhar bloqueios e reclamações.

## 5. Plano de migração para a Meta Business (Cloud API)

Quando o volume justificar ou o risco de banimento pesar, migra-se para a
**WhatsApp Cloud API** oficial:

1. **Conta e número**: criar WABA (WhatsApp Business Account), verificar o negócio e
   registrar o número na Cloud API.
2. **Templates aprovados**: submeter os 9 templates (abaixo) para aprovação da Meta.
   Cada template vira um *named template* com placeholders.
3. **Implementar `meta.ts`**: usar o Graph API (`/messages`), mapeando
   `templateKey` → nome aprovado e `vars` → componentes.
4. **Webhook da Meta**: ajustar `parseWebhook` para o formato de eventos da Cloud
   API (verificação de assinatura `X-Hub-Signature-256`).
5. **Trocar o provider**: `WHATSAPP_PROVIDER=meta`. **Nenhum** código de domínio
   muda — só o adapter, graças à interface.
6. **Período de coexistência**: rodar os dois em paralelo, migrando conversas
   gradualmente.

Como toda a aplicação fala com a interface `WhatsAppAdapter` (e não com a Evolution
diretamente), a migração é **localizada no adapter**.

## 6. Templates obrigatórios

Definidos em `lib/whatsapp/templates.ts`, renderizados em pt-BR:

| Chave | Uso |
|-------|-----|
| `rental.reminder_3_days_before` | Lembrete 3 dias antes do vencimento |
| `rental.reminder_due_today`     | Lembrete no dia do vencimento |
| `rental.overdue_first_notice`   | 1º aviso de atraso |
| `rental.overdue_second_notice`  | 2º aviso de atraso |
| `rental.boleto_delivery`        | Entrega de boleto/PIX |
| `condo.fee_reminder`            | Lembrete de taxa condominial |
| `condo.fee_overdue`             | Aviso de taxa em atraso |
| `crm.lead_welcome`              | Boas-vindas a lead inbound |
| `crm.visit_confirmation`        | Confirmação de visita |

Cada template é uma função `vars → texto`. Na Cloud API, esses textos correspondem
a templates aprovados com placeholders numerados.

## 7. O bot de triagem

`lib/whatsapp/triage-bot.ts` classifica cada mensagem inbound por **intenção**,
usando palavras-chave + heurística simples:

- `locacao` — "alugar", "aluguel", "fiador", …
- `venda` — "comprar", "financiamento", "à venda", …
- `condominio` — "síndico", "assembleia", "taxa", …
- `financeiro` — "boleto", "2ª via", "comprovante", "pix", …
- `outro` — fallback.

Para intenções de `locacao` ou `venda`, o bot **cria um `crm_lead`** automaticamente
e o **roteia** para o corretor com menos leads atribuídos (distribuição simples). A
conversa recebe a classificação para priorização no inbox.

A função de classificação é **pura e testada** (`triage-bot.test.ts`), separada do
I/O, para facilitar evolução (ex.: trocar heurística por um classificador de IA sem
mexer no roteamento).

## 8. Persistência

- `whatsapp_conversations` — uma por telefone, com `status`, `assigned_to_user_id` e
  `triage_classification`.
- `whatsapp_messages` — cada mensagem com `direction` (in/out), `body`,
  `template_key`, `external_id`, timestamps de envio/entrega/leitura e `sent_by`
  (`user`/`system`/`ai`/`bot`).

Tudo isolado por `tenancy_id` (ver `MULTI_TENANT_STRATEGY.md`).

## 9. Integração com a IA

Três tools expõem o WhatsApp ao assistente: `send_whatsapp_message`,
`send_whatsapp_template` e `search_conversations`. As de envio são `write` e, como
toda escrita, exigem confirmação (dry-run) antes de disparar. Ver
`AI_AGENT_STRATEGY.md`.

## 10. Conformidade e boas práticas

- **Consentimento**: enviar apenas para contatos com relação legítima.
- **Identificação**: toda mensagem identifica a imobiliária.
- **Horário**: respeitar horário comercial para cobranças.
- **Registro**: toda mensagem fica auditável no banco.
- **Descadastro**: oferecer e respeitar pedidos de não receber.

## 11. Resumo do caminho

> Evolution continua como caminho local/VPS para MVP e demo. Para produção,
> Meta Cloud API já é o caminho oficial. O domínio não muda: apenas o adapter e a
> configuração do provider.
