
-- ============ ENUM + ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'colaborador');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ SIGNUP TRIGGER (profile + first admin) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF admin_exists THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CONDOMINIOS ============
CREATE TABLE public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  numero_interno TEXT,
  morada TEXT,
  codigo_postal TEXT,
  localidade TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condominios TO authenticated;
GRANT ALL ON public.condominios TO service_role;
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cond_select" ON public.condominios FOR SELECT TO authenticated USING (true);
CREATE POLICY "cond_insert" ON public.condominios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cond_update" ON public.condominios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cond_delete_admin" ON public.condominios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_cond_updated BEFORE UPDATE ON public.condominios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_cond_nome ON public.condominios (nome);
CREATE INDEX idx_cond_numero ON public.condominios (numero_interno);

-- ============ ELETRICIDADE (1:1) ============
CREATE TABLE public.contratos_eletricidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL UNIQUE REFERENCES public.condominios(id) ON DELETE CASCADE,
  companhia TEXT,
  numero_contrato TEXT,
  cpe TEXT,
  titular TEXT,
  data_inicio DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_eletricidade TO authenticated;
GRANT ALL ON public.contratos_eletricidade TO service_role;
ALTER TABLE public.contratos_eletricidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "elec_all" ON public.contratos_eletricidade FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "elec_delete_admin" ON public.contratos_eletricidade FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_elec_updated BEFORE UPDATE ON public.contratos_eletricidade FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BANCO (1:1) ============
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL UNIQUE REFERENCES public.condominios(id) ON DELETE CASCADE,
  banco TEXT,
  iban TEXT,
  numero_conta TEXT,
  site_url TEXT,
  observacoes_acesso TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_bancarias TO authenticated;
GRANT ALL ON public.contas_bancarias TO service_role;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banco_all" ON public.contas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "banco_delete_admin" ON public.contas_bancarias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_banco_updated BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEGUROS (1:N) ============
CREATE TABLE public.seguros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  companhia TEXT,
  numero_apolice TEXT,
  tipo TEXT,
  data_inicio DATE,
  data_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seguros TO authenticated;
GRANT ALL ON public.seguros TO service_role;
ALTER TABLE public.seguros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seg_rw" ON public.seguros FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "seg_delete_admin" ON public.seguros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_seg_updated BEFORE UPDATE ON public.seguros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_seg_cond ON public.seguros (condominio_id);

-- ============ CONTACTOS (1:N) ============
CREATE TABLE public.contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  funcao TEXT,
  telefone TEXT,
  email TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contactos TO authenticated;
GRANT ALL ON public.contactos TO service_role;
ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cnt_rw" ON public.contactos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cnt_delete_admin" ON public.contactos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_cnt_updated BEFORE UPDATE ON public.contactos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_cnt_cond ON public.contactos (condominio_id);

-- ============ DOCUMENTOS (1:N) ============
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_rw" ON public.documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "doc_delete_admin" ON public.documentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_doc_cond ON public.documentos (condominio_id);

-- ============ STORAGE POLICIES (bucket criado via tool) ============
