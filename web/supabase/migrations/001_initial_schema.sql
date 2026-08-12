-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Create enum types
create type subscription_tier as enum ('free', 'pro', 'team', 'enterprise');
create type subscription_status as enum ('active', 'canceled', 'past_due', 'trialing');
create type application_status as enum ('wishlist', 'applied', 'interviewing', 'offered', 'rejected', 'accepted');

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- User profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  company text,
  role text,
  subscription_tier subscription_tier default 'free' not null,
  subscription_status subscription_status,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  trial_ends_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  settings jsonb default '{}'::jsonb,
  onboarding_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =====================================================
-- CV PROFILES
-- =====================================================

create table public.cv_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  template text not null default 'modern-professional',
  parent_cv_id uuid references public.cv_profiles(id) on delete set null,
  job_id uuid, -- Reference to job application (optional)

  -- Personal Information
  professional_title text,
  personal jsonb not null default '{}'::jsonb,

  -- CV Sections (JSONB for flexibility)
  experience jsonb default '[]'::jsonb,
  education jsonb default '[]'::jsonb,
  skills jsonb default '[]'::jsonb,
  projects jsonb default '[]'::jsonb,
  certifications jsonb default '[]'::jsonb,
  courses jsonb default '[]'::jsonb,
  languages jsonb default '[]'::jsonb,

  -- Section ordering
  section_order text[] default array['personal', 'experience', 'education', 'skills']::text[],

  -- Design settings
  design jsonb default '{}'::jsonb,

  -- Metadata
  source_filename text,
  notes text,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index cv_profiles_user_id_idx on public.cv_profiles(user_id);
create index cv_profiles_created_at_idx on public.cv_profiles(created_at desc);

-- Enable RLS
alter table public.cv_profiles enable row level security;

-- RLS Policies
create policy "Users can view own CVs"
  on public.cv_profiles for select
  using (auth.uid() = user_id);

create policy "Users can create own CVs"
  on public.cv_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own CVs"
  on public.cv_profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own CVs"
  on public.cv_profiles for delete
  using (auth.uid() = user_id);

-- =====================================================
-- CV VERSIONS (Version History)
-- =====================================================

create table public.cv_versions (
  id uuid default uuid_generate_v4() primary key,
  cv_id uuid references public.cv_profiles(id) on delete cascade not null,
  version_number integer not null,
  snapshot jsonb not null,
  change_summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint cv_versions_unique unique (cv_id, version_number)
);

create index cv_versions_cv_id_idx on public.cv_versions(cv_id);
alter table public.cv_versions enable row level security;

create policy "Users can view own CV versions"
  on public.cv_versions for select
  using (
	exists (
	  select 1 from public.cv_profiles
	  where cv_profiles.id = cv_versions.cv_id
	  and cv_profiles.user_id = auth.uid()
	)
  );

-- =====================================================
-- JOB APPLICATIONS
-- =====================================================

create table public.job_applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  cv_id uuid references public.cv_profiles(id) on delete set null,

  -- Job Details
  company text not null,
  position text not null,
  location text,
  job_url text,
  job_description text,
  salary_range text,

  -- Application Status
  status application_status default 'wishlist' not null,
  applied_date date,
  interview_date timestamp with time zone,
  offer_date date,
  rejection_date date,

  -- Notes & Tracking
  notes text,
  contact_name text,
  contact_email text,
  contact_phone text,
  follow_up_date date,

  -- AI Analysis
  match_score integer, -- 0-100
  missing_keywords text[],

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index job_applications_user_id_idx on public.job_applications(user_id);
create index job_applications_status_idx on public.job_applications(status);

alter table public.job_applications enable row level security;

create policy "Users can manage own applications"
  on public.job_applications for all
  using (auth.uid() = user_id);

-- =====================================================
-- SHARED CVs (For Collaboration)
-- =====================================================

create table public.cv_shares (
  id uuid default uuid_generate_v4() primary key,
  cv_id uuid references public.cv_profiles(id) on delete cascade not null,
  shared_by uuid references public.profiles(id) on delete cascade not null,
  share_token text unique not null default encode(gen_random_bytes(32), 'hex'),

  -- Permissions
  can_view boolean default true,
  can_comment boolean default false,
  can_edit boolean default false,

  -- Metadata
  password_hash text, -- Optional password protection
  expires_at timestamp with time zone,
  view_count integer default 0,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index cv_shares_cv_id_idx on public.cv_shares(cv_id);
create index cv_shares_token_idx on public.cv_shares(share_token);

alter table public.cv_shares enable row level security;

create policy "Users can manage own shares"
  on public.cv_shares for all
  using (auth.uid() = shared_by);

create policy "Anyone can view with valid token"
  on public.cv_shares for select
  using (expires_at is null or expires_at > now());

-- =====================================================
-- COMMENTS (For Shared CVs)
-- =====================================================

create table public.cv_comments (
  id uuid default uuid_generate_v4() primary key,
  cv_id uuid references public.cv_profiles(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  parent_id uuid references public.cv_comments(id) on delete cascade,

  -- Comment Content
  section text, -- Which section of CV
  field_path text, -- JSON path to specific field
  content text not null,
  resolved boolean default false,

  -- Anonymous comments (for shared CVs)
  author_name text, -- For non-authenticated commenters
  author_email text,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index cv_comments_cv_id_idx on public.cv_comments(cv_id);
alter table public.cv_comments enable row level security;

create policy "CV owners can view all comments"
  on public.cv_comments for select
  using (
	exists (
	  select 1 from public.cv_profiles
	  where cv_profiles.id = cv_comments.cv_id
	  and cv_profiles.user_id = auth.uid()
	)
  );

-- =====================================================
-- TEMPLATES
-- =====================================================

create table public.templates (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  description text,
  category text,
  preview_url text,
  thumbnail_url text,

  -- Template Configuration
  config jsonb not null default '{}'::jsonb,

  -- Access Control
  is_premium boolean default false,
  is_public boolean default true,
  created_by uuid references public.profiles(id) on delete set null,

  -- Usage Stats
  usage_count integer default 0,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index templates_slug_idx on public.templates(slug);
create index templates_category_idx on public.templates(category);

alter table public.templates enable row level security;

create policy "Anyone can view public templates"
  on public.templates for select
  using (is_public = true);

-- =====================================================
-- ANALYTICS & EVENTS
-- =====================================================

create table public.events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null,
  event_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index events_user_id_idx on public.events(user_id);
create index events_type_idx on public.events(event_type);
create index events_created_at_idx on public.events(created_at desc);

alter table public.events enable row level security;

create policy "Users can view own events"
  on public.events for select
  using (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Add triggers for updated_at
create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.cv_profiles
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.job_applications
  for each row
  execute function public.handle_updated_at();

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
	new.id,
	new.email,
	new.raw_user_meta_data->>'full_name',
	new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Function to check subscription limits
create or replace function public.check_cv_limit()
returns trigger as $$
declare
  cv_count integer;
  user_tier subscription_tier;
begin
  select count(*) into cv_count
  from public.cv_profiles
  where user_id = new.user_id;

  select subscription_tier into user_tier
  from public.profiles
  where id = new.user_id;

  if user_tier = 'free' and cv_count >= 3 then
	raise exception 'Free tier limited to 3 CVs. Upgrade to Pro for unlimited CVs.';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger check_cv_limit_trigger
  before insert on public.cv_profiles
  for each row
  execute function public.check_cv_limit();

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('cv-exports', 'cv-exports', false),
  ('template-previews', 'template-previews', true);

-- Storage policies
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
	bucket_id = 'avatars' and
	auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view any avatar"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can manage own CV exports"
  on storage.objects for all
  using (
	bucket_id = 'cv-exports' and
	auth.uid()::text = (storage.foldername(name))[1]
  );
