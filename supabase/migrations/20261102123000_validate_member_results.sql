create function private.valid_member_sets(value jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb; a numeric; b numeric;
begin
 if jsonb_typeof(value)<>'array' or jsonb_array_length(value) not between 1 and 5 then return false; end if;
 for item in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(item)<>'array' or jsonb_array_length(item)<>2 or jsonb_typeof(item->0)<>'number' or jsonb_typeof(item->1)<>'number' then return false; end if;
  a=(item->>0)::numeric; b=(item->>1)::numeric;
  if a<>trunc(a) or b<>trunc(b) or least(a,b)<0 or not ((greatest(a,b)=6 and least(a,b)<=4) or (greatest(a,b)=7 and least(a,b) in (5,6))) then return false; end if;
 end loop;
 return true;
exception when others then return false;
end; $$;
revoke all on function private.valid_member_sets(jsonb) from public,anon;
grant execute on function private.valid_member_sets(jsonb) to authenticated;
alter table public.member_results add constraint valid_finished_sets check(private.valid_member_sets(sets));
