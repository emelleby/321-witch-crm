-- Update the organization RLS policy to allow creation during signup
CREATE POLICY "Allow organization creation during signup" ON organizations FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM auth.users
            WHERE auth.users.id = auth.uid() -- This allows both confirmed and unconfirmed users
                AND (
                    auth.users.confirmed_at IS NOT NULL
                    OR auth.users.confirmation_sent_at IS NOT NULL
                )
        )
    );