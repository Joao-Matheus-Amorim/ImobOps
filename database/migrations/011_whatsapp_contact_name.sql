-- 011_whatsapp_contact_name.sql
-- Store the sender's WhatsApp display name (pushName) on the conversation so the
-- inbox can show "Maísa Valentim" instead of a raw phone number / LID.
alter table whatsapp_conversations
  add column if not exists contact_name text;
