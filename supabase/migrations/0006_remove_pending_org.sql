-- Remove pending organization fields from profiles table
ALTER TABLE public.profiles DROP COLUMN pending_organization_name,
    DROP COLUMN pending_organization_domain;