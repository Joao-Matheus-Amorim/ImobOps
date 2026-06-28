-- ImobOps — 015 document metadata for real uploads.
-- Complements the existing documents table with professional document tracking.

alter type document_kind_t add value if not exists 'cnpj';
alter type document_kind_t add value if not exists 'comprovante_endereco';
alter type document_kind_t add value if not exists 'matricula';
alter type document_kind_t add value if not exists 'iptu';
alter type document_kind_t add value if not exists 'escritura';
alter type document_kind_t add value if not exists 'vistoria';
alter type document_kind_t add value if not exists 'proposta';
alter type document_kind_t add value if not exists 'certidao';
alter type document_kind_t add value if not exists 'recibo';
alter type document_kind_t add value if not exists 'nota_fiscal';

do $$ begin
  create type document_status_t as enum ('pendente','validado','rejeitado','vencido');
exception
  when duplicate_object then null;
end $$;

alter table documents
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists file_name text,
  add column if not exists status document_status_t not null default 'pendente',
  add column if not exists expires_at date,
  add column if not exists validated_by uuid references users(id),
  add column if not exists validated_at timestamptz,
  add column if not exists rejected_reason text;

update documents
set title = coalesce(title, kind::text),
    file_name = coalesce(file_name, (string_to_array(storage_path, '/'))[array_length(string_to_array(storage_path, '/'), 1)])
where title is null or file_name is null;

alter table documents
  alter column title set not null,
  alter column file_name set not null;

create index if not exists idx_documents_status on documents(status);
create index if not exists idx_documents_expires_at on documents(expires_at);
