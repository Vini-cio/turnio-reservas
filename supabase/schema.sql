-- Turnio — esquema de base de datos (idempotente: se puede ejecutar varias veces).
--
-- Códigos de error propios (SQLSTATE) que devuelven triggers y RPC:
--   TUA01  no hay sesión
--   TUP01  operación no permitida para este usuario
--   TUP02  el servicio no pertenece al profesional del hueco
--   TUN01  el hueco no existe        TUN02  la reserva no existe      TUN03  el servicio no existe
--   TUC01  la reserva ya está cancelada
--   TUR02  hueco en el pasado (R2)   TUR03  huecos solapados (R3)     TUR04  hueco ya reservado (R4)
--   TUR05  reservar hueco pasado o propio (R5)                        TUR06  máximo de reservas (R6)
--   TUR07  cancelación fuera de plazo (R7)                            TUR08  borrar hueco reservado (R8)
--   TUS01  la duración de un servicio no se puede cambiar (los huecos ya publicados dependen de ella)

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'client',
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('provider', 'client')),
  constraint profiles_full_name_length check (char_length(full_name) <= 100)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  duration_min integer not null,
  price_cents integer not null,
  created_at timestamptz not null default now(),
  -- R1
  constraint services_name_length check (char_length(btrim(name)) between 2 and 80),
  constraint services_duration_range check (duration_min between 15 and 240 and duration_min % 5 = 0),
  constraint services_price_non_negative check (price_cents >= 0)
);

create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint slots_time_order check (ends_at > starts_at),
  -- R3: los huecos de un mismo profesional no se solapan (intervalos semiabiertos [inicio, fin)).
  constraint slots_no_overlap exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'confirmed',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bookings_status_check check (status in ('confirmed', 'cancelled')),
  constraint bookings_cancelled_at_check check ((status = 'cancelled') = (cancelled_at is not null))
);

-- R4: como mucho una reserva confirmada por hueco.
create unique index if not exists bookings_one_confirmed_per_slot
  on public.bookings (slot_id) where status = 'confirmed';

create index if not exists services_provider_id_idx on public.services (provider_id);
create index if not exists slots_provider_starts_idx on public.slots (provider_id, starts_at);
create index if not exists slots_service_id_idx on public.slots (service_id);
create index if not exists bookings_client_id_idx on public.bookings (client_id);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------------

create or replace function public.is_provider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'provider'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Crea el perfil al registrarse, con full_name y role de raw_user_meta_data (por defecto 'client').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)), 100),
    case when new.raw_user_meta_data ->> 'role' = 'provider' then 'provider' else 'client' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Antes de guardar un hueco: valida el servicio, calcula ends_at, impone R2 y R3 con mensajes claros.
create or replace function public.slots_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
begin
  select * into v_service from public.services where id = new.service_id;
  if not found then
    raise exception using errcode = 'TUN03', message = 'El servicio no existe.';
  end if;
  if v_service.provider_id <> new.provider_id then
    raise exception using errcode = 'TUP02', message = 'El servicio no pertenece a este profesional.';
  end if;

  new.ends_at := new.starts_at + make_interval(mins => v_service.duration_min);

  if (tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at) and new.starts_at <= now() then
    raise exception using errcode = 'TUR02', message = 'No se pueden publicar huecos en el pasado.';
  end if;

  if exists (
    select 1 from public.slots s
    where s.provider_id = new.provider_id
      and s.id <> new.id
      and tstzrange(s.starts_at, s.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception using errcode = 'TUR03', message = 'Este hueco se solapa con otro que ya tienes publicado.';
  end if;

  return new;
end;
$$;

drop trigger if exists slots_before_write on public.slots;
create trigger slots_before_write
  before insert or update on public.slots
  for each row execute function public.slots_before_write();

-- La duración de un servicio es inmutable: los huecos publicados calculan su fin con ella.
create or replace function public.services_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.duration_min is distinct from old.duration_min then
    raise exception using errcode = 'TUS01',
      message = 'La duración de un servicio no se puede cambiar. Crea un servicio nuevo con la duración que necesites.';
  end if;
  return new;
end;
$$;

drop trigger if exists services_before_update on public.services;
create trigger services_before_update
  before update on public.services
  for each row execute function public.services_before_update();

-- R8: no se puede borrar un hueco con una reserva confirmada.
create or replace function public.slots_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.bookings where slot_id = old.id and status = 'confirmed') then
    raise exception using errcode = 'TUR08',
      message = 'No se puede borrar un hueco con una reserva confirmada. Cancela primero la reserva.';
  end if;
  return old;
end;
$$;

drop trigger if exists slots_before_delete on public.slots;
create trigger slots_before_delete
  before delete on public.slots
  for each row execute function public.slots_before_delete();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;

-- profiles: se ven los profesionales (página pública), el propio perfil y los clientes
-- que han reservado en mis huecos. Solo se puede editar el propio full_name.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to anon, authenticated
  using (
    role = 'provider'
    or id = auth.uid()
    or exists (
      select 1
      from public.bookings b
      join public.slots s on s.id = b.slot_id
      where b.client_id = profiles.id and s.provider_id = auth.uid()
    )
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sin políticas de insert/delete en profiles: los crea el trigger de registro.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- services
drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to anon, authenticated
  using (true);

drop policy if exists services_insert_own on public.services;
create policy services_insert_own on public.services
  for insert to authenticated
  with check (provider_id = auth.uid() and public.is_provider());

drop policy if exists services_update_own on public.services;
create policy services_update_own on public.services
  for update to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

drop policy if exists services_delete_own on public.services;
create policy services_delete_own on public.services
  for delete to authenticated
  using (provider_id = auth.uid());

-- slots (sin política de update: un hueco se publica o se borra, no se edita)
drop policy if exists slots_select on public.slots;
create policy slots_select on public.slots
  for select to anon, authenticated
  using (true);

drop policy if exists slots_insert_own on public.slots;
create policy slots_insert_own on public.slots
  for insert to authenticated
  with check (provider_id = auth.uid() and public.is_provider());

drop policy if exists slots_delete_own on public.slots;
create policy slots_delete_own on public.slots
  for delete to authenticated
  using (provider_id = auth.uid());

revoke update on public.slots from anon, authenticated;

-- bookings: las ve el cliente o el profesional del hueco. Solo se escriben vía RPC.
drop policy if exists bookings_select_involved on public.bookings;
create policy bookings_select_involved on public.bookings
  for select to authenticated
  using (
    client_id = auth.uid()
    or exists (select 1 from public.slots s where s.id = bookings.slot_id and s.provider_id = auth.uid())
  );

revoke insert, update, delete on public.bookings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Reserva un hueco de forma atómica (R4, R5, R6). Devuelve el id de la reserva.
create or replace function public.book_slot(p_slot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot public.slots%rowtype;
  v_future_count integer;
  v_booking_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'TUA01', message = 'Debes iniciar sesión para reservar.';
  end if;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then
    raise exception using errcode = 'TUN01', message = 'El hueco no existe.';
  end if;

  if v_slot.starts_at <= now() then
    raise exception using errcode = 'TUR05', message = 'No se puede reservar un hueco que ya ha pasado.';
  end if;
  if v_slot.provider_id = v_uid then
    raise exception using errcode = 'TUR05', message = 'No puedes reservar un hueco propio.';
  end if;

  if exists (select 1 from public.bookings where slot_id = p_slot_id and status = 'confirmed') then
    raise exception using errcode = 'TUR04', message = 'Este hueco ya está reservado.';
  end if;

  -- Serializa las reservas de un mismo cliente para que R6 no se salte con peticiones simultáneas.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception using errcode = 'TUP01', message = 'Tu usuario no tiene perfil.';
  end if;

  select count(*) into v_future_count
  from public.bookings b
  join public.slots s on s.id = b.slot_id
  where b.client_id = v_uid and b.status = 'confirmed' and s.starts_at > now();

  if v_future_count >= 3 then
    raise exception using errcode = 'TUR06',
      message = 'Ya tienes 3 reservas futuras confirmadas. Cancela una para poder reservar otra.';
  end if;

  insert into public.bookings (slot_id, client_id)
  values (p_slot_id, v_uid)
  returning id into v_booking_id;

  return v_booking_id;
exception
  when unique_violation then
    raise exception using errcode = 'TUR04', message = 'Este hueco ya está reservado.';
end;
$$;

-- Cancela una reserva (R7): el cliente hasta 2 h antes del inicio; el profesional, siempre.
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_client_id uuid;
  v_status text;
  v_starts_at timestamptz;
  v_provider_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'TUA01', message = 'Debes iniciar sesión para cancelar.';
  end if;

  select b.client_id, b.status, s.starts_at, s.provider_id
    into v_client_id, v_status, v_starts_at, v_provider_id
  from public.bookings b
  join public.slots s on s.id = b.slot_id
  where b.id = p_booking_id
  for update of b;

  if not found then
    raise exception using errcode = 'TUN02', message = 'La reserva no existe.';
  end if;
  if v_uid <> v_client_id and v_uid <> v_provider_id then
    raise exception using errcode = 'TUP01', message = 'No puedes cancelar esta reserva.';
  end if;
  if v_status = 'cancelled' then
    raise exception using errcode = 'TUC01', message = 'La reserva ya está cancelada.';
  end if;
  if v_uid <> v_provider_id and now() > v_starts_at - interval '2 hours' then
    raise exception using errcode = 'TUR07',
      message = 'Solo puedes cancelar hasta 2 horas antes del inicio de la cita.';
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now()
  where id = p_booking_id;
end;
$$;

-- Huecos libres futuros de un profesional (para la página pública, sin exponer quién reservó).
create or replace function public.free_slots(p_provider_id uuid)
returns table (
  id uuid,
  service_id uuid,
  service_name text,
  duration_min integer,
  price_cents integer,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.service_id, sv.name, sv.duration_min, sv.price_cents, s.starts_at, s.ends_at
  from public.slots s
  join public.services sv on sv.id = s.service_id
  where s.provider_id = p_provider_id
    and s.starts_at > now()
    and not exists (
      select 1 from public.bookings b where b.slot_id = s.id and b.status = 'confirmed'
    )
  order by s.starts_at;
$$;

-- Permisos de ejecución
revoke all on function public.book_slot(uuid) from public, anon;
grant execute on function public.book_slot(uuid) to authenticated;

revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

revoke all on function public.free_slots(uuid) from public;
grant execute on function public.free_slots(uuid) to anon, authenticated;

revoke all on function public.is_provider() from public, anon;
grant execute on function public.is_provider() to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.slots_before_write() from public, anon, authenticated;
revoke all on function public.slots_before_delete() from public, anon, authenticated;
revoke all on function public.services_before_update() from public, anon, authenticated;
