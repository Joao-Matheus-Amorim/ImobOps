# Local Runtime Runbook

Use this sequence when preparing the local client preview.

## 1. Check configuration

```powershell
npm.cmd run config:check
```

Expected:

```text
OK Supabase
OK OpenRouter
OK Asaas
OK Evolution
OK Evolution API key match
```

Upstash can remain as a warning in local development.

## 2. Start Evolution

```powershell
npm.cmd run evolution:up
```

Manager:

```text
http://localhost:8080/manager/login
```

Instance:

```text
imobops
```

## 3. Start ImobOps

```powershell
npm.cmd run dev
```

App:

```text
http://localhost:3000
```

## 4. Start ngrok

```powershell
ngrok http 3000
```

Copy the HTTPS URL.

## 5. Configure Evolution webhook

```powershell
npm.cmd run whatsapp:webhook:set -- https://YOUR_NGROK_URL
```

## 6. Test without WhatsApp

```powershell
npm.cmd run whatsapp:webhook:test
```

Expected response:

```json
{"ok":true}
```

## 7. Test with WhatsApp

Send a real message to the connected number.

Expected:

```text
ngrok: POST /api/whatsapp/webhook 200
ImobOps: conversation appears in WhatsApp module after the background worker
persists the payload and publishes the update event
```
