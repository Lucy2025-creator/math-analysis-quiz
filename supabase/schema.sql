-- =========================================================
-- 数分刷题 · Supabase 云同步初始化
-- 在 Supabase Dashboard → SQL Editor 中整段运行一次。
-- =========================================================

create extension if not exists pgcrypto;

-- 1) 每用户一份学习进度 JSON
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  client_updated_at bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "own user_state" on public.user_state;
create policy "own user_state"
  on public.user_state
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_state_updated on public.user_state;
create trigger trg_user_state_updated
  before update on public.user_state
  for each row execute function public.touch_updated_at();

-- 2) 作答图片的元数据（文件本身在 Storage）
create table if not exists public.traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  qid text not null,
  storage_path text not null,
  name text,
  created_at timestamptz not null default now()
);

create index if not exists traces_user_qid_idx on public.traces(user_id, qid);

alter table public.traces enable row level security;

drop policy if exists "own traces" on public.traces;
create policy "own traces"
  on public.traces
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) 私有图片桶：路径必须以 user_id 开头
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'traces', 'traces', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "own trace files read" on storage.objects;
create policy "own trace files read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'traces' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own trace files insert" on storage.objects;
create policy "own trace files insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'traces' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own trace files update" on storage.objects;
create policy "own trace files update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'traces' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'traces' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own trace files delete" on storage.objects;
create policy "own trace files delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'traces' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4) 打开 Realtime（实时同步）
do $$
begin
  create publication supabase_realtime;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_state;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.traces;
exception
  when duplicate_object then null;
end $$;
