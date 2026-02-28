-- Permite current_key_location nulo para imóveis sem chave
ALTER TABLE public.properties
  ALTER COLUMN current_key_location DROP NOT NULL;
