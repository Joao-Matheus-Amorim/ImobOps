-- Idempotency and lookup indexes for WhatsApp traffic.

create unique index if not exists uq_whatsapp_conversations_tenancy_phone
  on whatsapp_conversations (tenancy_id, phone);

create unique index if not exists uq_whatsapp_messages_tenancy_external
  on whatsapp_messages (tenancy_id, external_id);

create index if not exists idx_whatsapp_messages_external_id
  on whatsapp_messages (external_id);