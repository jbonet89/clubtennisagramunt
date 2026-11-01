-- Supabase's default event-trigger helper must not be an exposed RPC.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
  end if;
end $$;
alter table public.club_settings alter column opening_minute set default 420;
alter table public.club_settings alter column closing_minute set default 1380;
update public.club_settings set opening_minute=420,closing_minute=1380 where id=true;
