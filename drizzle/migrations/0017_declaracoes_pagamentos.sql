ALTER TABLE public.declaracoes
 ADD COLUMN pago_solicitadora boolean NOT NULL DEFAULT false,
 ADD COLUMN pago_solicitadora_pdf text,
 ADD COLUMN pago_nono boolean NOT NULL DEFAULT false,
 ADD COLUMN pago_nono_pdf text;