
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condominios TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_eletricidade TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_bancarias TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seguros TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contactos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO anon, authenticated;

CREATE POLICY "public access condominios" ON public.condominios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access contratos_eletricidade" ON public.contratos_eletricidade FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access contas_bancarias" ON public.contas_bancarias FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access seguros" ON public.seguros FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access contactos" ON public.contactos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access documentos" ON public.documentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Storage: allow anon full access to the condominio-docs bucket
CREATE POLICY "condominio-docs read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'condominio-docs');
CREATE POLICY "condominio-docs insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'condominio-docs');
CREATE POLICY "condominio-docs update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'condominio-docs');
CREATE POLICY "condominio-docs delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'condominio-docs');
