-- TimFit: синхронизация вкладки «Клиенты» между устройствами
-- Запусти этот код отдельно в Supabase SQL Editor.

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

alter table public.crm_clients enable row level security;

drop policy if exists "Public can manage crm clients" on public.crm_clients;
create policy "Public can manage crm clients"
on public.crm_clients
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.crm_clients to anon, authenticated;
