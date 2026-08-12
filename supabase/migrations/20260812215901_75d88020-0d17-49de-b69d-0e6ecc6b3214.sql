
create or replace function public.busy_slots(_from timestamptz, _to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.starts_at, b.ends_at from public.bookings b
  where b.status in ('awaiting_payment','pending','confirmed','completed')
    and b.ends_at >= _from and b.starts_at <= _to
  order by b.starts_at
$$;
revoke all on function public.busy_slots(timestamptz, timestamptz) from public, anon;
grant execute on function public.busy_slots(timestamptz, timestamptz) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_booking_buffer() from public, anon, authenticated;
revoke all on function public.schedule_booking_notifications() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.is_manager() from public, anon;
