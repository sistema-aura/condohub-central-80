CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  edificio_id uuid REFERENCES public.edificios(id) ON DELETE SET NULL,
  de_pessoa text NOT NULL,
  para_pessoa text NOT NULL,
  estado text NOT NULL DEFAULT 'pendente',
  prioridade boolean NOT NULL DEFAULT false,
  prazo date,
  concluida_em timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all tarefas" ON public.tarefas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tarefas_updated BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();