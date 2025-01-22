-- Add SELECT policy for tickets
CREATE POLICY "Users can view tickets" ON "public"."tickets" FOR
SELECT TO authenticated USING (
        creator_id = auth.uid()
        OR organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
        )
    );