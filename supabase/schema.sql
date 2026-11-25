-- ============================================================================
-- Cambridge English Exam Preparation (B2 First & C1 Advanced)
-- Supabase PostgreSQL Schema, RLS Policies, Triggers & Storage
-- ============================================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
do $$ begin
  create type public.user_role as enum ('student', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_level as enum ('B2_FIRST', 'C1_ADVANCED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_category as enum (
    'READING',
    'LISTENING',
    'WRITING',
    'VOCABULARY',
    'GRAMMAR',
    'USE_OF_ENGLISH'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_type as enum (
    'EXTERNAL_LINK',
    'INTERACTIVE_EXERCISE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_type as enum (
    'NONE',
    'READING_PASSAGE',
    'VIDEO_URL',
    'AUDIO_MP4_UPLOAD'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_type as enum (
    'MULTIPLE_CHOICE',
    'FILL_IN_THE_BLANK',
    'OPEN_ENDED',
    'TRUE_FALSE_NOT_GIVEN',
    'MATCHING',
    'GAPPED_TEXT',
    'INLINE_CLOZE',
    'WORD_BANK_CLOZE',
    'SENTENCE_ORDERING',
    'ERROR_CORRECTION',
    'KEY_WORD_TRANSFORMATION',
    'MULTIPLE_SELECT',
    'CATEGORIZE',
    'SPEAKING_RECORDING'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_status as enum (
    'COMPLETED',
    'PENDING_REVIEW',
    'GRADED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_type as enum ('EXERCISE_ISSUE', 'WEBSITE_BUG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('OPEN', 'RESOLVED');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'student',
  selected_level public.exam_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Steps (ordered weekly modules per level)
create table if not exists public.steps (
  id uuid primary key default gen_random_uuid(),
  level public.exam_level not null,
  step_number integer not null check (step_number >= 1),
  title text not null,
  description text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level, step_number)
);

-- Reusable Assignment Bank
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructions text not null default '',
  level public.exam_level not null,
  category public.assignment_category not null,
  assignment_type public.assignment_type not null,
  external_url text,
  media_type public.media_type not null default 'NONE',
  media_content text,
  media_start_time text,
  media_end_time text,
  media_audio_only boolean not null default false,
  phases jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Junction table linking reusable assignments to one or more steps
create table if not exists public.step_assignments (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.steps(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (step_id, assignment_id)
);

-- Ordered Questions for Interactive Exercises
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  order_index integer not null default 0,
  question_type public.question_type not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  accepted_answers jsonb not null default '[]'::jsonb,
  keyword text,
  min_words integer,
  max_words integer,
  image_url text,
  question_data jsonb not null default '{}'::jsonb,
  explanation text,
  created_at timestamptz not null default now()
);

-- Student Submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  step_id uuid references public.steps(id) on delete set null,
  status public.submission_status not null default 'COMPLETED',
  raw_score_input text,
  percentage_score numeric(5, 2) check (percentage_score >= 0 and percentage_score <= 100),
  answers jsonb not null default '{}'::jsonb,
  admin_feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, assignment_id)
);

-- Feedback & Bug Reports (Exercise issues + Website bugs)
create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_type public.report_type not null,
  issue_category text not null default 'OTHER',
  assignment_id uuid references public.assignments(id) on delete set null,
  question_id uuid references public.questions(id) on delete set null,
  page_url text,
  message text not null,
  status public.report_status not null default 'OPEN',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_steps_level_number on public.steps(level, step_number);
create index if not exists idx_assignments_level_category on public.assignments(level, category);
create index if not exists idx_step_assignments_step on public.step_assignments(step_id, order_index);
create index if not exists idx_step_assignments_assignment on public.step_assignments(assignment_id);
create index if not exists idx_questions_assignment on public.questions(assignment_id, order_index);
create index if not exists idx_submissions_user on public.submissions(user_id);
create index if not exists idx_submissions_status on public.submissions(status);

-- ============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated-at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_steps_updated_at on public.steps;
create trigger trg_steps_updated_at
  before update on public.steps
  for each row execute function public.set_updated_at();

drop trigger if exists trg_assignments_updated_at on public.assignments;
create trigger trg_assignments_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_submissions_updated_at on public.submissions;
create trigger trg_submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER helper to check admin role without recursive RLS lookups
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Prevent non-admin app users from self-escalating their role
-- (Allows updates from Supabase Dashboard / SQL Editor where auth.uid() is null)
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.role is distinct from old.role
     and not public.is_admin() then
    raise exception 'Only administrators can change user roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Auto-create profile row when a new auth.users row is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, selected_level)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student',
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.steps enable row level security;
alter table public.assignments enable row level security;
alter table public.step_assignments enable row level security;
alter table public.questions enable row level security;
alter table public.submissions enable row level security;

-- PROFILES
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'student');

-- STEPS
drop policy if exists "Students read published steps" on public.steps;
create policy "Students read published steps"
  on public.steps for select
  using (is_published = true or public.is_admin());

drop policy if exists "Admins manage steps" on public.steps;
create policy "Admins manage steps"
  on public.steps for all
  using (public.is_admin())
  with check (public.is_admin());

-- ASSIGNMENTS
drop policy if exists "Students read published assignments" on public.assignments;
create policy "Students read published assignments"
  on public.assignments for select
  using (is_published = true or public.is_admin());

drop policy if exists "Admins manage assignments" on public.assignments;
create policy "Admins manage assignments"
  on public.assignments for all
  using (public.is_admin())
  with check (public.is_admin());

-- STEP_ASSIGNMENTS
drop policy if exists "Students read published step_assignments" on public.step_assignments;
create policy "Students read published step_assignments"
  on public.step_assignments for select
  using (
    public.is_admin()
    or (
      exists (select 1 from public.steps s where s.id = step_id and s.is_published = true)
      and exists (select 1 from public.assignments a where a.id = assignment_id and a.is_published = true)
    )
  );

drop policy if exists "Admins manage step_assignments" on public.step_assignments;
create policy "Admins manage step_assignments"
  on public.step_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

-- QUESTIONS
drop policy if exists "Students read questions of published assignments" on public.questions;
create policy "Students read questions of published assignments"
  on public.questions for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.is_published = true
    )
  );

drop policy if exists "Admins manage questions" on public.questions;
create policy "Admins manage questions"
  on public.questions for all
  using (public.is_admin())
  with check (public.is_admin());

-- SUBMISSIONS
drop policy if exists "Students read own submissions" on public.submissions;
create policy "Students read own submissions"
  on public.submissions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Students insert own submissions" on public.submissions;
create policy "Students insert own submissions"
  on public.submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Students update own submissions" on public.submissions;
create policy "Students update own submissions"
  on public.submissions for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins delete submissions" on public.submissions;
create policy "Admins delete submissions"
  on public.submissions for delete
  using (public.is_admin());

-- FEEDBACK REPORTS
alter table public.feedback_reports enable row level security;

drop policy if exists "Students read own reports" on public.feedback_reports;
create policy "Students read own reports"
  on public.feedback_reports for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Students create own reports" on public.feedback_reports;
create policy "Students create own reports"
  on public.feedback_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins manage all reports" on public.feedback_reports;
create policy "Admins manage all reports"
  on public.feedback_reports for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 5. SUPABASE STORAGE BUCKET FOR AUDIO / MP4 UPLOADS
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('assignment-media', 'assignment-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read assignment media" on storage.objects;
create policy "Public read assignment media"
  on storage.objects for select
  using (bucket_id = 'assignment-media');

drop policy if exists "Admins upload assignment media" on storage.objects;
create policy "Admins upload assignment media"
  on storage.objects for insert
  with check (bucket_id = 'assignment-media' and public.is_admin());

drop policy if exists "Admins update assignment media" on storage.objects;
create policy "Admins update assignment media"
  on storage.objects for update
  using (bucket_id = 'assignment-media' and public.is_admin());

drop policy if exists "Admins delete assignment media" on storage.objects;
create policy "Admins delete assignment media"
  on storage.objects for delete
  using (bucket_id = 'assignment-media' and public.is_admin());

-- Storage bucket for student speaking recordings
insert into storage.buckets (id, name, public)
values ('student-recordings', 'student-recordings', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated read student recordings" on storage.objects;
create policy "Authenticated read student recordings"
  on storage.objects for select
  using (bucket_id = 'student-recordings' and auth.role() = 'authenticated');

drop policy if exists "Students upload own recordings" on storage.objects;
create policy "Students upload own recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'student-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Students update own recordings" on storage.objects;
create policy "Students update own recordings"
  on storage.objects for update
  using (
    bucket_id = 'student-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
