CREATE TABLE public.assembleias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id uuid NOT NULL REFERENCES public.edificios(id) ON DELETE CASCADE,
  data_hora timestamptz NOT NULL,
  local text,
  observacoes text,
  convocatoria_enviada boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assembleias TO authenticated;
GRANT ALL ON public.assembleias TO service_role;
ALTER TABLE public.assembleias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all assembleias" ON public.assembleias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER assembleias_updated_at BEFORE UPDATE ON public.assembleias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();