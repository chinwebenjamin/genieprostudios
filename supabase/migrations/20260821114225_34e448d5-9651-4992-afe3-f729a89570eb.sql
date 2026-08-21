REVOKE ALL ON FUNCTION public.busy_slots(timestamptz, timestamptz) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.busy_slots(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_manager_invite(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_manager_invite(text) TO authenticated;