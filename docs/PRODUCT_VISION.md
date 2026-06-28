# Visão de Produto — ImobOps

## 1. O que é o ImobOps

O **ImobOps** é o sistema operacional interno de uma imobiliária. Ele unifica, em um
único produto mobile-first, as três frentes de negócio que normalmente vivem em
planilhas dispersas, grupos de WhatsApp e sistemas legados desconectados:

- **Locação** — contratos, parcelas mensais, cobrança e repasse ao proprietário.
- **Venda** — listagens, funil de propostas, contratos e comissões.
- **Condomínio** — condomínios administrados, unidades, taxas, despesas e assembleias.

Sobre essas frentes existe um **núcleo compartilhado**: tenancies, usuários,
clientes, imóveis, documentos, CRM, dashboard contextual, calendário operacional,
integração com WhatsApp, billing e um assistente de IA que opera com as mesmas
permissões do usuário logado.

## 1.1 Estado atual do produto

Hoje o repositório está em um estado **maduro, mock-first por padrão**:

- O app sobe sem credenciais e continua funcional em modo mock.
- Supabase, WhatsApp, billing e IA já têm **implementações reais completas** no
  código — só precisam de variáveis de ambiente para operar.
- O banco real usa `DATABASE_URL` + Prisma 7 + `prisma.config.ts`. São 16
  migrations SQL que cobrem schema, RLS, auth hooks, auditoria, billing, WhatsApp,
  documentos e calendário.
- O Supabase tem clientes browser, server, admin e middleware; login real com
  `supabase.auth.signInWithPassword` com fallback mock.
- O WhatsApp possui Evolution para local/VPS e Meta Cloud API para produção,
  ambos com webhook, envio de templates e bot de triagem de leads.
- O billing Asaas está completo: adapter, webhook idempotente, cron de lembretes,
  multa/juros pro-rata, UI de cobrança e AI tools.
- A IA tem adapters OpenAI, Anthropic e OpenRouter (com fallback automático entre
  17 modelos gratuitos), guard com allowlist, dry-run/confirm, auditoria
  append-only e cache Redis (Upstash) com degradação graciosa.
- O calendário operacional já existe para eventos manuais e agregação de itens
  operacionais (visitas, prazos, assembleias) na leitura.
- Testes E2E com Playwright (104+ testes, Chromium + WebKit) cobrem navegação,
  acessibilidade WCAG 2.1 AA, exportação de relatórios, validação de formulários,
  WhatsApp (página/API/webhook) e permissões por role (broker/finance/viewer).
- Exportação de relatórios em 4 formatos (CSV, JSON, HTML, XLS) via API dedicada,
  sem dependências externas.
- Streaming SSE real nos adapters OpenAI, Anthropic e OpenRouter com fallback
  chain; frontend consumindo tokens em tempo real.

O que ainda não existe:
- Testes E2E de criação de entidades (imóvel→locação→venda).
- Exportação XLSX nativa (atual é HTML com extensão `.xls`) e PDF.
- CI/CD com GitHub Actions.
- UI de overrides de permissão para admin.
- Promoção completa a SaaS multi-imobiliária com onboarding e billing por tenant.

O ImobOps não é um portal para o cliente final (inquilino, proprietário ou
comprador). É uma ferramenta **interna**, usada pela equipe da imobiliária:
administradores, gerentes, corretores, financeiro e síndicos/administradores de
condomínio.

## 2. O problema

A operação de uma imobiliária pequena ou média sofre de fragmentação:

1. **Locação** mora numa planilha de controle de aluguéis, com cobrança manual e
   repasse calculado "no olho".
2. **Vendas** vivem na cabeça do corretor e em conversas soltas de WhatsApp.
3. **Condomínio**, quando administrado, usa um sistema próprio que não conversa com
   o resto.
4. O **relacionamento** (leads, follow-ups, visitas) não tem funil; oportunidades
   se perdem.
5. A **cobrança** é feita à mão, boleto a boleto, sem lembrete automático.
6. Não há **trilha de auditoria**: quem mudou o quê, quando e por quê.

O resultado é retrabalho, inadimplência mal controlada, leads frios e zero
visibilidade gerencial.

## 3. A proposta de valor

O ImobOps entrega:

- **Uma carteira única** de imóveis e clientes, com papéis de negócio claros
  (locador, locatário, fiador, comprador, vendedor, lead, condômino).
- **Locação ponta a ponta**: contrato → geração de 12 parcelas → cobrança via
  WhatsApp/Asaas → baixa por webhook → repasse ao proprietário descontando a taxa
  de administração.
- **Vendas com funil real**: listagem → propostas e contrapropostas com histórico
  → fechamento → comissão do corretor e da imobiliária.
- **Condomínio integrado**: unidades, taxas mensais, despesas comuns rateadas (por
  fração ideal ou igualitário) e atas de assembleia.
- **CRM** com funil de leads que recebe automaticamente contatos do WhatsApp.
- **Calendário operacional** com eventos manuais, visitas, prazos e assembleias
  agregados na leitura.
- **WhatsApp** como canal de cobrança e de captação, com triagem automática de
  leads por intenção.
- **Assistente de IA** que executa tarefas ("crie o contrato", "marque a parcela de
  maio como paga", "envie lembrete de cobrança") sempre respeitando as permissões e
  com confirmação obrigatória em ações de escrita.
- **Dashboard contextual** que mostra para cada papel exatamente o que importa.

## 4. Decisão de produto crítica: personalizado → SaaS

O ImobOps nasce como **solução personalizada para uma única imobiliária**. Mas é
**arquitetado como multi-tenant desde o dia 1**, para virar SaaS sem reescrita.

Isso significa, concretamente:

- **Toda tabela tem `tenancy_id`.** Não existe entidade de negócio sem tenancy.
- **Toda policy RLS filtra por `tenancy_id`** extraído do JWT.
- **A troca de tenant fica escondida na UI** enquanto for cliente único. O switch
  existe na arquitetura, não na tela.
- Quando virar SaaS, **o uso continua interno por imobiliária** — não há portal
  externo para inquilino/proprietário. O SaaS é "muitas imobiliárias usando
  internamente", não "um marketplace para o consumidor final".

Essa decisão evita o erro clássico de construir um produto single-tenant e ter que
reescrever todo o data layer para suportar múltiplos clientes. O custo marginal de
carregar `tenancy_id` desde o início é baixíssimo; o custo de adicioná-lo depois é
proibitivo. Ver `MULTI_TENANT_STRATEGY.md`.

## 5. A regra de ouro das permissões

Toda a lógica de acesso obedece a três frases:

```
O papel (role) define a permissão inicial.
O admin define a permissão real.
A permissão sempre vence o papel.
```

Um corretor, por padrão, vê apenas seus próprios clientes (escopo `own`). Mas se o
admin conceder a ele escopo `all` em clientes, essa concessão prevalece. As
permissões padrão por papel são apenas o ponto de partida; o que vale é a
permissão resolvida (padrão + overrides). Ver `PERMISSION_STRATEGY.md`.

## 6. Os três módulos em detalhe

### 6.1 Locação

O coração financeiro recorrente da imobiliária. Cada contrato gera parcelas
mensais. A cobrança já possui fluxo operacional com emissão de boleto/PIX,
webhook de baixa e repasse. O caminho manual continua como fallback, mas o estado
atual do projeto já não é só "upload e marcação". No fim do mês, o sistema calcula
o **repasse** ao proprietário:

```
repasse_líquido = valor_bruto − (valor_bruto × taxa_de_administração%)
```

A inadimplência é visível no dashboard e no módulo financeiro, com sequência de
lembretes via templates de WhatsApp (3 dias antes, no vencimento, 1º aviso de
atraso, 2º aviso).

### 6.2 Venda

Listagens de imóveis à venda com preço pedido e percentual de comissão. O funil de
propostas guarda **cada rodada** de proposta e contraproposta (histórico em JSON),
para que a negociação seja auditável. Ao fechar, gera-se o contrato de venda e as
comissões (corretor + imobiliária), com status de pagamento.

### 6.3 Condomínio

Para imobiliárias que também administram condomínios. Cada condomínio tem unidades
(com fração ideal), moradores, taxas mensais e despesas comuns. As despesas são
**rateadas** de duas formas:

- **Igualitário**: total ÷ número de unidades.
- **Fração ideal**: total × (fração da unidade ÷ soma das frações).

Atas de assembleia ficam anexadas como documentos.

### 6.4 Calendário operacional

Eventos manuais, visitas, prazos e reuniões aparecem em um calendário de operação
com eventos persistidos em `calendar_events` e agregação de itens operacionais na
leitura. O foco é apoiar a rotina interna da equipe, não substituir um produto de
agenda genérico.

## 7. Princípios de design

1. **Mobile-first.** A equipe trabalha no celular, em visita, no corredor. Bottom
   navigation, cards grandes, sem rolagem lateral, tema escuro elegante por padrão.
2. **Mock-first.** O app roda sem nenhuma variável de ambiente, com dados mockados
   tipados. Isso permite desenvolver, demonstrar e testar sem infraestrutura.
3. **Segurança por padrão.** RLS no banco, permissões na aplicação, auditoria de
   tudo. A IA herda o RLS do usuário — nunca usa `service_role`.
4. **Sem reescrita.** Multi-tenant, adapters plugáveis (WhatsApp, LLM) e
   repositories com interface comum garantem evolução incremental.

## 8. O que está fora de escopo (por ora)

- Portal externo para inquilino/proprietário/comprador.
- Integração contábil/fiscal (NF-e, SPED).
- App nativo (o produto é um PWA mobile-first).
- Expansão completa a SaaS multi-imobiliária com onboarding, tenant switch e
  billing por tenant já operacionalizados de ponta a ponta.

## 9. Métricas de sucesso

- **Tempo de fechamento de cobrança** (do vencimento à baixa) reduzido.
- **Taxa de inadimplência** visível e em queda.
- **Leads convertidos** rastreáveis no funil.
- **Repasses no prazo** ao proprietário.
- **Adoção do assistente de IA** pela equipe administrativa.

## 10. Roadmap em uma frase

Entregar primeiro o **núcleo rodável em modo mock** (este repositório), depois
plugar Supabase/RLS, WhatsApp real (Evolution API) e IA com provider real, e por
fim promover a arquitetura a SaaS multi-imobiliária. Detalhes em `ROADMAP.md`.
