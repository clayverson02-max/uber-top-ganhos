CREATE TYPE public.app_role AS ENUM ('admin','equipe');
CREATE TYPE public.client_status AS ENUM ('novo','primeiro_contato','aguardando_documentos','documentos_recebidos','documentos_em_analise','cadastro_concluido','cliente_ativo','cliente_inativo','nao_prosseguiu','cadastro_duplicado');
CREATE TYPE public.doc_status AS ENUM ('pendente','recebido','em_analise','aprovado','rejeitado');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.user_id = _user_id AND r.role = _role AND p.active)
$$;
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.user_id = _user_id AND p.active)
$$;
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

CREATE POLICY "members read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_member(auth.uid()) OR id = auth.uid());
CREATE POLICY "admin updates profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email,''));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code bigserial UNIQUE,
  origin text NOT NULL CHECK (origin IN ('anuncio','whatsapp')),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 150),
  email text NOT NULL CHECK (char_length(email) <= 255),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^[0-9]{10,13}$'),
  avg_bill numeric(12,2) CHECK (avg_bill IS NULL OR avg_bill >= 0),
  notes text,
  last_contact_at date,
  next_contact_at date,
  responsible_id uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  status public.client_status NOT NULL DEFAULT 'novo',
  stopped_responding boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clients_whatsapp_idx ON public.clients (whatsapp);
CREATE INDEX clients_email_idx ON public.clients (lower(email));
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT USAGE ON SEQUENCE public.clients_code_seq TO authenticated;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_client(_client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (public.is_member(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = _client AND (c.created_by = auth.uid() OR c.responsible_id = auth.uid())))
$$;

CREATE POLICY "clients select" ON public.clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (public.is_member(auth.uid()) AND (created_by = auth.uid() OR responsible_id = auth.uid())));
CREATE POLICY "clients insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "clients update" ON public.clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (public.is_member(auth.uid()) AND (created_by = auth.uid() OR responsible_id = auth.uid())));

CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  doc_type text NOT NULL CHECK (doc_type IN ('fatura','documento_foto')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  status public.doc_status NOT NULL DEFAULT 'recebido',
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs select" ON public.client_documents FOR SELECT TO authenticated USING (public.can_access_client(client_id));
CREATE POLICY "docs insert" ON public.client_documents FOR INSERT TO authenticated WITH CHECK (public.can_access_client(client_id) AND uploaded_by = auth.uid());
CREATE POLICY "docs update" ON public.client_documents FOR UPDATE TO authenticated USING (public.can_access_client(client_id));

CREATE TABLE public.client_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  user_id uuid DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('status','edicao','contato','documento','financeiro','criacao')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.client_history TO authenticated;
GRANT ALL ON public.client_history TO service_role;
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hist select" ON public.client_history FOR SELECT TO authenticated USING (public.can_access_client(client_id));
CREATE POLICY "hist insert" ON public.client_history FOR INSERT TO authenticated WITH CHECK (public.can_access_client(client_id) AND user_id = auth.uid());

CREATE TABLE public.bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id),
  amount numeric(12,2) NOT NULL DEFAULT 25.00,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmada')),
  responsible_id uuid,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.bonuses TO authenticated;
GRANT ALL ON public.bonuses TO service_role;
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bonus select" ON public.bonuses FOR SELECT TO authenticated USING (public.can_access_client(client_id));
CREATE POLICY "bonus admin update" ON public.bonuses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.bonus_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.amount := 25.00;
  NEW.client_id := OLD.client_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bonus_rules BEFORE UPDATE ON public.bonuses FOR EACH ROW EXECUTE FUNCTION public.bonus_rules();

CREATE TABLE public.monthly_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  reference_month date NOT NULL,
  bill_amount numeric(12,2) NOT NULL CHECK (bill_amount >= 0),
  percent numeric(5,4) NOT NULL DEFAULT 0.04,
  revenue numeric(12,2) GENERATED ALWAYS AS (round(bill_amount * percent, 2)) STORED,
  is_estimate boolean NOT NULL DEFAULT true,
  receipt_status text NOT NULL DEFAULT 'pendente' CHECK (receipt_status IN ('pendente','recebido')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, reference_month)
);
GRANT SELECT, INSERT, UPDATE ON public.monthly_revenues TO authenticated;
GRANT ALL ON public.monthly_revenues TO service_role;
ALTER TABLE public.monthly_revenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rev select" ON public.monthly_revenues FOR SELECT TO authenticated USING (public.can_access_client(client_id));
CREATE POLICY "rev admin insert" ON public.monthly_revenues FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rev admin update" ON public.monthly_revenues FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.enforce_revenue_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.percent := 0.04;
  NEW.reference_month := date_trunc('month', NEW.reference_month)::date;
  IF TG_OP = 'INSERT' AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = NEW.client_id AND status = 'cliente_ativo' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Receita só pode ser registrada para clientes ativos';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_revenue_rules BEFORE INSERT OR UPDATE ON public.monthly_revenues FOR EACH ROW EXECUTE FUNCTION public.enforce_revenue_rules();

CREATE OR REPLACE FUNCTION public.generate_monthly_revenues(_month date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  INSERT INTO public.monthly_revenues (client_id, reference_month, bill_amount, is_estimate)
  SELECT id, date_trunc('month', _month)::date, avg_bill, true FROM public.clients
  WHERE status = 'cliente_ativo' AND deleted_at IS NULL AND avg_bill IS NOT NULL
  ON CONFLICT (client_id, reference_month) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.find_duplicates(_whatsapp text, _email text, _exclude uuid DEFAULT NULL)
RETURNS TABLE (id uuid, code bigint, full_name text, status public.client_status, match text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.code, c.full_name, c.status,
    CASE WHEN c.whatsapp = _whatsapp THEN 'WhatsApp' ELSE 'E-mail' END
  FROM public.clients c
  WHERE public.is_member(auth.uid()) AND c.deleted_at IS NULL
    AND (c.whatsapp = _whatsapp OR lower(c.email) = lower(trim(_email)))
    AND (_exclude IS NULL OR c.id <> _exclude)
  LIMIT 10
$$;

CREATE OR REPLACE FUNCTION public.clients_before()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.code := OLD.code;
    IF NOT public.has_role(auth.uid(),'admin') THEN
      NEW.deleted_at := OLD.deleted_at;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_clients_before BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.clients_before();

CREATE OR REPLACE FUNCTION public.clients_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_history (client_id, user_id, kind, description) VALUES (NEW.id, auth.uid(), 'criacao', 'Cadastro criado');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.client_history (client_id, user_id, kind, description)
    VALUES (NEW.id, auth.uid(), 'status', 'Status alterado: ' || OLD.status || ' → ' || NEW.status);
  END IF;
  IF NEW.status IN ('cadastro_concluido','cliente_ativo') AND NEW.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.bonuses b JOIN public.clients c ON c.id = b.client_id
                     WHERE c.whatsapp = NEW.whatsapp OR lower(c.email) = lower(NEW.email)) THEN
    INSERT INTO public.bonuses (client_id, responsible_id) VALUES (NEW.id, COALESCE(NEW.responsible_id, NEW.created_by))
    ON CONFLICT (client_id) DO NOTHING;
    INSERT INTO public.client_history (client_id, user_id, kind, description) VALUES (NEW.id, auth.uid(), 'financeiro', 'Bonificação única de R$ 25,00 registrada (pendente)');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_clients_after AFTER INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.clients_after();

CREATE POLICY "client docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-docs' AND public.can_access_client(((storage.foldername(name))[1])::uuid));
CREATE POLICY "client docs upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-docs' AND public.can_access_client(((storage.foldername(name))[1])::uuid));