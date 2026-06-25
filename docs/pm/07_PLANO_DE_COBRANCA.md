# 07 — Plano de Cobrança e Boletos (Asaas)

> **Status:** aprovado em 2026-06-25 · **Patrocinador:** proprietário do produto
> **Prioridade:** nº 1 do produto — "precisa gerir boletos e cobranças mais do que tudo".

Este documento é o plano mestre da capacidade de **cobrança** do ImobOps: emissão de
boleto/PIX, baixa automática, régua de lembretes e repasse ao proprietário. Segue o
modelo PMBOK — escopo fechado, sem gaps, entrega incremental e verificável.

---

## 1. Objetivo

Transformar a cobrança de **manual** (upload de PDF + marcação na mão) em
**operacional e automatizada**, mantendo a arquitetura mock-first e multi-tenant do
ImobOps: nada quebra sem env; o Asaas pluga sobre um núcleo que já funciona.

---

## 2. Decisão de arquitetura

A cobrança é uma **integração externa**, e segue **exatamente** o mesmo padrão de
adapter já consolidado em `lib/whatsapp/` e `lib/ai/`:

```
lib/billing/
  provider.ts     # interface BillingAdapter (emitir, consultar, cancelar, parseWebhook)
  asaas.ts        # implementação real (Asaas API)
  mock.ts         # implementação mock (sem env — determinística, testável)
  adapter.ts      # seletor por env (getBillingAdapter)
  reminders.ts    # régua de lembretes (cadência + seleção de template)
  charge-logic.ts # lógica pura: status de atraso, mapeamento parcela↔cobrança
```

- **Sem `ASAAS_API_KEY` → modo mock** (igual WhatsApp/IA). `isBillingConfigured()`
  em `constants.ts`.
- Nenhuma regra de negócio acopla-se ao Asaas. Trocar de provider (ou somar um PIX
  de banco PJ no futuro) é localizado ao adapter — **sem reescrita**. Ver
  [billing-gateway-asaas](decisão de memória) e a seção 9 (Riscos).

### 2.1 Por que Asaas

Boleto registrado + PIX + cartão + **split** de repasse num único provider. Tarifa
por boleto/PIX **liquidado** (só paga quando recebe), mensalidade R$ 0 no plano
gratuito. A tarifa exata é tabelada por plano e negociável por volume — **confirmar
em asaas.com/precos antes de assinar** (não é número fixo eterno).

---

## 3. Escopo do 1º corte — **somente Locação (aluguel)**

> Decisão 2026-06-25: condomínio e comissões ficam para cortes seguintes (mesma
> fundação). Multa/juros ficam para o corte seguinte.

| Inclui | Não inclui (próximos cortes) |
|---|---|
| Parcela de aluguel → cobrança Asaas (boleto/PIX) | Taxa condominial recorrente |
| Webhook de pagamento → baixa automática da parcela | Comissões de venda |
| Repasse ao proprietário disparado pela baixa | Multa, juros e correção monetária |
| Régua de lembretes WhatsApp (D-3 / venc. / D+1 / D+5) | Cobrança de cartão recorrente |
| Status `atrasado` calculado na leitura | Split automático no Asaas (fase 2) |

---

## 4. Modelo de dados — nova entidade `Charge`

Hoje a parcela (`Installment`) só guarda `boletoDocumentId` (PDF avulso). Falta a
**cobrança** propriamente dita. Introduz-se `Charge` como o elo entre a parcela e o
gateway:

```ts
type ChargeMethod = "boleto" | "pix" | "cartao";
type ChargeStatus =
  | "pendente"     // criada, aguardando pagamento
  | "paga"         // confirmada (webhook ou baixa manual)
  | "vencida"      // due_date < hoje e não paga
  | "cancelada"    // estornada/cancelada
  | "falha";       // erro na emissão

interface Charge extends BaseEntity {
  // origem (1º corte: sempre installment)
  sourceType: "installment";
  sourceId: string;          // installment.id
  method: ChargeMethod;
  amount: number;
  dueDate: string;           // yyyy-mm-dd
  status: ChargeStatus;
  // dados do provider (null em mock até emitir)
  provider: "asaas" | "mock";
  externalId: string | null;     // id da cobrança no Asaas
  boletoUrl: string | null;      // PDF/linha digitável
  pixPayload: string | null;     // copia-e-cola / QR
  paidAt: string | null;
  paidAmount: number | null;
}
```

`Installment` ganha `chargeId: string | null` (vínculo 1:1 com a cobrança ativa).
O `boletoDocumentId` permanece para PDFs legados/uploads manuais.

---

## 5. Fluxos operacionais (sem gaps)

### 5.1 Emissão
1. Operador (ou cron de geração) seleciona parcela `a_vencer` sem cobrança.
2. `billingRepository.emitCharge(ctx, installmentId, method)` chama
   `adapter.createCharge(...)`.
3. Asaas devolve `externalId` + `boletoUrl`/`pixPayload`; persiste `Charge` e
   vincula à parcela. Em mock, gera payload determinístico.

### 5.2 Pagamento → baixa automática
1. Asaas envia webhook (`PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED`) →
   `POST /api/billing/webhook`.
2. Valida assinatura (token), `adapter.parseWebhook(payload)` normaliza.
3. Marca `Charge.paga` → `Installment.pago` (reusa `markInstallmentPaid`) →
   `financeRepository.computeRepasse(...)` dispara o repasse pendente.
4. **Idempotente:** `externalId` já conciliado é ignorado.

### 5.3 Atraso (híbrido)
- **Leitura:** `chargeStatusAsOf(charge, hoje)` calcula `vencida` em tempo de
  leitura — o status fica **sempre correto** sem depender de job. Reflete em
  `Installment.atrasado` e no dashboard.
- **Cron (`/api/cron/billing-daily`, Vercel Cron):** apenas dispara lembretes
  agendados e sincroniza divergências com o Asaas. Se o cron falhar, o status de
  atraso **continua correto** (calculado na leitura). Sem ponto único de falha.

### 5.4 Régua de lembretes (`reminders.ts`)
| Gatilho | Template WhatsApp |
|---|---|
| D-3 (3 dias antes) | `cobranca_proximo_vencimento` |
| D0 (vencimento) | `cobranca_vencimento_hoje` |
| D+1 | `cobranca_atraso_1` |
| D+5 | `cobranca_atraso_2` |

Cada envio é registrado para evitar duplicidade (idempotência por
parcela+gatilho+dia). Reusa os templates já existentes em `lib/whatsapp/templates.ts`
(completar os que faltarem).

---

## 6. Superfície de API

| Rota | Método | Função |
|---|---|---|
| `/api/billing/webhook` | POST | Recebe eventos do Asaas → baixa automática (idempotente) |
| `/api/billing/charges` | POST | Emite cobrança para uma parcela |
| `/api/cron/billing-daily` | GET | Cron diário: lembretes + sincronização |

Todas herdam o `RepoContext`/RLS do padrão atual; webhook e cron usam contexto de
sistema com validação de token (mesmo padrão de `app/api/whatsapp/webhook`).

---

## 7. Variáveis de ambiente (novas)

```
# Cobrança (Asaas) — sem isso, billing roda em modo mock
ASAAS_API_KEY=
ASAAS_BASE_URL=          # https://api.asaas.com/v3 (prod) | sandbox
ASAAS_WEBHOOK_TOKEN=     # valida o webhook de pagamento
CRON_SECRET=             # protege /api/cron/billing-daily
```

---

## 8. Critérios de aceite (Definition of Done do 1º corte)

1. `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test` **verdes**.
2. App sobe **sem nenhuma env** (billing em mock) — não regride o princípio mock-first.
3. Emitir cobrança para uma parcela cria `Charge` vinculada; em mock, payload
   determinístico e testável.
4. Webhook de pagamento marca `Charge` paga → parcela paga → repasse pendente, de
   forma **idempotente** (reenvio não duplica).
5. Status `vencida`/`atrasado` correto **sem depender do cron**.
6. Régua seleciona o template certo por gatilho; sem envio duplicado no mesmo dia.
7. Testes puros cobrindo: `chargeStatusAsOf` (bordas de data), mapeamento
   parcela↔cobrança, idempotência de conciliação, seleção de template da régua.
8. `docs/` e `04_REQUISITOS.md` atualizados; nenhuma referência a "boleto manual"
   sem o caminho automatizado ao lado.

---

## 9. Riscos específicos de cobrança

| ID | Risco | Resposta |
|---|---|---|
| RC1 | Tarifa Asaas muda / fica cara em volume | Adapter neutro permite trocar provider sem reescrita |
| RC2 | Webhook duplicado ou fora de ordem | Conciliação idempotente por `externalId` + status calculado na leitura |
| RC3 | Cron não roda (Vercel) | Atraso é calculado na leitura; cron só atrasa lembrete, não corrompe estado |
| RC4 | Divergência de valor pago (parcial) | `paidAmount` registrado; parcela só fecha com valor pleno; diferença vira pendência |
| RC5 | Banimento do número WhatsApp na régua | Cadência conservadora + opt-out; e-mail como canal alternativo (corte futuro) |
| RC6 | Dados sensíveis de pagamento | Nunca trafegar/armazenar dados de cartão; Asaas é PCI; guardamos só id/url/payload |

---

## 10. Sequência de implementação (cirúrgica, em ondas verificáveis)

> Cada onda termina com build/typecheck/test verdes antes da próxima. Nada de big bang.

- **Onda A — Fundação (mock, sem env):** tipo `Charge` + `chargeId` na parcela;
  `charge-logic.ts` puro + testes; `lib/billing/{provider,mock,adapter}.ts`;
  `isBillingConfigured()`; mock-data de cobranças coerente. *(Zero custo, zero risco
  externo.)*
- **Onda B — Repositório + UI:** `billingRepository` (emitir/listar/conciliar);
  página de Finanças mostra cobranças, botão "emitir boleto/PIX", baixa manual.
- **Onda C — Webhook + baixa automática:** `/api/billing/webhook` idempotente →
  parcela paga → repasse. Testado em mock.
- **Onda D — Régua + cron:** `reminders.ts` + `/api/cron/billing-daily` +
  `vercel.json`. Templates completados.
- **Onda E — Asaas real:** `asaas.ts` implementa a interface; smoke em sandbox;
  documentação de configuração. *(Só aqui entra credencial/custo.)*

Cortes seguintes (fora deste plano): condomínio, comissões, multa/juros, split
automático, canal e-mail.
