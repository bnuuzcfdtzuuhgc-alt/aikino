-- Кейсы: запустите один раз в Supabase → SQL Editor
alter table public.works add column if not exists task text;
alter table public.works add column if not exists solution text;
alter table public.works add column if not exists result text;
