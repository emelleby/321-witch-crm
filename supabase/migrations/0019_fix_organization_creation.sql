-- Drop the existing policy
DROP POLICY IF EXISTS "Agents and admins can create organizations" ON "public"."organizations";
-- Create new policy that allows any authenticated user to create an organization
CREATE POLICY "Authenticated users can create organizations" ON "public"."organizations" FOR
INSERT TO authenticated WITH CHECK (true);