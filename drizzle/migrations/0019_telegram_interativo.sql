-- Server-only interaction state. No browser access to tokens or reminder queues.
CREATE TABLE IF NOT EXISTS public.telegram_confirmations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 chat_id bigint NOT NULL REFERENCES public.telegram_config(chat_id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('a','d','t','v')),
 entity_id uuid NOT NULL,
 before_row jsonb NOT NULL,
 after_row jsonb,
 expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
 used_at timestamptz,
 undone_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.telegram_reminders (
 chat_id bigint NOT NULL REFERENCES public.telegram_config(chat_id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('a','d','t','v')),
 entity_id uuid NOT NULL,
 due_at timestamptz NOT NULL,
 lease_until timestamptz,
 PRIMARY KEY(chat_id,kind,entity_id)
);
CREATE TABLE IF NOT EXISTS public.telegram_pairings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes'
);
ALTER TABLE public.telegram_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_pairings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_confirmations, public.telegram_reminders, public.telegram_pairings FROM anon, authenticated;
GRANT ALL ON public.telegram_confirmations, public.telegram_reminders, public.telegram_pairings TO service_role;

-- Compare the entire record under a row lock: stale confirmations/undo must not
-- overwrite edits made by another colleague or via the site.
CREATE OR REPLACE FUNCTION public.telegram_confirm(_chat bigint, _id uuid, _undo boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.telegram_confirmations; tbl text; current_row jsonb; new_row jsonb;
BEGIN
 SELECT * INTO c FROM public.telegram_confirmations WHERE id=_id AND chat_id=_chat FOR UPDATE;
 IF NOT FOUND OR c.expires_at < now() THEN RETURN 'expired'; END IF;
 IF (_undo AND (c.used_at IS NULL OR c.undone_at IS NOT NULL)) OR (NOT _undo AND c.used_at IS NOT NULL) THEN RETURN 'used'; END IF;
 tbl := CASE c.kind WHEN 'a' THEN 'assembleias' WHEN 'd' THEN 'declaracoes' WHEN 't' THEN 'tarefas' WHEN 'v' THEN 'vistorias' END;
 EXECUTE format('SELECT to_jsonb(r) FROM public.%I r WHERE id=$1 FOR UPDATE',tbl) INTO current_row USING c.entity_id;
 IF current_row IS NULL OR current_row IS DISTINCT FROM (CASE WHEN _undo THEN c.after_row ELSE c.before_row END) THEN RETURN 'stale'; END IF;
 IF c.kind='a' THEN
   IF (current_row->>'cancelada')::boolean THEN RETURN 'stale'; END IF;
   UPDATE public.assembleias SET convocatoria_enviada=CASE WHEN _undo THEN (c.before_row->>'convocatoria_enviada')::boolean ELSE true END WHERE id=c.entity_id;
 ELSIF c.kind='d' THEN
   UPDATE public.declaracoes SET feita=CASE WHEN _undo THEN (c.before_row->>'feita')::boolean ELSE true END,
     feita_em=CASE WHEN _undo THEN (c.before_row->>'feita_em')::timestamptz ELSE now() END WHERE id=c.entity_id;
 ELSIF c.kind='t' THEN
   UPDATE public.tarefas SET estado=CASE WHEN _undo THEN c.before_row->>'estado' ELSE 'concluida' END,
     concluida_em=CASE WHEN _undo THEN (c.before_row->>'concluida_em')::timestamptz ELSE now() END WHERE id=c.entity_id;
 ELSE
   UPDATE public.vistorias SET concluida=CASE WHEN _undo THEN (c.before_row->>'concluida')::boolean ELSE true END WHERE id=c.entity_id;
 END IF;
 EXECUTE format('SELECT to_jsonb(r) FROM public.%I r WHERE id=$1',tbl) INTO new_row USING c.entity_id;
 IF _undo THEN UPDATE public.telegram_confirmations SET undone_at=now() WHERE id=_id;
 ELSE UPDATE public.telegram_confirmations SET used_at=now(), after_row=new_row, expires_at=now()+interval '10 minutes' WHERE id=_id; END IF;
 RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.telegram_confirm(bigint,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_confirm(bigint,uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.telegram_claim_reminders()
RETURNS SETOF public.telegram_reminders LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.telegram_reminders SET lease_until=now()+interval '2 minutes'
 WHERE (chat_id,kind,entity_id) IN (
   SELECT chat_id,kind,entity_id FROM public.telegram_reminders
   WHERE due_at<=now() AND (lease_until IS NULL OR lease_until<now())
   ORDER BY due_at LIMIT 30 FOR UPDATE SKIP LOCKED
 ) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.telegram_claim_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_claim_reminders() TO service_role;

-- Activated only after the new route is deployed; reuse the existing secret
-- entirely inside PostgreSQL, never exposing it to the browser or deployment logs.
CREATE OR REPLACE FUNCTION public.telegram_schedule_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cmd text;
BEGIN
 SELECT command INTO cmd FROM cron.job WHERE jobname='telegram-avisos-diario';
 IF cmd IS NULL OR position('jsonb_build_object(' in cmd)=0 THEN RAISE EXCEPTION 'Cron dos avisos não encontrado'; END IF;
 cmd := replace(cmd, 'jsonb_build_object(', 'jsonb_build_object(''x-modo'',''lembretes'',');
 PERFORM cron.schedule('telegram-lembretes-interativos', '* * * * *', cmd);
END $$;
REVOKE ALL ON FUNCTION public.telegram_schedule_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_schedule_reminders() TO service_role;
