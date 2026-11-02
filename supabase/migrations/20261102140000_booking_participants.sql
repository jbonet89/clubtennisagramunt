-- Keep historical player text; only new bookings have classified participants.
alter table public.bookings add column match_format text check(match_format in ('singles','doubles'));
alter table public.bookings add column participants jsonb not null default '[]'::jsonb;
alter table public.bookings drop constraint bookings_players_check;
alter table public.bookings add constraint bookings_players_check check(char_length(players) between 2 and 410 and players !~ '[[:cntrl:]]');

create function public.search_booking_members(p_query text)
returns table(id uuid, full_name text) language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.member_active and p.role in ('member','admin')) then raise insufficient_privilege; end if;
  if char_length(trim(p_query)) not between 2 and 100 then return; end if;
  return query select p.id,p.full_name from public.profiles p
    where p.member_active and p.role in ('member','admin') and p.id<>auth.uid()
      and strpos(lower(p.full_name),lower(trim(p_query)))>0
    order by p.full_name,p.id limit 15;
end; $$;

create function public.create_participant_booking(p_court_id uuid,p_start_time timestamptz,p_duration integer,p_match_format text,p_participants jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_item jsonb; v_name text; v_owner text; v_member uuid;
  v_seen uuid[]; v_names text[]; v_people jsonb='[]'::jsonb;
begin
  select full_name into v_owner from public.profiles where id=auth.uid() and member_active and role in ('member','admin') for share;
  if not found then raise insufficient_privilege; end if;
  if p_match_format is null or p_match_format not in ('singles','doubles') or jsonb_typeof(p_participants) is distinct from 'array' then raise invalid_parameter_value; end if;
  if jsonb_array_length(p_participants)<>(case when p_match_format='singles' then 1 else 3 end) then raise invalid_parameter_value; end if;
  v_seen:=array[auth.uid()]; v_names:=array[v_owner];
  v_people:=jsonb_build_array(jsonb_build_object('kind','member','member_id',auth.uid(),'name',v_owner));
  for v_item in select value from jsonb_array_elements(p_participants) loop
    if v_item->>'kind'='member' then
      v_member:=(v_item->>'member_id')::uuid;
      if v_member is null or v_member=any(v_seen) then raise invalid_parameter_value; end if;
      select full_name into v_name from public.profiles where id=v_member and member_active and role in ('member','admin') for share;
      if not found then raise invalid_parameter_value; end if;
      v_seen:=array_append(v_seen,v_member);
      v_people:=v_people||jsonb_build_array(jsonb_build_object('kind','member','member_id',v_member,'name',v_name));
    elsif v_item->>'kind'='guest' then
      v_name:=trim(v_item->>'name');
      if v_name is null or char_length(v_name) not between 2 and 100 or v_name ~ '[[:cntrl:]]' then raise invalid_parameter_value; end if;
      if exists(select 1 from unnest(v_names) n where lower(n)=lower(v_name)) then raise invalid_parameter_value; end if;
      v_people:=v_people||jsonb_build_array(jsonb_build_object('kind','guest','name',v_name));
    else raise invalid_parameter_value; end if;
    v_names:=array_append(v_names,v_name);
  end loop;
  -- Reuse the existing atomic availability, membership, duration and horizon checks.
  v_id:=private.make_booking(p_court_id,p_start_time,p_duration,v_owner);
  update public.bookings set players=array_to_string(v_names,' · '),match_format=p_match_format,participants=v_people where id=v_id;
  return v_id;
end; $$;

create function public.guest_participation_stats()
returns table(name text, appearances bigint, last_played timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
  if not private.admin_section_enabled('convidats') then raise insufficient_privilege; end if;
  return query select min(trim(p->>'name')),count(distinct b.id),max(b.start_time)
    from public.bookings b cross join lateral jsonb_array_elements(b.participants) p
    where b.status='confirmed' and b.end_time<=now() and p->>'kind'='guest'
    group by lower(regexp_replace(trim(p->>'name'),'\s+',' ','g'))
    order by count(distinct b.id) desc,max(b.start_time) desc;
end; $$;
insert into public.admin_sections(id) values('convidats');
revoke all on function public.search_booking_members(text),public.create_participant_booking(uuid,timestamptz,integer,text,jsonb),public.guest_participation_stats() from public,anon;
grant execute on function public.search_booking_members(text),public.create_participant_booking(uuid,timestamptz,integer,text,jsonb),public.guest_participation_stats() to authenticated;

