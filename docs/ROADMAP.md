# Roadmap de Entrega — ImobOps

O roadmap é dividido em **9 cortes** incrementais. Cada corte é entregável,
verificável e deixa o produto utilizável. Os cortes 1–5 já estão implementados no
repositório; 6–8 estão em modo híbrido/parcial com infraestrutura real já
plugada em partes; o 9 continua planejado.

Legenda de status: ✅ entregue · 🟡 parcial · ⬜ planejado.

> Nota de estado: além dos cortes abaixo, o repositório já contém calendário
operacional (`calendar_events`), integração de billing Asaas e produção de IA/
WhatsApp com providers reais. O roadmap organiza prioridade, não a cronologia exata
da implementação.

---

## Corte 1 — Núcleo rodável em modo mock ✅

**Objetivo:** app que sobe com `npm run dev` sem nenhuma variável de ambiente.

**Escopo:**
- Configuração (Next 14 App Router, TS estrito, Tailwind, shadcn/ui).
- Tipos de domínio completos (`lib/types`).
- Mock-data tipado e coerente (`lib/mock-data`).
- Repositories com isolamento por tenancy (`lib/repositories`).
- Permissões (rules/scope/enforce) com `can()` e `enforceScope()`.

**Critérios de aceite:**
- `npm run build`, `npm run typecheck`, `npm run test` passam limpos.
- O app não depende de Supabase/IA/WhatsApp para iniciar.
- Testes de permissão e de geração de parcelas/repasse verdes.

---

## Corte 2 — Shell mobile + dashboard contextual ✅

**Objetivo:** navegação e visão geral por papel.

**Escopo:**
- `MobileShell`, `BottomNav`, `TopBar`, toggle de tema (escuro por padrão).
- Dashboard com métricas diferentes por papel (admin/manager/broker/finance/
  condo_admin/viewer).
- Filtragem de navegação por permissão.

**Critérios de aceite:**
- Bottom navigation funcional, sem rolagem lateral.
- Dashboard mostra ocupação, GMV, inadimplência, funil, comissões e repasses
  conforme o papel.
- Rotas sem permissão retornam 404.

---

## Corte 3 — Páginas de domínio (list + detail) ✅

**Objetivo:** CRUD navegável de todas as entidades em modo mock.

**Escopo:**
- Clientes, imóveis, locação (com parcelas), vendas (com propostas/histórico),
  condomínios (unidades/taxas/despesas/assembleias), finanças, CRM (funil).
- Componentes reutilizáveis (`ListItem`, `StatusBadge`, `StatCard`, `EmptyState`).

**Critérios de aceite:**
- Toda entidade tem listagem e detalhe.
- Escopo de dados respeitado (corretor vê só os seus).
- Cálculo de repasse e geração de parcelas corretos e testados.

---

## Corte 4 — Assistente de IA (mock + tools) ✅

**Objetivo:** assistente operando com as quatro regras inegociáveis.

**Escopo:**
- Adapter LLM (`openai`/`anthropic`/`openrouter`/`mock`).
- Registry de tools tipadas com Zod (clientes, imóveis, locação, vendas,
  condomínio, CRM, WhatsApp).
- Guard (allowlist por papel, MVP admin-only), dry-run/confirm, auditoria.
- Rotas `/api/ai/chat` e `/api/ai/tools/[tool]`.

**Critérios de aceite:**
- Leitura executa direto; escrita exige confirmação (dry-run → confirm).
- Toda execução grava em `ai_actions`.
- Sem `AI_PROVIDER`, responde em modo mock.
- Teste do guard verde.

---

## Corte 5 — WhatsApp (Evolution + triagem) ✅

**Objetivo:** captação e cobrança via WhatsApp.

**Escopo:**
- Adapter Evolution (default local/VPS, mock sem env) e Meta Cloud API oficial
  já implementada.
- Triagem de leads inbound por intenção; criação e roteamento de lead.
- Rotas de webhook e envio; inbox no app; webhook assíncrono com publicação de
  eventos para SSE.

**Critérios de aceite:**
- Webhook normaliza payload, persiste e triá; envio persiste a mensagem.
- Classificação de intenção testada.
- Inbox mostra conversas, classificação e status.

**Estado atual:** ✅ entregue.

---

## Corte 6 — Persistência real com Supabase + RLS ⬜

**Objetivo:** trocar o mock pelo banco real, sem mudar a interface dos
repositories.

**Escopo:**
- Aplicar `001`–`004` no Supabase.
- Auth hook injetando `tenancy_id`/`role` no JWT.
- Repositories delegando ao cliente Supabase do usuário (sob RLS).
- Login real (Supabase Auth) substituindo o login mock.

**Estado atual:** 🟡 parcial.

**Critérios de aceite:**
- Todas as queries passam por RLS; nenhum uso de `service_role` em rota de usuário.
- Isolamento de tenancy verificável (usuário de uma tenancy não vê outra).
- Escopo de corretor garantido por policy.

---

## Corte 7 — Cobrança e repasse operacionais (Asaas) 🟡

**Objetivo:** ciclo de cobrança de **locação** automatizado — boleto/PIX, baixa por
webhook e repasse — via gateway Asaas, mantendo o princípio mock-first. **Prioridade
nº 1 do produto.** Plano detalhado: [pm/07_PLANO_DE_COBRANCA.md](pm/07_PLANO_DE_COBRANCA.md).

**Escopo (1º corte — somente locação):**
- Entidade `Charge` + adapter `lib/billing` (Asaas; mock sem env), espelhando os
  adapters de WhatsApp/IA.
- Emissão de boleto registrado/PIX para a parcela; `boletoUrl`/`pixPayload`
  persistidos.
- Webhook de pagamento (`/api/billing/webhook`) → baixa automática **idempotente** →
  repasse pendente.
- Status `vencida`/`atrasado` calculado **na leitura** (correto sem depender de cron).
- Régua de lembretes WhatsApp via Vercel Cron (D-3 / vencimento / D+1 / D+5).
- UI de cobrança na página de Finanças (emitir, status, baixa manual de fallback).

**Critérios de aceite:**
- App ainda sobe sem nenhuma env (billing em mock); build/typecheck/lint/test verdes.
- Emitir cobrança cria `Charge` vinculada à parcela (payload determinístico em mock).
- Webhook marca parcela paga → dispara repasse, sem duplicar em reenvio.
- Inadimplência reflete em tempo real no dashboard **sem** depender do cron.
- Testes puros de status de atraso, conciliação idempotente e régua verdes.

**Estado atual:** 🟡 parcial.

**Notas:** o fluxo real de cobrança já existe no repositório, mas ainda convive com
modo mock e com outras superfícies de domínio em evolução.

**Fora deste corte (cortes seguintes):** cobrança de condomínio e comissões,
multa/juros/correção, split automático no Asaas, canal e-mail.

---

## Corte 8 — IA com provider real + permissões ampliadas 🟡

**Objetivo:** assistente em produção, com papéis liberados conforme política.

**Escopo:**
- `AI_PROVIDER=anthropic` (modelo `claude-opus-4-8`), `openai` ou `openrouter`.
- Streaming real via SSE.
- Ampliar allowlist (ex.: `finance` nas tools de cobrança).
- Overrides de permissão por usuário na UI de admin.

**Critérios de aceite:**
- Tool calling real funcionando com confirmação e auditoria.
- Papéis liberados respeitando `can()` e RLS.
- Overrides editáveis pelo admin e refletidos imediatamente.

**Estado atual:** 🟡 parcial.

**Notas:** o assistente já roda com OpenRouter/OpenAI/Anthropic/mock; o que falta
é a maturação de streaming, permissões ampliadas e hardening de uso real.

---

## Corte 9 — Promoção a SaaS multi-imobiliária ⬜

**Objetivo:** atender múltiplas imobiliárias sem reescrita.

**Escopo:**
- Onboarding de tenancy + primeiro admin.
- Planos (`tenancy_plan_t`) com limites por assinatura.
- Billing amarrado a `tenancy_id`.
- Seletor de tenant (para usuários multi-imobiliária).
- Observabilidade por tenant.

**Critérios de aceite:**
- Nova imobiliária criada e isolada por RLS desde o primeiro acesso.
- Nenhuma mudança no schema de negócio (só onboarding/billing).
- Uso permanece interno por imobiliária (sem portal externo).

---

## Visão de dependências

```
1 ─▶ 2 ─▶ 3 ─▶ 6 ─▶ 7
          │     └─▶ 8
          ├─▶ 4 ─────┘
          └─▶ 5 ─────▶ 7
                6 ─▶ 9
```

Cortes 1–5 são independentes de infraestrutura (modo mock). O corte 6 (Supabase)
destrava 7, 8 e 9. A interface estável dos repositories e dos adapters garante que
a troca de mock por real seja localizada.

## Princípio de entrega

> Cada corte deixa o produto **rodável e verificável**. Nada de big bang: o ImobOps
> evolui plugando peças reais sobre um núcleo que já funciona.
