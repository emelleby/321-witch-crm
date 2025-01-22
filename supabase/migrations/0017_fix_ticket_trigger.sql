-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_ticket_metrics_trigger ON tickets;
-- Create the trigger
CREATE TRIGGER calculate_ticket_metrics_trigger
AFTER
INSERT
    OR
UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION calculate_ticket_metrics();
-- Ensure ticket_metrics table allows inserts from authenticated users
DROP POLICY IF EXISTS "Users can manage their ticket metrics" ON public.ticket_metrics;
CREATE POLICY "Users can manage their ticket metrics" ON public.ticket_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);