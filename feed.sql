-- Лента в телефоне (игра «Остановите ленту»).
-- Запустите один раз в Supabase → SQL Editor → New query → Run. Повторный запуск безопасен.
-- Файлы кладутся в тот же бакет portfolio, в папку feed/.

create table if not exists public.feed (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'other' check (kind in ('ours', 'other')), -- ours = красный кадр, other = обычный ролик
  label_ru    text not null default '',
  label_en    text not null default '',
  media_type  text check (media_type in ('image', 'video')),                    -- пусто = серый фон с подписью
  file_url    text,
  poster_url  text,
  paths       jsonb not null default '[]'::jsonb,                                -- пути файлов в бакете, чтобы удалять вместе с записью
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.feed enable row level security;

-- Читать опубликованное может кто угодно (сайт)
drop policy if exists "feed public read" on public.feed;
create policy "feed public read" on public.feed
  for select using (published = true);

-- Админ видит и меняет всё. Проверка такая же, как у работ: email из таблицы admins
-- (или функция is_admin(), если она у вас уже есть).
do $$
declare cond text;
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_admin' and p.pronargs = 0) then
    cond := 'public.is_admin()';
  elsif exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'admins' and column_name = 'email') then
    cond := 'exists (select 1 from public.admins a where lower(a.email) = lower(auth.jwt() ->> ''email''))';
  elsif exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'admins' and column_name = 'user_id') then
    cond := 'exists (select 1 from public.admins a where a.user_id = auth.uid())';
  else
    raise exception 'Не нашёл таблицу admins (email или user_id) и функцию is_admin(). Напишите в чат, поправим.';
  end if;

  execute 'drop policy if exists "feed admin all" on public.feed';
  execute format('create policy "feed admin all" on public.feed for all to authenticated using (%s) with check (%s)', cond, cond);
end $$;

grant select on public.feed to anon, authenticated;
grant insert, update, delete on public.feed to authenticated;
