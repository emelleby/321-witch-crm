-- Add pending organization fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN pending_organization_name text,
    ADD COLUMN pending_organization_domain text;