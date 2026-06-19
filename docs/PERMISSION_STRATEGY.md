# Estratégia de Permissões — ImobOps

## 1. A regra de ouro

```
O papel (role) define a permissão inicial.
O admin define a permissão real.
A permissão sempre vence o papel.
```

Esta é a única regra que precisa ser memorizada. Tudo abaixo a detalha.

O papel de um usuário (`admin`, `manager`, `broker`, `finance`, `condo_admin`,
`viewer`) determina um **conjunto padrão** de permissões. Esse conjunto é apenas o
ponto de partida. O administrador da imobiliária pode conceder ou revogar
permissões específicas por usuário através de **overrides**
(`user_feature_permissions`). Quando há override, ele **prevalece** sobre o padrão
do papel — para mais e para menos.

## 2. Os três eixos de uma permissão

Uma permissão no ImobOps é definida por três coisas:

1. **Feature** — a área funcional (`clients`, `properties`, `rentals`,
   `rentals.installments`, `sales`, `condos`, `condo_fees`, `condo_expenses`,
   `condo_meetings`, `finance`, `repasses`, `commissions`, `crm`, `whatsapp`,
   `assistant`, `admin`).
2. **Ações** — o que pode fazer: `view`, `create`, `edit`, `delete`.
3. **Escopo** — quais registros enxerga: `own`, `team`, `all`.

```ts
interface FeaturePermission {
  feature: FeatureKey;
  actions: Action[];   // ["view","create","edit","delete"]
  scope: Scope;        // "own" | "team" | "all"
  allowedMemberIds?: string[]; // refinamento opcional do escopo team
}
```

## 3. Os três escopos de dados

| Escopo | Vê |
|--------|----|
| `own`  | Apenas registros que pertencem ao próprio usuário (`owner_user_id`, `assigned_to_user_id`, etc.). |
| `team` | Registros do próprio usuário **e** dos membros da sua equipe. |
| `all`  | Todos os registros da tenancy. |

O escopo é aplicado **antes** de qualquer dado chegar ao repository, pelo helper
`enforceScope(user, feature, action, record?)`. Quando um `record` é informado, o
escopo é verificado contra o dono do registro. Quando se trata de uma listagem,
usa-se `filterAllowed(principal, feature, records)` para reduzir a lista ao
subconjunto visível.

```ts
// Servidor: lança PermissionError se a ação não for permitida ou o registro
// estiver fora do escopo.
enforceScope(principal, "clients", "edit", client);

// UI: esconde rotas e botões.
can(principal, "finance", "view");
```

## 4. Padrões por papel

Estes são os **defaults**. O admin pode sobrescrever qualquer um deles.

### admin
- `all` em **tudo**. Acesso completo a todas as features e ações.

### manager
- `all` em CRM, vendas e locação (incluindo parcelas e comissões).
- `all` em clientes e imóveis.
- `view` em condomínio e seus sub-recursos.
- `view` em finanças e repasses.

### broker (corretor)
- `own` em clientes, imóveis, vendas e CRM (cria/edita os seus).
- `view` em locação (apenas consulta).
- `own` em WhatsApp (suas conversas).

### finance (financeiro)
- `all` em finanças, parcelas de locação, taxas de condomínio, repasses e comissões.
- `view` em clientes e imóveis.

### condo_admin (síndico/administrador de condomínio)
- `all` em condomínios, unidades, taxas, despesas e assembleias.
- `view` em clientes e imóveis.

### viewer
- `view` em tudo. Nenhuma ação de escrita.

## 5. Como o padrão vira permissão real

A resolução acontece em `lib/permissions/enforce.ts`:

```ts
export function resolvePermissions(principal: Principal): PermissionSet {
  const base = DEFAULT_PERMISSIONS[principal.role]; // padrão do papel
  const byFeature = new Map(base.map((p) => [p.feature, { ...p }]));

  // Overrides do usuário sobrescrevem o padrão (permissão vence o papel).
  for (const o of principal.overrides ?? []) {
    byFeature.set(o.featureKey, {
      feature: o.featureKey,
      actions: o.actions,
      scope: o.scope,
      allowedMemberIds: o.allowedMemberIds,
    });
  }
  return { role: principal.role, permissions: [...byFeature.values()] };
}
```

Note que o override substitui a permissão da feature inteira — não faz merge de
ações. Isso é intencional: o admin descreve **exatamente** o que aquele usuário
pode naquela feature, sem ambiguidade.

## 6. Dois lugares onde a permissão é aplicada

### 6.1 Na UI (esconder)
`can(principal, feature, action)` decide se uma rota aparece na navegação e se um
botão é renderizado. O layout do app (`app/(app)/layout.tsx`) filtra a navegação:

```ts
const primaryNav = PRIMARY_NAV.filter((e) => can(principal, e.feature, "view"));
```

Cada página chama `guardPage(feature, action)`, que faz `notFound()` se o usuário
não tiver acesso — a rota some de verdade, não só o link.

### 6.2 No servidor (impedir)
Toda operação de escrita passa por `enforceScope` **antes** de tocar o repository.
A UI esconder um botão é conveniência; o servidor recusar é segurança. Os dois
trabalham juntos.

## 7. Relação com a RLS do banco

A RLS (ver `MULTI_TENANT_STRATEGY.md` e `002_rls_policies.sql`) é a **fronteira
dura**: isolamento por tenancy e escopo base (ex.: corretor só vê seus clientes).
A camada de aplicação **refina** isso: distingue ações (`create` vs `edit` vs
`delete`) e aplica os overrides de `user_feature_permissions`.

Em outras palavras:
- **RLS** garante que ninguém veja dados de outra imobiliária, jamais.
- **Aplicação** garante que dentro da imobiliária cada um faça só o que pode.

Defesa em profundidade: mesmo que um bug na aplicação deixe passar uma operação, a
RLS ainda barra o acesso cruzado entre tenancies.

## 8. Overrides na prática

Exemplo: o admin quer que o corretor Bruno também enxergue **todos** os clientes
(não só os dele) por um período de campanha:

```sql
insert into user_feature_permissions (tenancy_id, user_id, feature_key, actions, scope)
values (:tenancy, :bruno, 'clients', '{view,create,edit}', 'all');
```

A partir daí, `can(bruno, "clients", "edit")` retorna `true` com escopo `all`,
mesmo o papel `broker` tendo padrão `own`. A permissão venceu o papel.

Para revogar, basta remover a linha; Bruno volta ao padrão do papel.

## 9. O assistente de IA e as permissões

A IA **não tem permissões próprias**. Ela herda as do usuário logado. A rota
`/api/ai/tools/[tool]` resolve o principal da sessão e aplica `assertToolAllowed`,
que checa (a) a allowlist por papel — no MVP, apenas `admin` pode chamar tools — e
(b) `can(principal, tool.feature, tool.action)`. Além disso, a execução real roda
sob o RLS do usuário. Ver `AI_AGENT_STRATEGY.md`.

## 10. Tabela-resumo de defaults

| Feature                | admin | manager | broker | finance | condo_admin | viewer |
|------------------------|:-----:|:-------:|:------:|:-------:|:-----------:|:------:|
| clients                | all   | all     | own    | view    | view        | view   |
| properties             | all   | all     | own    | view    | view        | view   |
| rentals                | all   | all     | view   | view    | —           | view   |
| rentals.installments   | all   | all     | —      | all     | —           | view   |
| sales                  | all   | all     | own    | —       | —           | view   |
| commissions            | all   | all     | —      | all     | —           | view   |
| finance                | all   | view    | —      | all     | —           | view   |
| repasses               | all   | view    | —      | all     | —           | view   |
| condos / fees / expenses / meetings | all | view | — | parcial | all | view |
| crm                    | all   | all     | own    | —       | —           | view   |
| whatsapp               | all   | all     | own    | —       | —           | view   |
| assistant              | all   | view    | —      | —       | —           | —      |
| admin                  | all   | —       | —      | —       | —           | —      |

("—" = sem permissão padrão; o admin pode conceder.)

## 11. Testes

`lib/permissions/permissions.test.ts` cobre:
- padrões por papel (admin pode tudo; broker só own; viewer só view);
- overrides que sobem e descem permissões;
- escopos `own`/`team`/`all`;
- `enforceScope` lançando `PermissionError` quando a ação não é permitida ou o
  registro está fora do escopo.

A regra de ouro é, portanto, **testada e garantida em código**, não apenas
documentada.
