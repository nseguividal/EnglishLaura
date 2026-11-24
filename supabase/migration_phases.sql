-- ============================================================================
-- Incremental Migration: Add Multi-Phase Support & Media Start/End Timestamps
-- Run this in Supabase SQL Editor on an existing database.
-- ============================================================================

alter table public.assignments
  add column if not exists media_start_time text,
  add column if not exists media_end_time text,
  add column if not exists media_audio_only boolean not null default false,
  add column if not exists phases jsonb not null default '[]'::jsonb;
