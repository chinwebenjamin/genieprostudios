
create type public.app_role as enum ('manager','client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'manager')
$$;

create policy "profiles readable by self and managers" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_manager());
create policy "profiles insert self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "roles readable by self and managers" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_manager());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''),'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'client')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.manager_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now()
);
grant all on public.manager_invites to service_role;
alter table public.manager_invites enable row level security;
insert into public.manager_invites (code) values ('54953947');

create or replace function public.redeem_manager_invite(_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then return false; end if;
  select exists(select 1 from public.manager_invites where code = _code) into ok;
  if not ok then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'manager')
  on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.redeem_manager_invite(text) from public, anon;
grant execute on function public.redeem_manager_invite(text) to authenticated;

create table public.studio_settings (
  id boolean primary key default true check (id),
  logo_url text,
  profile_image_url text,
  bank_name text not null default 'Zenith Bank',
  account_name text not null default 'Genie Pro Music Studio',
  account_number text not null default '0000000000',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.studio_settings to authenticated;
grant all on public.studio_settings to service_role;
alter table public.studio_settings enable row level security;
create policy "settings readable" on public.studio_settings for select to authenticated using (true);
create policy "settings managed by manager" on public.studio_settings for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
insert into public.studio_settings (id) values (true);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  quantity integer not null default 0,
  provided_by text not null default 'studio' check (provided_by in ('studio','client')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories readable" on public.categories for select to authenticated using (true);
create policy "categories managed by manager" on public.categories for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

insert into public.categories (name, description, quantity, provided_by) values
  ('BGV Mics','Backing vocal microphones', 6, 'studio'),
  ('Lead Mics','Lead vocal microphones', 2, 'studio'),
  ('Drum Kit','Full studio drum kit (fixed, on-site)', 1, 'studio'),
  ('Keyboard','Studio keyboard (fixed, on-site)', 1, 'studio'),
  ('Bass Guitar','Client must bring their own', 0, 'client'),
  ('Lead Guitar','Client must bring their own', 0, 'client'),
  ('Percussionist','Client must bring their own', 0, 'client');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  package_key text not null,
  package_label text not null,
  period text not null check (period in ('day','night')),
  duration_hours integer not null,
  price numeric not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','pending','confirmed','declined','completed')),
  receipt_url text,
  payment_type text check (payment_type in ('full','partial')),
  balance numeric not null default 0,
  agreed_terms boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "bookings visible to owner or manager" on public.bookings for select to authenticated
  using (client_id = auth.uid() or public.is_manager());
create policy "clients create own bookings" on public.bookings for insert to authenticated
  with check (client_id = auth.uid());
create policy "owner updates own booking" on public.bookings for update to authenticated
  using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "manager updates bookings" on public.bookings for update to authenticated
  using (public.is_manager()) with check (public.is_manager());
create policy "manager deletes bookings" on public.bookings for delete to authenticated
  using (public.is_manager());

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  provided_by text not null default 'studio',
  quantity integer not null default 1
);
grant select, insert, update, delete on public.booking_items to authenticated;
grant all on public.booking_items to service_role;
alter table public.booking_items enable row level security;
create policy "items visible to owner or manager" on public.booking_items for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and (b.client_id = auth.uid() or public.is_manager())));
create policy "items inserted by owner" on public.booking_items for insert to authenticated
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = auth.uid()));
create policy "items managed by manager" on public.booking_items for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create or replace function public.enforce_booking_buffer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.bookings b
    where b.id <> new.id
      and b.status in ('awaiting_payment','pending','confirmed','completed')
      and new.starts_at < b.ends_at + interval '30 minutes'
      and b.starts_at < new.ends_at + interval '30 minutes'
  ) then
    raise exception 'That time slot is unavailable. A 30-minute buffer is required between sessions.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger bookings_buffer before insert or update of starts_at, ends_at on public.bookings
  for each row execute function public.enforce_booking_buffer();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  title text not null,
  body text not null,
  scheduled_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index notifications_user_sched_idx on public.notifications (user_id, scheduled_at);

create or replace function public.schedule_booking_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lead interval;
  bal text := '';
  recipients uuid[];
  r uuid;
  offs interval[];
  o interval;
  label text;
begin
  if new.status <> 'confirmed' or old.status = 'confirmed' then return new; end if;

  if new.payment_type = 'partial' and new.balance > 0 then
    bal := ' Outstanding balance: NGN ' || to_char(new.balance, 'FM999,999,999');
  end if;

  select array_agg(user_id) into recipients from (
    select new.client_id as user_id
    union
    select user_id from public.user_roles where role = 'manager'
  ) s;

  lead := new.starts_at - now();

  if lead >= interval '3 days' then
    offs := array[interval '3 days', interval '2 days', interval '1 day', interval '45 minutes', interval '30 minutes'];
  elsif lead > interval '1 hour' then
    offs := array[lead / 2, interval '30 minutes'];
  else
    offs := array[interval '30 minutes'];
  end if;

  foreach r in array recipients loop
    insert into public.notifications (user_id, booking_id, title, body, scheduled_at)
    values (r, new.id, 'Booking confirmed',
      'Session confirmed for ' || to_char(new.starts_at at time zone 'Africa/Lagos', 'DD Mon YYYY, HH12:MI AM')
      || ' (' || new.package_label || ').' || bal, now());

    foreach o in array offs loop
      if new.starts_at - o > now() then
        if o >= interval '1 day' then
          label := 'You have a session with Genie Pro Music Studio in ' || (extract(day from o))::int || ' day(s).';
        else
          label := 'Session starting in ' || round(extract(epoch from o)/60)::int || ' minutes.';
        end if;
        insert into public.notifications (user_id, booking_id, title, body, scheduled_at)
        values (r, new.id, 'Session reminder', label || bal, new.starts_at - o);
      end if;
    end loop;
  end loop;

  return new;
end;
$$;
create trigger bookings_notify after update of status on public.bookings
  for each row execute function public.schedule_booking_notifications();

create policy "receipt upload by owner" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipt read by owner or manager" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_manager()));
create policy "branding read by authenticated" on storage.objects for select to authenticated
  using (bucket_id = 'branding');
create policy "branding managed by manager" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and public.is_manager()) with check (bucket_id = 'branding' and public.is_manager());
