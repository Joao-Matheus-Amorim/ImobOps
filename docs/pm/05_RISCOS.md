# 05 — Gestão de Riscos

Registro de riscos com probabilidade (P), impacto (I) e severidade (P×I, escala
1–5). Cada risco tem estratégia de resposta e responsável.

## 1. Matriz resumida

| ID | Risco | P | I | Sev. | Resposta |
|----|-------|:-:|:-:|:----:|----------|
| R-01 | Banimento do número no WhatsApp (Evolution) | 4 | 4 | 16 | Mitigar |
| R-02 | Vazamento de dados entre tenancies | 2 | 5 | 10 | Mitigar |
| R-03 | Uso indevido/erro da IA em escrita | 3 | 4 | 12 | Mitigar |
| R-04 | Esquecer `tenancy_id` em tabela nova | 2 | 5 | 10 | Mitigar |
| R-05 | Dependência de provider de IA (custo/disponibilidade) | 3 | 3 | 9 | Mitigar |
| R-06 | Inadimplência mal modelada | 2 | 4 | 8 | Mitigar |
| R-07 | Erros de fuso na geração de datas | 3 | 3 | 9 | Mitigar |
| R-08 | Escopo crescente (scope creep) | 3 | 3 | 9 | Mitigar |
| R-09 | Falha do auth hook (claims do JWT) | 2 | 4 | 8 | Mitigar |
| R-10 | Adoção baixa pela equipe | 2 | 4 | 8 | Mitigar |

## 2. Detalhamento

### R-01 — Banimento do WhatsApp
**Causa:** Evolution API automatiza o WhatsApp Web (canal não oficial); envio em
massa/spam pode banir o número.
**Resposta (mitigar):** opt-in real, volume controlado, número dedicado,
identificação da imobiliária, monitorar reputação. **Contingência:** migrar para a
Meta Cloud API trocando apenas o adapter (ver `WHATSAPP_INTEGRATION.md`).
**Responsável:** líder técnico.

### R-02 — Vazamento entre tenancies
**Causa:** query sem filtro de tenancy ou uso indevido de `service_role`.
**Resposta:** RLS em todas as tabelas + filtro centralizado no repository;
`service_role` proibido em rota de usuário; revisão de PRs. **Indicador:** testes de
isolamento. **Responsável:** líder técnico.

### R-03 — Uso indevido/erro da IA
**Causa:** alucinação do modelo ou ação destrutiva inesperada.
**Resposta:** dry-run + confirmação obrigatória em escrita, validação Zod,
allowlist por papel (MVP admin), auditoria de tudo. **Responsável:** PO + técnico.

### R-04 — Tabela sem `tenancy_id`
**Causa:** descuido ao criar entidade nova.
**Resposta:** checklist em `MULTI_TENANT_STRATEGY.md`; RLS sem policy bloqueia por
padrão (falha fecha). **Responsável:** revisor.

### R-05 — Dependência de provider de IA
**Causa:** custo, limite de taxa ou indisponibilidade do provedor.
**Resposta:** adapter agnóstico (OpenAI/Anthropic/mock); fallback para mock;
configuração por env. **Responsável:** líder técnico.

### R-06 — Inadimplência mal modelada
**Causa:** status de parcela inconsistente com a realidade.
**Resposta:** estados explícitos (`a_vencer/pago/atrasado/cancelado`), testes de
geração, dashboard e finanças refletindo em tempo real. **Responsável:** financeiro
+ técnico.

### R-07 — Erros de fuso horário
**Causa:** conversão UTC↔local ao gerar datas de vencimento.
**Resposta:** aritmética de mês baseada em inteiros (sem `Date` para o cálculo de
referência), testada. **Status:** mitigado (bug identificado e corrigido no
desenvolvimento). **Responsável:** técnico.

### R-08 — Scope creep
**Causa:** pedidos fora do escopo definido.
**Resposta:** declaração de escopo (`02_ESCOPO.md`) + processo de mudança;
itens "fora de escopo" só entram via aprovação. **Responsável:** PO.

### R-09 — Falha do auth hook
**Causa:** JWT sem `tenancy_id`/`role`.
**Resposta:** sem `tenancy_id`, a RLS nega tudo (falha fecha). Monitorar login;
testes de claims. **Responsável:** técnico.

### R-10 — Adoção baixa
**Causa:** UI complexa ou fora do fluxo da equipe.
**Resposta:** mobile-first, foco no dashboard por papel, assistente de IA para
tarefas repetitivas; treinamento. **Responsável:** PO.

## 3. Plano de monitoramento

- Reavaliar a matriz a cada corte do roadmap.
- Riscos com severidade ≥ 12 têm acompanhamento contínuo.
- Novos riscos são registrados com P, I e resposta antes de virar problema.

## 4. Riscos aceitos

- Cobrança operacional já existe com Asaas; o fallback manual continua como
  contingência, não como estado desejado.
- Uso da Evolution API é dívida técnica consciente, aceita com mitigações e plano de
  saída.
