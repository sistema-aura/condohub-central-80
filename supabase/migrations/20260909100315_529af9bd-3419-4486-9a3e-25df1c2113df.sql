ALTER TABLE public.edificios
  ADD COLUMN IF NOT EXISTS banco_codigo_acesso text,
  ADD COLUMN IF NOT EXISTS banco_pin text;