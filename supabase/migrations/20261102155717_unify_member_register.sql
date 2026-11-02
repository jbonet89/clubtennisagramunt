-- One census for web accounts, approved applications and historical members.
alter table public.club_members
  add column profile_id uuid unique references public.profiles(id) on delete set null,
  add column legacy_reference text not null default '' check(length(legacy_reference)<=80),
  add column category text check(category in ('adult','junior')),
  add column annual_fee_cents integer check(annual_fee_cents between 0 and 1000000),
  add column season text check(length(season)<=40),
  add column notes text not null default '' check(length(notes)<=4000),
  add column source text not null default 'manual' check(source in ('manual','profile','historical','invitation')),
  add column invitation_status text not null default 'not_sent' check(invitation_status in ('not_sent','sending','sent','failed')),
  add column invitation_attempted_at timestamptz,
  add column invitation_sent_at timestamptz,
  add column updated_at timestamptz not null default now();
create unique index club_members_email_unique on public.club_members(lower(trim(email))) where trim(email)<>'';
create unique index club_members_legacy_unique on public.club_members(lower(trim(legacy_reference))) where trim(legacy_reference)<>'';
alter table public.club_dues add column season text check(length(season)<=40), add column source text not null default 'manual';
create unique index club_dues_member_season_unique on public.club_dues(member_id,season);

-- Relink existing census entries by email, then recover every current web profile.
update public.club_members m set profile_id=p.id from public.profiles p
where m.profile_id is null and trim(m.email)<>'' and lower(trim(m.email))=lower(trim(p.email));
insert into public.club_members(profile_id,full_name,email,phone,status,source)
select p.id,p.full_name,lower(trim(p.email)),coalesce(p.phone,''),
  case when p.member_active and p.role in ('member','admin') then 'active' when p.role in ('member','admin') then 'inactive' else 'pending' end,'profile'
from public.profiles p where not exists(select 1 from public.club_members m where m.profile_id=p.id);
update public.club_members m set status='active' from public.profiles p
where m.profile_id=p.id and p.member_active and p.role in ('member','admin');

create function private.sync_profile_census() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  -- Profiles can be inserted by the auth.users trigger (already depth 2).
  -- Recursion terminates in sync_census_profile instead.
  select id into v_id from public.club_members where profile_id=new.id;
  if v_id is null then
    select id into v_id from public.club_members where profile_id is null and trim(email)<>'' and lower(trim(email))=lower(trim(new.email)) for update;
    if v_id is not null then
      update public.club_members set profile_id=new.id,updated_at=now() where id=v_id;
      return new;
    end if;
    insert into public.club_members(profile_id,full_name,email,phone,status,source)
    values(new.id,new.full_name,lower(trim(new.email)),coalesce(new.phone,''),case when new.member_active and new.role in ('member','admin') then 'active' when new.role in ('member','admin') then 'inactive' else 'pending' end,'profile');
  else
    update public.club_members set
      full_name=case when new.role in ('member','admin') or status<>'active' then new.full_name else full_name end,
      email=lower(trim(new.email)),
      phone=case when coalesce(new.phone,'')<>'' then new.phone else phone end,
      status=case when new.role in ('member','admin') then case when new.member_active then 'active' else 'inactive' end else status end,
      updated_at=now() where id=v_id;
  end if;
  return new;
end; $$;
revoke all on function private.sync_profile_census() from public,anon,authenticated;
create trigger profiles_census_sync after insert or update of full_name,email,phone,role,member_active on public.profiles for each row execute function private.sync_profile_census();

create function private.sync_census_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare v_role text; v_confirmed boolean;
begin
  if pg_trigger_depth()>1 or new.profile_id is null then return new; end if;
  select p.role,(u.email_confirmed_at is not null and lower(trim(u.email))=lower(trim(new.email))) into v_role,v_confirmed
    from public.profiles p join auth.users u on u.id=p.id where p.id=new.profile_id;
  if v_role='admin' and new.status<>'active' then raise insufficient_privilege using message='ADMIN_ACCOUNT_PROTECTED'; end if;
  update public.profiles set full_name=new.full_name,phone=nullif(new.phone,''),
    member_active=case when new.status='active' and v_confirmed then true else false end,
    role=case when role='admin' then role when new.status='active' and v_confirmed then 'member' else role end
    where id=new.profile_id;
  return new;
end; $$;
revoke all on function private.sync_census_profile() from public,anon,authenticated;
create trigger census_profile_sync after insert or update of full_name,phone,status on public.club_members for each row execute function private.sync_census_profile();

create function private.claim_census_membership() returns boolean language plpgsql security definer set search_path='' as $$
declare v_member public.club_members; v_email text;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select lower(trim(email)) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if v_email is null then return false; end if;
  select * into v_member from public.club_members where lower(trim(email))=v_email and status='active' and (profile_id is null or profile_id=auth.uid()) for update;
  if not found then return false; end if;
  update public.club_members set profile_id=auth.uid(),updated_at=now() where id=v_member.id;
  update public.profiles set full_name=v_member.full_name,phone=nullif(v_member.phone,''),member_active=true,
    role=case when role='admin' then role else 'member' end where id=auth.uid();
  return true;
end; $$;
create function public.claim_census_membership() returns boolean language sql security invoker set search_path='' as $$select private.claim_census_membership();$$;
revoke all on function private.claim_census_membership(),public.claim_census_membership() from public,anon;
grant execute on function private.claim_census_membership(),public.claim_census_membership() to authenticated;

-- An approved SEPA mandate is not proof of collection. Preserve manual receipts.
create function private.sync_application_census() returns trigger language plpgsql security definer set search_path='' as $$
declare v_member uuid;
begin
  select id into v_member from public.club_members where profile_id=new.user_id;
  if v_member is null then raise exception 'MEMBER_REGISTER_MISSING'; end if;
  update public.club_members set phone=new.phone,category=new.category,annual_fee_cents=new.fee_cents,season=new.season,updated_at=now() where id=v_member;
  update public.profiles set phone=new.phone where id=new.user_id;
  if new.fee_cents>0 then
    insert into public.club_dues(member_id,description,amount,due_date,status,season,source)
    values(v_member,'Quota '||new.season,new.fee_cents/100.0,(new.submitted_at at time zone 'Europe/Madrid')::date,
      case when new.status='approved' and new.payment_method='transfer' then 'paid' else 'pending' end,new.season,'application')
    on conflict(member_id,season) do update set
      amount=case when club_dues.source='application' then excluded.amount else club_dues.amount end,
      status=case when club_dues.status in ('paid','returned') then club_dues.status when club_dues.source='application' and excluded.status='paid' then 'paid' else club_dues.status end;
  end if;
  return new;
end; $$;
revoke all on function private.sync_application_census() from public,anon,authenticated;
create trigger application_census_sync after insert or update of category,phone,payment_method,fee_cents,season,status on public.membership_applications for each row execute function private.sync_application_census();
update public.membership_applications set status=status;

create table public.club_member_documents(
  id uuid primary key default gen_random_uuid(),member_id uuid not null references public.club_members(id) on delete cascade,
  filename text not null check(length(filename) between 1 and 200),storage_path text not null unique,
  kind text not null default 'other' check(kind in ('form','receipt','mandate','other')),
  uploaded_by uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now()
);
create index club_member_documents_member_idx on public.club_member_documents(member_id);
create index club_member_documents_uploader_idx on public.club_member_documents(uploaded_by);
alter table public.club_member_documents enable row level security;
revoke all on public.club_member_documents from public,anon,authenticated;
grant select,insert on public.club_member_documents to authenticated;
grant all on public.club_member_documents to service_role;
create policy member_document_read on public.club_member_documents for select to authenticated using((select private.admin_section_enabled('socis')));
create policy member_document_insert on public.club_member_documents for insert to authenticated with check((select private.admin_section_enabled('socis')) and uploaded_by=(select auth.uid()));
insert into public.club_member_documents(member_id,filename,storage_path,created_at)
select m.id,'Document PDF',o.name,o.created_at from storage.objects o join public.club_members m on split_part(split_part(o.name,'/',2),'_',1)=m.id::text
where o.bucket_id='club-documents' and o.name like 'mandats/%';
update storage.buckets set allowed_mime_types=array['application/pdf','image/jpeg','image/png'] where id='club-documents';
create policy member_files_read on storage.objects for select to authenticated using(bucket_id='club-documents' and (select private.admin_section_enabled('socis')));
create policy member_files_insert on storage.objects for insert to authenticated with check(bucket_id='club-documents' and (select private.admin_section_enabled('socis')) and name ~ '^members/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg)$');
create policy member_files_cleanup on storage.objects for delete to authenticated using(bucket_id='club-documents' and (select private.admin_section_enabled('socis')) and not exists(select 1 from public.club_member_documents d where d.storage_path=name));

-- Existing dues remain intact; their access now belongs to the member section.
create policy member_dues_read on public.club_dues for select to authenticated using((select private.admin_section_enabled('socis')));
create policy member_dues_insert on public.club_dues for insert to authenticated with check((select private.admin_section_enabled('socis')));
create policy member_dues_update on public.club_dues for update to authenticated using((select private.admin_section_enabled('socis'))) with check((select private.admin_section_enabled('socis')));

create view public.admin_member_directory with (security_invoker=true) as
select m.*,f.name as family_name,p.role as web_role,p.member_active as web_active,
  a.status as application_status,a.payment_method,
  ((select count(*) from public.club_member_documents d where d.member_id=m.id)+case when a.document_path is not null then 1 else 0 end+case when a.receipt_path is not null then 1 else 0 end)::integer as document_count,
  coalesce(q.total,0)::integer as dues_count,coalesce(q.paid,0)::integer as paid_dues,
  coalesce(q.outstanding,0) as outstanding_amount,
  case when coalesce(q.returned,0)>0 then 'returned' when coalesce(q.pending,0)>0 then 'pending' when coalesce(q.total,0)>0 then 'paid' else 'unrecorded' end as quota_status,
  lower(m.full_name||' '||m.email||' '||m.phone||' '||m.legacy_reference||' '||coalesce(f.name,'')) as search_text
from public.club_members m left join public.profiles p on p.id=m.profile_id
left join public.club_families f on f.id=m.family_id left join public.membership_applications a on a.user_id=m.profile_id
left join lateral(select count(*) as total,count(*) filter(where status='paid') as paid,count(*) filter(where status='pending') as pending,count(*) filter(where status='returned') as returned,sum(amount) filter(where status<>'paid') as outstanding from public.club_dues where member_id=m.id) q on true;
revoke all on public.admin_member_directory from public,anon,authenticated;
grant select on public.admin_member_directory to authenticated;

create function private.admin_save_member(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_profile uuid; v_existing public.club_members; v_name text=trim(p_data->>'full_name');
  v_email text=lower(trim(coalesce(p_data->>'email',''))); v_status text=coalesce(p_data->>'status','pending');
begin
  if not private.admin_section_enabled('socis') then raise insufficient_privilege; end if;
  if v_name is null or length(v_name) not between 2 and 100 or v_name ~ '[[:cntrl:]]' or length(coalesce(p_data->>'phone',''))>40 or length(v_email)>254 or (v_email<>'' and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or v_status not in ('active','pending','inactive') then raise invalid_parameter_value; end if;
  if nullif(p_data->>'id','') is not null then
    v_id:=(p_data->>'id')::uuid;
    select * into v_existing from public.club_members where id=v_id for update;
    if not found then raise invalid_parameter_value; end if;
    if v_existing.profile_id is not null and v_email<>lower(trim(v_existing.email)) then raise invalid_parameter_value using message='LINKED_EMAIL_READONLY'; end if;
    v_profile:=v_existing.profile_id;
  end if;
  if v_profile is null and v_email<>'' then select id into v_profile from public.profiles where lower(trim(email))=v_email; end if;
  if v_id is null then
    insert into public.club_members(profile_id,full_name,email,phone,status,family_id,legacy_reference,category,annual_fee_cents,season,notes,source)
    values(v_profile,v_name,v_email,coalesce(p_data->>'phone',''),v_status,nullif(p_data->>'family_id','')::uuid,coalesce(p_data->>'legacy_reference',''),nullif(p_data->>'category',''),nullif(p_data->>'annual_fee_cents','')::integer,nullif(p_data->>'season',''),coalesce(p_data->>'notes',''),coalesce(p_data->>'source','manual')) returning id into v_id;
  else
    update public.club_members set profile_id=v_profile,full_name=v_name,email=v_email,phone=coalesce(p_data->>'phone',''),status=v_status,
      family_id=nullif(p_data->>'family_id','')::uuid,legacy_reference=coalesce(p_data->>'legacy_reference',''),category=nullif(p_data->>'category',''),
      annual_fee_cents=nullif(p_data->>'annual_fee_cents','')::integer,season=nullif(p_data->>'season',''),notes=coalesce(p_data->>'notes',''),updated_at=now() where id=v_id;
  end if;
  return v_id;
end; $$;
create function public.admin_save_member(p_data jsonb) returns uuid language sql security invoker set search_path='' as $$select private.admin_save_member(p_data);$$;

create function private.admin_import_members(p_rows jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb; v_by_email uuid; v_by_reference uuid; v_count integer=0; v_base jsonb; v_saved uuid;
begin
  if not private.admin_section_enabled('socis') then raise insufficient_privilege; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise invalid_parameter_value; end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    if trim(coalesce(item->>'email',''))='' and trim(coalesce(item->>'legacy_reference',''))='' then raise invalid_parameter_value using message='IMPORT_ID_REQUIRED'; end if;
    v_by_email:=null; v_by_reference:=null;
    select id into v_by_email from public.club_members where trim(email)<>'' and lower(trim(email))=lower(trim(item->>'email'));
    select id into v_by_reference from public.club_members where trim(legacy_reference)<>'' and lower(trim(legacy_reference))=lower(trim(item->>'legacy_reference'));
    if v_by_email is not null and v_by_reference is not null and v_by_email<>v_by_reference then raise invalid_parameter_value using message='IMPORT_ID_CONFLICT'; end if;
    select to_jsonb(m) into v_base from public.club_members m where m.id=coalesce(v_by_email,v_by_reference);
    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into item from jsonb_each(item) where value<>'null'::jsonb and value<>'""'::jsonb;
    item:=coalesce(v_base,jsonb_build_object('status','active'))||item||jsonb_build_object('id',coalesce(v_by_email,v_by_reference),'source','historical');
    v_saved:=private.admin_save_member(item);
    if item->>'dues_status' is not null then
      if item->>'dues_status' not in ('paid','pending','returned') or coalesce(item->>'season','')='' or coalesce((item->>'annual_fee_cents')::integer,0)<=0 then raise invalid_parameter_value using message='IMPORT_FEE_INVALID'; end if;
      insert into public.club_dues(member_id,description,amount,due_date,status,season,source)
      values(v_saved,'Quota '||(item->>'season'),(item->>'annual_fee_cents')::integer/100.0,current_date,item->>'dues_status',item->>'season','import')
      on conflict(member_id,season) do update set amount=excluded.amount,status=excluded.status;
    end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;
create function public.admin_import_members(p_rows jsonb) returns integer language sql security invoker set search_path='' as $$select private.admin_import_members(p_rows);$$;

create function private.reserve_member_invitation(p_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare v_member public.club_members;
begin
  if not private.admin_section_enabled('socis') then raise insufficient_privilege; end if;
  select * into v_member from public.club_members where id=p_id for update;
  if not found or v_member.email='' then raise invalid_parameter_value; end if;
  if v_member.invitation_attempted_at>now()-interval '60 seconds' then raise exception using errcode='P0001',message='INVITATION_RATE_LIMIT'; end if;
  update public.club_members set invitation_attempted_at=now(),invitation_status='sending' where id=p_id;
  return v_member.email;
end; $$;
create function public.reserve_member_invitation(p_id uuid) returns text language sql security invoker set search_path='' as $$select private.reserve_member_invitation(p_id);$$;
revoke all on function private.admin_save_member(jsonb),public.admin_save_member(jsonb),private.admin_import_members(jsonb),public.admin_import_members(jsonb),private.reserve_member_invitation(uuid),public.reserve_member_invitation(uuid) from public,anon;
grant execute on function private.admin_save_member(jsonb),public.admin_save_member(jsonb),private.admin_import_members(jsonb),public.admin_import_members(jsonb),private.reserve_member_invitation(uuid),public.reserve_member_invitation(uuid) to authenticated;
