# 03 — Estrutura Analítica do Projeto (WBS)

Decomposição do trabalho em pacotes entregáveis. Numeração hierárquica.

## 1. Fundação

- **1.1** Configuração do projeto (Next 14, TS estrito, Tailwind, shadcn, ESLint).
- **1.2** Ferramentas de teste (Vitest) e scripts (`build`, `lint`, `typecheck`,
  `test`).
- **1.3** Variáveis de ambiente e modo mock (`.env.example`, `constants.ts`).
- **1.4** Deploy alvo (Vercel) e configuração (`vercel.json`).

## 2. Modelo de domínio

- **2.1** Tipos do núcleo (tenancy, user, client, property, document).
- **2.2** Tipos de locação (contrato, parcela, repasse).
- **2.3** Tipos de venda (listagem, proposta, contrato, comissão).
- **2.4** Tipos de condomínio (condo, unidade, taxa, despesa, assembleia).
- **2.5** Tipos de CRM e WhatsApp.
- **2.6** Tipos de permissões e de IA.

## 3. Dados e persistência

- **3.1** Mock-data coerente por entidade.
- **3.2** Store em memória + agregação (`mock-data/index.ts`).
- **3.3** Repositories com isolamento por tenancy (`base.ts` + por entidade).
- **3.4** Lógica pura de parcelas e repasse (`installment-logic.ts`).
- **3.5** Clientes Supabase (server/client/middleware) e sessão.

## 4. Permissões

- **4.1** Padrões por papel (`rules.ts`).
- **4.2** Escopos `own/team/all` (`scope.ts`).
- **4.3** Resolução com overrides + `can`/`enforceScope` (`enforce.ts`).
- **4.4** Guarda de página (`guard-page.ts`).
- **4.5** Testes de permissões.

## 5. Interface (UI)

- **5.1** Primitivos shadcn/ui (button, card, badge, input, label, etc.).
- **5.2** Componentes utilitários (StatCard, StatusBadge, ListItem, EmptyState,
  PageHeader, Avatar).
- **5.3** Shell mobile (MobileShell, BottomNav, TopBar, ThemeToggle, RoleSwitcher).
- **5.4** Dashboard contextual por papel.
- **5.5** Páginas de domínio (list + detail) por módulo.
- **5.6** Páginas de assistente, WhatsApp e admin.

## 6. Assistente de IA

- **6.1** Interface de adapter + implementações (OpenAI, Anthropic, mock).
- **6.2** Conversão Zod → JSON Schema.
- **6.3** Registry de tools por domínio.
- **6.4** Guard (allowlist por papel + permissão).
- **6.5** Dry-run/confirm e auditoria.
- **6.6** Rotas `/api/ai/chat` e `/api/ai/tools/[tool]`.
- **6.7** Teste do guard e do registry.

## 7. WhatsApp

- **7.1** Interface de adapter + Evolution + stub Meta.
- **7.2** Templates obrigatórios.
- **7.3** Bot de triagem (classificação + roteamento).
- **7.4** Rotas webhook e send.
- **7.5** Teste de classificação.

## 8. Banco de dados (SQL)

- **8.1** Schema core multi-tenant (`001`).
- **8.2** Policies RLS (`002`).
- **8.3** Seed (`003`).
- **8.4** Auditoria, IA e overrides (`004`).

## 9. Documentação

- **9.1** Visão de produto.
- **9.2** Estratégia de permissões.
- **9.3** Estratégia multi-tenant.
- **9.4** Estratégia do assistente de IA.
- **9.5** Integração WhatsApp.
- **9.6** Roadmap.
- **9.7** Documentos de gestão (PM): termo, escopo, WBS, requisitos, riscos,
  roadmap de entrega.

## 10. Qualidade e verificação

- **10.1** Typecheck estrito sem `any` não justificado.
- **10.2** Lint limpo.
- **10.3** Build sem env.
- **10.4** Suíte de testes verde.
- **10.5** Smoke test das rotas de API.

## Dicionário da WBS (amostra)

| ID | Pacote | Critério de "pronto" |
|----|--------|----------------------|
| 3.4 | Lógica de parcelas/repasse | Funções puras + testes cobrindo borda (clamp de dia, arredondamento) |
| 4.3 | Resolução de permissões | `can`/`enforceScope` com overrides testados |
| 6.5 | Dry-run/auditoria | Escrita exige confirm; toda execução grava em `ai_actions` |
| 7.3 | Triagem | Classificação testada; lead criado e roteado |
| 8.2 | RLS | Toda tabela com RLS; isolamento por tenancy |

## Relação com os cortes do roadmap

- Fundação + Domínio + Dados + Permissões + UI (1–5) ⇒ Cortes 1–3.
- IA (6) ⇒ Corte 4.
- WhatsApp (7) ⇒ Corte 5.
- SQL (8) ⇒ destrava Corte 6.
- Documentação (9) e Qualidade (10) ⇒ transversais a todos os cortes.
