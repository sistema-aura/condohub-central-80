ALTER TABLE public.telegram_config DROP CONSTRAINT IF EXISTS telegram_config_pkey;
ALTER TABLE public.telegram_config ADD PRIMARY KEY (chat_id);
COMMENT ON COLUMN public.telegram_config.id IS 'DEPRECATED: multiple chats keyed by chat_id';