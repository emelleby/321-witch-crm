-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Organization members can view their organization" ON "public"."organizations";
-- Add new policy allowing all authenticated users to view organizations
CREATE POLICY "Authenticated users can view all organizations" ON "public"."organizations" FOR
SELECT TO authenticated USING (true);