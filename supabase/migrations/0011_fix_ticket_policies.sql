-- Create ticket status enum if it doesn't exist
DO $$ BEGIN CREATE TYPE public.ticket_status AS ENUM ('open', 'pending', 'closed');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Create ticket priority enum if it doesn't exist
DO $$ BEGIN CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    subject text NOT NULL,
    description text NOT NULL,
    creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    assigned_to uuid REFERENCES auth.users(id) ON DELETE
    SET NULL,
        status public.ticket_status DEFAULT 'open'::public.ticket_status NOT NULL,
        priority public.ticket_priority DEFAULT 'normal'::public.ticket_priority NOT NULL,
        resolution_summary text,
        source text,
        estimated_resolution_time interval,
        ai_routing_confidence_score numeric(5, 2),
        tags text [],
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        unread_customer_messages integer DEFAULT 0,
        unread_agent_messages integer DEFAULT 0,
        sla_policy_id uuid REFERENCES public.sla_policies(id),
        first_response_breach_at timestamptz,
        resolution_breach_at timestamptz,
        search_vector tsvector,
        content_embedding extensions.vector(1536)
);
-- Create indexes
CREATE INDEX IF NOT EXISTS tickets_description_trgm_idx ON public.tickets USING gin (description public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tickets_subject_trgm_idx ON public.tickets USING gin (subject public.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tickets_search_vector_idx ON public.tickets USING gin (search_vector);
CREATE INDEX IF NOT EXISTS tickets_embedding_idx ON public.tickets USING ivfflat (content_embedding extensions.vector_cosine_ops) WITH (lists = 100);
-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets in their organization" ON public.tickets;
DROP POLICY IF EXISTS "Agents can update tickets in their organization" ON public.tickets;
-- Create policies
CREATE POLICY "Users can create tickets" ON public.tickets FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view tickets in their organization" ON public.tickets FOR
SELECT TO authenticated USING (
        (
            organization_id IN (
                SELECT profiles.organization_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
        )
        OR creator_id = auth.uid()
    );
CREATE POLICY "Agents can update tickets in their organization" ON public.tickets FOR
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
-- Grant privileges
GRANT ALL ON TABLE public.tickets TO authenticated;
GRANT ALL ON TABLE public.tickets TO service_role;
-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER handle_updated_at BEFORE
UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();