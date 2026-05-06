-- TimFit booking calendar schema for Supabase
-- Run this in Supabase SQL Editor.
-- This version supports time intervals: start_time + end_time.

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

-- Safe migration for older projects where end_time did not exist yet.
alter table booking_slots add column if not exists end_time text;
update booking_slots
set end_time = to_char((start_time::time + interval '1 hour'), 'HH24:MI')
where end_time is null and start_time is not null;

-- Keep one slot per start time. If you need two different intervals with the same start time,
-- create the second one with a slightly different start time.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_slots_date_start_time_key'
  ) then
    alter table booking_slots add constraint booking_slots_date_start_time_key unique (date, start_time);
  end if;
end $$;

create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references booking_slots(id) on delete cascade,
  client_name text not null,
  contact text not null,
  goal text,
  format text,
  comment text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

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
  and r.status not in ('cancelled', 'canceled', 'отмена')
where s.is_active = true
group by s.id, s.date, s.start_time, s.end_time, s.capacity
order by s.date, s.start_time;

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
    and status not in ('cancelled', 'canceled', 'отмена');

  if v_taken >= v_capacity then
    raise exception 'Это время уже занято';
  end if;

  insert into booking_requests(slot_id, client_name, contact, goal, format, comment)
  values (p_slot_id, p_client_name, p_contact, p_goal, p_format, p_comment)
  returning id into v_booking_id;

  return json_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

alter table booking_slots enable row level security;
alter table booking_requests enable row level security;

drop policy if exists "Public can read active slots" on booking_slots;
create policy "Public can read active slots"
on booking_slots for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Authenticated can manage slots" on booking_slots;
create policy "Authenticated can manage slots"
on booking_slots for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can read bookings" on booking_requests;
create policy "Authenticated can read bookings"
on booking_requests for select
to authenticated
using (true);

drop policy if exists "Authenticated can update bookings" on booking_requests;
create policy "Authenticated can update bookings"
on booking_requests for update
to authenticated
using (true)
with check (true);

-- Example interval slots. You can delete or edit them.
insert into booking_slots(date, start_time, end_time, capacity)
values
  (current_date + interval '1 day', '10:00', '11:00', 1),
  (current_date + interval '1 day', '18:30', '19:30', 1),
  (current_date + interval '2 day', '12:00', '13:00', 1),
  (current_date + interval '2 day', '20:00', '21:00', 1),
  (current_date + interval '3 day', '15:00', '16:00', 1)
on conflict (date, start_time) do nothing;
