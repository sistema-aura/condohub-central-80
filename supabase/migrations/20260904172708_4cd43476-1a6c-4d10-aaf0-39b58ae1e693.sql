DROP TABLE IF EXISTS public.contactos CASCADE;
DROP TABLE IF EXISTS public.contas_bancarias CASCADE;
DROP TABLE IF EXISTS public.contratos_eletricidade CASCADE;
DROP TABLE IF EXISTS public.seguros CASCADE;
DROP TABLE IF EXISTS public.documentos CASCADE;
DROP TABLE IF EXISTS public.condominios CASCADE;

CREATE TABLE public.edificios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  identificacao_interna text,
  morada text,
  codigo_postal text,
  localidade text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edificios TO authenticated;
GRANT ALL ON public.edificios TO service_role;
ALTER TABLE public.edificios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read edificios" ON public.edificios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert edificios" ON public.edificios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update edificios" ON public.edificios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete edificios" ON public.edificios FOR DELETE TO authenticated USING (true);

CREATE TYPE public.tipo_documento AS ENUM ('luz','agua','banco','elevador','seguro','outros');

CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id uuid NOT NULL REFERENCES public.edificios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  tipo public.tipo_documento NOT NULL DEFAULT 'outros',
  informacao text,
  ficheiro_path text,
  ficheiro_nome text,
  mime_type text,
  tamanho bigint,
  data_documento date,
  data_validade date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read documentos" ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert documentos" ON public.documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update documentos" ON public.documentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete documentos" ON public.documentos FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_documentos_edificio ON public.documentos(edificio_id);
CREATE INDEX idx_documentos_validade ON public.documentos(data_validade);

CREATE TRIGGER trg_edificios_updated BEFORE UPDATE ON public.edificios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_documentos_updated BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "public read condominio-docs" ON storage.objects;
DROP POLICY IF EXISTS "public write condominio-docs" ON storage.objects;
DROP POLICY IF EXISTS "public update condominio-docs" ON storage.objects;
DROP POLICY IF EXISTS "public delete condominio-docs" ON storage.objects;
CREATE POLICY "auth read condominio-docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'condominio-docs');
CREATE POLICY "auth insert condominio-docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'condominio-docs');
CREATE POLICY "auth update condominio-docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'condominio-docs') WITH CHECK (bucket_id = 'condominio-docs');
CREATE POLICY "auth delete condominio-docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'condominio-docs');