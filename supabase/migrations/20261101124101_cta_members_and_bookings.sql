-- CTA: membership and bookings. Applied through a versioned migration.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create extension if not exists btree_gist with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  email text not null,
  phone text,
  role text not null default 'guest' check (role in ('guest','member','admin')),
  member_active boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  surface text not null check(surface in ('clay','hardcourt')),
  status text not null default 'active' check(status in ('active','maintenance'))
);
create table public.club_settings (
  id boolean primary key default true check(id),
  opening_minute integer not null default 480 check(opening_minute between 0 and 1410 and opening_minute % 30 = 0),
  closing_minute integer not null default 1320 check(closing_minute between 30 and 1440 and closing_minute % 30 = 0),
  booking_horizon_days integer not null default 14 check(booking_horizon_days between 1 and 60),
  check(closing_minute > opening_minute)
);
insert into public.club_settings(id) values(true);
insert into public.courts(name,surface) values ('Pista 3 - Terra Batuda','clay'),('Pista 4 - Pista Blava / Quick','hardcourt');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id),
  user_id uuid references public.profiles(id) on delete cascade,
  players text not null check(char_length(players) between 2 and 160 and players !~ '[[:cntrl:]]'),
  guest_name text, guest_email text, guest_phone text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
  payment_status text not null default 'free_member' check(payment_status in ('free_member','pending','paid')),
  source text not null default 'web' check(source in ('web','playtomic_sync')),
  access_code text,
  created_at timestamptz not null default now(),
  check(end_time - start_time in (interval '60 minutes',interval '90 minutes')),
  check(date_trunc('minute',start_time)=start_time and extract(minute from start_time)::int % 30=0),
  exclude using gist(court_id with =, tstzrange(start_time,end_time,'[)') with &&) where(status='confirmed')
);
create index bookings_user_start_idx on public.bookings(user_id,start_time desc);
create index bookings_court_start_idx on public.bookings(court_id,start_time) where(status='confirmed');
create table public.matches (
  id uuid primary key default gen_random_uuid(), booking_id uuid references public.bookings(id) on delete set null,
  player1_id uuid references public.profiles(id), player2_id uuid references public.profiles(id),
  player3_id uuid references public.profiles(id), player4_id uuid references public.profiles(id),
  winner_team integer check(winner_team in (1,2)), score text,
  match_date timestamptz not null, created_at timestamptz not null default now()
);
create index matches_player1_idx on public.matches(player1_id);
create index matches_player2_idx on public.matches(player2_id);
create index matches_player3_idx on public.matches(player3_id);
create index matches_player4_idx on public.matches(player4_id);
create index matches_booking_idx on public.matches(booking_id);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, message text not null, read boolean not null default false,
  type text not null check(type in ('club_notice','booking','match')), created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications(user_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.club_settings enable row level security;
alter table public.bookings enable row level security;
alter table public.matches enable row level security;
alter table public.notifications enable row level security;

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role='admin' and member_active);
$$;
create function private.is_member() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role in ('member','admin') and member_active);
$$;
revoke all on function private.is_admin(),private.is_member() from public,anon;
grant execute on function private.is_admin(),private.is_member() to authenticated;

-- Auth owns identity and confirmed email. User-editable metadata NEVER sets roles.
create function private.sync_auth_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_schema <> 'auth' or tg_table_name <> 'users' then raise exception 'Invalid trigger context'; end if;
  if auth.uid() is not null and auth.uid() <> new.id then raise exception 'Invalid caller'; end if;
  insert into public.profiles(id,full_name,email)
  values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1),'Soci'),100),coalesce(new.email,''))
  on conflict(id) do update set email=excluded.email;
  if lower(new.email)='clubtennisagramunt1974@gmail.com' and new.email_confirmed_at is not null then
    update public.profiles set role='admin',member_active=true where id=new.id;
  end if;
  return new;
end; $$;
revoke all on function private.sync_auth_profile() from public,anon,authenticated;
create trigger cta_auth_profile after insert or update of email,email_confirmed_at on auth.users for each row execute function private.sync_auth_profile();

create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_admin()));
create policy profiles_edit_own on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy courts_read on public.courts for select to anon,authenticated using(true);
create policy settings_read on public.club_settings for select to anon,authenticated using(true);
create policy bookings_read on public.bookings for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy matches_read on public.matches for select to authenticated using((select auth.uid()) in (player1_id,player2_id,player3_id,player4_id) or (select private.is_admin()));
create policy notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

revoke all on public.profiles,public.courts,public.club_settings,public.bookings,public.matches,public.notifications from anon,authenticated;
grant select on public.courts,public.club_settings to anon,authenticated;
grant select on public.profiles,public.bookings,public.matches,public.notifications to authenticated;
grant update(full_name,phone,avatar_url) on public.profiles to authenticated;
grant update(read) on public.notifications to authenticated;
grant all on public.profiles,public.courts,public.club_settings,public.bookings,public.matches,public.notifications to service_role;

-- Atomic writes are restricted to authenticated RPCs with explicit identity checks.
create function private.make_booking(p_court_id uuid,p_start_time timestamptz,p_duration integer,p_players text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_active boolean; v_settings public.club_settings; v_day date; v_end timestamptz;
begin
  if auth.uid() is null then raise insufficient_privilege using message='AUTH_REQUIRED'; end if;
  select (member_active and role in ('member','admin')) into v_active from public.profiles where id=auth.uid() for share;
  if not coalesce(v_active,false) then raise insufficient_privilege using message='MEMBER_REQUIRED'; end if;
  if p_duration not in (60,90) or p_duration is null then raise invalid_parameter_value using message='INVALID_DURATION'; end if;
  if p_start_time is null or p_players is null or char_length(trim(p_players)) not between 2 and 160 or p_players ~ '[[:cntrl:]]' then
    raise invalid_parameter_value using message='INVALID_BOOKING';
  end if;
  if not exists(select 1 from public.courts where id=p_court_id and status='active') then raise invalid_parameter_value using message='COURT_UNAVAILABLE'; end if;
  select * into v_settings from public.club_settings where id=true;
  v_day := (p_start_time at time zone 'Europe/Madrid')::date;
  v_end := p_start_time + make_interval(mins=>p_duration);
  if p_start_time<=now() or v_day > (now() at time zone 'Europe/Madrid')::date + v_settings.booking_horizon_days
    or p_start_time < ((v_day::timestamp + make_interval(mins=>v_settings.opening_minute)) at time zone 'Europe/Madrid')
    or v_end > ((v_day::timestamp + make_interval(mins=>v_settings.closing_minute)) at time zone 'Europe/Madrid') then
    raise invalid_parameter_value using message='OUTSIDE_BOOKING_WINDOW';
  end if;
  insert into public.bookings(court_id,user_id,players,start_time,end_time)
  values(p_court_id,auth.uid(),trim(p_players),p_start_time,v_end) returning id into v_id;
  insert into public.notifications(user_id,title,message,type) values(auth.uid(),'Reserva confirmada','La teva reserva s’ha registrat al club.','booking');
  return v_id;
end; $$;

create function private.availability(p_day date) returns table(court_id uuid,start_time timestamptz,end_time timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_member() then raise insufficient_privilege using message='MEMBER_REQUIRED'; end if;
  if p_day is null or p_day < (now() at time zone 'Europe/Madrid')::date or p_day > (now() at time zone 'Europe/Madrid')::date+60 then
    raise invalid_parameter_value using message='INVALID_DATE';
  end if;
  return query select b.court_id,b.start_time,b.end_time from public.bookings b where b.status='confirmed'
    and b.start_time < ((p_day+1)::timestamp at time zone 'Europe/Madrid') and b.end_time > (p_day::timestamp at time zone 'Europe/Madrid');
end; $$;

create function private.cancel_booking(p_booking_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_booking public.bookings;
begin
  if auth.uid() is null then raise insufficient_privilege using message='AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found or (v_booking.user_id is distinct from auth.uid() and not private.is_admin()) then raise insufficient_privilege using message='BOOKING_NOT_FOUND'; end if;
  if v_booking.start_time<=now() then raise invalid_parameter_value using message='BOOKING_ALREADY_STARTED'; end if;
  update public.bookings set status='cancelled' where id=p_booking_id;
  return true;
end; $$;

create function private.set_member_active(p_user_id uuid,p_active boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin() then raise insufficient_privilege using message='ADMIN_REQUIRED'; end if;
  if p_active is null then raise invalid_parameter_value using message='INVALID_STATUS'; end if;
  update public.profiles set member_active=p_active,role='member' where id=p_user_id and role<>'admin';
  if not found then raise invalid_parameter_value using message='MEMBER_NOT_FOUND'; end if;
  return true;
end; $$;

revoke all on function private.make_booking(uuid,timestamptz,integer,text),private.availability(date),private.cancel_booking(uuid),private.set_member_active(uuid,boolean) from public,anon;
grant execute on function private.make_booking(uuid,timestamptz,integer,text),private.availability(date),private.cancel_booking(uuid),private.set_member_active(uuid,boolean) to authenticated;

create function public.create_member_booking(p_court_id uuid,p_start_time timestamptz,p_duration integer,p_players text)
returns uuid language sql security invoker set search_path='' as $$ select private.make_booking(p_court_id,p_start_time,p_duration,p_players); $$;
create function public.get_court_availability(p_day date) returns table(court_id uuid,start_time timestamptz,end_time timestamptz)
language sql security invoker set search_path='' as $$ select * from private.availability(p_day); $$;
create function public.cancel_member_booking(p_booking_id uuid) returns boolean
language sql security invoker set search_path='' as $$ select private.cancel_booking(p_booking_id); $$;
create function public.set_member_active(p_user_id uuid,p_active boolean) returns boolean
language sql security invoker set search_path='' as $$ select private.set_member_active(p_user_id,p_active); $$;
revoke all on function public.create_member_booking(uuid,timestamptz,integer,text),public.get_court_availability(date),public.cancel_member_booking(uuid),public.set_member_active(uuid,boolean) from public,anon;
grant execute on function public.create_member_booking(uuid,timestamptz,integer,text),public.get_court_availability(date),public.cancel_member_booking(uuid),public.set_member_active(uuid,boolean) to authenticated;
