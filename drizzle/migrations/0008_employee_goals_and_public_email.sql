ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

CREATE TABLE IF NOT EXISTS public.employee_goals (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_goal integer NOT NULL DEFAULT 0 CHECK (monthly_goal >= 0 AND monthly_goal <= 100000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_goals TO authenticated;
GRANT ALL ON public.employee_goals TO service_role;
ALTER TABLE public.employee_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin manages employee goals" ON public.employee_goals;
CREATE POLICY "admin manages employee goals" ON public.employee_goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.public_registration_leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.public_registration_leads ALTER COLUMN city SET DEFAULT '';
DROP POLICY IF EXISTS "public registration leads can be created" ON public.public_registration_leads;
CREATE POLICY "public registration leads can be created" ON public.public_registration_leads FOR INSERT TO anon
WITH CHECK (
  char_length(trim(full_name)) BETWEEN 3 AND 150
  AND char_length(trim(whatsapp)) BETWEEN 10 AND 20
  AND (email IS NULL OR (char_length(email) <= 255 AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))
  AND char_length(city) <= 120
  AND source = 'public_cadastro'
  AND status = 'capturado'
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_responsible_id_fkey') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_responsible_id_fkey
      FOREIGN KEY (responsible_id) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS clients_responsible_id_idx ON public.clients (responsible_id);