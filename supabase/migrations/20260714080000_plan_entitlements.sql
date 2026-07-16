CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'pro' CHECK (plan IN ('pro')),
  source text NOT NULL DEFAULT 'manual',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_entitlements FROM public, anon, authenticated;
GRANT ALL ON public.plan_entitlements TO service_role;

DROP POLICY IF EXISTS "Service role can manage plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Service role can manage plan entitlements"
  ON public.plan_entitlements FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'sandbox'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF ((SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> user_uuid)
    AND COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.plan_entitlements entitlement
    WHERE entitlement.user_id = user_uuid
      AND (entitlement.expires_at IS NULL OR entitlement.expires_at > now())
  ) OR EXISTS (
    SELECT 1
    FROM public.subscriptions subscription
    WHERE subscription.user_id = user_uuid
      AND (check_env IS NULL OR subscription.environment = check_env)
      AND (
        (subscription.status IN ('active', 'trialing') AND (subscription.current_period_end IS NULL OR subscription.current_period_end > now()))
        OR (subscription.status = 'canceled' AND subscription.current_period_end > now())
      )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;

INSERT INTO public.plan_entitlements (user_id, plan, source, expires_at)
SELECT id, 'pro', 'owner', NULL
FROM auth.users
WHERE lower(email) = lower('pedroborges906@gmail.com')
ON CONFLICT (user_id) DO UPDATE
SET plan = EXCLUDED.plan,
    source = EXCLUDED.source,
    expires_at = NULL,
    updated_at = now();

DROP POLICY IF EXISTS "Users upload own attachments" ON storage.objects;
CREATE POLICY "Pro users upload own attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'page-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_active_subscription(auth.uid(), NULL)
  );

DROP POLICY IF EXISTS "Users update own attachments" ON storage.objects;
CREATE POLICY "Pro users update own attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'page-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_active_subscription(auth.uid(), NULL)
  )
  WITH CHECK (
    bucket_id = 'page-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.has_active_subscription(auth.uid(), NULL)
  );
