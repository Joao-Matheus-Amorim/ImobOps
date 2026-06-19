# 06 — Roadmap de Entrega

Visão de gestão do roadmap técnico (`../ROADMAP.md`), com fases, marcos, critérios
de saída e dependências. Sem estimativas infladas de horas — o foco é a sequência
lógica e os critérios de pronto.

## 1. Fases de entrega

### Fase A — Núcleo rodável (mock) — Marco M1
Cortes 1–3 do roadmap técnico.
- Configuração, domínio, dados, permissões, shell, dashboard, páginas.
- **Saída:** `npm run dev` sobe sem env; `build/lint/typecheck/test` limpos.

### Fase B — Inteligência e canal — Marco M2
Cortes 4–5.
- Assistente de IA (mock + tools, quatro regras) e WhatsApp (Evolution + triagem).
- **Saída:** dry-run/confirm funcionando; webhook triá e cria lead; testes verdes.

### Fase C — Persistência real — Marco M3
Corte 6.
- Supabase + RLS + auth hook; repositories sob RLS; login real.
- **Saída:** isolamento de tenancy verificável; sem `service_role` em rota de
  usuário.

### Fase D — Operação financeira + IA real — Marco M4
Cortes 7–8.
- Cobrança/repasse com Storage e lembretes; IA com provider real e papéis
  ampliados; overrides na UI de admin.
- **Saída:** ciclo de cobrança demonstrável; IA real com auditoria.

### Fase E — SaaS — Marco M5
Corte 9.
- Onboarding de tenancy, planos, billing, seletor de tenant, observabilidade.
- **Saída:** nova imobiliária isolada desde o primeiro acesso; sem mudança no schema
  de negócio.

## 2. Marcos e critérios de saída

| Marco | Critério de saída |
|-------|-------------------|
| M1 | App mock estável; suíte de testes verde; sem dependência de infra |
| M2 | IA e WhatsApp operando em mock; triagem e dry-run testados |
| M3 | RLS em produção; isolamento de tenancy comprovado |
| M4 | Cobrança/repasse + IA real em uso; auditoria completa |
| M5 | Multi-imobiliária com isolamento garantido; uso interno |

## 3. Dependências entre fases

```
A ─▶ B ─▶ C ─▶ D ─▶ E
     │         ▲
     └─────────┘  (IA real em D depende da IA mock de B e da RLS de C)
```

- B independe de infra (mock).
- C é o gargalo que destrava D e E.
- D consome cobrança (C) + IA (B).

## 4. Estratégia de releases

- **Incremental:** cada fase deixa o produto utilizável; nada de big bang.
- **Feature flags por env:** Supabase, IA e WhatsApp ligam por configuração; ausência
  cai para mock.
- **Coexistência:** na migração de WhatsApp (Evolution → Meta) e de dados (mock →
  Supabase), rodar em paralelo quando possível.

## 5. Definição de pronto (DoD) por fase

Uma fase está pronta quando:
1. Todos os critérios de saída do marco foram atendidos.
2. `build`, `lint`, `typecheck` e `test` passam limpos.
3. A documentação correspondente está atualizada.
4. Os riscos relevantes da fase foram reavaliados (`05_RISCOS.md`).

## 6. Governança de entrega

- Revisão de cada corte com o patrocinador antes de avançar.
- Mudanças de escopo seguem o processo de `02_ESCOPO.md`.
- Métricas de sucesso (`../PRODUCT_VISION.md` §9) acompanhadas a partir de M3.

## 7. Estado atual

- **Fases A e B: concluídas** neste repositório (modo mock), com testes verdes e
  build limpo.
- **Fases C–E: planejadas**, destravadas pela aplicação das migrations e
  configuração de infraestrutura.

## 8. Próximos passos imediatos

1. Provisionar projeto Supabase e aplicar `001`–`004`.
2. Configurar auth hook (claims `tenancy_id`/`role`).
3. Ligar `AI_PROVIDER` e credenciais da Evolution.
4. Validar isolamento de tenancy com dois usuários de tenancies distintas.
