-- M1 account auth + cloud sync schema.
-- Run this in the target Supabase project before enabling sync.

create table if not exists public.books (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  author text not null,
  format text not null,
  file_path text not null,
  cover_path text,
  file_size bigint not null,
  language text not null,
  tags text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, id)
);

create table if not exists public.book_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  status text not null default 'unread',
  progress_current bigint default 0,
  progress_total bigint default 0,
  location text,
  last_read_at bigint,
  started_at bigint,
  completed_at bigint,
  metadata text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, book_id)
);

create table if not exists public.book_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  book_id text not null,
  type text not null,
  cfi text not null,
  text text,
  style text,
  color text,
  note text not null,
  context_before text,
  context_after text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, id)
);

create table if not exists public.notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  book_id text,
  book_meta text,
  title text,
  content text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, id)
);

create table if not exists public.tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  color text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, id)
);

create table if not exists public.skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  content text not null,
  description text not null default '',
  is_active integer default 1,
  is_system integer default 0,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, id)
);

create table if not exists public.user_memories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  category text not null,
  key text not null,
  value text not null,
  source_type text,
  source_id text,
  book_id text,
  related_memory_ids text,
  confidence real default 1.0,
  access_count integer default 0,
  last_accessed_at bigint,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, id)
);

create table if not exists public.reading_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  book_id text not null,
  started_at bigint not null,
  ended_at bigint,
  duration_seconds bigint default 0,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sync_status text default 'synced',
  primary key (user_id, id)
);

create table if not exists public.user_configs (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  encrypted_value text not null,
  iv text not null,
  updated_at bigint not null,
  primary key (user_id, key)
);

create table if not exists public.user_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  wrapped_device_key text,
  created_at bigint not null,
  primary key (user_id, device_id)
);

create index if not exists idx_books_user_updated on public.books(user_id, updated_at);
create index if not exists idx_books_user_deleted on public.books(user_id, deleted_at);
create index if not exists idx_book_status_user_updated on public.book_status(user_id, updated_at);
create index if not exists idx_book_notes_user_updated on public.book_notes(user_id, updated_at);
create index if not exists idx_notes_user_updated on public.notes(user_id, updated_at);
create index if not exists idx_tags_user_updated on public.tags(user_id, updated_at);
create index if not exists idx_skills_user_updated on public.skills(user_id, updated_at);
create index if not exists idx_memories_user_updated on public.user_memories(user_id, updated_at);
create index if not exists idx_reading_sessions_user_updated on public.reading_sessions(user_id, updated_at);

alter table public.tags drop constraint if exists tags_user_id_name_key;
alter table public.skills drop constraint if exists skills_user_id_name_key;

create unique index if not exists idx_tags_user_active_name
  on public.tags(user_id, name)
  where deleted_at is null;

create unique index if not exists idx_skills_user_active_name
  on public.skills(user_id, name)
  where deleted_at is null;

alter table public.books enable row level security;
alter table public.book_status enable row level security;
alter table public.book_notes enable row level security;
alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.skills enable row level security;
alter table public.user_memories enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.user_configs enable row level security;
alter table public.user_devices enable row level security;

do $$
declare
  sync_table_name text;
begin
  foreach sync_table_name in array array[
    'books',
    'book_status',
    'book_notes',
    'notes',
    'tags',
    'skills',
    'user_memories',
    'reading_sessions',
    'user_configs',
    'user_devices'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = sync_table_name
        and policyname = sync_table_name || '_owner_policy'
    ) then
      execute format(
        'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        sync_table_name || '_owner_policy',
        sync_table_name
      );
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('epubs', 'epubs', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'epubs_owner_policy'
  ) then
    create policy epubs_owner_policy
    on storage.objects for all
    using (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1])
    with check (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;
