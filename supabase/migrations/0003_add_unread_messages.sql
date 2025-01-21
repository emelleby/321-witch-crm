-- Add unread tracking to ticket_messages
ALTER TABLE public.ticket_messages
ADD COLUMN read_by_customer BOOLEAN DEFAULT false,
    ADD COLUMN read_by_agent BOOLEAN DEFAULT false;
-- Add unread message counters to tickets
ALTER TABLE public.tickets
ADD COLUMN unread_customer_messages INTEGER DEFAULT 0,
    ADD COLUMN unread_agent_messages INTEGER DEFAULT 0;
-- Create function to update unread counts
CREATE OR REPLACE FUNCTION public.update_ticket_unread_counts() RETURNS TRIGGER AS $$ BEGIN -- Update unread counts in tickets table
UPDATE public.tickets
SET unread_customer_messages = (
        SELECT COUNT(*)
        FROM public.ticket_messages
        WHERE ticket_id = NEW.ticket_id
            AND role = 'customer'
            AND read_by_agent = false
    ),
    unread_agent_messages = (
        SELECT COUNT(*)
        FROM public.ticket_messages
        WHERE ticket_id = NEW.ticket_id
            AND (
                role = 'agent'
                OR role = 'admin'
            )
            AND read_by_customer = false
    )
WHERE id = NEW.ticket_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger for ticket_messages
CREATE TRIGGER trg_update_ticket_unread_counts
AFTER
INSERT
    OR
UPDATE OF read_by_customer,
    read_by_agent ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.update_ticket_unread_counts();
-- Update RLS policies for ticket_messages
CREATE POLICY "Customers can mark their messages as read" ON public.ticket_messages FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.tickets
            WHERE tickets.id = ticket_id
                AND tickets.creator_id = auth.uid()
        )
    ) WITH CHECK (read_by_customer = true);
CREATE POLICY "Agents can mark messages as read" ON public.ticket_messages FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.tickets t
                JOIN public.profiles p ON p.organization_id = t.organization_id
            WHERE t.id = ticket_id
                AND p.id = auth.uid()
                AND (
                    p.role = 'agent'
                    OR p.role = 'admin'
                )
        )
    ) WITH CHECK (read_by_agent = true);