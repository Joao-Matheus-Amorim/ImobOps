# ImobOps

**Sistema operacional interno de imobiliária** — locação, venda e condomínio sobre
um núcleo compartilhado, mobile-first, multi-tenant desde o dia 1, com integração de
WhatsApp e assistente de IA.

O app **roda sem nenhuma variável de ambiente** (modo mock, com dados tipados em
`lib/mock-data/`). Supabase, IA e WhatsApp são opcionais e plugáveis.

---

## Começando

```bash
npm install
npm run dev
# abra http://localhost:3000  → redireciona para /dashboard (modo mock)
```

Sem `.env`, o app sobe em **modo demonstração**: dados mockados, IA em modo "mock",
WhatsApp simulado. Use o seletor de papel no topo (apenas em demonstração) para ver
o dashboard de cada papel.

### Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (passa limpo sem env) |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (TypeScript estrito) |
| `npm run test` | Vitest |

---

## Stack

- **Next.js 14** (App Router) + **TypeScript estrito**
- **Tailwind CSS** + **shadcn/ui** (Radix) + **lucide-react** + **framer-motion**
- **Supabase** (Auth, DB, Storage, RLS) — opcional no MVP
- **Zod** para validação de tools e payloads
- **Vitest** para testes
- **Vercel** como alvo de deploy
- Adapter **WhatsApp** (`lib/whatsapp/`): Evolution API + stub Meta
- Adapter **IA** (`lib/ai/`): OpenAI / Anthropic / mock, com tool calling

---

## Os três módulos

- **Locação** — contratos, parcelas mensais, cobrança manual (boleto/PIX por upload
  + marcação), repasse ao proprietário descontando a taxa de administração.
- **Venda** — listagens, funil de propostas/contrapropostas, contratos, comissões.
- **Condomínio** — condomínios, unidades, taxas, despesas rateadas, assembleias.

Núcleo compartilhado: tenancies, usuários, clientes, imóveis, documentos, CRM,
dashboard contextual, WhatsApp e assistente de IA.

---

## A regra de ouro das permissões

```
O papel define a permissão inicial.
O admin define a permissão real.
A permissão sempre vence o papel.
```

Três escopos de dados: `own` · `team` · `all`. A UI esconde o que o usuário não pode
ver (`can`), e o servidor impede o que ele não pode fazer (`enforceScope`). Detalhes
em [docs/PERMISSION_STRATEGY.md](docs/PERMISSION_STRATEGY.md).

---

## Multi-tenant desde o dia 1

Toda tabela tem `tenancy_id`; toda policy RLS filtra por `tenancy_id` do JWT. A
troca de tenant fica escondida na UI enquanto for cliente único, e o produto vira
SaaS **sem reescrita**. Ver [docs/MULTI_TENANT_STRATEGY.md](docs/MULTI_TENANT_STRATEGY.md).

---

## Assistente de IA — quatro regras inegociáveis

1. **Herda o RLS do usuário logado** (nunca `service_role`).
2. **Confirmação obrigatória em escrita** (dry-run → confirm). Leituras executam
   direto.
3. **Auditoria de tudo** em `ai_actions` (append-only).
4. **Allowlist por papel** (MVP: apenas `admin`).

Provider por `AI_PROVIDER=openai|anthropic`; sem env, modo mock. Ver
[docs/AI_AGENT_STRATEGY.md](docs/AI_AGENT_STRATEGY.md).

---

## WhatsApp

Adapter com Evolution API (default; mock sem env) e stub Meta tipado para migração.
9 templates de cobrança/captação, bot de triagem de leads por intenção, webhook e
envio. Ver [docs/WHATSAPP_INTEGRATION.md](docs/WHATSAPP_INTEGRATION.md).

---

## Estrutura

```
app/            # rotas (App Router): (auth), (app), api
components/     # ui (shadcn), layout (shell), domain (por módulo)
lib/
  types/        # domínio, permissões, IA
  mock-data/    # seed tipado (modo mock)
  repositories/ # acesso a dados (mock ↔ supabase) + lógica de parcelas/repasse
  permissions/  # rules, scope, enforce
  supabase/     # clients server/client/middleware
  whatsapp/     # adapter, evolution, meta, templates, triage-bot
  ai/           # adapter, providers, tools, guard, confirm, audit
database/
  migrations/   # 001 schema · 002 RLS · 003 seed · 004 auditoria/IA
docs/           # produto, permissões, multi-tenant, IA, WhatsApp, roadmap, pm/
```

---

## Configuração (opcional)

Copie `.env.example` para `.env.local` e preencha conforme necessário:

- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL` deve ser a URL HTTPS do projeto; `DATABASE_URL` é a conexão do Postgres para o Prisma, de preferência via pooler do Supabase em `6543` com `pgbouncer=true&connection_limit=5`.
- **Evolution API** — sem isso, o WhatsApp é simulado.
- **IA** — `AI_PROVIDER=openai|anthropic|mock` + a key correspondente.

O banco é criado aplicando, em ordem, os arquivos de `database/migrations/`. Para o runtime real do Prisma, o app lê `DATABASE_URL` e usa `prisma.config.ts` + `@prisma/adapter-pg`.

---

## Testes

```bash
npm run test
```

Cobertura principal: permissões (`lib/permissions`), guard da IA (`lib/ai/guard`),
geração de parcelas e cálculo de repasse (`lib/repositories`), e triagem de WhatsApp
(`lib/whatsapp`).

---

## Documentação

- [Visão de Produto](docs/PRODUCT_VISION.md)
- [Estratégia de Permissões](docs/PERMISSION_STRATEGY.md)
- [Estratégia Multi-Tenant](docs/MULTI_TENANT_STRATEGY.md)
- [Estratégia do Assistente de IA](docs/AI_AGENT_STRATEGY.md)
- [Integração WhatsApp](docs/WHATSAPP_INTEGRATION.md)
- [Setup e Readiness](docs/SETUP_READYNESS.md)
- [Roadmap](docs/ROADMAP.md)
- Gestão (PM): [Termo de Abertura](docs/pm/01_TERMO_DE_ABERTURA.md) ·
  [Escopo](docs/pm/02_ESCOPO.md) · [WBS](docs/pm/03_WBS.md) ·
  [Requisitos](docs/pm/04_REQUISITOS.md) · [Riscos](docs/pm/05_RISCOS.md) ·
  [Roadmap de Entrega](docs/pm/06_ROADMAP_DE_ENTREGA.md)

---

## Licença

MIT — ver [LICENSE](LICENSE).
