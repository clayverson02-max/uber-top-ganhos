
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  order_bump_active BOOLEAN NOT NULL DEFAULT false,
  total_price NUMERIC(10,2) NOT NULL,
  fbp TEXT,
  fbc TEXT,
  user_agent TEXT,
  ip_address TEXT,
  event_id TEXT,
  source TEXT DEFAULT 'checkout',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can insert a lead (it's a public funnel)
CREATE POLICY "Anyone can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- No public SELECT/UPDATE/DELETE — only service role (used in Cloud dashboard) can read.
-- This prevents leaking customer contact data.

CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
