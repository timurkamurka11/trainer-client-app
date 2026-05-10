-- TimFit FULL sync schema for Supabase
-- Вставь весь этот файл в Supabase SQL Editor и нажми Run.
-- Синхронизирует: лиды, клиенты, календарь, профиль, площадки, шаблоны, очередь сообщений и ручные записи CRM.

create extension if not exists pgcrypto;

-- Убираем старые view, чтобы не было конфликтов старой структуры.
drop view if exists public.admin_leads cascade;
drop view if exists public.available_slots cascade;
drop view if exists public.available_booking_slots cascade;
drop view if exists public.free_booking_slots cascade;

-- Календарные слоты для клиентской страницы.
create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time text not null,
  end_time text,
  capacity integer not null default 1 check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.booking_slots add column if not exists end_time text;
alter table public.booking_slots add column if not exists capacity integer not null default 1;
alter table public.booking_slots add column if not exists is_active boolean not null default true;
alter table public.booking_slots add column if not exists created_at timestamptz not null default now();

alter table public.booking_slots alter column start_time type text using start_time::text;
alter table public.booking_slots alter column end_time type text using end_time::text;

update public.booking_slots
set start_time = substring(start_time from 1 for 5)
where start_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$';

update public.booking_slots
set end_time = substring(end_time from 1 for 5)
where end_time ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$';

update public.booking_slots
set end_time = to_char((start_time::time + interval '1 hour')::time, 'HH24:MI')
where (end_time is null or end_time = '')
  and start_time ~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'booking_slots_date_start_time_key'
  ) then
    alter table public.booking_slots
    add constraint booking_slots_date_start_time_key unique (date, start_time);
  end if;
exception when others then null;
end $$;

-- Лиды и заявки с сайта.
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.booking_slots(id) on delete set null,
  client_name text not null,
  contact text not null default '',
  goal text,
  format text,
  comment text,
  status text not null default 'Новый лид',
  source text not null default 'Страница записи',
  next_step text not null default 'Подтвердить запись и написать клиенту',
  follow_up text not null default 'Сегодня',
  created_at timestamptz not null default now()
);

alter table public.booking_requests alter column slot_id drop not null;
alter table public.booking_requests alter column status set default 'Новый лид';
alter table public.booking_requests add column if not exists source text not null default 'Страница записи';
alter table public.booking_requests add column if not exists next_step text not null default 'Подтвердить запись и написать клиенту';
alter table public.booking_requests add column if not exists follow_up text not null default 'Сегодня';
alter table public.booking_requests add column if not exists created_at timestamptz not null default now();
update public.booking_requests set status = 'Новый лид' where status is null or status in ('new', '');
update public.booking_requests set source = 'Страница записи' where source is null or source = '';
update public.booking_requests set next_step = 'Подтвердить запись и написать клиенту' where next_step is null or next_step = '';
update public.booking_requests set follow_up = 'Сегодня' where follow_up is null or follow_up = '';

-- Клиенты и история тренировок.
create table if not exists public.crm_clients (
  id text primary key,
  name text not null,
  contact text,
  goal text,
  format text,
  status text not null default 'Активный клиент',
  package_name text,
  sessions_left integer not null default 0,
  next_workout text,
  notes text,
  workouts jsonb not null default '[]'::jsonb,
  created_at_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_clients add column if not exists contact text;
alter table public.crm_clients add column if not exists goal text;
alter table public.crm_clients add column if not exists format text;
alter table public.crm_clients add column if not exists status text not null default 'Активный клиент';
alter table public.crm_clients add column if not exists package_name text;
alter table public.crm_clients add column if not exists sessions_left integer not null default 0;
alter table public.crm_clients add column if not exists next_workout text;
alter table public.crm_clients add column if not exists notes text;
alter table public.crm_clients add column if not exists workouts jsonb not null default '[]'::jsonb;
alter table public.crm_clients add column if not exists created_at_text text;
alter table public.crm_clients add column if not exists created_at timestamptz not null default now();
alter table public.crm_clients add column if not exists updated_at timestamptz not null default now();

update public.crm_clients set status = 'Активный клиент' where status is null or status = '';
update public.crm_clients set sessions_left = 0 where sessions_left is null;
update public.crm_clients set workouts = '[]'::jsonb where workouts is null;
update public.crm_clients set created_at_text = to_char(created_at, 'DD.MM.YYYY, HH24:MI') where created_at_text is null or created_at_text = '';
update public.crm_clients set updated_at = now() where updated_at is null;

create or replace function public.set_crm_clients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crm_clients_updated_at on public.crm_clients;
create trigger trg_crm_clients_updated_at
before update on public.crm_clients
for each row
execute function public.set_crm_clients_updated_at();

-- Общее состояние всей админки: профиль, площадки, шаблоны, очередь и ручные записи.
create table if not exists public.admin_app_state (
  id text primary key,
  trainer jsonb not null default '{}'::jsonb,
  platforms jsonb not null default '[]'::jsonb,
  templates jsonb not null default '[]'::jsonb,
  outbox jsonb not null default '[]'::jsonb,
  bookings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_app_state add column if not exists trainer jsonb not null default '{}'::jsonb;
alter table public.admin_app_state add column if not exists platforms jsonb not null default '[]'::jsonb;
alter table public.admin_app_state add column if not exists templates jsonb not null default '[]'::jsonb;
alter table public.admin_app_state add column if not exists outbox jsonb not null default '[]'::jsonb;
alter table public.admin_app_state add column if not exists bookings jsonb not null default '[]'::jsonb;
alter table public.admin_app_state add column if not exists created_at timestamptz not null default now();
alter table public.admin_app_state add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_admin_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_app_state_updated_at on public.admin_app_state;
create trigger trg_admin_app_state_updated_at
before update on public.admin_app_state
for each row
execute function public.set_admin_app_state_updated_at();

-- Views.
create or replace view public.available_slots as
select
  s.id,
  s.date,
  s.start_time,
  coalesce(nullif(s.end_time, ''), to_char((s.start_time::time + interval '1 hour')::time, 'HH24:MI')) as end_time,
  s.capacity,
  greatest(s.capacity - count(r.id)::int, 0) as available
from public.booking_slots s
left join public.booking_requests r
  on r.slot_id = s.id
  and r.status not in ('cancelled', 'canceled', 'отмена', 'Отказ')
where s.is_active = true
group by s.id, s.date, s.start_time, s.end_time, s.capacity
order by s.date, s.start_time;

create or replace view public.admin_leads as
select
  br.id,
  br.client_name as name,
  br.contact,
  br.source,
  br.goal,
  br.format,
  br.comment,
  br.status,
  br.next_step,
  br.follow_up,
  br.created_at,
  bs.date as slot_date,
  bs.start_time,
  bs.end_time
from public.booking_requests br
left join public.booking_slots bs on bs.id = br.slot_id
order by br.created_at desc;

-- Создание бронирования с защитой от двойной записи.
create or replace function public.create_booking(
  p_slot_id uuid,
  p_client_name text,
  p_contact text,
  p_goal text,
  p_format text,
  p_comment text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_taken integer;
  v_booking_id uuid;
begin
  select capacity into v_capacity
  from public.booking_slots
  where id = p_slot_id and is_active = true
  for update;

  if v_capacity is null then
    raise exception 'Слот не найден или недоступен';
  end if;

  select count(*)::int into v_taken
  from public.booking_requests
  where slot_id = p_slot_id
    and status not in ('cancelled', 'canceled', 'отмена', 'Отказ');

  if v_taken >= v_capacity then
    raise exception 'Это время уже занято';
  end if;

  insert into public.booking_requests(
    slot_id, client_name, contact, goal, format, comment, status, source, next_step, follow_up
  ) values (
    p_slot_id, p_client_name, p_contact, p_goal, p_format, p_comment,
    'Новый лид', 'Страница записи', 'Подтвердить запись и написать клиенту', 'Сегодня'
  ) returning id into v_booking_id;

  return json_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

-- RLS и права. Сейчас админка без логина, поэтому доступ открыт для anon/authenticated.
-- Следующий правильный шаг — закрыть /admin авторизацией.
alter table public.booking_slots enable row level security;
alter table public.booking_requests enable row level security;
alter table public.crm_clients enable row level security;
alter table public.admin_app_state enable row level security;

drop policy if exists "Public can manage slots" on public.booking_slots;
drop policy if exists "Public can read active slots" on public.booking_slots;
drop policy if exists "Authenticated can manage slots" on public.booking_slots;
create policy "Public can manage slots"
on public.booking_slots for all to anon, authenticated
using (true) with check (true);

drop policy if exists "Public can read bookings" on public.booking_requests;
drop policy if exists "Public can insert bookings" on public.booking_requests;
drop policy if exists "Public can update bookings" on public.booking_requests;
drop policy if exists "Public can delete bookings" on public.booking_requests;
drop policy if exists "Authenticated can read bookings" on public.booking_requests;
drop policy if exists "Authenticated can update bookings" on public.booking_requests;
create policy "Public can read bookings" on public.booking_requests for select to anon, authenticated using (true);
create policy "Public can insert bookings" on public.booking_requests for insert to anon, authenticated with check (true);
create policy "Public can update bookings" on public.booking_requests for update to anon, authenticated using (true) with check (true);
create policy "Public can delete bookings" on public.booking_requests for delete to anon, authenticated using (true);

drop policy if exists "Public can manage crm clients" on public.crm_clients;
create policy "Public can manage crm clients"
on public.crm_clients for all to anon, authenticated
using (true) with check (true);

drop policy if exists "Public can manage admin app state" on public.admin_app_state;
create policy "Public can manage admin app state"
on public.admin_app_state for all to anon, authenticated
using (true) with check (true);

grant select on public.available_slots to anon, authenticated;
grant select on public.admin_leads to anon, authenticated;
grant select, insert, update, delete on public.booking_slots to anon, authenticated;
grant select, insert, update, delete on public.booking_requests to anon, authenticated;
grant select, insert, update, delete on public.crm_clients to anon, authenticated;
grant select, insert, update, delete on public.admin_app_state to anon, authenticated;
grant execute on function public.create_booking(uuid, text, text, text, text, text) to anon, authenticated;

-- Пример слотов. Если они уже есть, дубликаты не добавятся.
insert into public.booking_slots(date, start_time, end_time, capacity, is_active)
values
  (current_date + interval '1 day', '10:00', '11:00', 1, true),
  (current_date + interval '1 day', '18:30', '19:30', 1, true),
  (current_date + interval '2 day', '12:00', '13:00', 1, true),
  (current_date + interval '2 day', '20:00', '21:00', 1, true),
  (current_date + interval '3 day', '15:00', '16:00', 1, true)
on conflict (date, start_time) do nothing;

select pg_notify('pgrst', 'reload schema');
