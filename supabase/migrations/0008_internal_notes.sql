-- Drop existing policies for ticket_messages
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.ticket_messages;
-- Create new policies that handle internal notes
CREATE POLICY "Customers can view non-internal messages for their tickets" ON public.ticket_messages FOR
SELECT TO authenticated USING (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE creator_id = auth.uid()
        )
        AND NOT is_internal
    );
CREATE POLICY "Agents can view all messages in their organization" ON public.ticket_messages FOR
SELECT TO authenticated USING (
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
    );
CREATE POLICY "Customers can create non-internal messages" ON public.ticket_messages FOR
INSERT TO authenticated WITH CHECK (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE creator_id = auth.uid()
        )
        AND NOT is_internal
        AND role = 'customer'
    );
CREATE POLICY "Agents can create all types of messages" ON public.ticket_messages FOR
INSERT TO authenticated WITH CHECK (
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
        AND (
            role = 'agent'
            OR role = 'admin'
        )
    );