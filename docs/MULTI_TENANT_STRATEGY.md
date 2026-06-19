# Estratégia Multi-Tenant — ImobOps

## 1. Decisão fundadora

O ImobOps começa atendendo **uma única imobiliária**, mas é **multi-tenant desde o
primeiro commit**. Não há "fase 2 de multi-tenancy". A arquitetura já é
multi-tenant; o que muda no futuro é apenas **expor** a troca de tenant na UI e o
fluxo de onboarding de novas imobiliárias.

A motivação é evitar o anti-padrão mais caro em SaaS: nascer single-tenant e ter
que reescrever todo o data layer, todas as queries e todas as policies para
suportar múltiplos clientes. Carregar `tenancy_id` desde o início custa quase nada;
adicioná-lo depois custa uma reescrita.

## 2. O invariante central

> **Toda entidade de negócio carrega `tenancy_id`. Toda query é filtrada por
> `tenancy_id`. Toda policy RLS valida `tenancy_id` contra o JWT.**

Não há exceção. Se uma tabela de negócio não tem `tenancy_id`, é um bug.

## 3. Modelo de dados

A tabela `tenancies` é a raiz:

```sql
create table tenancies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan tenancy_plan_t not null default 'single',
  created_at timestamptz not null default now()
);
```

Cada `user`, `client`, `property`, `rental_contract`, `installment`, `repasse`,
`sale_listing`, `proposal`, `sale_contract`, `commission`, `condo`, `unit`,
`condo_fee`, `condo_expense`, `condo_meeting`, `crm_lead`, `crm_activity`,
`whatsapp_conversation`, `whatsapp_message`, `audit_log`, `ai_action` e
`user_feature_permission` referencia `tenancies(id)` via `tenancy_id not null`.

Índices em `tenancy_id` existem em todas as tabelas para que o filtro seja barato.

## 4. O JWT carrega a tenancy

A identidade de tenant viaja no **JWT** do Supabase Auth, como claims customizados:

```json
{
  "sub": "auth-user-uuid",
  "tenancy_id": "...",
  "role": "admin"
}
```

Esses claims são injetados por um **auth hook** (custom access token hook) que, no
login, lê o `users` correspondente ao `auth.uid()` e adiciona `tenancy_id` e
`role`. A aplicação nunca confia em `tenancy_id` vindo do corpo da requisição — só
no claim do token.

Helpers SQL para ler o claim:

```sql
create or replace function auth_tenancy_id() returns uuid
  language sql stable as $$ select nullif(auth.jwt() ->> 'tenancy_id','')::uuid $$;

create or replace function auth_role() returns text
  language sql stable as $$ select coalesce(auth.jwt() ->> 'role','viewer') $$;
```

## 5. RLS: a fronteira dura

Toda tabela tem RLS habilitada. A policy padrão é a mesma em todas:

```sql
create policy tenancy_isolation on <tabela>
  for all
  using (tenancy_id = auth_tenancy_id())
  with check (tenancy_id = auth_tenancy_id());
```

`using` filtra o que é lido/atualizado/deletado; `with check` impede inserir ou
mover um registro para outra tenancy. Juntos, garantem que **nenhuma operação
cruze a fronteira de tenant**, independentemente de bugs na aplicação.

Algumas tabelas têm policies **refinadas** por escopo (ex.: corretor só vê seus
clientes e seus leads). Essas policies adicionam condições sobre `owner_user_id` /
`assigned_to_user_id` além do `tenancy_id`. Ver `002_rls_policies.sql`.

## 6. Por que RLS *e* filtro na aplicação?

Defesa em profundidade.

- **RLS** é a garantia que sobrevive a qualquer bug de aplicação. É a última linha.
- **Aplicação** (`MockCollection`/repositories + `enforceScope`) também filtra por
  tenancy e escopo, porque (a) no modo mock não há banco/RLS, e (b) permite
  refinar ações (`create`/`edit`/`delete`) e aplicar overrides de permissão que o
  RLS não modela.

No MVP em modo mock, o filtro de tenancy vive em `lib/repositories/base.ts`:

```ts
list(ctx, predicate) {
  return this.all().filter(
    (r) => r.tenancyId === ctx.tenancyId && (predicate ? predicate(r) : true),
  );
}
```

Quando o Supabase está configurado, a mesma interface de repository delega ao
cliente Supabase do usuário, e o RLS faz o filtro no banco.

## 7. O cliente Supabase nunca usa service_role para dados de usuário

`lib/supabase/server.ts` cria o cliente **vinculado aos cookies da sessão**, de
modo que toda query roda sob o JWT do usuário e, portanto, sob a RLS. A chave
`service_role` (que ignora RLS) existe no `.env.example` apenas para tarefas
administrativas pontuais (migrations, jobs), **nunca** para servir requisições de
usuário e **nunca** para o assistente de IA.

## 8. Isolamento do assistente de IA

A IA é só mais um "usuário" do ponto de vista de dados. A rota
`/api/ai/tools/[tool]` resolve o principal da sessão e executa a tool com o
contexto `{ tenancyId, userId, role }`. No modo Supabase, isso significa o RLS do
usuário; no modo mock, o filtro por tenancy do repository. A IA **não pode**
acessar dados de outra tenancy, nem usar `service_role`. Ver `AI_AGENT_STRATEGY.md`.

## 9. Modo single-tenant hoje

Enquanto o produto atende uma imobiliária:

- Existe **uma** linha em `tenancies` ("Imobiliária Demonstração", id fixo no seed
  e em `lib/constants.ts`).
- A **troca de tenant não aparece** na UI. O `TopBar` mostra o usuário e o papel,
  mas não um seletor de imobiliária.
- O `tenancy_id` é sempre o da imobiliária ativa, resolvido em `lib/session.ts`.

Nada disso impede a evolução: a coluna, os índices e as policies já estão prontos.

## 10. Plano de promoção a SaaS

Quando for hora de atender várias imobiliárias, o caminho é incremental e **sem
reescrita**:

1. **Onboarding**: tela de criação de tenancy + primeiro usuário admin. Uma linha
   nova em `tenancies`, um `user` admin vinculado.
2. **Auth hook**: já injeta `tenancy_id` e `role` no JWT a partir do `users`.
   Apenas garantir que cada novo usuário esteja corretamente vinculado.
3. **Planos** (`plan`): o enum `tenancy_plan_t` (`single`, `saas_starter`,
   `saas_pro`) já existe para diferenciar limites/funcionalidades por assinatura.
4. **Faturamento**: integração de billing (fora do escopo deste repositório)
   amarrada ao `tenancy_id`.
5. **Seletor de tenant na UI**: só para usuários que pertencem a mais de uma
   imobiliária (ex.: grupos). Habilitar o switch que já é suportado pela
   arquitetura.
6. **Observabilidade por tenant**: métricas e logs particionados por `tenancy_id`.

Em nenhum desses passos é necessário tocar no schema de negócio ou nas queries —
porque `tenancy_id` já está em tudo.

## 11. O que continua interno (mesmo no SaaS)

O SaaS é **multi-imobiliária**, não **multi-consumidor**. Cada imobiliária usa o
ImobOps internamente, com sua equipe. **Não existe** portal externo para inquilino,
proprietário ou comprador. Essa restrição mantém o produto focado e a superfície de
segurança pequena: todos os usuários são funcionários autenticados de uma tenancy.

## 12. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Esquecer `tenancy_id` numa tabela nova | Convenção obrigatória + revisão; RLS sem policy bloqueia por padrão. |
| `tenancy_id` vindo do cliente ser confiado | Sempre lido do JWT (`auth_tenancy_id()`), nunca do body. |
| Vazamento via `service_role` | Proibido em rotas de usuário e na IA; uso restrito a jobs administrativos. |
| Query sem filtro de tenancy no modo mock | Centralizado em `MockCollection`; nenhuma query crua espalhada. |
| Auth hook não injetar claims | Falha "fecha" (sem `tenancy_id` ⇒ RLS nega tudo), nunca "abre". |

## 13. Checklist para nova tabela de negócio

1. Coluna `tenancy_id uuid not null references tenancies(id) on delete cascade`.
2. Índice `idx_<tabela>_tenancy on <tabela>(tenancy_id)`.
3. `alter table <tabela> enable row level security;`
4. Policy `tenancy_isolation` (e, se aplicável, policy de escopo refinado).
5. Colunas de auditoria: `created_at`, `updated_at`, `created_by`.
6. Tipo TS correspondente em `lib/types/domain.ts` estendendo `BaseEntity`.
7. Repository herdando o filtro de tenancy via `MockCollection`.
