
-- Drop trigger and function that created profiles/roles on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop profiles/roles tables and enum
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Remove all existing policies on data tables; access will go through backend with service role
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('condominios','contratos_eletricidade','contas_bancarias','seguros','contactos','documentos')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- Keep RLS enabled but with no policies -> only service_role (which bypasses RLS) can access.
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_eletricidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Revoke direct API access from anon/authenticated (backend uses service_role)
REVOKE ALL ON public.condominios FROM anon, authenticated;
REVOKE ALL ON public.contratos_eletricidade FROM anon, authenticated;
REVOKE ALL ON public.contas_bancarias FROM anon, authenticated;
REVOKE ALL ON public.seguros FROM anon, authenticated;
REVOKE ALL ON public.contactos FROM anon, authenticated;
REVOKE ALL ON public.documentos FROM anon, authenticated;

GRANT ALL ON public.condominios TO service_role;
GRANT ALL ON public.contratos_eletricidade TO service_role;
GRANT ALL ON public.contas_bancarias TO service_role;
GRANT ALL ON public.seguros TO service_role;
GRANT ALL ON public.contactos TO service_role;
GRANT ALL ON public.documentos TO service_role;
