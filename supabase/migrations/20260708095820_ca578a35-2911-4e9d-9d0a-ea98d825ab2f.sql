REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;