-- Add INSERT policy for ticket_metrics
DROP POLICY IF EXISTS "Allow ticket metrics creation" ON public.ticket_metrics;
CREATE POLICY "Allow ticket metrics creation" ON public.ticket_metrics FOR
INSERT TO authenticated WITH CHECK (
        organization_id IN (
            SELECT profiles.organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );