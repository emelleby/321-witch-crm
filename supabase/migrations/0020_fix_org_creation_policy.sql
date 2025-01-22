-- Drop the existing policies
DROP POLICY IF EXISTS "Agents and admins can create organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Allow organization creation during registration" ON "public"."organizations";
-- Create new policy that allows organization creation during registration
-- This works because during registration, the user won't have a profile yet
CREATE POLICY "Allow organization creation during registration" ON "public"."organizations" FOR
INSERT TO authenticated WITH CHECK (
        NOT EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );