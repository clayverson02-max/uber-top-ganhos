-- Allow registration to continue when the energy bill PDF is not available yet.
-- The PDF remains the preferred document; these nullable fields store the manual alternative.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS consumo_medio_kwh numeric(12,2),
  ADD COLUMN IF NOT EXISTS numero_instalacao text;
