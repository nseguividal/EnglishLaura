-- ============================================================================
-- Incremental Migration: Add 7 New Question Types + image_url & question_data
-- Run this in Supabase SQL Editor on an existing database.
-- ============================================================================

alter type public.question_type add value if not exists 'TRUE_FALSE_NOT_GIVEN';
alter type public.question_type add value if not exists 'MATCHING';
alter type public.question_type add value if not exists 'GAPPED_TEXT';
alter type public.question_type add value if not exists 'INLINE_CLOZE';
alter type public.question_type add value if not exists 'WORD_BANK_CLOZE';
alter type public.question_type add value if not exists 'SENTENCE_ORDERING';
alter type public.question_type add value if not exists 'ERROR_CORRECTION';
alter type public.question_type add value if not exists 'KEY_WORD_TRANSFORMATION';
alter type public.question_type add value if not exists 'MULTIPLE_SELECT';
alter type public.question_type add value if not exists 'CATEGORIZE';
alter type public.question_type add value if not exists 'SPEAKING_RECORDING';

alter table public.questions
  add column if not exists image_url text,
  add column if not exists question_data jsonb not null default '{}'::jsonb;

-- Storage bucket for student speaking recordings (students upload to their own folder)
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
