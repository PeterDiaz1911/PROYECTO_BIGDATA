create extension if not exists pgcrypto with schema extensions;

create table public.roles (
  code text primary key check (code in (
    'admin', 'operator', 'sorter', 'transport', 'courier', 'analyst', 'client'
  )),
  name text not null unique
);

insert into public.roles (code, name) values
  ('admin', 'Administrador'),
  ('operator', 'Operador postal'),
  ('sorter', 'Encargado de clasificación'),
  ('transport', 'Encargado de transporte'),
  ('courier', 'Repartidor'),
  ('analyst', 'Supervisor / Analista'),
  ('client', 'Cliente externo')
on conflict (code) do update set name = excluded.name;

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region text not null,
  city text not null,
  created_at timestamptz not null default now()
);

insert into public.agencies (name, region, city)
values ('Lima Centro', 'Lima Metropolitana', 'Lima')
on conflict (name) do nothing;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role_code text not null default 'client' references public.roles(code),
  agency_id uuid references public.agencies(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint profiles_client_without_agency check (role_code <> 'client' or agency_id is null),
  constraint profiles_staff_agency_required check (
    role_code in ('admin', 'analyst', 'client') or agency_id is not null
  )
);

create table public.customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique default (
    'SP-PE-' || upper(encode(extensions.gen_random_bytes(16), 'hex'))
  ),
  customer_id uuid not null references public.customers(user_id),
  agency_id uuid not null references public.agencies(id),
  registered_by uuid not null references public.profiles(id),
  destination text not null,
  public_description text not null check (
    public_description in ('Documentos', 'Ropa', 'Libros', 'Artículos generales')
  ),
  service text not null check (service in ('standard', 'express')),
  weight_kg numeric(8, 2) not null check (weight_kg > 0 and weight_kg <= 1000),
  contents text not null,
  status text not null default 'registered' check (status in (
    'registered', 'classified', 'in_transit', 'at_destination',
    'out_for_delivery', 'delivered', 'delivery_failed', 'returned'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_customer_created_idx on public.shipments (customer_id, created_at desc);
create index shipments_agency_created_idx on public.shipments (agency_id, created_at desc);

create table public.shipment_history (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null check (status in (
    'registered', 'classified', 'in_transit', 'at_destination',
    'out_for_delivery', 'delivered', 'delivery_failed', 'returned'
  )),
  note text not null,
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index shipment_history_timeline_idx on public.shipment_history (shipment_id, created_at desc);

create table public.shipment_assignments (
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role_code text not null check (role_code in ('sorter', 'transport', 'courier')),
  assigned_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (shipment_id, role_code)
);

create index shipment_assignments_user_idx
  on public.shipment_assignments (user_id, role_code, shipment_id);

create function public.prevent_tracking_code_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tracking_code is distinct from old.tracking_code then
    raise exception using errcode = '23514', message = 'tracking_code_is_immutable';
  end if;
  return new;
end;
$$;

create trigger shipments_tracking_code_immutable
before update of tracking_code on public.shipments
for each row execute function public.prevent_tracking_code_change();

create function public.set_shipment_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shipments_set_updated_at
before update on public.shipments
for each row execute function public.set_shipment_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_name text;
begin
  if new.email is null then
    raise exception using errcode = '22023', message = 'email_address_required';
  end if;

  new_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, full_name, role_code)
  values (new.id, new_name, 'client');

  insert into public.customers (user_id, full_name, email)
  values (new.id, new_name, lower(new.email));

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create function public.sync_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.customers
    set email = lower(new.email)
    where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row execute function public.sync_customer_email();

create function public.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role_code
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active
$$;

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.is_active
    from public.profiles as p
    where p.id = (select auth.uid())
  ), false)
$$;

create function public.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role() = any(allowed_roles), false)
$$;

create function public.current_agency()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.agency_id
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active
$$;

alter table public.roles enable row level security;
alter table public.agencies enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_history enable row level security;
alter table public.shipment_assignments enable row level security;

create policy roles_read_authenticated
on public.roles for select to authenticated
using ((select public.is_active_user()));

create policy agencies_read_authenticated
on public.agencies for select to authenticated
using ((select public.is_active_user()));

create policy profiles_read_self_or_administration
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.has_role(array['admin', 'analyst'])
  or (
    agency_id = (select public.current_agency())
    and public.has_role(array['operator', 'sorter', 'transport', 'courier'])
  )
);

create policy customers_read_self
on public.customers for select to authenticated
using (user_id = (select auth.uid()) and (select public.is_active_user()));

create policy shipments_read_owner_or_authorized_staff
on public.shipments for select to authenticated
using (
  (select public.is_active_user())
  and (
  customer_id = (select auth.uid())
  or public.has_role(array['admin', 'analyst'])
  or (
    agency_id = (select public.current_agency())
    and public.has_role(array['operator', 'sorter', 'transport', 'courier'])
  )
  )
);

create policy shipment_history_read_visible_shipment
on public.shipment_history for select to authenticated
using (
  exists (
    select 1
    from public.shipments as s
    where s.id = shipment_id
  )
);

create policy shipment_assignments_read_visible_shipment
on public.shipment_assignments for select to authenticated
using (
  (select public.is_active_user())
  and (
    user_id = (select auth.uid())
    or public.has_role(array['admin', 'analyst'])
    or (
      exists (
        select 1 from public.shipments as s
        where s.id = shipment_id
          and s.agency_id = (select public.current_agency())
      )
      and public.has_role(array['operator', 'sorter', 'transport', 'courier'])
    )
  )
);

grant usage on schema public to authenticated, service_role;
revoke all on public.roles, public.agencies, public.profiles, public.customers,
  public.shipments, public.shipment_history, public.shipment_assignments
  from public, anon, authenticated;
grant select on public.roles, public.agencies, public.profiles, public.customers,
  public.shipments, public.shipment_history, public.shipment_assignments to authenticated;

create function public.record_shipment_history()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  event_note text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authenticated_actor_required';
  end if;

  if tg_op = 'INSERT' then
    insert into public.shipment_history (shipment_id, status, note, actor_id)
    values (new.id, new.status, 'Encomienda registrada.', actor_id);
    return new;
  end if;

  if new.status is distinct from old.status then
    event_note := nullif(trim(current_setting('app.shipment_status_note', true)), '');
    if event_note is null then
      raise exception using errcode = '23514', message = 'shipment_history_note_required';
    end if;
    insert into public.shipment_history (shipment_id, status, note, actor_id)
    values (new.id, new.status, event_note, actor_id);
  end if;
  return new;
end;
$$;

create trigger shipments_record_history
after insert or update of status on public.shipments
for each row execute function public.record_shipment_history();

create function public.create_shipment(
  p_customer_email text,
  p_destination text,
  p_public_description text,
  p_service text,
  p_weight_kg numeric,
  p_contents text
)
returns table (id uuid, tracking_code text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_agency uuid;
  recipient_id uuid;
  created_shipment public.shipments%rowtype;
  clean_destination text := trim(coalesce(p_destination, ''));
  clean_public_description text := trim(coalesce(p_public_description, ''));
  clean_contents text := trim(coalesce(p_contents, ''));
begin
  if actor_id is null or not public.has_role(array['operator']) then
    raise exception using errcode = '42501', message = 'operator_role_required';
  end if;

  select p.agency_id into actor_agency
  from public.profiles as p
  where p.id = actor_id;

  if actor_agency is null then
    raise exception using errcode = '23514', message = 'operator_agency_required';
  end if;

  if p_customer_email is null or length(trim(p_customer_email)) > 320 then
    raise exception using errcode = '22023', message = 'valid_customer_email_required';
  end if;

  select c.user_id into recipient_id
  from public.customers as c
  join auth.users as u on u.id = c.user_id
  join public.profiles as p on p.id = c.user_id
  where lower(c.email) = lower(trim(p_customer_email))
    and u.email_confirmed_at is not null
    and p.role_code = 'client'
    and p.is_active;

  if recipient_id is null then
    raise exception using errcode = 'P0002', message = 'confirmed_customer_not_found';
  end if;

  if clean_destination = '' or length(clean_destination) > 300
    or clean_public_description not in ('Documentos', 'Ropa', 'Libros', 'Artículos generales')
    or clean_contents = '' or length(clean_contents) > 300
    or p_service is null or p_service not in ('standard', 'express')
    or p_weight_kg is null or p_weight_kg <= 0 or p_weight_kg > 1000 then
    raise exception using errcode = '22023', message = 'invalid_shipment_details';
  end if;

  insert into public.shipments (
    customer_id, agency_id, registered_by, destination, public_description, service,
    weight_kg, contents, status
  )
  values (
    recipient_id, actor_agency, actor_id, clean_destination, clean_public_description, p_service,
    p_weight_kg, clean_contents, 'registered'
  )
  returning * into created_shipment;

  return query
  select created_shipment.id, created_shipment.tracking_code,
    created_shipment.status, created_shipment.created_at;
end;
$$;

create function public.update_shipment_status(
  p_tracking_code text,
  p_status text,
  p_note text
)
returns table (id uuid, tracking_code text, status text, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  actor_agency uuid;
  current_shipment public.shipments%rowtype;
  clean_note text := trim(coalesce(p_note, ''));
  transition_allowed boolean := false;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select p.role_code, p.agency_id into actor_role, actor_agency
  from public.profiles as p
  where p.id = actor_id
    and p.is_active;

  if actor_role is null or actor_role not in ('admin', 'sorter', 'transport', 'courier') then
    raise exception using errcode = '42501', message = 'shipment_update_role_required';
  end if;

  if p_status is null then
    raise exception using errcode = '22023', message = 'valid_shipment_status_required';
  end if;

  select s.* into current_shipment
  from public.shipments as s
  where s.tracking_code = upper(trim(coalesce(p_tracking_code, '')))
    and (actor_role = 'admin' or s.agency_id = actor_agency)
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'shipment_not_found';
  end if;

  if clean_note = '' or length(clean_note) > 500 then
    raise exception using errcode = '22023', message = 'valid_status_note_required';
  end if;

  transition_allowed := case current_shipment.status
    when 'registered' then p_status = 'classified' and actor_role in ('admin', 'sorter')
    when 'classified' then p_status = 'in_transit' and actor_role in ('admin', 'transport')
    when 'in_transit' then p_status = 'at_destination' and actor_role in ('admin', 'transport')
    when 'at_destination' then p_status = 'out_for_delivery' and actor_role in ('admin', 'courier')
    when 'out_for_delivery' then p_status in ('delivered', 'delivery_failed')
      and actor_role in ('admin', 'courier')
    when 'delivery_failed' then p_status in ('out_for_delivery', 'returned')
      and actor_role in ('admin', 'courier')
    else false
  end;

  if not transition_allowed then
    raise exception using errcode = '42501', message = 'invalid_status_transition';
  end if;

  if actor_role <> 'admin' and not exists (
    select 1
    from public.shipment_assignments as a
    where a.shipment_id = current_shipment.id
      and a.user_id = actor_id
      and a.role_code = actor_role
  ) then
    raise exception using errcode = '42501', message = 'shipment_assignment_required';
  end if;

  perform set_config('app.shipment_status_note', clean_note, true);

  update public.shipments as s
  set status = p_status
  where s.id = current_shipment.id
  returning * into current_shipment;

  return query
  select current_shipment.id, current_shipment.tracking_code,
    current_shipment.status, current_shipment.updated_at;
end;
$$;

create function public.assign_shipment(
  p_tracking_code text,
  p_staff_id uuid,
  p_role_code text
)
returns table (tracking_code text, user_id uuid, role_code text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  actor_agency uuid;
  target_agency uuid;
  shipment public.shipments%rowtype;
begin
  select p.role_code, p.agency_id into actor_role, actor_agency
  from public.profiles as p
  where p.id = actor_id and p.is_active;

  if actor_role is null or actor_role not in ('admin', 'operator') then
    raise exception using errcode = '42501', message = 'shipment_assignment_role_required';
  end if;

  if p_role_code not in ('sorter', 'transport', 'courier') then
    raise exception using errcode = '22023', message = 'invalid_assignment_role';
  end if;

  select s.* into shipment
  from public.shipments as s
  where s.tracking_code = upper(trim(coalesce(p_tracking_code, '')))
    and (actor_role = 'admin' or s.agency_id = actor_agency)
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'shipment_not_found';
  end if;

  select p.agency_id into target_agency
  from public.profiles as p
  where p.id = p_staff_id
    and p.role_code = p_role_code
    and p.is_active;

  if target_agency is null or target_agency <> shipment.agency_id then
    raise exception using errcode = '42501', message = 'staff_agency_or_role_mismatch';
  end if;

  insert into public.shipment_assignments (shipment_id, user_id, role_code, assigned_by)
  values (shipment.id, p_staff_id, p_role_code, actor_id)
  on conflict (shipment_id, role_code)
  do update set
    user_id = excluded.user_id,
    assigned_by = excluded.assigned_by,
    created_at = now();

  return query
  select shipment.tracking_code, p_staff_id, p_role_code, a.created_at
  from public.shipment_assignments as a
  where a.shipment_id = shipment.id
    and a.user_id = p_staff_id
    and a.role_code = p_role_code;
end;
$$;

create function public.lookup_public_tracking(p_tracking_code text)
returns table (
  tracking_code text,
  status text,
  agency_name text,
  city text,
  created_at timestamptz,
  updated_at timestamptz,
  public_description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.tracking_code, s.status, a.name, a.city,
    s.created_at, s.updated_at, s.public_description
  from public.shipments as s
  join public.agencies as a on a.id = s.agency_id
  where upper(trim(coalesce(p_tracking_code, ''))) ~ '^SP-PE-[0-9A-F]{32}$'
    and s.tracking_code = upper(trim(p_tracking_code))
  limit 1
$$;

revoke all on function public.current_role() from public, anon, authenticated;
revoke all on function public.is_active_user() from public, anon, authenticated;
revoke all on function public.has_role(text[]) from public, anon, authenticated;
revoke all on function public.current_agency() from public, anon, authenticated;
revoke all on function public.set_shipment_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_tracking_code_change() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.sync_customer_email() from public, anon, authenticated;
revoke all on function public.record_shipment_history() from public, anon, authenticated;
revoke all on function public.create_shipment(text, text, text, text, numeric, text) from public, anon, authenticated;
revoke all on function public.update_shipment_status(text, text, text) from public, anon, authenticated;
revoke all on function public.assign_shipment(text, uuid, text) from public, anon, authenticated;
revoke all on function public.lookup_public_tracking(text) from public, anon, authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.has_role(text[]) to authenticated;
grant execute on function public.current_agency() to authenticated;
grant execute on function public.create_shipment(text, text, text, text, numeric, text) to authenticated;
grant execute on function public.update_shipment_status(text, text, text) to authenticated;
grant execute on function public.assign_shipment(text, uuid, text) to authenticated;
grant execute on function public.lookup_public_tracking(text) to service_role;
