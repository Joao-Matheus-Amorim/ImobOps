-- 012_whatsapp_templates.sql
-- Admin-editable WhatsApp message templates. Atendentes click these in the inbox
-- to insert a pre-written message (variables like {nome} resolved on send).
create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references tenancies(id) on delete cascade,
  title text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists idx_wa_templates_tenancy on whatsapp_templates(tenancy_id);

alter table whatsapp_templates enable row level security;
create policy tenancy_isolation on whatsapp_templates
  for all using (tenancy_id = auth_tenancy_id()) with check (tenancy_id = auth_tenancy_id());

-- Seed the 9 starter templates for every existing tenancy (idempotent: skip if
-- the tenancy already has any template). Variables use {chave} placeholders.
insert into whatsapp_templates (tenancy_id, title, body)
select t.id, x.title, x.body
from tenancies t
cross join (values
  ('Lembrete · 3 dias antes', 'Olá {nome}! Seu aluguel vence em 3 dias. Qualquer dúvida, estamos à disposição.'),
  ('Lembrete · vence hoje', 'Olá {nome}! Hoje é o vencimento do seu aluguel. Se já pagou, desconsidere esta mensagem.'),
  ('Cobrança · 1º aviso', 'Olá {nome}. Identificamos que seu aluguel está em aberto. Pode nos enviar o comprovante ou regularizar?'),
  ('Cobrança · 2º aviso', 'Olá {nome}. Reforçamos que seu aluguel segue em aberto. Entre em contato para evitarmos encargos.'),
  ('Envio de boleto', 'Olá {nome}! Estamos te enviando o boleto do aluguel. Qualquer dúvida, é só chamar.'),
  ('Condomínio · lembrete', 'Olá {nome}! A taxa condominial está próxima do vencimento. Qualquer dúvida, estamos à disposição.'),
  ('Condomínio · em atraso', 'Olá {nome}. A taxa condominial está em atraso. Por favor, regularize para manter as contas em dia.'),
  ('Boas-vindas ao lead', 'Olá {nome}! Obrigado pelo contato. Pode nos dizer o que você procura? Um corretor vai te atender.'),
  ('Confirmação de visita', 'Olá {nome}! Confirmando sua visita. Qualquer imprevisto, é só nos avisar. Até lá!')
) as x(title, body)
where not exists (select 1 from whatsapp_templates w where w.tenancy_id = t.id);
