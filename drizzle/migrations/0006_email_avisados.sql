CREATE TABLE public.email_avisados (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.email_avisados TO service_role;
ALTER TABLE public.email_avisados ENABLE ROW LEVEL SECURITY;