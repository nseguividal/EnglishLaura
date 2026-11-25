-- ============================================================================
-- Incremental Migration: Student Exercise Issue & Website Bug Reports
-- Run this in Supabase SQL Editor.
-- ============================================================================

do $$ begin
  create type public.report_type as enum ('EXERCISE_ISSUE', 'WEBSITE_BUG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('OPEN', 'RESOLVED');
exception when duplicate_object then null; end $$;

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

create index if not exists idx_feedback_reports_status on public.feedback_reports(status, created_at desc);
create index if not exists idx_feedback_reports_assignment on public.feedback_reports(assignment_id);

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
