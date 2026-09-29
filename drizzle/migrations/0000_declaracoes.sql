CREATE TABLE public.declaracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id uuid NOT NULL REFERENCES public.edificios(id) ON DELETE CASCADE,
  fracao text,
  proprietario text,
  nif text,
  urgente boolean NOT NULL DEFAULT false,
  reconhecida boolean NOT NULL DEFAULT false,
  feita boolean NOT NULL DEFAULT false,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.declaracoes TO authenticated;
GRANT ALL ON public.declaracoes TO service_role;
ALTER TABLE public.declaracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all declaracoes" ON public.declaracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_declaracoes_updated BEFORE UPDATE ON public.declaracoes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.declaracoes;