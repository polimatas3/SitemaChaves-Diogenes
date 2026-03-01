-- Adicionar campos de venda em properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC,
  ADD COLUMN IF NOT EXISTS selling_broker_id BIGINT REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;

-- Migrar roles existentes
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE public.users SET role = 'atendente' WHERE role = 'broker';
UPDATE public.users SET role = 'gerente'   WHERE role IN ('manager', 'admin');
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('atendente', 'gerente'));

-- Atualizar trigger de novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (auth_id, name, role, email, phone)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'atendente'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;
