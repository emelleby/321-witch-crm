-- Create ticket feedback table
CREATE TABLE IF NOT EXISTS public.ticket_feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (
        rating >= 1
        AND rating <= 5
    ),
    feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
-- Add RLS policies
ALTER TABLE public.ticket_feedback ENABLE ROW LEVEL SECURITY;
-- Allow customers to view their own feedback
CREATE POLICY "Customers can view their own feedback" ON public.ticket_feedback FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.tickets
            WHERE tickets.id = ticket_id
                AND tickets.creator_id = auth.uid()
        )
    );
-- Allow customers to create feedback for their tickets
CREATE POLICY "Customers can create feedback for their tickets" ON public.ticket_feedback FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tickets
            WHERE tickets.id = ticket_id
                AND tickets.creator_id = auth.uid()
                AND tickets.status = 'closed'
        )
    );
-- Allow agents to view feedback for their organization's tickets
CREATE POLICY "Agents can view organization feedback" ON public.ticket_feedback FOR
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