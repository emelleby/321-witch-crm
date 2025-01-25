/*
 * Extensions needed for core functionality
 */
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
WITH
    SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "vector"
WITH
    SCHEMA "extensions";

/*
 * Enum types with descriptive names
 */
CREATE TYPE "public"."user_role_type" AS ENUM('customer', 'agent', 'admin');

CREATE TYPE "public"."ticket_priority_type" AS ENUM('low', 'normal', 'high', 'urgent');

CREATE TYPE "public"."ticket_status_type" AS ENUM(
    'open',
    'in_progress',
    'waiting_on_customer',
    'resolved',
    'closed'
);

CREATE TYPE "public"."entity_type" AS ENUM(
    'support_tickets',
    'ticket_messages',
    'user_profiles',
    'organizations',
    'support_teams',
    'team_memberships',
    'ticket_categories',
    'ticket_tags',
    'ticket_category_assignments',
    'ticket_tag_assignments',
    'uploaded_files',
    'knowledge_faqs',
    'knowledge_articles',
    'knowledge_files',
    'knowledge_base_embeddings',
    'knowledge_article_versions',
    'read_status',
    'notifications',
    'notification_assignments'
);

CREATE TYPE notification_type AS ENUM(
    'orphan_ticket',
    'high_priority',
    'sla_breach',
    'team_assignment'
);

/*
 * Files table needs to come first since other tables reference it
 */
CREATE TABLE
    "public"."uploaded_files" (
        "file_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "file_name" TEXT NOT NULL,
        "file_type" TEXT NOT NULL,
        "file_size" INTEGER NOT NULL DEFAULT 0,
        "storage_path" TEXT NOT NULL,
        "uploaded_by_user_id" UUID,
        -- Will be set after user_profiles is created
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

-- Core tables
CREATE TABLE
    "public"."organizations" (
        "organization_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_name" TEXT NOT NULL,
        "organization_domain" TEXT NOT NULL,
        "organization_logo_file_id" UUID REFERENCES public.uploaded_files (file_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."user_profiles" (
        "user_id" UUID PRIMARY KEY REFERENCES auth.users (id),
        "organization_id" UUID REFERENCES public.organizations (organization_id),
        "display_name" TEXT NOT NULL,
        "user_role" user_role_type NOT NULL,
        "avatar_file_id" UUID REFERENCES public.uploaded_files (file_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

/*
 * Now we can add the foreign key constraint for uploaded_files
 */
ALTER TABLE "public"."uploaded_files"
ADD CONSTRAINT "uploaded_files_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user_profiles" ("user_id");

CREATE TABLE
    "public"."support_teams" (
        "team_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "team_name" TEXT NOT NULL,
        "team_description" TEXT,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."team_memberships" (
        "membership_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "team_id" UUID NOT NULL REFERENCES public.support_teams (team_id),
        "user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "is_team_lead" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (team_id, user_id)
    );

CREATE TABLE
    "public"."support_tickets" (
        "ticket_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "ticket_title" TEXT NOT NULL,
        "ticket_description" TEXT NOT NULL,
        "ticket_priority" ticket_priority_type NOT NULL DEFAULT 'normal',
        "ticket_status" ticket_status_type NOT NULL DEFAULT 'open',
        "created_by_user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "assigned_to_user_id" UUID REFERENCES public.user_profiles (user_id),
        "assigned_to_team_id" UUID REFERENCES public.support_teams (team_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."ticket_messages" (
        "message_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "ticket_id" UUID NOT NULL REFERENCES public.support_tickets (ticket_id),
        "sender_user_id" UUID REFERENCES public.user_profiles (user_id),
        "message_content" TEXT NOT NULL,
        "is_internal_note" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_ai_generated" BOOLEAN NOT NULL DEFAULT FALSE,
        "customer_has_read" BOOLEAN NOT NULL DEFAULT FALSE,
        "agent_has_read" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    public.message_file_attachments (
        "attachment_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "message_id" UUID NOT NULL REFERENCES public.ticket_messages (message_id) ON DELETE CASCADE,
        "file_id" UUID NOT NULL REFERENCES public.uploaded_files (file_id),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (message_id, file_id)
    );

CREATE TABLE
    "public"."ticket_categories" (
        "category_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "category_name" TEXT NOT NULL,
        "category_description" TEXT,
        "display_color" TEXT,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."ticket_category_assignments" (
        "assignment_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "ticket_id" UUID NOT NULL REFERENCES public.support_tickets (ticket_id),
        "category_id" UUID NOT NULL REFERENCES public.ticket_categories (category_id),
        "is_primary_category" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (ticket_id, category_id)
    );

-- Enforce one primary category per ticket
CREATE UNIQUE INDEX idx_ticket_primary_category ON public.ticket_category_assignments (ticket_id)
WHERE
    is_primary_category = TRUE;

CREATE TABLE
    "public"."ticket_tags" (
        "tag_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "tag_name" TEXT NOT NULL,
        "tag_description" TEXT,
        "display_color" TEXT,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."ticket_tag_assignments" (
        "assignment_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "ticket_id" UUID NOT NULL REFERENCES public.support_tickets (ticket_id),
        "tag_id" UUID NOT NULL REFERENCES public.ticket_tags (tag_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (ticket_id, tag_id)
    );

CREATE TABLE
    public.ticket_file_attachments (
        "attachment_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "ticket_id" UUID NOT NULL REFERENCES public.support_tickets (ticket_id),
        "file_id" UUID NOT NULL REFERENCES public.uploaded_files (file_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (ticket_id, file_id)
    );

CREATE INDEX idx_ticket_file_attachments_ticket ON public.ticket_file_attachments (ticket_id);

CREATE INDEX idx_ticket_file_attachments_file ON public.ticket_file_attachments (file_id);

/*
 * Embedding tables for AI functionality
 */
CREATE TABLE
    "public"."ticket_embeddings" (
        "embedding_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "ticket_id" UUID NOT NULL REFERENCES public.support_tickets (ticket_id),
        "content_embedding" vector (1536) NOT NULL,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (ticket_id)
    );

CREATE TABLE
    "public"."message_embeddings" (
        "embedding_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "message_id" UUID NOT NULL REFERENCES public.ticket_messages (message_id),
        "content_embedding" vector (1536) NOT NULL,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (message_id)
    );

CREATE TABLE
    "public"."category_embeddings" (
        "embedding_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "category_id" UUID NOT NULL REFERENCES public.ticket_categories (category_id),
        "content_embedding" vector (1536) NOT NULL,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (category_id)
    );

CREATE TABLE
    "public"."tag_embeddings" (
        "embedding_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "tag_id" UUID NOT NULL REFERENCES public.ticket_tags (tag_id),
        "content_embedding" vector (1536) NOT NULL,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (tag_id)
    );

CREATE TABLE
    "public"."file_embeddings" (
        "embedding_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "file_id" UUID NOT NULL REFERENCES public.uploaded_files (file_id),
        "content_embedding" vector (1536) NOT NULL,
        "extracted_text" TEXT NOT NULL,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (file_id)
    );

CREATE TABLE
    public.notifications (
        "notification_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID REFERENCES public.organizations (organization_id),
        "notification_type" notification_type NOT NULL,
        "entity_type" entity_type NOT NULL,
        "entity_id" UUID NOT NULL,
        "notification_title" TEXT NOT NULL,
        "notification_content" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE
    public.notification_assignments (
        "assignment_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "notification_id" UUID NOT NULL REFERENCES public.notifications (notification_id) ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (notification_id, user_id)
    );

CREATE TABLE
    public.read_status (
        "read_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "entity_type" entity_type NOT NULL,
        "entity_id" UUID NOT NULL,
        "read_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, entity_type, entity_id)
    );

/*
 * Indexes for foreign keys and embedding similarity searches
 */
CREATE INDEX idx_tickets_organization ON public.support_tickets (organization_id);

CREATE INDEX idx_tickets_assigned_user ON public.support_tickets (assigned_to_user_id);

CREATE INDEX idx_tickets_assigned_team ON public.support_tickets (assigned_to_team_id);

CREATE INDEX idx_tickets_created_by ON public.support_tickets (created_by_user_id);

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages (ticket_id);

CREATE INDEX idx_ticket_messages_sender ON public.ticket_messages (sender_user_id);

CREATE INDEX idx_user_profiles_organization ON public.user_profiles (organization_id);

CREATE INDEX idx_team_memberships_user ON public.team_memberships (user_id);

CREATE INDEX idx_ticket_embeddings ON public.ticket_embeddings USING ivfflat (content_embedding vector_cosine_ops);

CREATE INDEX idx_message_embeddings ON public.message_embeddings USING ivfflat (content_embedding vector_cosine_ops);

CREATE INDEX idx_category_embeddings ON public.category_embeddings USING ivfflat (content_embedding vector_cosine_ops);

CREATE INDEX idx_tag_embeddings ON public.tag_embeddings USING ivfflat (content_embedding vector_cosine_ops);

CREATE INDEX idx_file_embeddings ON public.file_embeddings USING ivfflat (content_embedding vector_cosine_ops);

CREATE INDEX idx_notifications_org ON public.notifications (organization_id)
WHERE
    organization_id IS NOT NULL;

CREATE INDEX idx_notifications_entity ON public.notifications (entity_type, entity_id);

CREATE INDEX idx_notification_assignments_user ON public.notification_assignments (user_id);

CREATE INDEX idx_read_status_user ON public.read_status (user_id);

CREATE INDEX idx_read_status_entity ON public.read_status (entity_type, entity_id);

/*
 * Realtime functionality
 */
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;

ALTER TABLE public.support_teams REPLICA IDENTITY FULL;

ALTER TABLE public.team_memberships REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_categories REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_tags REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_category_assignments REPLICA IDENTITY FULL;

ALTER TABLE public.ticket_tag_assignments REPLICA IDENTITY FULL;

ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;

ALTER TABLE public.organizations REPLICA IDENTITY FULL;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER TABLE public.notification_assignments REPLICA IDENTITY FULL;

ALTER TABLE public.read_status REPLICA IDENTITY FULL;

/*
 * Functions
 */
-- * Audit log function
-- Commenting out audit functionality temporarily
/*
CREATE TABLE "public"."audit_logs" (
"log_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
"entity_type" entity_type NOT NULL,
"entity_id" UUID NOT NULL,
"action" TEXT NOT NULL,
"changes" jsonb NOT NULL,
"performed_by_user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
"organization_id" UUID REFERENCES public.organizations (organization_id),
"created_at" timestamptz DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.fn_create_audit_log() RETURNS TRIGGER AS $$
DECLARE 
org_id uuid;
entity_id_value uuid;
BEGIN
-- Determine organization_id
org_id := CASE
WHEN TG_OP = 'DELETE' THEN
CASE TG_TABLE_NAME
WHEN 'uploaded_files' THEN NULL
WHEN 'knowledge_base_embeddings' THEN (
-- Only access OLD.source_type for knowledge_base_embeddings during DELETE
CASE OLD.source_type
WHEN 'article' THEN (SELECT organization_id FROM knowledge_articles WHERE article_id = OLD.source_id)
WHEN 'faq' THEN (SELECT organization_id FROM knowledge_faqs WHERE faq_id = OLD.source_id)
WHEN 'file' THEN (SELECT organization_id FROM knowledge_files WHERE file_id = OLD.source_id)
ELSE NULL
END
)
WHEN 'knowledge_article_versions' THEN (
SELECT organization_id FROM knowledge_articles WHERE article_id = OLD.article_id
)
-- Handle tables without organization_id
WHEN 'read_status' THEN (
SELECT organization_id FROM user_profiles WHERE user_id = OLD.user_id
)
WHEN 'notification_assignments' THEN (
SELECT organization_id FROM notifications WHERE notification_id = OLD.notification_id
)
WHEN 'team_memberships' THEN (
SELECT organization_id FROM support_teams WHERE team_id = OLD.team_id
)
WHEN 'ticket_messages' THEN (
SELECT organization_id FROM support_tickets WHERE ticket_id = OLD.ticket_id
)
WHEN 'ticket_category_assignments' THEN (
SELECT organization_id FROM ticket_categories WHERE category_id = OLD.category_id
)
WHEN 'ticket_tag_assignments' THEN (
SELECT organization_id FROM ticket_tags WHERE tag_id = OLD.tag_id
)
WHEN 'ticket_file_attachments' THEN (
SELECT organization_id FROM support_tickets WHERE ticket_id = OLD.ticket_id
)
WHEN 'message_file_attachments' THEN (
SELECT t.organization_id 
FROM support_tickets t 
JOIN ticket_messages m ON m.ticket_id = t.ticket_id 
WHERE m.message_id = OLD.message_id
)
-- For tables with direct organization_id column
WHEN 'organizations' THEN OLD.organization_id
WHEN 'user_profiles' THEN OLD.organization_id
WHEN 'support_tickets' THEN OLD.organization_id
WHEN 'support_teams' THEN OLD.organization_id
WHEN 'ticket_categories' THEN OLD.organization_id
WHEN 'ticket_tags' THEN OLD.organization_id
WHEN 'notifications' THEN OLD.organization_id
WHEN 'knowledge_faqs' THEN OLD.organization_id
WHEN 'knowledge_articles' THEN OLD.organization_id
WHEN 'knowledge_files' THEN OLD.organization_id
ELSE NULL
END
ELSE
CASE TG_TABLE_NAME
WHEN 'uploaded_files' THEN NULL
WHEN 'knowledge_base_embeddings' THEN (
-- Only access NEW.source_type for knowledge_base_embeddings during INSERT/UPDATE
CASE NEW.source_type
WHEN 'article' THEN (SELECT organization_id FROM knowledge_articles WHERE article_id = NEW.source_id)
WHEN 'faq' THEN (SELECT organization_id FROM knowledge_faqs WHERE faq_id = NEW.source_id)
WHEN 'file' THEN (SELECT organization_id FROM knowledge_files WHERE file_id = NEW.source_id)
ELSE NULL
END
)
WHEN 'knowledge_article_versions' THEN (
SELECT organization_id FROM knowledge_articles WHERE article_id = NEW.article_id
)
-- Handle tables without organization_id
WHEN 'read_status' THEN (
SELECT organization_id FROM user_profiles WHERE user_id = NEW.user_id
)
WHEN 'notification_assignments' THEN (
SELECT organization_id FROM notifications WHERE notification_id = NEW.notification_id
)
WHEN 'team_memberships' THEN (
SELECT organization_id FROM support_teams WHERE team_id = NEW.team_id
)
WHEN 'ticket_messages' THEN (
SELECT organization_id FROM support_tickets WHERE ticket_id = NEW.ticket_id
)
WHEN 'ticket_category_assignments' THEN (
SELECT organization_id FROM ticket_categories WHERE category_id = NEW.category_id
)
WHEN 'ticket_tag_assignments' THEN (
SELECT organization_id FROM ticket_tags WHERE tag_id = NEW.tag_id
)
WHEN 'ticket_file_attachments' THEN (
SELECT organization_id FROM support_tickets WHERE ticket_id = NEW.ticket_id
)
WHEN 'message_file_attachments' THEN (
SELECT t.organization_id 
FROM support_tickets t 
JOIN ticket_messages m ON m.ticket_id = t.ticket_id 
WHERE m.message_id = NEW.message_id
)
-- For tables with direct organization_id column
WHEN 'organizations' THEN NEW.organization_id
WHEN 'user_profiles' THEN NEW.organization_id
WHEN 'support_tickets' THEN NEW.organization_id
WHEN 'support_teams' THEN NEW.organization_id
WHEN 'ticket_categories' THEN NEW.organization_id
WHEN 'ticket_tags' THEN NEW.organization_id
WHEN 'notifications' THEN NEW.organization_id
WHEN 'knowledge_faqs' THEN NEW.organization_id
WHEN 'knowledge_articles' THEN NEW.organization_id
WHEN 'knowledge_files' THEN NEW.organization_id
ELSE NULL
END
END;

-- Determine the correct entity ID based on table name
entity_id_value := CASE
WHEN TG_OP = 'DELETE' THEN 
CASE TG_TABLE_NAME
WHEN 'user_profiles' THEN OLD.user_id
WHEN 'organizations' THEN OLD.organization_id
WHEN 'support_tickets' THEN OLD.ticket_id
WHEN 'ticket_messages' THEN OLD.message_id
WHEN 'support_teams' THEN OLD.team_id
WHEN 'team_memberships' THEN OLD.membership_id
WHEN 'ticket_categories' THEN OLD.category_id
WHEN 'ticket_tags' THEN OLD.tag_id
WHEN 'ticket_category_assignments' THEN OLD.assignment_id
WHEN 'ticket_tag_assignments' THEN OLD.assignment_id
WHEN 'ticket_file_attachments' THEN OLD.attachment_id
WHEN 'uploaded_files' THEN OLD.file_id
WHEN 'notifications' THEN OLD.notification_id
WHEN 'notification_assignments' THEN OLD.assignment_id
WHEN 'read_status' THEN OLD.read_id
WHEN 'knowledge_faqs' THEN OLD.faq_id
WHEN 'knowledge_articles' THEN OLD.article_id
WHEN 'knowledge_files' THEN OLD.file_id
WHEN 'knowledge_base_embeddings' THEN OLD.embedding_id
WHEN 'knowledge_article_versions' THEN OLD.version_id
WHEN 'message_file_attachments' THEN OLD.attachment_id
ELSE NULL
END
ELSE 
CASE TG_TABLE_NAME
WHEN 'user_profiles' THEN NEW.user_id
WHEN 'organizations' THEN NEW.organization_id
WHEN 'support_tickets' THEN NEW.ticket_id
WHEN 'ticket_messages' THEN NEW.message_id
WHEN 'support_teams' THEN NEW.team_id
WHEN 'team_memberships' THEN NEW.membership_id
WHEN 'ticket_categories' THEN NEW.category_id
WHEN 'ticket_tags' THEN NEW.tag_id
WHEN 'ticket_category_assignments' THEN NEW.assignment_id
WHEN 'ticket_tag_assignments' THEN NEW.assignment_id
WHEN 'ticket_file_attachments' THEN NEW.attachment_id
WHEN 'uploaded_files' THEN NEW.file_id
WHEN 'notifications' THEN NEW.notification_id
WHEN 'notification_assignments' THEN NEW.assignment_id
WHEN 'read_status' THEN NEW.read_id
WHEN 'knowledge_faqs' THEN NEW.faq_id
WHEN 'knowledge_articles' THEN NEW.article_id
WHEN 'knowledge_files' THEN NEW.file_id
WHEN 'knowledge_base_embeddings' THEN NEW.embedding_id
WHEN 'knowledge_article_versions' THEN NEW.version_id
WHEN 'message_file_attachments' THEN NEW.attachment_id
ELSE NULL
END
END;

-- Insert the audit log
INSERT INTO public.audit_logs (
entity_type,
entity_id,
action,
changes,
performed_by_user_id,
organization_id
)
VALUES (
TG_TABLE_NAME::entity_type,
entity_id_value,
TG_OP,
CASE
WHEN TG_OP = 'INSERT' THEN jsonb_build_object('new', row_to_json(NEW)::jsonb)
WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
'old', row_to_json(OLD)::jsonb,
'new', row_to_json(NEW)::jsonb
)
WHEN TG_OP = 'DELETE' THEN jsonb_build_object('old', row_to_json(OLD)::jsonb)
END,
COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
org_id
);
RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
 */
/*
 * Knowledge Base Tables
 */
CREATE TABLE
    "public"."knowledge_faqs" (
        "faq_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "question" TEXT NOT NULL,
        "answer" TEXT NOT NULL,
        "is_published" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_by_user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "updated_by_user_id" UUID REFERENCES public.user_profiles (user_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."knowledge_articles" (
        "article_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "is_published" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_by_user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "updated_by_user_id" UUID REFERENCES public.user_profiles (user_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."knowledge_files" (
        "file_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "file_reference_id" UUID NOT NULL REFERENCES public.uploaded_files (file_id),
        "title" TEXT NOT NULL,
        "description" TEXT,
        "extracted_text" TEXT NOT NULL,
        "is_published" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_by_user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "updated_by_user_id" UUID REFERENCES public.user_profiles (user_id),
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
    );

CREATE TABLE
    "public"."knowledge_base_embeddings" (
        "embedding_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "organization_id" UUID NOT NULL REFERENCES public.organizations (organization_id),
        "source_type" TEXT NOT NULL CHECK (source_type IN ('faq', 'article', 'file')),
        "source_id" UUID NOT NULL,
        "chunk_index" INTEGER NOT NULL,
        "content" TEXT NOT NULL,
        "content_embedding" vector (1536) NOT NULL,
        "metadata" JSONB,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        UNIQUE (source_type, source_id, chunk_index)
    );

-- Add version history table for knowledge articles
CREATE TABLE
    "public"."knowledge_article_versions" (
        "version_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
        "article_id" UUID NOT NULL REFERENCES public.knowledge_articles (article_id),
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "updated_by_user_id" UUID NOT NULL REFERENCES public.user_profiles (user_id),
        "update_reason" TEXT,
        "created_at" timestamptz DEFAULT NOW()
    );

-- Add indexes for knowledge base tables
CREATE INDEX idx_knowledge_faqs_org ON public.knowledge_faqs (organization_id);

CREATE INDEX idx_knowledge_articles_org ON public.knowledge_articles (organization_id);

CREATE INDEX idx_knowledge_files_org ON public.knowledge_files (organization_id);

CREATE INDEX idx_knowledge_base_embeddings_org ON public.knowledge_base_embeddings (organization_id);

CREATE INDEX idx_knowledge_base_embeddings_source ON public.knowledge_base_embeddings (source_type, source_id);

CREATE INDEX idx_knowledge_base_embeddings_vector ON public.knowledge_base_embeddings USING ivfflat (content_embedding vector_cosine_ops);

-- Create function for similarity search across all knowledge bases
CREATE
OR REPLACE FUNCTION match_knowledge_base (
    query_embedding vector (1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    organization_id UUID DEFAULT NULL
) RETURNS TABLE (
    embedding_id UUID,
    source_type TEXT,
    source_id UUID,
    CONTENT TEXT,
    metadata jsonb,
    similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        kbe.embedding_id,
        kbe.source_type,
        kbe.source_id,
        kbe.content,
        kbe.metadata,
        1 - (kbe.content_embedding <=> query_embedding) as similarity
    FROM knowledge_base_embeddings kbe
    WHERE
        CASE 
            WHEN organization_id IS NOT NULL THEN
                kbe.organization_id = organization_id
            ELSE
                TRUE
        END
        AND 1 - (kbe.content_embedding <=> query_embedding) > match_threshold
    ORDER BY kbe.content_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

CREATE INDEX idx_message_file_attachments_message ON public.message_file_attachments (message_id);

CREATE INDEX idx_message_file_attachments_file ON public.message_file_attachments (file_id);

-- Knowledge base cleanup triggers
CREATE
OR REPLACE FUNCTION fn_delete_knowledge_embeddings () RETURNS TRIGGER AS $$
BEGIN
  IF TG_ARGV[0] = 'faq' THEN
    DELETE FROM public.knowledge_base_embeddings
    WHERE source_type = 'faq' AND source_id = OLD.faq_id;
  ELSIF TG_ARGV[0] = 'article' THEN
    DELETE FROM public.knowledge_base_embeddings
    WHERE source_type = 'article' AND source_id = OLD.article_id;
  ELSIF TG_ARGV[0] = 'file' THEN
    DELETE FROM public.knowledge_base_embeddings
    WHERE source_type = 'file' AND source_id = OLD.file_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS delete_faq_embeddings ON public.knowledge_faqs;

DROP TRIGGER IF EXISTS delete_article_embeddings ON public.knowledge_articles;

DROP TRIGGER IF EXISTS delete_file_embeddings ON public.knowledge_files;

-- Recreate triggers with explicit arguments
CREATE TRIGGER delete_faq_embeddings
AFTER DELETE ON public.knowledge_faqs FOR EACH ROW
EXECUTE FUNCTION fn_delete_knowledge_embeddings ('faq');

CREATE TRIGGER delete_article_embeddings
AFTER DELETE ON public.knowledge_articles FOR EACH ROW
EXECUTE FUNCTION fn_delete_knowledge_embeddings ('article');

CREATE TRIGGER delete_file_embeddings
AFTER DELETE ON public.knowledge_files FOR EACH ROW
EXECUTE FUNCTION fn_delete_knowledge_embeddings ('file');

-- Transaction function for user and organization creation
CREATE
OR REPLACE FUNCTION create_user_and_organization (
    user_id UUID,
    full_name TEXT,
    ROLE user_role_type,
    org_name TEXT DEFAULT NULL,
    org_domain TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    org_id uuid;
BEGIN
    -- For agents creating a new organization
    IF role = 'agent' AND org_name IS NOT NULL AND org_domain IS NOT NULL THEN
        INSERT INTO organizations (organization_name, organization_domain)
        VALUES (org_name, org_domain)
        RETURNING organization_id INTO org_id;
    -- For agents joining an existing organization
    ELSIF role = 'agent' AND org_domain IS NOT NULL THEN
        SELECT organization_id INTO org_id
        FROM organizations
        WHERE organization_domain = org_domain;
        
        IF org_id IS NULL THEN
            RAISE EXCEPTION 'Organization not found with domain %', org_domain;
        END IF;
    END IF;

    INSERT INTO user_profiles (user_id, display_name, user_role, organization_id)
    VALUES (
        user_id,
        full_name,
        CASE 
            WHEN role = 'agent' AND org_name IS NOT NULL THEN 'admin'::user_role_type
            ELSE role
        END,
        org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;