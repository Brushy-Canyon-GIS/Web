-- 1. Role enum
create type public.app_role as enum ('free_user', 'paid_user', 'administrator');

-- 2. User profiles (no password_hash needed; Supabase Auth owns credentials)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Single active role per user (null expires_at = never expires)
create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'free_user',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Below this point is AI code that has not been vetted
-- Authentication will be checked via a JSON Web Token (JWT) provided on login

-- 4. Read role from JWT claim (defaults to 'free_user' for authenticated users without a row)
create or replace function public.jwt_user_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'user_role', '')::public.app_role,
    'free_user'::public.app_role
  );
$$;

-- 5. Live DB check helper (useful for server/RPC checks or strict expiration checks)
create or replace function public.has_active_role(target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements ue
    where ue.user_id = auth.uid()
      and ue.role = target_role
      and (ue.expires_at is null or ue.expires_at > now())
  );
$$;

-- 6. Automatically create profile + free_user role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.user_entitlements (user_id, role, expires_at, updated_at)
  values (new.id, 'free_user', null, now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant user paid access (Will have to be called in some way for admin panel)
insert into public.user_roles (user_id, role, expires_at, updated_at)
values ($1, 'paid_user', now() + interval '1 year', now())
on conflict (user_id) do update
  set role = 'paid_user',
      expires_at = now() + interval '1 year',
      updated_at = now();