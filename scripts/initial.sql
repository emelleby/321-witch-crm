-- Enable pgvector (for vector columns and indexes)
CREATE EXTENSION IF NOT EXISTS vector;
--
-- 1. Enum Types
--
CREATE TYPE user_role AS ENUM ('customer', 'agent', 'admin');
CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high');
CREATE TYPE message_role AS ENUM ('customer', 'agent', 'admin');
--
-- 2. Updated-At Trigger Function
--
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--
-- 3. Files Table
--    - For storing references to files (profile images, attachments, etc.)
--
CREATE TABLE files (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
file_name TEXT,
content_type TEXT,
storage_path TEXT,
-- e.g. S3 object key
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Automatically update 'updated_at'
CREATE TRIGGER trg_files_set_updated_at BEFORE
UPDATE ON files FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
--
-- 4. Organizations Table
--    - Multi-tenant "org" concept; each org can have an optional logo file
--
CREATE TABLE organizations (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name TEXT NOT NULL,
domain TEXT NOT NULL,
logo_file_id UUID REFERENCES files (id) ON DELETE
SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Automatically update 'updated_at'
CREATE TRIGGER trg_organizations_set_updated_at BEFORE
UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
--
-- 5. Profiles Table
--    - Each user in auth.users can have exactly one profile
--    - organization_id is nullable for "customers" not tied to an org
--    - If organization_id is set, assume they're an agent/admin of that org
--
CREATE TABLE profiles (
id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
full_name TEXT NOT NULL,
role user_role NOT NULL DEFAULT 'customer',
profile_picture_file_id UUID REFERENCES files (id) ON DELETE
SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Automatically update 'updated_at'
CREATE TRIGGER trg_profiles_set_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
--
-- 6. Tickets Table
--    - Cascade when organization is deleted, but do NOT force creator_id to match org
--
CREATE TABLE tickets (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
subject TEXT NOT NULL,
description TEXT NOT NULL,
creator_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
assigned_to UUID REFERENCES auth.users (id) ON DELETE

SET NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  resolution_summary TEXT,
  source TEXT,
  -- e.g. 'web', 'email', 'chat', 'phone'
  estimated_resolution_time INTERVAL,
  ai_routing_confidence_score NUMERIC(5, 2),
  tags TEXT [],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Automatically update 'updated_at'
CREATE TRIGGER trg_tickets_set_updated_at BEFORE
UPDATE ON tickets FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
--
-- 7. Ticket Messages
--    - Messages are cascaded if the parent ticket is deleted
--
CREATE TABLE ticket_messages (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
ticket_id UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
role message_role NOT NULL DEFAULT 'customer',
message_body TEXT NOT NULL,
is_ai_generated BOOLEAN NOT NULL DEFAULT false,
is_internal BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
--
-- 8. Knowledge Base
--    - Vector column for RAG-based AI retrieval
--    - Cascade if organization is deleted
--
CREATE TABLE knowledge_base (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
title TEXT NOT NULL,
content TEXT NOT NULL,
language TEXT NOT NULL DEFAULT 'en',
category TEXT,
tags TEXT [],
embedding vector(1536),
metadata JSONB,
views_count INTEGER DEFAULT 0,
last_indexed_at TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Automatically update 'updated_at'
CREATE TRIGGER trg_knowledge_base_set_updated_at BEFORE
UPDATE ON knowledge_base FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
-- Create an IVFFlat index for cosine similarity searches on 'embedding'
CREATE INDEX knowledge_base_embedding_idx ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
--
-- 9. AI Model Configs
--    - Basic table for storing model settings
--
CREATE TABLE ai_model_configs (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
model_name TEXT NOT NULL,
model_provider TEXT NOT NULL,
version TEXT NOT NULL,
is_active BOOLEAN DEFAULT true,
config_details JSONB,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- add an updated_at if desired
);
--
-- 10. AI Interactions
--     - Reference a ticket, model config, track usage stats
--
CREATE TABLE ai_interactions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
ticket_id UUID REFERENCES tickets (id) ON DELETE CASCADE,
model_id UUID REFERENCES ai_model_configs (id) ON DELETE
SET NULL,
  interaction_type TEXT NOT NULL,
  -- e.g. 'routing', 'response_generation', 'summarization'
  input_tokens INTEGER,
  output_tokens INTEGER,
  confidence_score NUMERIC(5, 2),
  was_human_reviewed BOOLEAN DEFAULT false,
  human_correction_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
--
-- 11. Optional Bridging Tables for Multiple Attachments
--     - e.g., If you want multiple files on a ticket or a KB article
--

-- Table for linking multiple files to a single ticket
CREATE TABLE ticket_files (
  ticket_id UUID REFERENCES tickets (id) ON DELETE CASCADE,
  file_id UUID REFERENCES files (id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, file_id)
);
-- Table for linking multiple files to a single knowledge base article
CREATE TABLE knowledge_base_files (
  knowledge_base_id UUID REFERENCES knowledge_base (id) ON DELETE CASCADE,
  file_id UUID REFERENCES files (id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_base_id, file_id)
);
-- Done!