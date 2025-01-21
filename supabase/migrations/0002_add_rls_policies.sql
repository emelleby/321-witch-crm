-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE TO authenticated USING (auth.uid() = id);
-- Organizations policies
CREATE POLICY "Organization members can view their organization" ON public.organizations FOR
SELECT TO authenticated USING (
        id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE profiles.id = auth.uid()
        )
    );
CREATE POLICY "Admins can update their organization" ON public.organizations FOR
UPDATE TO authenticated USING (
        id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND role = 'admin'
        )
    );
-- Tickets policies
CREATE POLICY "Users can view tickets in their organization" ON public.tickets FOR
SELECT TO authenticated USING (
        organization_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE profiles.id = auth.uid()
        )
        OR creator_id = auth.uid()
    );
CREATE POLICY "Users can create tickets" ON public.tickets FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Agents can update tickets in their organization" ON public.tickets FOR
UPDATE TO authenticated USING (
        organization_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND (
                    role = 'agent'
                    OR role = 'admin'
                )
        )
    );
-- Ticket messages policies
CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages FOR
SELECT TO authenticated USING (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE organization_id IN (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE profiles.id = auth.uid()
                )
                OR creator_id = auth.uid()
        )
    );
CREATE POLICY "Users can create messages" ON public.ticket_messages FOR
INSERT TO authenticated WITH CHECK (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE creator_id = auth.uid()
                OR organization_id IN (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE profiles.id = auth.uid()
                )
        )
    );
-- Knowledge base policies
CREATE POLICY "Anyone can view knowledge base articles" ON public.knowledge_base FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Agents can create and update knowledge base articles" ON public.knowledge_base FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
            AND (
                role = 'agent'
                OR role = 'admin'
            )
    )
);
-- Allow users to create their own profile during registration
CREATE POLICY "Users can create their own profile" ON public.profiles FOR
INSERT TO authenticated WITH CHECK (auth.uid() = id);
-- Also allow public (unauthenticated) users to create initial profile
-- This is needed because during registration, the user isn't authenticated yet
CREATE POLICY "Public can create initial profile" ON public.profiles FOR
INSERT TO anon WITH CHECK (true);