-- Обновляет имя тренера в общей синхронизированной админке.
-- Запусти в Supabase SQL Editor, если в админке/профиле осталось старое имя "Тим".

update public.admin_app_state
set trainer = jsonb_set(
  coalesce(trainer, '{}'::jsonb),
  '{name}',
  to_jsonb('Архипов Тимур'::text),
  true
)
where id is not null;

select pg_notify('pgrst', 'reload schema');
