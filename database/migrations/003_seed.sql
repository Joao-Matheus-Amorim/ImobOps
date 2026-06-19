-- ImobOps — 003 seed
-- One demo tenancy, 3 users, 5 clients, 3 properties, 1 rental contract with 12
-- installments, 1 sale listing, 1 condo with 4 units. Ids are fixed for reuse.

-- Tenancy ----------------------------------------------------------------------
insert into tenancies (id, name, slug, plan) values
  ('00000000-0000-0000-0000-0000000000t1', 'Imobiliária Demonstração', 'imobiliaria-demonstracao', 'single');

-- Users ------------------------------------------------------------------------
insert into users (id, tenancy_id, role, display_name, email, phone, active) values
  ('00000000-0000-0000-0000-0000000000u1','00000000-0000-0000-0000-0000000000t1','admin','Ana Admin','admin@imobops.demo','+5511999990001',true),
  ('00000000-0000-0000-0000-0000000000u2','00000000-0000-0000-0000-0000000000t1','broker','Bruno Corretor','corretor@imobops.demo','+5511999990002',true),
  ('00000000-0000-0000-0000-0000000000u3','00000000-0000-0000-0000-0000000000t1','finance','Fabi Financeiro','financeiro@imobops.demo','+5511999990003',true);

-- Clients ----------------------------------------------------------------------
insert into clients (id, tenancy_id, kind, name, document, email, phone, whatsapp, address, tags, roles_in_business, owner_user_id) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000t1','pf','Carlos Locador Silva','123.456.789-00','carlos.locador@email.com','+5511988880001','+5511988880001','Rua das Flores, 100 — São Paulo/SP','{proprietário,vip}','{locador,vendedor}','00000000-0000-0000-0000-0000000000u1'),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000t1','pf','Daniela Locatária Souza','234.567.890-11','daniela.souza@email.com','+5511988880002','+5511988880002','Av. Paulista, 2000 — São Paulo/SP','{inquilino}','{locatario}','00000000-0000-0000-0000-0000000000u2'),
  ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000t1','pf','Eduardo Fiador Lima','345.678.901-22','eduardo.lima@email.com','+5511988880003',null,'Rua Augusta, 500 — São Paulo/SP','{fiador}','{fiador}','00000000-0000-0000-0000-0000000000u2'),
  ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000t1','pj','Imobiliária Compradora Ltda','12.345.678/0001-99','contato@compradora.com.br','+5511988880004','+5511988880004','Av. Faria Lima, 3000 — São Paulo/SP','{comprador,investidor}','{comprador,lead}','00000000-0000-0000-0000-0000000000u2'),
  ('00000000-0000-0000-0000-0000000000c5','00000000-0000-0000-0000-0000000000t1','pf','Fernanda Condômina Rocha','456.789.012-33','fernanda.rocha@email.com','+5511988880005','+5511988880005','Bloco A — 302, Cond. Jardim das Acácias','{condômino}','{proprietario_condomino}','00000000-0000-0000-0000-0000000000u1');

-- Condo (created before properties that reference it) --------------------------
insert into condos (id, tenancy_id, name, address, unit_count, manager_user_id, admin_fee_pct) values
  ('00000000-0000-0000-0000-00000000cd01','00000000-0000-0000-0000-0000000000t1','Cond. Jardim das Acácias','Rua das Acácias, 1500 — São Paulo/SP',4,'00000000-0000-0000-0000-0000000000u1',6);

-- Properties -------------------------------------------------------------------
insert into properties (id, tenancy_id, kind, address, area_m2, bedrooms, bathrooms, parking_spots, owner_client_id, status, availability, condo_id, description, owner_user_id) values
  ('00000000-0000-0000-0000-0000000000p1','00000000-0000-0000-0000-0000000000t1','apartamento','Rua das Flores, 100, ap 51 — São Paulo/SP',78,2,2,1,'00000000-0000-0000-0000-0000000000c1','alugado','locacao',null,'Apartamento de 2 dormitórios, próximo ao metrô.','00000000-0000-0000-0000-0000000000u1'),
  ('00000000-0000-0000-0000-0000000000p2','00000000-0000-0000-0000-0000000000t1','casa','Rua dos Ipês, 250 — São Paulo/SP',180,3,3,2,'00000000-0000-0000-0000-0000000000c1','disponivel','venda',null,'Casa térrea com quintal amplo.','00000000-0000-0000-0000-0000000000u2'),
  ('00000000-0000-0000-0000-0000000000p3','00000000-0000-0000-0000-0000000000t1','apartamento','Bloco A — 302, Cond. Jardim das Acácias',64,2,1,1,'00000000-0000-0000-0000-0000000000c5','disponivel','condominio_only','00000000-0000-0000-0000-00000000cd01','Unidade de condomínio administrado.','00000000-0000-0000-0000-0000000000u1');

-- Units ------------------------------------------------------------------------
insert into units (id, tenancy_id, condo_id, label, owner_client_id, current_resident_client_id, area_m2, fraction_pct) values
  ('00000000-0000-0000-0000-0000000000n1','00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-00000000cd01','Bloco A — 302','00000000-0000-0000-0000-0000000000c5','00000000-0000-0000-0000-0000000000c5',64,25),
  ('00000000-0000-0000-0000-0000000000n2','00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-00000000cd01','Bloco A — 303','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2',64,25),
  ('00000000-0000-0000-0000-0000000000n3','00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-00000000cd01','Bloco B — 101','00000000-0000-0000-0000-0000000000c4',null,72,28),
  ('00000000-0000-0000-0000-0000000000n4','00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-00000000cd01','Bloco B — 102','00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000c3',56,22);

-- Rental contract --------------------------------------------------------------
insert into rental_contracts (id, tenancy_id, property_id, landlord_client_id, tenant_client_id, guarantor_client_id, monthly_value, due_day, start_date, end_date, duration_months, index_type, admin_fee_pct, status) values
  ('00000000-0000-0000-0000-0000000000r1','00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-0000000000p1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c3',2800,10,'2026-01-01','2026-12-31',12,'igpm',8,'ativo');

-- 12 installments (Jan..Dec 2026). Jan..Apr paid, May overdue, rest a_vencer.
insert into installments (tenancy_id, contract_id, reference_month, due_date, amount, status, paid_at, paid_amount)
select
  '00000000-0000-0000-0000-0000000000t1',
  '00000000-0000-0000-0000-0000000000r1',
  to_char(d, 'YYYY-MM'),
  (date_trunc('month', d) + interval '9 day')::date,
  2800,
  case
    when extract(month from d) <= 4 then 'pago'::installment_status_t
    when extract(month from d) = 5 then 'atrasado'::installment_status_t
    else 'a_vencer'::installment_status_t
  end,
  case when extract(month from d) <= 4 then (date_trunc('month', d) + interval '8 day') else null end,
  case when extract(month from d) <= 4 then 2800 else null end
from generate_series('2026-01-01'::date, '2026-12-01'::date, interval '1 month') as d;

-- Sale listing -----------------------------------------------------------------
insert into sale_listings (id, tenancy_id, property_id, asking_price, status, commission_pct) values
  ('00000000-0000-0000-0000-00000000sl01','00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-0000000000p2',850000,'sob_proposta',5);

-- A proposal on the listing -----------------------------------------------------
insert into proposals (tenancy_id, listing_id, buyer_client_id, broker_user_id, offered_price, conditions, status, history) values
  ('00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-00000000sl01','00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000u2',800000,'Entrada de 30%, financiamento do saldo.','contraproposta',
   '[{"at":"2026-05-20T12:00:00Z","by":"buyer","price":780000,"note":"Proposta inicial"},{"at":"2026-05-22T12:00:00Z","by":"seller","price":830000,"note":"Contraproposta"}]'::jsonb);

-- Condo fees for the demo month -------------------------------------------------
insert into condo_fees (tenancy_id, unit_id, reference_month, due_date, amount, status, paid_at)
select '00000000-0000-0000-0000-0000000000t1', id, '2026-06', '2026-06-10', 650,
  case when label = 'Bloco A — 302' then 'atrasado'::condo_fee_status_t else 'pago'::condo_fee_status_t end,
  case when label = 'Bloco A — 302' then null else '2026-06-08T10:00:00Z'::timestamptz end
from units where tenancy_id = '00000000-0000-0000-0000-0000000000t1';

-- A CRM lead and a WhatsApp conversation ---------------------------------------
insert into crm_leads (tenancy_id, client_id, source, interest, assigned_to_user_id, funnel_stage) values
  ('00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-0000000000c4','whatsapp','venda','00000000-0000-0000-0000-0000000000u2','proposta');

insert into whatsapp_conversations (id, tenancy_id, client_id, phone, assigned_to_user_id, status, triage_classification) values
  ('00000000-0000-0000-0000-00000000wc01','00000000-0000-0000-0000-0000000000t1','00000000-0000-0000-0000-0000000000c4','+5511988880004','00000000-0000-0000-0000-0000000000u2','em_atendimento','venda');
