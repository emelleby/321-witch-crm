-- Drop all existing organization policies
DROP POLICY IF EXISTS "Admins can update their organization" ON "public"."organizations";
DROP POLICY IF EXISTS "Allow organization creation during registration" ON "public"."organizations";
DROP POLICY IF EXISTS "Authenticated users can view all organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Organization members can view their organization" ON "public"."organizations";
DROP POLICY IF EXISTS "Agents and admins can create organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON "public"."organizations";
-- Create simple policies for organizations
-- Allow any authenticated user to create organizations
CREATE POLICY "Anyone can create organizations" ON "public"."organizations" FOR
INSERT TO authenticated WITH CHECK (true);
-- Allow viewing all organizations
CREATE POLICY "Anyone can view organizations" ON "public"."organizations" FOR
SELECT TO authenticated USING (true);
-- Allow updating organization if user is admin of that organization
CREATE POLICY "Admins can update their organization" ON "public"."organizations" FOR
UPDATE TO authenticated USING (
        id IN (
            SELECT organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
        )
    );