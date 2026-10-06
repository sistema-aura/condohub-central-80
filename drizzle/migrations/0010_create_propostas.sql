CREATE TABLE public.propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text, morada text, numero text,
  dados jsonb NOT NULL,
  total_com_iva numeric,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.propostas TO authenticated;
GRANT ALL ON public.propostas TO service_role;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all propostas" ON public.propostas FOR ALL TO authenticated USING (true) WITH CHECK (true);