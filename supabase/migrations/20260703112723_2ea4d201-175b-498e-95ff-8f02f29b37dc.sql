
CREATE POLICY "docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'condominio-docs');
CREATE POLICY "docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'condominio-docs');
CREATE POLICY "docs_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'condominio-docs');
CREATE POLICY "docs_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'condominio-docs' AND public.has_role(auth.uid(), 'admin'));
