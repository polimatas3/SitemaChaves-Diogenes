-- Nome e número do cliente na retirada da chave (histórico)
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS client_name  TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;
