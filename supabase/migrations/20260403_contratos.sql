create table if not exists contratos (
  id bigint generated always as identity primary key,
  tipo text not null,
  titulo text not null,
  dados jsonb not null default '{}',
  texto_gerado text,
  property_id bigint references properties(id) on delete set null,
  criado_por text,
  status text not null default 'rascunho', -- rascunho | finalizado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contratos enable row level security;

create policy "allow all for authenticated" on contratos
  for all using (true) with check (true);

create index contratos_property_id_idx on contratos(property_id);
create index contratos_tipo_idx on contratos(tipo);
create index contratos_created_at_idx on contratos(created_at desc);
