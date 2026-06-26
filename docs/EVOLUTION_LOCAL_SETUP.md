# Evolution Local Setup

This is the local WhatsApp gateway used by ImobOps.

## 1. Prepare the Evolution env

From the repo root:

```powershell
Copy-Item infra/evolution/.env.example infra/evolution/.env
```

The key in `infra/evolution/.env` must match the key in the root `.env`:

```env
# infra/evolution/.env
AUTHENTICATION_API_KEY=evo_imobops_2026_123456

# .env
EVOLUTION_API_TOKEN=evo_imobops_2026_123456
```

## 2. Start Evolution

```powershell
npm run evolution:up
```

Evolution API:

```text
http://localhost:8080
```

Manager:

```text
http://localhost:8080/manager/login
```

Use this key:

```text
evo_imobops_2026_123456
```

## 3. Create/connect the instance

Create an instance named:

```text
imobops
```

Scan the QR code with the WhatsApp number.

## 4. Start ImobOps

```powershell
npm run dev
```

## 5. Start ngrok

```powershell
ngrok http 3000
```

Use the generated URL to configure the Evolution webhook:

```text
https://YOUR_NGROK_URL/api/whatsapp/webhook
```

Or configure it by command:

```powershell
npm run whatsapp:webhook:set -- https://YOUR_NGROK_URL
```

Header:

```text
x-webhook-token: imobops_evolution_webhook_2026
```

Event:

```text
MESSAGES_UPSERT
```

## 6. Test the webhook

With ImobOps running on `http://localhost:3000`:

```powershell
npm run whatsapp:webhook:test
```

## 7. Stop Evolution

```powershell
npm run evolution:down
```
