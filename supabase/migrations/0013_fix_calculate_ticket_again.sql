CREATE OR REPLACE FUNCTION calculate_ticket_metrics() RETURNS trigger AS $$
DECLARE first_response interval;
resolution interval;
ticket_status text;
ticket_created timestamptz;
BEGIN -- Calculate first response time
SELECT min(created_at) - NEW.created_at INTO first_response
FROM ticket_messages
WHERE ticket_id = NEW.id
    AND creator_id IN (
        SELECT id
        FROM profiles
        WHERE organization_id = NEW.organization_id
            AND role = 'agent'
    );
-- Calculate resolution time if the ticket is closed
IF NEW.status = 'closed' THEN resolution := NEW.updated_at - NEW.created_at;
END IF;
-- Insert or update ticket metrics
INSERT INTO ticket_metrics (
        ticket_id,
        organization_id,
        first_response_time,
        resolution_time,
        replies_count
    )
VALUES (
        NEW.id,
        NEW.organization_id,
        first_response,
        resolution,
        (
            SELECT count(*)
            FROM ticket_messages
            WHERE ticket_id = NEW.id
        )
    ) ON CONFLICT (ticket_id) DO
UPDATE
SET first_response_time = EXCLUDED.first_response_time,
    resolution_time = EXCLUDED.resolution_time,
    replies_count = EXCLUDED.replies_count,
    updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Enable RLS on ticket_metrics table
ALTER TABLE public.ticket_metrics ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view ticket metrics in their organization" ON public.ticket_metrics;
DROP POLICY IF EXISTS "Agents can update ticket metrics in their organization" ON public.ticket_metrics;
DROP POLICY IF EXISTS "System can manage ticket metrics" ON public.ticket_metrics;
-- Create policies
CREATE POLICY "Users can view ticket metrics in their organization" ON public.ticket_metrics FOR
SELECT TO authenticated USING (
        organization_id IN (
            SELECT profiles.organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );
CREATE POLICY "Agents can update ticket metrics in their organization" ON public.ticket_metrics FOR
UPDATE TO authenticated USING (
        organization_id IN (
            SELECT profiles.organization_id
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND (
                    profiles.role = 'agent'::public.user_role
                    OR profiles.role = 'admin'::public.user_role
                )
        )
    );
CREATE POLICY "System can manage ticket metrics" ON public.ticket_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Grant necessary privileges
GRANT ALL ON TABLE public.ticket_metrics TO authenticated;
GRANT ALL ON TABLE public.ticket_metrics TO service_role;