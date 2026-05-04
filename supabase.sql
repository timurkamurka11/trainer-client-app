
-- TimFit database schema and policies

create extension if not exists pgcrypto;

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time text not null,
  end_time time,
  capacity int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.booking_slots(id) on delete set null,
  client_name text not null,
  contact text not null,
  goal text,
  format text,
  comment text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.booking_slots add column if not exists end_time time;
alter table public.booking_slots add column if not exists is_active boolean not null default true;
alter table public.booking_slots add column if not exists capacity int not null default 1;

update public.booking_slots
set end_time = (start_time::time + interval '1 hour')::time
where end_time is null
  and start_time is not null
  and start_time ~ '^[0-9]{1,2}:[0-9]{2}$';

alter table public.booking_slots enable row level security;
alter table public.booking_requests enable row level security;

drop policy if exists "Public can read booking slots" on public.booking_slots;
create policy "Public can read booking slots"
on public.booking_slots
for select
to anon
using (true);

drop policy if exists "Public can insert booking slots" on public.booking_slots;
create policy "Public can insert booking slots"
on public.booking_slots
for insert
to anon
with check (true);

drop policy if exists "Public can update booking slots" on public.booking_slots;
create policy "Public can update booking slots"
on public.booking_slots
for update
to anon
using (true)
with check (true);

drop policy if exists "Public can delete booking slots" on public.booking_slots;
create policy "Public can delete booking slots"
on public.booking_slots
for delete
to anon
using (true);

drop policy if exists "Public can read booking requests" on public.booking_requests;
create policy "Public can read booking requests"
on public.booking_requests
for select
to anon
using (true);

drop policy if exists "Public can insert booking requests" on public.booking_requests;
create policy "Public can insert booking requests"
on public.booking_requests
for insert
to anon
with check (true);

drop policy if exists "Public can update booking requests" on public.booking_requests;
create policy "Public can update booking requests"
on public.booking_requests
for update
to anon
using (true)
with check (true);

notify pgrst, 'reload schema';
