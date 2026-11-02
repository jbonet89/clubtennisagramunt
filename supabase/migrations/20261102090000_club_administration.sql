-- Independent membership register: an account is optional.
create table public.admin_sections (id text primary key, enabled boolean not null default true);
insert into public.admin_sections(id) values ('resum'),('socis'),('families'),('documents'),('quotes'),('permisos');
create table public.club_families(id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120));
create table public.club_members(id uuid primary key default gen_random_uuid(), full_name text not null check(length(trim(full_name)) between 1 and 100), email text not null default '', phone text not null default '', status text not null default 'pending' check(status in ('pending','active','inactive')), family_id uuid references public.club_families(id), created_at timestamptz not null default now());
create table public.club_dues(id uuid primary key default gen_random_uuid(), member_id uuid not null references public.club_members(id), description text not null check(length(trim(description)) between 1 and 160), amount numeric(10,2) not null check(amount>0), due_date date not null, status text not null default 'pending' check(status in ('pending','paid','returned')), created_at timestamptz not null default now());
create index club_members_family_idx on public.club_members(family_id);
create index club_dues_member_idx on public.club_dues(member_id);
create function private.admin_section_enabled(section_name text) returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin() and exists(select 1 from public.admin_sections where id=section_name and enabled); $$;
revoke all on function private.admin_section_enabled(text) from public,anon;
grant execute on function private.admin_section_enabled(text) to authenticated;
alter table public.admin_sections enable row level security;
revoke all on public.admin_sections from anon,authenticated;
grant select,update on public.admin_sections to authenticated;
create policy admin_sections_read on public.admin_sections for select to authenticated using((select private.is_admin()));
create policy admin_sections_update on public.admin_sections for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
do $$ declare t text; s text; begin
for t,s in select * from (values ('club_members','socis'),('club_families','families'),('club_dues','quotes')) as x(t,s) loop
execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from anon,authenticated',t);
execute format('grant select,insert,update on public.%I to authenticated',t);
execute format('create policy admin_read on public.%I for select to authenticated using(private.admin_section_enabled(%L))',t,s);
execute format('create policy admin_insert on public.%I for insert to authenticated with check(private.admin_section_enabled(%L))',t,s);
execute format('create policy admin_update on public.%I for update to authenticated using(private.admin_section_enabled(%L)) with check(private.admin_section_enabled(%L))',t,s,s);
end loop; end $$;
-- Private PDFs; no public URLs, no overwrite.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('club-documents','club-documents',false,10485760,array['application/pdf']);
create policy club_documents_read on storage.objects for select to authenticated using(bucket_id='club-documents' and private.admin_section_enabled('documents'));
create policy club_documents_insert on storage.objects for insert to authenticated with check(bucket_id='club-documents' and private.admin_section_enabled('documents'));
