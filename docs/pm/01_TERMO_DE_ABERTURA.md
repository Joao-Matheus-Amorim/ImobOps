# 01 — Termo de Abertura do Projeto (Project Charter)

## Identificação

- **Projeto:** ImobOps — Sistema Operacional Interno de Imobiliária
- **Patrocinador:** Direção da imobiliária cliente (cliente único na fase inicial)
- **Gerente do projeto:** Líder técnico / product owner
- **Data de abertura:** referência de início do desenvolvimento
- **Versão:** 1.0

## 1. Justificativa

A operação da imobiliária está fragmentada em planilhas, sistemas legados e
conversas de WhatsApp. Locação, venda e condomínio não conversam entre si, a
cobrança é manual e sem trilha, e o relacionamento com leads não tem funil. Isso
gera inadimplência mal controlada, oportunidades perdidas e ausência de visibilidade
gerencial.

O ImobOps consolida as três frentes em um único produto mobile-first, com cobrança
assistida, repasse automático, funil de CRM, integração com WhatsApp e um assistente
de IA que opera sob as permissões do usuário.

## 2. Objetivos do projeto

1. Unificar locação, venda e condomínio sobre um núcleo compartilhado.
2. Reduzir o tempo de fechamento de cobrança e a inadimplência.
3. Dar visibilidade gerencial por meio de dashboards contextuais por papel.
4. Estruturar a captação e a conversão de leads em um funil rastreável.
5. Entregar uma base **multi-tenant desde o dia 1**, pronta para virar SaaS sem
   reescrita.

## 3. Descrição de alto nível

Aplicação Next.js 14 (App Router), TypeScript estrito, Tailwind + shadcn/ui,
Supabase (Auth, DB, Storage, RLS) opcional no MVP, adapters plugáveis para WhatsApp
(Evolution API / Meta) e IA (OpenAI / Anthropic / mock). O app roda em **modo mock**
sem nenhuma variável de ambiente, permitindo desenvolvimento, demonstração e testes
sem infraestrutura.

## 4. Premissas

- A primeira entrega atende **uma** imobiliária, mas a arquitetura é multi-tenant.
- O uso é **interno** (equipe da imobiliária); não há portal externo para o
  consumidor final.
- A cobrança é **manual e assistida** (upload de comprovante + marcação), não
  geração automática de boleto bancário.
- O WhatsApp inicia com Evolution API, com plano de migração para a Meta Cloud API.

## 5. Restrições

- Stack obrigatória: Next 14, TS estrito, Tailwind/shadcn, Supabase, Zod, Vitest,
  Vercel.
- Mobile-first, tema escuro por padrão.
- Sem `service_role` em operações de usuário ou na IA.
- Documentação e UI em português brasileiro; código e comentários em inglês curto.

## 6. Escopo resumido (entra / não entra)

**Entra:** núcleo (tenancy, usuários, clientes, imóveis, documentos), locação,
venda, condomínio, CRM, WhatsApp, IA, dashboard, permissões, auditoria.

**Não entra (fase inicial):** portal externo, boleto bancário automatizado,
integração fiscal/contábil, app nativo.

## 7. Principais entregáveis

- Repositório completo rodável em modo mock.
- Migrations SQL (schema multi-tenant, RLS, seed, auditoria/IA).
- Adapters de WhatsApp e IA.
- Documentação técnica e de produto.

## 8. Marcos (alto nível)

| Marco | Descrição |
|-------|-----------|
| M1 | Núcleo rodável em mock (cortes 1–3) |
| M2 | IA + WhatsApp (cortes 4–5) |
| M3 | Supabase + RLS em produção (corte 6) |
| M4 | Cobrança/repasse operacionais + IA real (cortes 7–8) |
| M5 | Promoção a SaaS (corte 9) |

## 9. Stakeholders principais

- **Direção** — patrocínio e decisões de negócio.
- **Administrativo/Financeiro** — cobrança, repasses, comissões.
- **Corretores** — clientes, imóveis, vendas, CRM.
- **Síndicos/Administradores de condomínio** — condomínios.
- **Equipe técnica** — desenvolvimento e operação.

## 10. Riscos de alto nível

- Banimento do número no WhatsApp (Evolution API) — mitigado por boas práticas e
  plano de migração.
- Vazamento entre tenancies — mitigado por RLS + filtro de aplicação.
- Uso indevido da IA — mitigado por allowlist, confirmação e auditoria.

(Detalhe em `05_RISCOS.md`.)

## 11. Critérios de sucesso

- `npm install && npm run dev` sobe o app sem env, mostrando o dashboard em mock.
- `npm run build`, `lint`, `typecheck` e `test` limpos.
- Regra de ouro de permissões testada em código.
- Ciclo de cobrança e repasse demonstrável.

## 12. Autorização

Este termo autoriza formalmente o início do projeto, a alocação da equipe técnica e
o uso dos recursos descritos, sob a gestão do gerente de projeto indicado.
