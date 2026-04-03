-- ================================================================
-- TESTE N8N — imóvel com devolução em atraso
-- Execute no SQL Editor do Supabase para subir os dados de teste.
-- ================================================================

WITH nova_propriedade AS (
  INSERT INTO public.properties (
    di, address, description, status, has_key, current_key_location
  )
  VALUES (
    'TESTE-001',
    'SHIS QL 10, Casa 01 – TESTE N8N',
    'Imóvel fictício para validação do fluxo de cobrança de devolução.',
    'Retirada',
    true,
    'Lago Norte'
  )
  RETURNING id
),
corretor AS (
  -- Pega o primeiro atendente com telefone cadastrado
  SELECT id FROM public.users
  WHERE role = 'atendente'
    AND phone IS NOT NULL
  LIMIT 1
)
INSERT INTO public.movements (
  property_id,
  type,
  broker_id,
  unit,
  withdrawal_datetime,
  return_forecast,
  observations
)
SELECT
  nova_propriedade.id,
  'Retirada',
  corretor.id,
  'Lago Norte',
  '2026-02-27T12:00:00Z',   -- retirada: há 2 dias
  '2026-02-28T12:00:00Z',   -- previsão: ontem (vencida)
  'TESTE — remover após validação do n8n'
FROM nova_propriedade, corretor;


-- ================================================================
-- LIMPEZA — execute após concluir o teste
-- (os movements são removidos em cascata via ON DELETE CASCADE)
-- ================================================================
-- DELETE FROM public.properties WHERE di = 'TESTE-001';
