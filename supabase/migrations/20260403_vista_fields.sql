alter table properties
  add column if not exists tipo_imovel     text,
  add column if not exists finalidade      text,
  add column if not exists valor_locacao   numeric,
  add column if not exists area_util       numeric,
  add column if not exists dormitorios     integer,
  add column if not exists vagas           integer,
  add column if not exists bairro          text,
  add column if not exists foto_url        text,
  add column if not exists vista_synced_at timestamptz;
