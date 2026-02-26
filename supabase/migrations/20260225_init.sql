-- Tabela de usuários
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('broker', 'manager', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de imóveis
CREATE TABLE IF NOT EXISTS public.properties (
  id BIGSERIAL PRIMARY KEY,
  di TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  description TEXT DEFAULT '',
  link TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  current_key_location TEXT NOT NULL DEFAULT 'Matriz',
  responsible_broker_id BIGINT REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de movimentações
CREATE TABLE IF NOT EXISTS public.movements (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  broker_id BIGINT REFERENCES public.users(id),
  unit TEXT,
  observations TEXT,
  proposal TEXT,
  feedback TEXT,
  return_forecast TEXT
);

-- Desabilitar RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements DISABLE ROW LEVEL SECURITY;

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movements;

-- Seed
INSERT INTO public.users (name, role) VALUES
  ('Admin Diógenes', 'admin'),
  ('Gerente Lago', 'manager'),
  ('Corretor Silva', 'broker')
ON CONFLICT DO NOTHING;

INSERT INTO public.properties (di, address, description, link, status, current_key_location) VALUES
  ('DI001', 'SHIN QL 10, Lago Norte', 'Casa de alto padrão', 'https://diogenesimoveis.com/imovel/DI001', 'Ativo', 'Lago Norte'),
  ('DI002', 'SCS Quadra 4, Edifício Vera Cruz', 'Sala comercial reformada', 'https://diogenesimoveis.com/imovel/DI002', 'Ativo', 'SCS')
ON CONFLICT (di) DO NOTHING;
