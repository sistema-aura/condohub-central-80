CREATE TABLE public.checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa TEXT NOT NULL DEFAULT 'Leonor',
  texto TEXT NOT NULL,
  feito BOOLEAN NOT NULL DEFAULT false,
  dia DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Lisbon')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checks TO authenticated;
GRANT ALL ON public.checks TO service_role;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados gerem checks" ON public.checks FOR ALL TO authenticated USING (true) WITH CHECK (true);