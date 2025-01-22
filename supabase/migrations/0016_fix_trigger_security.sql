-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION calculate_ticket_metrics() RETURNS trigger SECURITY DEFINER LANGUAGE plpgsql AS $$
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
$$;