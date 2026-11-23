-- Role enum
create type public.app_role as enum ('free_user', 'paid_user', 'administrator');

-- User profiles (no password_hash needed; Supabase Auth owns credentials)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User entitlements table - Single active role per user (null expires_at = never expires)
create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'free_user',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Read role from JWT claim (defaults to 'free_user' for authenticated users without a row)
-- This will require that a Custom Access Token Hook (or inject user_role when minting tokens) 
-- that reads public.user_entitlements and adds 'user_role' to the JWT payload. 
-- This JWT hook is not set up yet
create or replace function public.jwt_user_role()
returns public.app_role
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'user_role', '')::public.app_role,
    'free_user'::public.app_role
  );
$$;

-- Below this point is AI code that has not been vetted
-- Authentication will be checked via a JSON Web Token (JWT) provided on login

-- View for admin panel
create or replace view public.admin_users_view
with (security_invoker = true) as
select
  p.id,
  p.email,
  p.full_name,
  coalesce(e.role, 'free_user'::public.app_role) as role,
  e.expires_at,
  p.created_at,
  e.updated_at as entitlement_updated_at
from public.profiles p
left join public.user_entitlements e on e.user_id = p.id;

-- Update Entitlements Function
create or replace function public.admin_update_user_entitlement(
  target_user_id uuid,
  new_role public.app_role,
  new_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: administrator role required';
  end if;

  if target_user_id = auth.uid() and new_role <> 'administrator' then
    raise exception 'Cannot remove your own administrator role';
  end if;

  if new_role = 'free_user' then
    new_expires_at := null;
  end if;

  insert into public.user_entitlements (user_id, role, expires_at, updated_at)
  values (target_user_id, new_role, new_expires_at, now())
  on conflict (user_id) do update
  set role = excluded.role,
      expires_at = excluded.expires_at,
      updated_at = now();
end;
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

--   -- Enable RLS on both tables
-- alter table public.profiles enable row level security;
-- alter table public.user_entitlements enable row level security;

-- -- PROFILES policies
-- create policy "Users can read own profile or admins can read all"
-- on public.profiles for select
-- using (auth.uid() = id or public.is_admin());

-- create policy "Users can update own profile or admins can update any"
-- on public.profiles for update
-- using (auth.uid() = id or public.is_admin())
-- with check (auth.uid() = id or public.is_admin());

-- -- USER_ENTITLEMENTS policies
-- create policy "Users can read own entitlement or admins can read all"
-- on public.user_entitlements for select
-- using (user_id = auth.uid() or public.is_admin());

-- create policy "Only admins can insert entitlements"
-- on public.user_entitlements for insert
-- with check (public.is_admin());

-- create policy "Only admins can update entitlements"
-- on public.user_entitlements for update
-- using (public.is_admin())
-- with check (public.is_admin());