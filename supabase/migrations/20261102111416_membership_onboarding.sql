create table public.membership_settings (
 id boolean primary key default true check(id),
 adult_fee_cents integer not null default 6500 check(adult_fee_cents between 0 and 1000000),
 junior_fee_cents integer not null default 4000 check(junior_fee_cents between 0 and 1000000),
 season text not null default '2026' check(char_length(season) between 1 and 40),
 bank_name text not null default 'Caixa Guissona' check(char_length(bank_name) between 1 and 100),
 iban text not null default 'ES1331400001950007699500' check(iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
 whatsapp text not null default '34656676815' check(whatsapp ~ '^[0-9]{8,15}$'),
 form_url text not null default 'https://tennisagramunt.wordpress.com/wp-content/uploads/2018/06/formulari-dades-soci.pdf' check(form_url ~ '^https://'),
 note text not null default '' check(char_length(note)<=2000),
 updated_at timestamptz not null default now()
);
insert into public.membership_settings(id) values(true);
alter table public.membership_settings enable row level security;
revoke all on public.membership_settings from anon,authenticated;
grant select,update on public.membership_settings to authenticated;
create policy membership_settings_read on public.membership_settings for select to authenticated using((select auth.uid()) is not null);
create policy membership_settings_edit on public.membership_settings for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));

create table public.membership_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.profiles(id) on delete cascade,
 category text not null check(category in ('adult','junior')),
 phone text not null check(char_length(phone) between 6 and 30),
 payment_method text not null check(payment_method in ('transfer','direct_debit')),
 fee_cents integer not null check(fee_cents between 0 and 1000000),
 season text not null,
 document_path text not null,
 receipt_path text,
 status text not null default 'submitted' check(status in ('submitted','approved','changes_requested')),
 review_note text not null default '' check(char_length(review_note)<=1000),
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id) on delete set null
);
create index membership_applications_status_idx on public.membership_applications(status,submitted_at desc);
create index membership_applications_reviewer_idx on public.membership_applications(reviewed_by);
alter table public.membership_applications enable row level security;
revoke all on public.membership_applications from anon,authenticated;
grant select on public.membership_applications to authenticated;
create policy membership_applications_read on public.membership_applications for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('membership-documents','membership-documents',false,3145728,array['application/pdf','image/jpeg','image/png']);
create policy membership_files_read on storage.objects for select to authenticated
using(bucket_id='membership-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_admin())));
create policy membership_files_upload on storage.objects for insert to authenticated
with check(bucket_id='membership-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and (select auth.uid()) is not null);
create policy membership_files_delete on storage.objects for delete to authenticated
using(bucket_id='membership-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
 and not exists(select 1 from public.membership_applications a where a.document_path=name or a.receipt_path=name));

create function private.submit_membership(p_category text,p_phone text,p_method text,p_document text,p_receipt text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_settings public.membership_settings; v_profile public.profiles;
begin
 if auth.uid() is null then raise insufficient_privilege using message='AUTH_REQUIRED'; end if;
 select * into v_profile from public.profiles where id=auth.uid() for update;
 if not found or v_profile.member_active then raise insufficient_privilege using message='PENDING_ACCOUNT_REQUIRED'; end if;
 if p_category is null or p_category not in ('adult','junior') or p_method is null or p_method not in ('transfer','direct_debit')
 or p_phone is null or char_length(trim(p_phone)) not between 6 and 30 then raise invalid_parameter_value using message='INVALID_APPLICATION'; end if;
 if p_document is null or split_part(p_document,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='membership-documents' and name=p_document) then
 raise invalid_parameter_value using message='DOCUMENT_REQUIRED'; end if;
 if p_receipt is not null and (split_part(p_receipt,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='membership-documents' and name=p_receipt)) then
 raise invalid_parameter_value using message='INVALID_RECEIPT'; end if;
 select * into v_settings from public.membership_settings where id=true;
 insert into public.membership_applications(user_id,category,phone,payment_method,fee_cents,season,document_path,receipt_path)
 values(auth.uid(),p_category,trim(p_phone),p_method,case when p_category='adult' then v_settings.adult_fee_cents else v_settings.junior_fee_cents end,v_settings.season,p_document,p_receipt)
 on conflict(user_id) do update set category=excluded.category,phone=excluded.phone,payment_method=excluded.payment_method,fee_cents=excluded.fee_cents,
 season=excluded.season,document_path=excluded.document_path,receipt_path=excluded.receipt_path,status='submitted',review_note='',submitted_at=now(),reviewed_at=null,reviewed_by=null
 returning id into v_id;
 return v_id;
end; $$;
revoke all on function private.submit_membership(text,text,text,text,text) from public,anon;
grant execute on function private.submit_membership(text,text,text,text,text) to authenticated;
create function public.submit_membership(p_category text,p_phone text,p_method text,p_document text,p_receipt text default null)
returns uuid language sql security invoker set search_path='' as $$ select private.submit_membership(p_category,p_phone,p_method,p_document,p_receipt); $$;
revoke all on function public.submit_membership(text,text,text,text,text) from public,anon;
grant execute on function public.submit_membership(text,text,text,text,text) to authenticated;

create function private.review_membership(p_id uuid,p_status text,p_note text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare v_application public.membership_applications;
begin
 if auth.uid() is null or not private.is_admin() then raise insufficient_privilege using message='ADMIN_REQUIRED'; end if;
 if p_status is null or p_status not in ('approved','changes_requested') or p_note is null or char_length(p_note)>1000 then
 raise invalid_parameter_value using message='INVALID_REVIEW'; end if;
 select * into v_application from public.membership_applications where id=p_id for update;
 if not found then raise invalid_parameter_value using message='APPLICATION_NOT_FOUND'; end if;
 if v_application.status='approved' then raise invalid_parameter_value using message='ALREADY_APPROVED'; end if;
 if p_status='approved' then
 if not exists(select 1 from auth.users where id=v_application.user_id and email_confirmed_at is not null) then raise invalid_parameter_value using message='CONFIRMED_ACCOUNT_REQUIRED'; end if;
 if not exists(select 1 from storage.objects where bucket_id='membership-documents' and name=v_application.document_path) then raise invalid_parameter_value using message='DOCUMENT_REQUIRED'; end if;
 update public.profiles set role='member',member_active=true where id=v_application.user_id and role<>'admin';
 if not found then raise invalid_parameter_value using message='INVALID_APPLICANT'; end if;
 end if;
 update public.membership_applications set status=p_status,review_note=trim(p_note),reviewed_at=now(),reviewed_by=auth.uid() where id=p_id;
 return true;
end; $$;
revoke all on function private.review_membership(uuid,text,text) from public,anon;
grant execute on function private.review_membership(uuid,text,text) to authenticated;
create function public.review_membership(p_id uuid,p_status text,p_note text default '') returns boolean
language sql security invoker set search_path='' as $$ select private.review_membership(p_id,p_status,p_note); $$;
revoke all on function public.review_membership(uuid,text,text) from public,anon;
grant execute on function public.review_membership(uuid,text,text) to authenticated;
alter publication supabase_realtime add table public.membership_settings,public.membership_applications;
