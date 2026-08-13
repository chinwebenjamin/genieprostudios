create table public.packages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  tagline text not null default '',
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  rates jsonb not null default '{"day":[],"night":[]}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.packages to anon;
grant select, insert, update, delete on public.packages to authenticated;
grant all on public.packages to service_role;

alter table public.packages enable row level security;

create policy "packages readable" on public.packages for select using (true);
create policy "packages managed by manager" on public.packages for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger packages_updated_at before update on public.packages
for each row execute function public.touch_updated_at();

insert into public.packages (key, label, tagline, includes, excludes, rates, sort_order) values
('rehearsal','Rehearsal Package','Stereo recording and full access to studio facilities.',
 array['Stereo recording','Full studio facilities'],
 array['No production lights','Cameras not permitted'],
 '{"day":[{"hours":2,"price":60000},{"hours":4,"price":110000},{"hours":6,"price":140000},{"hours":12,"price":280000}],"night":[{"hours":2,"price":60000},{"hours":4,"price":90000},{"hours":6,"price":120000}]}'::jsonb, 1),
('virtual','Virtual Package','Facebook or YouTube Live sessions with production lights.',
 array['Stereo recording','Studio facilities','Production lights'],
 array['Video livestreaming not included by default','One-camera HD livestream to one platform on request — NGN 70,000 / 2hrs'],
 '{"day":[{"hours":2,"price":80000},{"hours":4,"price":140000},{"hours":6,"price":180000}],"night":[{"hours":2,"price":80000},{"hours":4,"price":140000},{"hours":6,"price":180000}]}'::jsonb, 2),
('freelance','Freelance Producer / Video Filming','Extracurricular sessions — bring your own producer or video director.',
 array['Stereo recording','Studio facilities','Production lights'],
 array['Client must bring their own producer / video director'],
 '{"day":[{"hours":2,"price":80000},{"hours":4,"price":140000},{"hours":6,"price":180000}],"night":[{"hours":2,"price":80000},{"hours":4,"price":140000},{"hours":6,"price":180000}]}'::jsonb, 3),
('multitrack','Multitrack Recording (No Screen)','Stereo & multi-track recording with RGB, beam and key lights.',
 array['Stereo & multi-track recording','Studio facilities','RGB, Beam & Key lights'],
 array['Excludes video coverage, mixing & mastering, post-production','Videographers available on request / negotiation'],
 '{"day":[{"hours":2,"price":100000},{"hours":4,"price":180000},{"hours":6,"price":280000},{"hours":12,"price":600000}],"night":[{"hours":2,"price":100000},{"hours":4,"price":180000},{"hours":6,"price":280000}]}'::jsonb, 4);

alter table public.bookings add column client_name text;
alter table public.bookings add column created_by_manager boolean not null default false;

create policy "managers create bookings" on public.bookings for insert to authenticated
  with check (public.is_manager());

alter table public.studio_settings add column whatsapp_number text not null default '';