CREATE TABLE public.vistorias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 edificio_id uuid REFERENCES public.edificios(id) ON DELETE CASCADE,
 data date NOT NULL DEFAULT current_date,
 hora_inicio time,
 hora_fim time,
 pessoa text NOT NULL DEFAULT 'Eduardo',
 notas text,
 created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vistorias TO authenticated;
GRANT ALL ON public.vistorias TO service_role;
ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth all vistorias" ON public.vistorias FOR ALL TO authenticated USING (true) WITH CHECK (true);