import { normalizePublicUrl, readRootEnv, requireEnv } from "./env-utils.mjs";

const env = readRootEnv();
if (!env.exists) {
  console.error("Missing .env file.");
  process.exit(1);
}

try {
  requireEnv(env, ["EVOLUTION_WEBHOOK_TOKEN"]);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const appUrl = normalizePublicUrl(process.argv[2] ?? "http://localhost:3000");
const message = process.argv[3] ?? "Oi, quero alugar um apartamento";

const payload = {
  data: {
    key: {
      id: `local-test-${Date.now()}`,
      remoteJid: "5511999990011@s.whatsapp.net",
    },
    message: {
      conversation: message,
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
  },
};

const res = await fetch(`${appUrl}/api/whatsapp/webhook`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-webhook-token": env.values.EVOLUTION_WEBHOOK_TOKEN,
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Webhook test failed: ${res.status}`);
  console.error(text);
  process.exit(1);
}

console.log("Webhook test OK.");
console.log(text);
