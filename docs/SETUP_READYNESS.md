# Setup e Readiness

Este projeto roda sem credenciais, mas a operacao real fica pronta quando cinco blocos estao configurados:

1. Supabase
2. WhatsApp
3. IA
4. Billing
5. Rate limit distribuido

## Arquivo de ambiente

```bash
copy .env.example .env.local
```

## Supabase

Variaveis:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://postgres:<password>@<project-ref>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&sslmode=require
```

Responsavel por:

- banco real
- auth real
- RLS
- persistencia dos modulos

Notas:

- `NEXT_PUBLIC_SUPABASE_URL` é a URL HTTPS do projeto Supabase.
- `DATABASE_URL` é a string de conexão do Postgres usada pelo Prisma.
- Prefira o pooler do Supabase na porta `6543` para reduzir pressão no pool de conexões.

Aplicar as migrations de `database/migrations/` em ordem.

## WhatsApp

Variaveis:

```env
EVOLUTION_API_URL=
EVOLUTION_API_TOKEN=
EVOLUTION_INSTANCE=
EVOLUTION_WEBHOOK_TOKEN=
```

Responsavel por:

- inbox real
- webhook
- envio de mensagens

## IA

Variaveis:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=
```

ou

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
```

ou

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Sem a key do provider ativo, o assistente continua em fallback local.

## Billing

Variaveis:

```env
ASAAS_API_KEY=
ASAAS_BASE_URL=
ASAAS_WEBHOOK_TOKEN=
CRON_SECRET=
```

Responsavel por:

- emissao de cobrancas (boleto, PIX, cartao)
- webhook autenticado (idempotente)
- cron protegido (lembretes D-3, vencimento, D+1, D+5)
- multa/juros/correcao pro-rata

## Rate limit distribuido

Variaveis:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Sem isso, o fallback continua em memoria local.

## Preview para cliente

Variavel opcional:

```env
NEXT_PUBLIC_CLIENT_PREVIEW=on
```

Use `off` para expor novamente sinais internos de demo.

## Checklist final

1. preencher `.env.local`
2. aplicar migrations (`001`–`016` no Supabase)
3. configurar auth hook (access token com `tenancy_id` + `role`)
4. validar login real (com `NEXT_PUBLIC_SUPABASE_URL`)
5. validar inbox WhatsApp (Evolution ou Meta Cloud API)
6. validar assistente com provider real (`AI_PROVIDER=openai|anthropic|openrouter`)
7. validar cobranca e webhook (`ASAAS_API_KEY`)
8. validar rate limiting (`UPSTASH_REDIS_REST_URL`)
9. executar `npm run e2e` para validar integridade geral
10. executar `npm run build && npm run test` para garantir build e testes

## Painel no app

O modulo `Admin` exibe o readiness de cada bloco e quais variaveis ainda faltam.
