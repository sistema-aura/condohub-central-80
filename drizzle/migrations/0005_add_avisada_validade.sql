ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS avisada_validade boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.documentos.avisada_validade IS 'Aviso de validade (95-90 dias antes) já enviado pelo aviso diário';
GRANT UPDATE (avisada_validade) ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;