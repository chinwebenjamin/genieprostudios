-- View should run with the querying user's permissions
DROP VIEW IF EXISTS public.studio_public;
CREATE VIEW public.studio_public
WITH (security_invoker = on) AS
SELECT id, logo_url, profile_image_url, whatsapp_number, guidelines, project_terms, updated_at
FROM public.studio_settings;

GRANT SELECT ON public.studio_public TO anon, authenticated;

-- Allow anon to pass RLS but only on non-financial columns (column-level grants)
DROP POLICY IF EXISTS "settings readable by authenticated" ON public.studio_settings;
CREATE POLICY "settings readable"
ON public.studio_settings FOR SELECT TO anon, authenticated USING (true);

REVOKE SELECT ON public.studio_settings FROM anon;
GRANT SELECT (id, logo_url, profile_image_url, whatsapp_number, guidelines, project_terms, updated_at)
ON public.studio_settings TO anon;

-- Role helpers are only used inside policies; users must not call them directly
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_manager() FROM anon, authenticated, public;