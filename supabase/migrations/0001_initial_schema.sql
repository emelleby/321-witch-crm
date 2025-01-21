SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";
CREATE TYPE "public"."message_role" AS ENUM ('customer', 'agent', 'admin');
ALTER TYPE "public"."message_role" OWNER TO "postgres";
CREATE TYPE "public"."ticket_priority" AS ENUM ('low', 'normal', 'high');
ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";
CREATE TYPE "public"."ticket_status" AS ENUM ('open', 'pending', 'closed');
ALTER TYPE "public"."ticket_status" OWNER TO "postgres";
CREATE TYPE "public"."user_role" AS ENUM ('customer', 'agent', 'admin');
ALTER TYPE "public"."user_role" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."ai_interactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid",
    "model_id" "uuid",
    "interaction_type" "text" NOT NULL,
    "input_tokens" integer,
    "output_tokens" integer,
    "confidence_score" numeric(5, 2),
    "was_human_reviewed" boolean DEFAULT false,
    "human_correction_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."ai_interactions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ai_model_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "model_name" "text" NOT NULL,
    "model_provider" "text" NOT NULL,
    "version" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "config_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."ai_model_configs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "file_name" "text",
    "content_type" "text",
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."files" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "category" "text",
    "tags" "text" [],
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb",
    "views_count" integer DEFAULT 0,
    "last_indexed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."knowledge_base_files" (
    "knowledge_base_id" "uuid" NOT NULL,
    "file_id" "uuid" NOT NULL
);
ALTER TABLE "public"."knowledge_base_files" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "logo_file_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."organizations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "full_name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'customer'::"public"."user_role" NOT NULL,
    "profile_picture_file_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_files" (
    "ticket_id" "uuid" NOT NULL,
    "file_id" "uuid" NOT NULL
);
ALTER TABLE "public"."ticket_files" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "role" "public"."message_role" DEFAULT 'customer'::"public"."message_role" NOT NULL,
    "message_body" "text" NOT NULL,
    "is_ai_generated" boolean DEFAULT false NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "subject" "text" NOT NULL,
    "description" "text" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "status" "public"."ticket_status" DEFAULT 'open'::"public"."ticket_status" NOT NULL,
    "priority" "public"."ticket_priority" DEFAULT 'normal'::"public"."ticket_priority" NOT NULL,
    "resolution_summary" "text",
    "source" "text",
    "estimated_resolution_time" interval,
    "ai_routing_confidence_score" numeric(5, 2),
    "tags" "text" [],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."tickets" OWNER TO "postgres";
ALTER TABLE ONLY "public"."ai_interactions"
ADD CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_model_configs"
ADD CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."files"
ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."knowledge_base_files"
ADD CONSTRAINT "knowledge_base_files_pkey" PRIMARY KEY ("knowledge_base_id", "file_id");
ALTER TABLE ONLY "public"."knowledge_base"
ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."organizations"
ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ticket_files"
ADD CONSTRAINT "ticket_files_pkey" PRIMARY KEY ("ticket_id", "file_id");
ALTER TABLE ONLY "public"."ticket_messages"
ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");
CREATE INDEX "knowledge_base_embedding_idx" ON "public"."knowledge_base" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists" = '100');
CREATE OR REPLACE TRIGGER "trg_files_set_updated_at" BEFORE
UPDATE ON "public"."files" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "trg_knowledge_base_set_updated_at" BEFORE
UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "trg_organizations_set_updated_at" BEFORE
UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "trg_profiles_set_updated_at" BEFORE
UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "trg_tickets_set_updated_at" BEFORE
UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
ALTER TABLE ONLY "public"."ai_interactions"
ADD CONSTRAINT "ai_interactions_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."ai_model_configs"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."ai_interactions"
ADD CONSTRAINT "ai_interactions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."knowledge_base_files"
ADD CONSTRAINT "knowledge_base_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."knowledge_base_files"
ADD CONSTRAINT "knowledge_base_files_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."knowledge_base"
ADD CONSTRAINT "knowledge_base_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."organizations"
ADD CONSTRAINT "organizations_logo_file_id_fkey" FOREIGN KEY ("logo_file_id") REFERENCES "public"."files"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_profile_picture_file_id_fkey" FOREIGN KEY ("profile_picture_file_id") REFERENCES "public"."files"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."ticket_files"
ADD CONSTRAINT "ticket_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_files"
ADD CONSTRAINT "ticket_files_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_messages"
ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON TABLE "public"."ai_interactions" TO "anon";
GRANT ALL ON TABLE "public"."ai_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_interactions" TO "service_role";
GRANT ALL ON TABLE "public"."ai_model_configs" TO "anon";
GRANT ALL ON TABLE "public"."ai_model_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_model_configs" TO "service_role";
GRANT ALL ON TABLE "public"."files" TO "anon";
GRANT ALL ON TABLE "public"."files" TO "authenticated";
GRANT ALL ON TABLE "public"."files" TO "service_role";
GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";
GRANT ALL ON TABLE "public"."knowledge_base_files" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base_files" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base_files" TO "service_role";
GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_files" TO "anon";
GRANT ALL ON TABLE "public"."ticket_files" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_files" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";
GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "service_role";
RESET ALL;