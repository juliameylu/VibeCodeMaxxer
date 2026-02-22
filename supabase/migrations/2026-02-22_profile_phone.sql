-- Add phone field to profiles for signup/profile persistence.
alter table if exists profiles
  add column if not exists phone text;

