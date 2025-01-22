-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can create tickets" ON "public"."tickets";
-- Add new policy allowing all authenticated users to create tickets
CREATE POLICY "Users can create tickets" ON "public"."tickets" FOR
INSERT TO authenticated WITH CHECK (true);