ALTER TABLE public.declaracoes ADD COLUMN feita_em timestamptz;
UPDATE public.declaracoes SET feita_em = updated_at WHERE feita AND feita_em IS NULL;