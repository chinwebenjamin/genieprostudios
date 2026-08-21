-- 1. Restrict studio_settings table reads to authenticated users
DROP POLICY IF EXISTS "settings readable" ON public.studio_settings;
CREATE POLICY "settings readable by authenticated"
ON public.studio_settings FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.studio_settings FROM anon;

-- 2. Public-safe view without financial columns
CREATE OR REPLACE VIEW public.studio_public
WITH (security_invoker = off) AS
SELECT id, logo_url, profile_image_url, whatsapp_number, guidelines, project_terms, updated_at
FROM public.studio_settings;

GRANT SELECT ON public.studio_public TO anon, authenticated;

-- 3. Lock down internal SECURITY DEFINER trigger functions
REVOKE ALL ON FUNCTION public.enforce_booking_buffer() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.schedule_booking_notifications() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;