CREATE TABLE public.despesas_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id uuid NOT NULL REFERENCES public.edificios(id) ON DELETE CASCADE,
  assembleia_id uuid REFERENCES public.assembleias(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Lisbon'))::date,
  descricao text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  pago_em date,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_admin TO authenticated;
GRANT ALL ON public.despesas_admin TO service_role;
ALTER TABLE public.despesas_admin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all despesas_admin" ON public.despesas_admin FOR ALL TO authenticated USING (true) WITH CHECK (true);