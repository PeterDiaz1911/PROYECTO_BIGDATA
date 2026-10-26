begin;

create temporary table security_test_tracking (tracking_code text not null);
grant select, insert on security_test_tracking to authenticated;

insert into public.agencies (name, region, city)
values
  ('Security Test Agency A', 'Test region', 'Test city A'),
  ('Security Test Agency B', 'Test region', 'Test city B')
on conflict (name) do nothing;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
values
  ('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'operator-a@security-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Operator A"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'operator-b@security-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Operator B"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'owner@security-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Shipment Owner"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'other@security-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Other Customer"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'sorter-a@security-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sorter A"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'inactive@security-test.invalid', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Inactive User"}', now(), now());

update public.profiles
set role_code = 'operator', agency_id = (select id from public.agencies where name = 'Security Test Agency A')
where id = 'a0000000-0000-4000-8000-000000000001';

update public.profiles
set role_code = 'operator', agency_id = (select id from public.agencies where name = 'Security Test Agency B')
where id = 'a0000000-0000-4000-8000-000000000002';

update public.profiles
set role_code = 'sorter', agency_id = (select id from public.agencies where name = 'Security Test Agency A')
where id = 'a0000000-0000-4000-8000-000000000005';

update public.profiles set is_active = false
where id = 'a0000000-0000-4000-8000-000000000006';

do $$
declare
  public_tables text[] := array[
    'public.roles', 'public.agencies', 'public.profiles', 'public.customers',
    'public.shipments', 'public.shipment_history', 'public.shipment_assignments'
  ];
  relation_name text;
begin
  if (select count(*) from public.roles) <> 7 then
    raise exception 'Expected the seven logistics roles';
  end if;

  foreach relation_name in array public_tables loop
    if not (
      select c.relrowsecurity
      from pg_catalog.pg_class as c
      where c.oid = relation_name::regclass
    ) then
      raise exception 'RLS is not enabled on %', relation_name;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.shipments', 'SELECT')
    or has_table_privilege('anon', 'public.shipment_history', 'SELECT')
    or has_table_privilege('anon', 'public.profiles', 'SELECT') then
    raise exception 'Anonymous users must not read protected tables';
  end if;

  if has_function_privilege('anon', 'public.lookup_public_tracking(text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.lookup_public_tracking(text)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.lookup_public_tracking(text)', 'EXECUTE') then
    raise exception 'Only the server-side service role may call the public tracking RPC';
  end if;

  if has_function_privilege('anon', 'public.create_shipment(text, text, text, text, numeric, text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.create_shipment(text, text, text, text, numeric, text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.update_shipment_status(text, text, text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.assign_shipment(text, uuid, text)', 'EXECUTE') then
    raise exception 'Shipment RPC permissions are incorrect';
  end if;

  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
    or has_table_privilege('authenticated', 'public.profiles', 'INSERT')
    or has_table_privilege('authenticated', 'public.shipments', 'UPDATE')
    or has_table_privilege('authenticated', 'public.shipment_history', 'INSERT')
    or has_table_privilege('authenticated', 'public.shipment_assignments', 'INSERT') then
    raise exception 'Authenticated clients must not write protected tables directly';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as p
    where p.oid in (
      'public.handle_new_auth_user()'::regprocedure,
      'public.sync_customer_email()'::regprocedure,
      'public.current_role()'::regprocedure,
      'public.is_active_user()'::regprocedure,
      'public.has_role(text[])'::regprocedure,
      'public.current_agency()'::regprocedure,
      'public.create_shipment(text, text, text, text, numeric, text)'::regprocedure,
      'public.update_shipment_status(text, text, text)'::regprocedure,
      'public.assign_shipment(text, uuid, text)'::regprocedure,
      'public.lookup_public_tracking(text)'::regprocedure
    )
      and (
        not p.prosecdef
        or not ('search_path=""' = any(p.proconfig))
      )
  ) then
    raise exception 'Every privileged function must be SECURITY DEFINER with empty search_path';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  created_code text;
begin
  insert into pg_temp.security_test_tracking (tracking_code)
  select result.tracking_code
  from public.create_shipment(
    'owner@security-test.invalid',
    'Test destination',
    'Documentos',
    'standard',
    1.25,
    'Private declared contents'
  ) as result;

  select tracking_code into created_code from pg_temp.security_test_tracking limit 1;
  if created_code !~ '^SP-PE-[0-9A-F]{32}$' then
    raise exception 'Tracking code must contain 128 bits of random uppercase hex';
  end if;
  if (select count(*) from public.shipments where tracking_code = created_code) <> 1 then
    raise exception 'Operator must be able to persist a shipment in their own agency';
  end if;
  if (select count(*) from public.shipment_history where shipment_id = (
    select id from public.shipments where tracking_code = created_code
  )) <> 1 then
    raise exception 'Shipment creation must atomically create initial history';
  end if;

  begin
    update public.profiles set role_code = 'admin'
    where id = 'a0000000-0000-4000-8000-000000000001';
    raise exception 'Browser profile updates unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.shipments set tracking_code = 'SP-PE-00000000000000000000000000000000'
    where tracking_code = created_code;
    raise exception 'Browser shipment updates unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
begin
  begin
    update public.shipments
    set tracking_code = 'SP-PE-00000000000000000000000000000000'
    where tracking_code = created_code;
    raise exception 'Tracking code immutability trigger unexpectedly allowed an update';
  exception when check_violation then
    null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
begin
  if (select count(*) from public.shipments where tracking_code = created_code) <> 0 then
    raise exception 'Operator from agency B can read an agency A shipment';
  end if;
  begin
    perform * from public.update_shipment_status(created_code, 'classified', 'Unauthorized agency update');
    raise exception 'Cross-agency status update unexpectedly succeeded';
  exception when no_data_found then
    null;
  end;
  begin
    perform * from public.assign_shipment(created_code, 'a0000000-0000-4000-8000-000000000005', 'sorter');
    raise exception 'Cross-agency assignment unexpectedly succeeded';
  exception when no_data_found then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
begin
  begin
    perform * from public.update_shipment_status(created_code, 'classified', 'Unassigned update');
    raise exception 'Unassigned employee update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
begin
  if (select count(*) from public.assign_shipment(
    created_code, 'a0000000-0000-4000-8000-000000000005', 'sorter'
  )) <> 1 then
    raise exception 'Same-agency operator assignment failed';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
  shipment_id uuid;
begin
  if (select count(*) from public.update_shipment_status(
    created_code, 'classified', 'Classification completed'
  )) <> 1 then
    raise exception 'Assigned sorter status update failed';
  end if;
  select id into shipment_id from public.shipments where tracking_code = created_code;
  if (select count(*) from public.shipment_history where shipment_history.shipment_id = shipment_id) <> 2 then
    raise exception 'Status mutation did not append history atomically';
  end if;
  if not exists (
    select 1 from public.shipment_history
    where shipment_history.shipment_id = shipment_id
      and status = 'classified'
      and actor_id = auth.uid()
      and note = 'Classification completed'
  ) then
    raise exception 'History must retain the authenticated actor and note';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
begin
  if (select count(*) from public.shipments where tracking_code = created_code) <> 1 then
    raise exception 'Shipment owner cannot read their own shipment';
  end if;
  if (select count(*) from public.shipment_assignments) <> 0 then
    raise exception 'A customer can read internal employee assignment data';
  end if;
  begin
    perform * from public.create_shipment(
      'other@security-test.invalid', 'Spoofed destination', 'Public description',
      'standard', 1, 'Contents'
    );
    raise exception 'A client unexpectedly created or claimed a shipment';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
begin
  if (select count(*) from public.shipments where tracking_code = created_code) <> 0 then
    raise exception 'A different customer can read another customer shipment';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000006', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
begin
  if (select count(*) from public.shipments where tracking_code = created_code) <> 0
    or (select count(*) from public.shipment_history) <> 0 then
    raise exception 'An inactive account can read shipment data';
  end if;
  begin
    perform * from public.create_shipment(
      'owner@security-test.invalid', 'Inactive destination', 'Public description',
      'standard', 1, 'Contents'
    );
    raise exception 'An inactive user unexpectedly created a shipment';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform count(*) from public.shipments;
    raise exception 'Anonymous users unexpectedly read shipments';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform * from public.lookup_public_tracking('SP-PE-00000000000000000000000000000000');
    raise exception 'Anonymous users bypassed the Turnstile Edge Function';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
do $$
declare
  created_code text := (select tracking_code from pg_temp.security_test_tracking limit 1);
  public_result record;
begin
  select * into public_result
  from public.lookup_public_tracking(created_code);
  if public_result.tracking_code <> created_code
    or public_result.status <> 'classified'
    or public_result.city <> 'Test city A'
    or public_result.public_description <> 'Documentos' then
    raise exception 'Public tracking did not return the expected limited fields';
  end if;
end;
$$;

rollback;
