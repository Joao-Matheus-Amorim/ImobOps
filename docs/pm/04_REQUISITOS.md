# 04 — Requisitos

Requisitos funcionais (RF) e não funcionais (RNF). Cada requisito tem prioridade
(Must / Should / Could) e referência de verificação.

## 1. Requisitos funcionais

### Núcleo
- **RF-01 (Must):** O sistema deve isolar dados por imobiliária (`tenancy_id`).
  *Verif.: RLS + filtro de repository; teste de isolamento.*
- **RF-02 (Must):** Usuários têm papéis e permissões resolvidas (padrão + override).
  *Verif.: `permissions.test.ts`.*
- **RF-03 (Must):** Clientes podem ser PF/PJ e ter múltiplos papéis de negócio.
  *Verif.: modelo + página de cliente.*
- **RF-04 (Must):** Imóveis têm tipo, status, disponibilidade e vínculo opcional a
  condomínio. *Verif.: modelo + página de imóvel.*
- **RF-05 (Should):** Documentos podem ser anexados a qualquer entidade.
  *Verif.: tabela `documents` + tipo.*

### Locação
- **RF-10 (Must):** Criar contrato de locação com partes, valor, vencimento, índice
  e taxa de administração. *Verif.: tool + repository + página.*
- **RF-11 (Must):** Gerar parcelas mensais a partir do contrato. *Verif.:
  `installment-logic.test.ts`.*
- **RF-12 (Must):** Marcar parcela como paga com comprovante. *Verif.: repository +
  tool.*
- **RF-13 (Must):** Calcular repasse ao proprietário descontando a taxa de
  administração. *Verif.: `computeRepasse` testado.*
- **RF-14 (Should):** Listar inadimplência (parcelas em atraso). *Verif.: dashboard
  + finanças.*

### Venda
- **RF-20 (Must):** Criar listagem de venda com preço e comissão. *Verif.: tool +
  página.*
- **RF-21 (Must):** Registrar propostas/contrapropostas com histórico. *Verif.:
  modelo `history` + página de venda.*
- **RF-22 (Should):** Fechar contrato de venda e registrar comissões. *Verif.:
  tools.*

### Condomínio
- **RF-30 (Must):** Cadastrar condomínio, unidades (com fração) e moradores.
  *Verif.: repository + página.*
- **RF-31 (Must):** Gerar taxas mensais por unidade. *Verif.: tool.*
- **RF-32 (Must):** Ratear despesas (igualitário/fração ideal). *Verif.:
  `apportionExpense`.*
- **RF-33 (Could):** Registrar atas de assembleia. *Verif.: modelo + página.*

### CRM
- **RF-40 (Must):** Funil de leads com etapas. *Verif.: página CRM.*
- **RF-41 (Must):** Criar lead automaticamente a partir do WhatsApp. *Verif.:
  triagem + webhook.*
- **RF-42 (Should):** Registrar atividades e agendar visitas. *Verif.: tools.*

### WhatsApp
- **RF-50 (Must):** Receber mensagens via webhook e persistir. *Verif.: rota
  webhook.*
- **RF-51 (Must):** Enviar mensagens e templates. *Verif.: rota send + adapter.*
- **RF-52 (Must):** Triagem de intenção e roteamento de lead. *Verif.:
  `triage-bot.test.ts`.*

### IA
- **RF-60 (Must):** A IA herda o RLS do usuário (sem `service_role`). *Verif.: rota
  de tools usa sessão.*
- **RF-61 (Must):** Escrita exige dry-run + confirmação. *Verif.: `confirm.ts` +
  smoke test.*
- **RF-62 (Must):** Toda execução de IA é auditada. *Verif.: `ai_actions`.*
- **RF-63 (Must):** Allowlist por papel (MVP admin-only). *Verif.:
  `guard.test.ts`.*

### Dashboard
- **RF-70 (Must):** Dashboard contextual por papel. *Verif.: `dashboard-views`.*

## 2. Requisitos não funcionais

- **RNF-01 (Must):** O app roda sem nenhuma variável de ambiente (modo mock).
  *Verif.: `npm run dev` sem `.env`.*
- **RNF-02 (Must):** Mobile-first, sem rolagem lateral, tema escuro por padrão.
  *Verif.: shell + CSS.*
- **RNF-03 (Must):** TypeScript estrito, sem `any` não justificado. *Verif.:
  `tsconfig` + `tsc --noEmit`.*
- **RNF-04 (Must):** Validação Zod em toda entrada de API e tool. *Verif.: schemas.*
- **RNF-05 (Must):** `build`, `lint`, `typecheck`, `test` limpos. *Verif.: CI/local.*
- **RNF-06 (Must):** Segurança: RLS + permissões + auditoria; sem `service_role` em
  rota de usuário. *Verif.: revisão + `002`/`004`.*
- **RNF-07 (Should):** Adapters plugáveis (WhatsApp, IA) trocáveis sem mexer no
  domínio. *Verif.: interfaces + providers.*
- **RNF-08 (Should):** Deploy na Vercel. *Verif.: `vercel.json`.*
- **RNF-09 (Could):** UI e docs em pt-BR; código em inglês curto. *Verif.: revisão.*

## 3. Regras de negócio chave

- **RN-01:** Dia de vencimento entre 1 e 28 (clamp aplicado).
- **RN-02:** Repasse líquido = bruto − (bruto × taxa%/100), arredondado a 2 casas.
- **RN-03:** Rateio igualitário = total ÷ nº de unidades; fração ideal = total ×
  (fração ÷ soma das frações).
- **RN-04:** Permissão sempre vence o papel.
- **RN-05:** `audit_log` e `ai_actions` são append-only.

## 4. Rastreabilidade (amostra)

| Requisito | Implementação | Teste |
|-----------|---------------|-------|
| RF-11 | `installment-logic.ts` | `installment-logic.test.ts` |
| RF-13 | `computeRepasse` | idem |
| RF-52 | `triage-bot.ts` | `triage-bot.test.ts` |
| RF-63 | `guard.ts` | `guard.test.ts` |
| RF-02 | `enforce.ts` | `permissions.test.ts` |

## 5. Critérios de aceite globais

Um requisito Must é considerado atendido quando: implementado, coberto por teste ou
verificação manual documentada, e sem regressão em `build`/`lint`/`typecheck`/`test`.
