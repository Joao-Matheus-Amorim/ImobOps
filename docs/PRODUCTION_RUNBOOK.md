# ImobOps — Roteiro de Produção

Como sair do ambiente local (Docker + ngrok + celular) para produção real.
Stack: **Next.js (Vercel)** + **Supabase (gerenciado, São Paulo)** + **WhatsApp**.

---

## Visão geral da arquitetura

```
Navegador ──► Vercel (app Next)  ──►  Supabase (Postgres + Auth + RLS, sa-east-1)
                     ▲
                     │ webhook (HTTPS)
                     │
            WhatsApp: Evolution (VPS)  OU  Meta Cloud API (oficial)
```

- **App Next** → Vercel (grátis para começar).
- **Banco/Auth** → Supabase já está na nuvem (projeto `ImobOps-BR`, região SP). Nada a mudar.
- **WhatsApp** → a única peça que exige decisão. Ver as duas opções abaixo.
- **Billing** → Asaas já está integrado no repositório; em produção só precisa de
   chaves e webhook.

---

## 1. App na Vercel

1. Conta na Vercel ligada ao repositório GitHub (`Joao-Matheus-Amorim/ImobOps`).
2. **Import Project** → selecione o repo. Framework: Next.js (detectado).
3. **Environment Variables** (Project Settings → Environment Variables) — copie do `.env`, exceto segredos locais:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret)
   - `SUPABASE_DEFAULT_TENANCY_ID`
   - `NEXT_PUBLIC_APP_URL` → a URL pública da Vercel (ex.: `https://imobops.vercel.app`)
   - `AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
   - `NEXT_PUBLIC_CLIENT_PREVIEW=off`
   - `WHATSAPP_AI_AUTOREPLY` → deixe vazio (humano responde no inbox)
   - **WhatsApp**: as variáveis dependem da opção escolhida (seção 2/3).
   - Rate-limit (recomendado em produção): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
4. **Deploy.** A cada push na `main`, a Vercel publica automaticamente.

### Pendência conhecida (multi-instância)
O bus de eventos do inbox (`lib/whatsapp/events.ts`) e o rate-limit em memória são
**single-process**. Na Vercel (serverless, várias instâncias), o SSE entre instâncias
não propaga. Para produção robusta: trocar o bus por **Supabase Realtime** ou
Redis/Upstash. O fallback de polling de 3s do inbox mantém a tela atualizando mesmo
sem SSE — funcional, só menos "instantâneo". Tratar como melhoria, não bloqueador.

---

## 2. Opção A — WhatsApp via Meta Cloud API (RECOMENDADO p/ produção)

Oficial da Meta. **Sem celular, sem QR, sem risco de ban, estável.** Já implementado
no código (`lib/whatsapp/meta.ts`); basta configurar e apontar `WHATSAPP_PROVIDER=meta`.

### Custo (referência — confirmar no site da Meta, muda)
- A API é **grátis**; paga-se por mensagem de template.
- **Conversa de serviço** (cliente inicia, você responde em 24h): **grátis** (1.000/mês inclusas).
- **Utilidade** (lembrete de boleto/aluguel): ~R$ 0,04–0,08 por msg.
- **Marketing**: ~R$ 0,10–0,25 por msg.
- Exemplo: 200 lembretes/mês ≈ **R$ 10–16/mês**. O atendimento (cliente inicia) é grátis.

### Setup
1. **Meta Business** (business.facebook.com) — crie/verifique a empresa (documentos; pode levar dias).
2. **Meta for Developers** → crie um app → adicione o produto **WhatsApp**.
3. Pegue:
   - **Phone Number ID** (não é o número, é um ID) → `WHATSAPP_META_PHONE_ID`
   - **Permanent token** (System User token, não o temporário de 24h) → `WHATSAPP_META_TOKEN`
   - Defina um **verify token** seu (qualquer string secreta) → `WHATSAPP_META_VERIFY_TOKEN`
4. **Número**: use um número **dedicado** (não pode estar logado num app WhatsApp comum).
5. **Webhook** (no painel do app Meta → WhatsApp → Configuration):
   - Callback URL: `https://SEU-APP.vercel.app/api/whatsapp/webhook`
   - Verify token: o mesmo `WHATSAPP_META_VERIFY_TOKEN`
   - Assine o campo **messages**.
   - A Meta faz um **GET** para verificar (o app responde o `hub.challenge` automaticamente).
6. **Templates**: mensagens iniciadas por você fora da janela de 24h exigem **templates
   aprovados** pela Meta. Os templates locais (`lib/whatsapp/templates.ts` / "Modelos de
   mensagem" do admin) servem dentro da janela de 24h; para envio proativo, cadastre os
   equivalentes no Meta e mapeie `TemplateKey → nome do template`.
7. Vars na Vercel:
   ```
   WHATSAPP_PROVIDER=meta
   WHATSAPP_META_TOKEN=...
   WHATSAPP_META_PHONE_ID=...
   WHATSAPP_META_VERIFY_TOKEN=...
   ```
8. **Limitações herdadas**: a Cloud API não expõe histórico → "Importar conversas" e
   QR/Conectar/Desconectar ficam inativos (o `MetaAdapter` reporta sempre "Conectado").

---

## 3. Opção B — Evolution numa VPS (não-oficial)

Mais barato e sem aprovação, mas **frágil**: depende do **celular do cliente sempre
ligado/online**, e o WhatsApp **pode banir** o número (é não-oficial). Bom para
MVP/demo ou poucos clientes; não ideal para escala.

### Setup
1. **VPS** (ex.: Hetzner, DigitalOcean, Contabo) — Docker instalado, ~R$ 20–40/mês.
2. Suba a Evolution (use `infra/evolution/docker-compose.yml` como base; troque as senhas
   padrão e a `AUTHENTICATION_API_KEY`).
3. **Domínio + HTTPS** apontando para a VPS (Caddy/Nginx + Let's Encrypt). A Evolution
   precisa de URL pública estável — **nada de ngrok em produção**.
4. Configure o webhook da instância para `https://SEU-DOMINIO/api/whatsapp/webhook` com
   eventos **`MESSAGES_UPSERT` e `SEND_MESSAGE`** (script `scripts/set-evolution-webhook.mjs`).
5. Vars na Vercel:
   ```
   # (WHATSAPP_PROVIDER vazio → Evolution é o padrão)
   EVOLUTION_API_URL=https://SEU-DOMINIO   (a API da Evolution na VPS)
   EVOLUTION_API_TOKEN=<AUTHENTICATION_API_KEY da VPS>
   EVOLUTION_INSTANCE=imobops
   EVOLUTION_WEBHOOK_TOKEN=<seu token>
   ```
6. **Operação** (ver [WHATSAPP setup](../whatsapp) / memória): conectar via QR, e ao
   reconectar a Evolution re-sincroniza o histórico (fica minutos "surda"). Se o socket
   travar (`state:open` mas só `Update messages`, sem `messages.upsert`):
   `docker restart` no container. Em produção, monitore isso (uptime/alertas).

---

## 4. Checklist final antes de apresentar ao cliente

- [ ] App publicado na Vercel, abrindo no domínio.
- [ ] `NEXT_PUBLIC_APP_URL` e o redirect de convite de usuário apontando para o domínio real.
- [ ] Supabase: confirmar que o **access-token hook** está ativo (Auth → Hooks) — sem ele o RLS bloqueia tudo.
- [ ] SMTP próprio no Supabase (Auth → Email) se for usar convite de usuários em volume (o SMTP default tem limite baixo).
- [ ] WhatsApp: webhook verificado e recebendo (mande uma msg de teste, confira no inbox).
- [ ] `WHATSAPP_AI_AUTOREPLY` desligado (a menos que queira o bot respondendo sozinho).
- [ ] Asaas: se for cobrar de verdade, configurar `ASAAS_API_KEY` (produção) — sem ela, billing roda em mock.

---

## Resumo da recomendação

| | Evolution (VPS) | Meta Cloud API |
|---|---|---|
| Custo | VPS ~R$ 20–40/mês | Atendimento grátis; envios ~centavos |
| Celular ligado | Obrigatório (frágil) | Não precisa |
| Risco de ban | Sim | Não |
| Estabilidade | Baixa | Alta |
| Setup | Pronto | Aprovação Meta + número |

**Para cliente pagante de verdade: Meta Cloud API.** A Evolution serve para validar/demo agora.
