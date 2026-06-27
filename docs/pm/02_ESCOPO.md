# 02 — Declaração de Escopo

## 1. Objetivo do documento

Definir, de forma não ambígua, o que o projeto ImobOps entrega e o que não entrega,
estabelecendo as fronteiras para gestão de mudanças.

## 2. Escopo do produto

### 2.1 Núcleo compartilhado
- **Tenancies** (multi-tenant desde o dia 1).
- **Usuários** com papéis (`admin`, `manager`, `broker`, `finance`, `condo_admin`,
  `viewer`).
- **Clientes** (PF/PJ) com papéis de negócio múltiplos.
- **Imóveis** com tipo, status, disponibilidade e vínculo opcional a condomínio.
- **Documentos** anexáveis a qualquer entidade.
- **CRM** com funil de leads.
- **Dashboard** contextual por papel.
- **Permissões** com escopos `own`/`team`/`all` e overrides por usuário.
- **Auditoria** (`audit_log`) e registro de ações de IA (`ai_actions`).

### 2.2 Locação
- Contratos com locador, locatário, fiador, valor, dia de vencimento, índice e taxa
  de administração.
- Geração de parcelas mensais.
- **Cobrança operacional via gateway (Asaas):** emissão de boleto registrado/PIX,
  baixa automática por webhook, régua de lembretes e status de atraso. Cobrança
  manual por upload permanece como caminho alternativo. Ver
  [07_PLANO_DE_COBRANCA.md](07_PLANO_DE_COBRANCA.md).
- Repasse ao proprietário descontando a taxa de administração, disparado pela baixa.

### 2.3 Venda
- Listagens com preço pedido e comissão.
- Funil de propostas/contrapropostas com histórico.
- Contratos de venda.
- Comissões (corretor + imobiliária).

### 2.4 Condomínio
- Condomínios administrados, unidades (com fração ideal) e moradores.
- Taxas mensais.
- Despesas comuns rateadas (igualitário ou fração ideal).
- Atas de assembleia.

### 2.5 Integrações
- **WhatsApp** via adapter (Evolution API local/VPS; Meta Cloud API oficial).
- **IA** via adapter agnóstico (OpenAI/Anthropic/OpenRouter/mock) com tool calling.
- **Cobrança** via adapter (Asaas; mock sem env) — boleto/PIX, webhook de
  pagamento, repasse. Ver [07_PLANO_DE_COBRANCA.md](07_PLANO_DE_COBRANCA.md).

## 3. Entregáveis

| # | Entregável | Forma |
|---|-----------|-------|
| E1 | Aplicação Next.js rodável em mock | Repositório |
| E2 | Modelo de domínio tipado | `lib/types` |
| E3 | Repositories + permissões | `lib/repositories`, `lib/permissions` |
| E4 | Migrations SQL (schema, RLS, seed, auditoria/IA) | `database/migrations` |
| E5 | Adapters WhatsApp e IA | `lib/whatsapp`, `lib/ai` |
| E6 | UI mobile-first + dashboard | `app`, `components` |
| E7 | Testes (permissões, parcelas, repasse, guard, triagem) | `*.test.ts` |
| E8 | Documentação técnica e de produto | `docs` |

## 4. Fora de escopo

- Portal externo para inquilino, proprietário ou comprador.
- ~~Geração/registro de boleto bancário automatizado.~~ **Movido para escopo em
  2026-06-25** (mudança aprovada) — ver §2.2 e
  [07_PLANO_DE_COBRANCA.md](07_PLANO_DE_COBRANCA.md). Passa a ser a prioridade nº 1
  do produto, via gateway Asaas.
- Integração fiscal/contábil (NF-e, SPED).
- Aplicativo nativo (o produto é PWA mobile-first).
- Assinatura eletrônica de contratos.
- Marketplace/portal de anúncios públicos.

## 5. Critérios de aceitação do escopo

1. App sobe sem variáveis de ambiente, em modo mock, mostrando o dashboard.
2. `build`, `lint`, `typecheck` e `test` passam limpos.
3. Toda entidade do modelo de domínio existe em código e no schema SQL.
4. A regra de ouro de permissões está implementada e testada.
5. As quatro regras do assistente de IA estão implementadas (RLS herdado,
   confirmação em escrita, auditoria, allowlist).
6. WhatsApp com triagem de leads e templates obrigatórios.

## 6. Exclusões e suposições

- Supõe-se que a infraestrutura real (Supabase, Evolution, provider de IA) será
  configurada em cortes posteriores; o MVP roda em mock.
- Supõe-se que números de WhatsApp seguirão boas práticas para reduzir risco de
  banimento.

## 7. Estrutura analítica resumida

Ver `03_WBS.md` para a decomposição completa do trabalho.

## 8. Gestão de mudanças de escopo

Mudanças seguem o fluxo: solicitação → avaliação de impacto (prazo, esforço,
risco) → aprovação do patrocinador → atualização desta declaração e da WBS. Itens
"fora de escopo" só entram via mudança aprovada.

### Registro de mudanças

| Data | Mudança | Impacto | Aprovação |
|------|---------|---------|-----------|
| 2026-06-25 | Boleto/PIX automatizado (gateway Asaas) movido de "fora de escopo" para escopo, como prioridade nº 1. Nova entidade `Charge`, adapter `lib/billing`, webhook de baixa, régua de lembretes, repasse automático. 1º corte: **somente locação**; condomínio, comissões e multa/juros em cortes seguintes. | Novo adapter + entidade + rotas; mantém princípio mock-first (sem env → mock). Plano em [07_PLANO_DE_COBRANCA.md](07_PLANO_DE_COBRANCA.md). | Patrocinador (proprietário do produto) |
