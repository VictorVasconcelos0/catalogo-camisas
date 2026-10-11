create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_photo_changes (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  photo_path text not null,
  photo_url text,
  action text not null check (action in ('hidden', 'added')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, photo_path)
);

create table if not exists public.catalog_covers (
  product_id text primary key,
  photo_path text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.catalog_photo_changes enable row level security;
alter table public.catalog_covers enable row level security;

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_catalog_admin() from public;
grant execute on function public.is_catalog_admin() to anon, authenticated;

drop policy if exists "Public can read photo changes" on public.catalog_photo_changes;
create policy "Public can read photo changes"
  on public.catalog_photo_changes for select
  using (true);

drop policy if exists "Admins can manage photo changes" on public.catalog_photo_changes;
create policy "Admins can manage photo changes"
  on public.catalog_photo_changes for all
  using (public.is_catalog_admin())
  with check (public.is_catalog_admin());

drop policy if exists "Public can read catalog covers" on public.catalog_covers;
create policy "Public can read catalog covers"
  on public.catalog_covers for select
  using (true);

drop policy if exists "Admins can manage catalog covers" on public.catalog_covers;
create policy "Admins can manage catalog covers"
  on public.catalog_covers for all
  using (public.is_catalog_admin())
  with check (public.is_catalog_admin());

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
  on public.admin_users for select
  using (public.is_catalog_admin());

insert into storage.buckets (id, name, public)
values ('catalogo-admin', 'catalogo-admin', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read catalog uploads" on storage.objects;
create policy "Public can read catalog uploads"
  on storage.objects for select
  using (bucket_id = 'catalogo-admin');

drop policy if exists "Admins can upload catalog photos" on storage.objects;
create policy "Admins can upload catalog photos"
  on storage.objects for insert
  with check (
    bucket_id = 'catalogo-admin'
    and public.is_catalog_admin()
  );

drop policy if exists "Admins can delete catalog photos" on storage.objects;
create policy "Admins can delete catalog photos"
  on storage.objects for delete
  using (
    bucket_id = 'catalogo-admin'
    and public.is_catalog_admin()
  );

-- Depois de criar o usuário no Authentication > Users, execute:
-- insert into public.admin_users (user_id, username)
-- values ('UUID_DO_USUARIO', 'administrador');
