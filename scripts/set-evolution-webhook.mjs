import { normalizePublicUrl, readRootEnv, requireEnv } from "./env-utils.mjs";

const env = readRootEnv();
if (!env.exists) {
  console.error("Missing .env file.");
  process.exit(1);
}

const publicUrl = process.argv[2] ?? env.values.NEXT_PUBLIC_APP_URL;
if (!publicUrl) {
  console.error("Usage: npm run whatsapp:webhook:set -- https://YOUR_NGROK_URL");
  console.error("Or set NEXT_PUBLIC_APP_URL in .env.");
  process.exit(1);
}

try {
  requireEnv(env, [
    "EVOLUTION_API_URL",
    "EVOLUTION_API_TOKEN",
    "EVOLUTION_INSTANCE",
    "EVOLUTION_WEBHOOK_TOKEN",
  ]);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const appUrl = normalizePublicUrl(publicUrl);
const webhookUrl = `${appUrl}/api/whatsapp/webhook`;
const baseUrl = normalizePublicUrl(env.values.EVOLUTION_API_URL);
const instance = env.values.EVOLUTION_INSTANCE;

const body = {
  webhook: {
    enabled: true,
    url: webhookUrl,
    headers: {
      "x-webhook-token": env.values.EVOLUTION_WEBHOOK_TOKEN,
    },
    webhook_by_events: false,
    webhookBase64: false,
    events: ["MESSAGES_UPSERT"],
  },
};

const res = await fetch(`${baseUrl}/webhook/set/${instance}`, {
  method: "POST",
  headers: {
    apikey: env.values.EVOLUTION_API_TOKEN,
    "content-type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Evolution webhook setup failed: ${res.status}`);
  console.error(text);
  process.exit(1);
}

console.log("Evolution webhook configured.");
console.log(`Instance: ${instance}`);
console.log(`URL: ${webhookUrl}`);
