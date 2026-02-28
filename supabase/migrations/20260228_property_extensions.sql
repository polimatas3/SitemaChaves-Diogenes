-- Informações do captador
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS captador_name  TEXT,
  ADD COLUMN IF NOT EXISTS captador_email TEXT,
  ADD COLUMN IF NOT EXISTS captador_phone TEXT;

-- Tipo de ocupação (chave disponível ou imóvel ocupado)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS has_key        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS occupation_type TEXT; -- 'Inquilino' | 'Proprietário'
