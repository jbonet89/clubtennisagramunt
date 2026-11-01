-- Only a currently active administrator can delegate administration.
create function private.grant_admin(p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise insufficient_privilege using message='ADMIN_REQUIRED';
  end if;
  if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null) then
    raise invalid_parameter_value using message='CONFIRMED_ACCOUNT_REQUIRED';
  end if;
  update public.profiles set role='admin',member_active=true where id=p_user_id;
  if not found then raise invalid_parameter_value using message='MEMBER_NOT_FOUND'; end if;
  return true;
end; $$;
revoke all on function private.grant_admin(uuid) from public,anon;
grant execute on function private.grant_admin(uuid) to authenticated;

create function public.grant_admin(p_user_id uuid) returns boolean
language sql security invoker set search_path='' as $$ select private.grant_admin(p_user_id); $$;
revoke all on function public.grant_admin(uuid) from public,anon;
grant execute on function public.grant_admin(uuid) to authenticated;
