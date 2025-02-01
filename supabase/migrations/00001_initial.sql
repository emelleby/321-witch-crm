-- ===========================
--  COMPREHENSIVE SCHEMA
--  WITH ANALYTICS, RLS, AUDIT TRIGGERS
-- ===========================
-- 1) EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS vector;

-- 2) ENUM TYPES
DROP TYPE IF EXISTS user_role_enum CASCADE;

CREATE TYPE user_role_enum AS ENUM('customer', 'agent', 'admin');

DROP TYPE IF EXISTS ticket_priority_enum CASCADE;

CREATE TYPE ticket_priority_enum AS ENUM('low', 'normal', 'high', 'urgent');

DROP TYPE IF EXISTS ticket_status_enum CASCADE;

CREATE TYPE ticket_status_enum AS ENUM(
    'preprocessing',
    'orphan',
    'rejected',
    'open',
    'in_progress',
    'waiting_on_customer',
    'resolved',
    'closed',
    'under_review',
    'error'
);

DROP TYPE IF EXISTS notification_type_enum CASCADE;

CREATE TYPE notification_type_enum AS ENUM(
    'orphan_ticket',
    'sla_breach',
    'team_assignment',
    'admin_alert',
    'ticket_error',
    'ticket_assigned_to_team',
    'ticket_assigned_to_agent',
    'ticket_created',
    'ticket_updated',
    'ticket_closed',
    'ticket_reopened',
    'ticket_escalated',
    'chat_message',
    'organization_invite',
    'organization_billing',
    'user_mention'
);

DROP TYPE IF EXISTS knowledge_source_enum CASCADE;

CREATE TYPE knowledge_source_enum AS ENUM('faq', 'article', 'file');

DROP TYPE IF EXISTS entity_type_enum CASCADE;

CREATE TYPE entity_type_enum AS ENUM(
    'ticket',
    'ticket_message',
    'organization',
    'user_profile',
    'support_team',
    'sla_policy',
    'ticket_category',
    'ticket_tag',
    'knowledge_faq',
    'knowledge_article',
    'knowledge_file',
    'notification',
    'chat_session',
    'chat_message'
);

-- 3) ORGANIZATIONS
CREATE TABLE
    public.organizations (
        organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_name TEXT NOT NULL,
        organization_domain TEXT UNIQUE NOT NULL,
        branding_config jsonb,
        branding_prompt TEXT,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

-- 4) USER PROFILES
CREATE TABLE
    public.user_profiles (
        user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
        organization_id UUID REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        user_role user_role_enum NOT NULL DEFAULT 'customer',
        avatar_url TEXT,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

-- 5) SLA POLICIES
CREATE TABLE
    public.sla_policies (
        sla_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        policy_name TEXT NOT NULL,
        time_to_first_response INTEGER NOT NULL DEFAULT 24,
        time_to_resolution INTEGER NOT NULL DEFAULT 72,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

-- 6) SUPPORT TEAMS
CREATE TABLE
    public.support_teams (
        team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        team_name TEXT NOT NULL,
        team_description TEXT,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.team_memberships (
        membership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        team_id UUID NOT NULL REFERENCES public.support_teams (team_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.user_profiles (user_id) ON DELETE CASCADE,
        is_team_lead BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        UNIQUE (team_id, user_id)
    );

-- 7) CHAT SESSIONS & MESSAGES
CREATE TABLE
    public.chat_sessions (
        chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        started_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        subject TEXT,
        is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.chat_messages (
        message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        chat_id UUID NOT NULL REFERENCES public.chat_sessions (chat_id) ON DELETE CASCADE,
        sender_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        message_content TEXT NOT NULL,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

-- 8) UPLOADED FILES
CREATE TABLE
    public.uploaded_files (
        file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_type TEXT,
        file_size BIGINT NOT NULL DEFAULT 0,
        storage_path TEXT NOT NULL,
        uploaded_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        is_processed BOOLEAN NOT NULL DEFAULT FALSE,
        file_content TEXT,
        file_content_summary TEXT,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
    );

-- 9) SUPPORT TICKETS & MESSAGES
CREATE TABLE
    public.support_tickets (
        ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        origin_chat_id UUID REFERENCES public.chat_sessions (chat_id) ON DELETE SET NULL,
        ticket_title TEXT NOT NULL,
        ticket_description TEXT NOT NULL,
        ticket_priority ticket_priority_enum NOT NULL DEFAULT 'normal',
        ticket_status ticket_status_enum NOT NULL DEFAULT 'preprocessing',
        created_by_user_id UUID NOT NULL REFERENCES public.user_profiles (user_id) ON DELETE CASCADE,
        assigned_to_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        assigned_to_team_id UUID REFERENCES public.support_teams (team_id) ON DELETE SET NULL,
        sla_id UUID REFERENCES public.sla_policies (sla_id) ON DELETE SET NULL,
        resolution_summary TEXT,
        customer_rating INT,
        customer_feedback TEXT,
        summary TEXT,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
    );

CREATE TABLE
    public.ticket_messages (
        message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        ticket_id UUID NOT NULL REFERENCES public.support_tickets (ticket_id) ON DELETE CASCADE,
        sender_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        message_content TEXT NOT NULL,
        is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
    );

-- 10) FILE ATTACHMENTS (TICKETS, MESSAGES)
CREATE TABLE
    public.ticket_file_attachments (
        attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        ticket_id UUID NOT NULL REFERENCES public.support_tickets (ticket_id) ON DELETE CASCADE,
        file_id UUID NOT NULL REFERENCES public.uploaded_files (file_id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (ticket_id, file_id)
    );

CREATE TABLE
    public.message_file_attachments (
        attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        message_id UUID NOT NULL REFERENCES public.ticket_messages (message_id) ON DELETE CASCADE,
        file_id UUID NOT NULL REFERENCES public.uploaded_files (file_id) ON DELETE CASCADE,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        UNIQUE (message_id, file_id)
    );

-- 11) TICKET CATEGORIES & TAGS
CREATE TABLE
    public.ticket_categories (
        category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        category_name TEXT NOT NULL,
        category_description TEXT,
        display_color TEXT,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.ticket_category_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        ticket_id UUID NOT NULL REFERENCES public.support_tickets (ticket_id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES public.ticket_categories (category_id) ON DELETE CASCADE,
        is_primary_category BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

CREATE UNIQUE INDEX idx_ticket_primary_category ON public.ticket_category_assignments (ticket_id)
WHERE
    is_primary_category = TRUE;

CREATE TABLE
    public.ticket_tags (
        tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        tag_name TEXT NOT NULL,
        tag_description TEXT,
        display_color TEXT,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.ticket_tag_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        ticket_id UUID NOT NULL REFERENCES public.support_tickets (ticket_id) ON DELETE CASCADE,
        tag_id UUID NOT NULL REFERENCES public.ticket_tags (tag_id) ON DELETE CASCADE,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        UNIQUE (ticket_id, tag_id)
    );

-- Team specializations (categories and tags)
CREATE TABLE
    public.team_category_specializations (
        specialization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        team_id UUID NOT NULL REFERENCES public.support_teams (team_id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES public.ticket_categories (category_id) ON DELETE CASCADE,
        expertise_level INTEGER NOT NULL DEFAULT 1,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        UNIQUE (team_id, category_id)
    );

CREATE TABLE
    public.team_tag_specializations (
        specialization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        team_id UUID NOT NULL REFERENCES public.support_teams (team_id) ON DELETE CASCADE,
        tag_id UUID NOT NULL REFERENCES public.ticket_tags (tag_id) ON DELETE CASCADE,
        expertise_level INTEGER NOT NULL DEFAULT 1,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        UNIQUE (team_id, tag_id)
    );

-- 12) KNOWLEDGE BASE
CREATE TABLE
    public.knowledge_faqs (
        faq_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_updated BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        updated_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.knowledge_faq_versions (
        version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        faq_id UUID NOT NULL REFERENCES public.knowledge_faqs (faq_id) ON DELETE CASCADE,
        version_number INT NOT NULL DEFAULT 1,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        updated_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_updated BOOLEAN NOT NULL DEFAULT FALSE,
        update_reason TEXT,
        created_at timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.knowledge_articles (
        article_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        CONTENT TEXT NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_updated BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        updated_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.knowledge_article_versions (
        version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        article_id UUID NOT NULL REFERENCES public.knowledge_articles (article_id) ON DELETE CASCADE,
        version_number INT NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        CONTENT TEXT NOT NULL,
        updated_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_updated BOOLEAN NOT NULL DEFAULT FALSE,
        update_reason TEXT,
        created_at timestamptz NOT NULL DEFAULT NOW()
    );

CREATE TABLE
    public.knowledge_files (
        knowledge_file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        file_id UUID NOT NULL REFERENCES public.uploaded_files (file_id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        extracted_text TEXT NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_updated BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        updated_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
    );

-- 13) KNOWLEDGE EMBEDDINGS
CREATE TABLE
    public.knowledge_embeddings (
        embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        source_type knowledge_source_enum NOT NULL,
        source_id UUID NOT NULL,
        chunk_index INT NOT NULL DEFAULT 0,
        CONTENT TEXT NOT NULL,
        content_embedding vector (1536) NOT NULL,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (source_type, source_id, chunk_index)
    );

-- 14) NOTIFICATIONS & READ STATUS
CREATE TABLE
    public.notifications (
        notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        notification_type notification_type_enum NOT NULL DEFAULT 'admin_alert',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
    );

CREATE TABLE
    public.notification_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        notification_id UUID NOT NULL REFERENCES public.notifications (notification_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.user_profiles (user_id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (notification_id, user_id)
    );

CREATE TABLE
    public.read_status (
        read_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        user_id UUID NOT NULL REFERENCES public.user_profiles (user_id) ON DELETE CASCADE,
        entity_type entity_type_enum NOT NULL,
        entity_id UUID NOT NULL,
        read_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        UNIQUE (user_id, entity_type, entity_id)
    );

-- 15) AUDIT LOGS
CREATE TABLE
    public.audit_logs (
        audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        entity_type entity_type_enum,
        entity_id UUID,
        ACTION TEXT NOT NULL,
        changes jsonb,
        performed_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        organization_id UUID REFERENCES public.organizations (organization_id) ON DELETE SET NULL,
        is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
        is_ai_updated BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz NOT NULL DEFAULT NOW()
    );

-- 16) ANALYTICS EVENTS
CREATE TABLE
    public.analytics_events (
        event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        event_data jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
    );

CREATE TABLE
    public.uploaded_file_embeddings (
        embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE,
        file_id UUID NOT NULL REFERENCES public.uploaded_files (file_id) ON DELETE CASCADE,
        chunk_index INT NOT NULL DEFAULT 0,
        CONTENT TEXT NOT NULL,
        content_embedding vector (1536) NOT NULL,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, file_id, chunk_index)
    );

CREATE TABLE
    public.ticket_routing_decisions (
        ticket_id UUID PRIMARY KEY REFERENCES public.support_tickets (ticket_id) ON DELETE CASCADE,
        selected_team_id UUID REFERENCES public.support_teams (team_id) ON DELETE SET NULL,
        confidence_score FLOAT,
        reasoning TEXT,
        suggested_categories TEXT[] DEFAULT '{}',
        suggested_tags TEXT[] DEFAULT '{}',
        suggested_priority ticket_priority_enum,
        is_orphaned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
    );

-- Add new ticket status enum values
ALTER TYPE ticket_status_enum
ADD VALUE IF NOT EXISTS 'under_review';

ALTER TYPE ticket_status_enum
ADD VALUE IF NOT EXISTS 'error';

-- Add new notification type enum values
ALTER TYPE notification_type_enum
ADD VALUE IF NOT EXISTS 'ticket_error';

-- Create new enum types for lifecycle and errors
CREATE TYPE ticket_lifecycle_stage_enum AS ENUM(
    'creation',
    'preprocessing',
    'routing',
    'support',
    'post_resolution',
    'archived'
);

CREATE TYPE ticket_error_type_enum AS ENUM(
    'moderation_failed',
    'file_processing_error',
    'routing_failed',
    'ai_processing_error',
    'sla_breach',
    'system_error'
);

-- Create table for tracking ticket errors and lifecycle
CREATE TABLE
    public.ticket_lifecycle (
        ticket_id UUID PRIMARY KEY REFERENCES public.support_tickets (ticket_id) ON DELETE CASCADE,
        current_stage ticket_lifecycle_stage_enum NOT NULL DEFAULT 'creation',
        current_error_type ticket_error_type_enum,
        error_description TEXT,
        error_details jsonb,
        requires_admin_review BOOLEAN NOT NULL DEFAULT FALSE,
        admin_review_reason TEXT,
        admin_review_notes TEXT,
        reviewed_by_user_id UUID REFERENCES public.user_profiles (user_id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
    );

-- Add index for ticket lifecycle stage queries
CREATE INDEX idx_ticket_lifecycle_stage ON public.ticket_lifecycle (current_stage);

CREATE INDEX idx_ticket_lifecycle_errors ON public.ticket_lifecycle (current_error_type)
WHERE
    current_error_type IS NOT NULL;

-- 17) INDEXES & VECTOR
CREATE INDEX idx_knowledge_embeddings_vector ON public.knowledge_embeddings USING ivfflat (content_embedding vector_cosine_ops);

CREATE INDEX idx_user_profiles_org ON public.user_profiles (organization_id);

CREATE INDEX idx_support_tickets_org ON public.support_tickets (organization_id);

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages (ticket_id);

CREATE INDEX idx_uploaded_files_org ON public.uploaded_files (organization_id);

CREATE INDEX idx_chat_sessions_org ON public.chat_sessions (organization_id);

CREATE INDEX idx_chat_messages_chat ON public.chat_messages (chat_id);

-- 18) REPLICA IDENTITY FOR REALTIME
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;

ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;

ALTER TABLE public.support_teams REPLICA IDENTITY FULL;

ALTER TABLE public.team_memberships REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_categories REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_tags REPLICA IDENTITY FULL;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER TABLE public.notification_assignments REPLICA IDENTITY FULL;

ALTER TABLE public.read_status REPLICA IDENTITY FULL;

ALTER TABLE public.knowledge_faqs REPLICA IDENTITY FULL;

ALTER TABLE public.knowledge_articles REPLICA IDENTITY FULL;

ALTER TABLE public.knowledge_files REPLICA IDENTITY FULL;

ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Check if all files for a ticket are processed. Returns true if all files are processed, otherwise false.
CREATE
OR REPLACE FUNCTION public.fn_check_all_ticket_files_processed (_ticket_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1
        FROM public.ticket_file_attachments tfa
        JOIN public.uploaded_files uf ON uf.file_id = tfa.file_id
        WHERE tfa.ticket_id = _ticket_id
        AND uf.is_processed = FALSE
    );
END;
$$;

-- Concatenates the ticket title and description with all attached file contents into a single string.
CREATE
OR REPLACE FUNCTION public.fn_concatenate_ticket_content (_ticket_id UUID) RETURNS TEXT LANGUAGE SQL AS $$
    WITH ticket_data AS (
        SELECT
            st.ticket_title,
            st.ticket_description
        FROM public.support_tickets st
        WHERE st.ticket_id = _ticket_id
    ),
    file_contents AS (
        SELECT
            COALESCE(string_agg(uf.file_content, ' '), '') AS all_file_contents
        FROM public.ticket_file_attachments tfa
        JOIN public.uploaded_files uf ON uf.file_id = tfa.file_id
        WHERE tfa.ticket_id = _ticket_id
    )
    SELECT CONCAT_WS(
        ' ',
        ticket_data.ticket_title,
        ticket_data.ticket_description,
        file_contents.all_file_contents
    )
    FROM ticket_data, file_contents;
$$;

-- 19) VIEWS FOR TICKET ROUTING
CREATE OR REPLACE VIEW
    public.team_routing_info AS
WITH
    team_categories AS (
        SELECT
            ts.team_id,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'category_id',
                    tc.category_id,
                    'category_name',
                    tc.category_name,
                    'category_description',
                    tc.category_description,
                    'expertise_level',
                    ts.expertise_level
                )
            ) AS categories
        FROM
            team_category_specializations ts
            JOIN ticket_categories tc ON tc.category_id = ts.category_id
        GROUP BY
            ts.team_id
    ),
    team_tags AS (
        SELECT
            ts.team_id,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'tag_id',
                    tt.tag_id,
                    'tag_name',
                    tt.tag_name,
                    'tag_description',
                    tt.tag_description,
                    'expertise_level',
                    ts.expertise_level
                )
            ) AS tags
        FROM
            team_tag_specializations ts
            JOIN ticket_tags tt ON tt.tag_id = ts.tag_id
        GROUP BY
            ts.team_id
    )
SELECT
    t.team_id,
    t.organization_id,
    t.team_name,
    t.team_description,
    COALESCE(tc.categories, '[]'::jsonb) AS team_categories,
    COALESCE(tt.tags, '[]'::jsonb) AS team_tags
FROM
    support_teams t
    LEFT JOIN team_categories tc ON tc.team_id = t.team_id
    LEFT JOIN team_tags tt ON tt.team_id = t.team_id;

CREATE OR REPLACE VIEW
    public.ticket_routing_info AS
SELECT
    t.ticket_id,
    t.ticket_title,
    t.ticket_description,
    t.organization_id,
    o.branding_prompt,
    COALESCE(
        (
            SELECT
                JSONB_AGG(
                    JSONB_BUILD_OBJECT('category_name', category_name)
                )
            FROM
                ticket_categories
            WHERE
                organization_id = t.organization_id
        ),
        '[]'::jsonb
    ) AS organization_categories,
    COALESCE(
        (
            SELECT
                JSONB_AGG(JSONB_BUILD_OBJECT('tag_name', tag_name))
            FROM
                ticket_tags
            WHERE
                organization_id = t.organization_id
        ),
        '[]'::jsonb
    ) AS organization_tags,
    (
        SELECT
            JSONB_BUILD_OBJECT(
                'policy_name',
                policy_name,
                'time_to_first_response',
                time_to_first_response,
                'time_to_resolution',
                time_to_resolution
            )
        FROM
            sla_policies
        WHERE
            sla_id = t.sla_id
    ) AS sla_policy,
    COALESCE(
        (
            SELECT
                JSONB_AGG(f.file_content_summary)
            FROM
                ticket_file_attachments tfa
                JOIN uploaded_files f ON f.file_id = tfa.file_id
            WHERE
                tfa.ticket_id = t.ticket_id
                AND f.file_content_summary IS NOT NULL
        ),
        '[]'::jsonb
    ) AS file_summaries
FROM
    support_tickets t
    JOIN organizations o ON o.organization_id = t.organization_id;

-- Create stored procedure for user and organization creation
CREATE
OR REPLACE FUNCTION public.create_user_and_organization (
    user_id UUID,
    full_name TEXT,
    ROLE TEXT,
    org_name TEXT DEFAULT NULL,
    org_domain TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public AS $$
DECLARE
    v_organization_id UUID;
BEGIN
    -- Start transaction
    BEGIN
        -- If organization name and domain are provided, create organization
        IF org_name IS NOT NULL AND org_domain IS NOT NULL THEN
            INSERT INTO public.organizations (organization_name, organization_domain)
            VALUES (org_name, org_domain)
            RETURNING organization_id INTO v_organization_id;
        END IF;

        -- Create user profile with proper enum casting
        INSERT INTO public.user_profiles (
            user_id,
            display_name,
            user_role,
            organization_id
        ) VALUES (
            user_id,
            full_name,
            role::user_role_enum,  -- Cast the role to user_role_enum
            v_organization_id
        );

        -- If this is a new organization and the user is an agent, make them an admin
        IF v_organization_id IS NOT NULL AND role = 'agent' THEN
            UPDATE public.user_profiles
            SET user_role = 'admin'::user_role_enum  -- Cast to user_role_enum here as well
            WHERE user_id = user_id;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction on error
        RAISE;
    END;
END;
$$;

-- Enable RLS on tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_faqs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_teams ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow admins full access to tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "Allow agents to view and update assigned tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "Allow customers to view their organization tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "Allow all for authenticated users - support_tickets" ON public.support_tickets;

-- First drop any existing development policies
DO $$ 
DECLARE
    table_name text;
BEGIN
    FOR table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated users - %I" ON public.%I;', table_name, table_name);
    END LOOP;
END $$;

-- Production policies (these will be overridden by development policies)
-- Admin policy - full access
CREATE POLICY "Allow admins full access to tickets" ON public.support_tickets FOR ALL TO authenticated USING (
    EXISTS (
        SELECT
            1
        FROM
            public.user_profiles
        WHERE
            user_profiles.user_id = auth.uid ()
            AND user_profiles.user_role = 'admin'
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT
                1
            FROM
                public.user_profiles
            WHERE
                user_profiles.user_id = auth.uid ()
                AND user_profiles.user_role = 'admin'
        )
    );

-- Agent policy - view and update assigned tickets or tickets in their team
CREATE POLICY "Allow agents to view and update assigned tickets" ON public.support_tickets FOR ALL TO authenticated USING (
    EXISTS (
        SELECT
            1
        FROM
            public.user_profiles up
            LEFT JOIN public.team_memberships tm ON tm.user_id = up.user_id
        WHERE
            up.user_id = auth.uid ()
            AND up.user_role = 'agent'
            AND (
                support_tickets.assigned_to_user_id = auth.uid ()
                OR support_tickets.assigned_to_team_id IN (
                    SELECT
                        team_id
                    FROM
                        public.team_memberships
                    WHERE
                        user_id = auth.uid ()
                )
            )
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT
                1
            FROM
                public.user_profiles
            WHERE
                user_profiles.user_id = auth.uid ()
                AND user_profiles.user_role = 'agent'
        )
    );

-- Customer policy - view tickets they created or in their organization
CREATE POLICY "Allow customers to view their organization tickets" ON public.support_tickets FOR ALL TO authenticated USING (
    created_by_user_id = auth.uid ()
    OR EXISTS (
        SELECT
            1
        FROM
            public.user_profiles
        WHERE
            user_profiles.user_id = auth.uid ()
            AND user_profiles.user_role = 'customer'
            AND user_profiles.organization_id = support_tickets.organization_id
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT
                1
            FROM
                public.user_profiles
            WHERE
                user_profiles.user_id = auth.uid ()
        )
    );

-- Development policies - Allow all operations for authenticated users
-- These will override the production policies in development
DO $$ 
DECLARE
    table_name text;
BEGIN
    FOR table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE format('CREATE POLICY "Allow all for authenticated users - %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', table_name, table_name);
    END LOOP;
END $$;