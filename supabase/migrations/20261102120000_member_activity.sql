create table public.member_results (
 booking_id uuid primary key references public.bookings(id),
 user_id uuid not null references public.profiles(id),
 sets jsonb not null check(jsonb_typeof(sets)='array' and jsonb_array_length(sets) between 1 and 5),
 updated_at timestamptz not null default now()
);
alter table public.member_results enable row level security;
revoke all on public.member_results from anon,authenticated;
grant select,insert,update on public.member_results to authenticated;
create policy results_read on public.member_results for select to authenticated using(user_id=(select auth.uid()));
create policy results_insert on public.member_results for insert to authenticated with check(user_id=(select auth.uid()) and private.is_member() and exists(select 1 from public.bookings b where b.id=booking_id and b.user_id=auth.uid() and b.status='confirmed' and b.end_time<=now()));
create policy results_update on public.member_results for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and private.is_member() and exists(select 1 from public.bookings b where b.id=booking_id and b.user_id=auth.uid() and b.status='confirmed' and b.end_time<=now()));
create index member_results_user_idx on public.member_results(user_id);
