-- TimFit booking calendar + synced CRM leads for Supabase
-- Run this whole file in Supabase SQL Editor after uploading this version.
-- It keeps existing slots/bookings and adds the fields needed for the admin CRM.

create extension if not exists pgcrypto;

create table if not exists booking_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time text not null,
  end_time text,
  capacity integer not null default 1 check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table booking_slots add column if not exists end_time text;
update booking_slots
set end_time = to_char((start_time::time + interval '1 hour'), 'HH24:MI')
where end_time is null and start_time is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'booking_slots_date_start_time_key'
  ) then
    alter table booking_slots add constraint booking_slots_date_start_time_key unique (date, start_time);
  end if;
end $$;

create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references booking_slots(id) on delete set null,
  client_name text not null,
  contact text not null,
  goal text,
  format text,
  comment text,
  status text not null default 'Новый лид',
  source text not null default 'Страница записи',
  next_step text not null default 'Подтвердить запись и написать клиенту',
  follow_up text not null default 'Сегодня',
  created_at timestamptz not null default now()
);

-- Safe migrations for older versions.
alter table booking_requests alter column slot_id drop not null;
alter table booking_requests alter column status set default 'Новый лид';
alter table booking_requests add column if not exists source text not null default 'Страница записи';
alter table booking_requests add column if not exists next_step text not null default 'Подтвердить запись и написать клиенту';
alter table booking_requests add column if not exists follow_up text not null default 'Сегодня';
update booking_requests set status = 'Новый лид' where status in ('new', '');
update booking_requests set source = 'Страница записи' where source is null or source = '';
update booking_requests set next_step = 'Подтвердить запись и написать клиенту' where next_step is null or next_step = '';
update booking_requests set follow_up = 'Сегодня' where follow_up is null or follow_up = '';

create or replace view available_slots as
select
  s.id,
  s.date,
  s.start_time,
  s.end_time,
  s.capacity,
  greatest(s.capacity - count(r.id)::int, 0) as available
from booking_slots s
left join booking_requests r
  on r.slot_id = s.id
  and r.status not in ('cancelled', 'canceled', 'отмена', 'Отказ')
where s.is_active = true
group by s.id, s.date, s.start_time, s.end_time, s.capacity
order by s.date, s.start_time;

create or replace view admin_leads as
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
from booking_requests br
left join booking_slots bs on bs.id = br.slot_id
order by br.created_at desc;

create or replace function create_booking(
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
  from booking_slots
  where id = p_slot_id and is_active = true
  for update;

  if v_capacity is null then
    raise exception 'Слот не найден или недоступен';
  end if;

  select count(*)::int into v_taken
  from booking_requests
  where slot_id = p_slot_id
    and status not in ('cancelled', 'canceled', 'отмена', 'Отказ');

  if v_taken >= v_capacity then
    raise exception 'Это время уже занято';
  end if;

  insert into booking_requests(slot_id, client_name, contact, goal, format, comment, status, source, next_step, follow_up)
  values (p_slot_id, p_client_name, p_contact, p_goal, p_format, p_comment, 'Новый лид', 'Страница записи', 'Подтвердить запись и написать клиенту', 'Сегодня')
  returning id into v_booking_id;

  return json_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

alter table booking_slots enable row level security;
alter table booking_requests enable row level security;

drop policy if exists "Public can read active slots" on booking_slots;
drop policy if exists "Authenticated can manage slots" on booking_slots;
drop policy if exists "Public can manage slots" on booking_slots;
create policy "Public can manage slots"
on booking_slots for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can read bookings" on booking_requests;
drop policy if exists "Authenticated can update bookings" on booking_requests;
drop policy if exists "Public can read bookings" on booking_requests;
drop policy if exists "Public can insert bookings" on booking_requests;
drop policy if exists "Public can update bookings" on booking_requests;
drop policy if exists "Public can delete bookings" on booking_requests;

create policy "Public can read bookings"
on booking_requests for select
to anon, authenticated
using (true);

create policy "Public can insert bookings"
on booking_requests for insert
to anon, authenticated
with check (true);

create policy "Public can update bookings"
on booking_requests for update
to anon, authenticated
using (true)
with check (true);

create policy "Public can delete bookings"
on booking_requests for delete
to anon, authenticated
using (true);

grant select on available_slots to anon, authenticated;
grant select on admin_leads to anon, authenticated;
grant select, insert, update, delete on booking_slots to anon, authenticated;
grant select, insert, update, delete on booking_requests to anon, authenticated;
grant execute on function create_booking(uuid, text, text, text, text, text) to anon, authenticated;

-- Example interval slots. You can delete or edit them.
insert into booking_slots(date, start_time, end_time, capacity)
values
  (current_date + interval '1 day', '10:00', '11:00', 1),
  (current_date + interval '1 day', '18:30', '19:30', 1),
  (current_date + interval '2 day', '12:00', '13:00', 1),
  (current_date + interval '2 day', '20:00', '21:00', 1),
  (current_date + interval '3 day', '15:00', '16:00', 1)
on conflict (date, start_time) do nothing;
