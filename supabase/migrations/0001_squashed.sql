-- Enable required extensions first
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";
-- CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
-- PostgreSQL utility extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
-- Performance and analysis extensions  
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
-- API and wrapper extensions
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";
-- or "extensions," depending on your setup
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
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE TYPE "public"."message_role" AS ENUM ('customer', 'agent', 'admin');
ALTER TYPE "public"."message_role" OWNER TO "postgres";
CREATE TYPE "public"."ticket_priority" AS ENUM ('low', 'normal', 'high');
ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";
CREATE TYPE "public"."ticket_status" AS ENUM ('open', 'pending', 'closed');
ALTER TYPE "public"."ticket_status" OWNER TO "postgres";
CREATE TYPE "public"."user_role" AS ENUM ('customer', 'agent', 'admin');
ALTER TYPE "public"."user_role" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."calculate_sla_breach_times"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare policy record;
begin -- Only calculate breach times if SLA policy is set
if NEW.sla_policy_id is not null then
select * into policy
from sla_policies
where id = NEW.sla_policy_id;
NEW.first_response_breach_at := NEW.created_at + policy.first_response_time;
NEW.resolution_breach_at := NEW.created_at + policy.resolution_time;
insert into sla_notifications (
        ticket_id,
        organization_id,
        type,
        breach_time
    )
values (
        NEW.id,
        NEW.organization_id,
        'first_response',
        NEW.first_response_breach_at
    ),
    (
        NEW.id,
        NEW.organization_id,
        'resolution',
        NEW.resolution_breach_at
    );
end if;
return NEW;
end;
$$;
ALTER FUNCTION "public"."calculate_sla_breach_times"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."calculate_ticket_metrics"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare first_response interval;
resolution interval;
begin -- Calculate first response time
select min(created_at) - tickets.created_at into first_response
from ticket_messages
where ticket_id = NEW.id
    and created_by in (
        select id
        from profiles
        where organization_id = NEW.organization_id
            and role = 'agent'
    );
if NEW.status = 'closed' then resolution := NEW.updated_at - NEW.created_at;
end if;
insert into ticket_metrics (
        ticket_id,
        organization_id,
        first_response_time,
        resolution_time,
        replies_count
    )
values (
        NEW.id,
        NEW.organization_id,
        first_response,
        resolution,
        (
            select count(*)
            from ticket_messages
            where ticket_id = NEW.id
        )
    ) on conflict (ticket_id) do
update
set first_response_time = EXCLUDED.first_response_time,
    resolution_time = EXCLUDED.resolution_time,
    replies_count = EXCLUDED.replies_count,
    updated_at = now();
return NEW;
end;
$$;
ALTER FUNCTION "public"."calculate_ticket_metrics"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_sla_breaches"() RETURNS "void" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare breach record;
begin -- Check for first response breaches
for breach in
select t.id as ticket_id,
    t.organization_id,
    'first_response' as type,
    tm.first_response_time is null as is_breached
from tickets t
    left join ticket_metrics tm on t.id = tm.ticket_id
where t.status != 'closed'
    and t.first_response_breach_at <= now()
    and not exists (
        select 1
        from sla_notifications
        where ticket_id = t.id
            and type = 'first_response'
            and notified_at is not null
    ) loop if breach.is_breached then -- Update notification record
update sla_notifications
set notified_at = now()
where ticket_id = breach.ticket_id
    and type = breach.type
    and notified_at is null;
end if;
end loop;
for breach in
select t.id as ticket_id,
    t.organization_id,
    'resolution' as type,
    t.status != 'closed' as is_breached
from tickets t
where t.status != 'closed'
    and t.resolution_breach_at <= now()
    and not exists (
        select 1
        from sla_notifications
        where ticket_id = t.id
            and type = 'resolution'
            and notified_at is not null
    ) loop if breach.is_breached then -- Update notification record
update sla_notifications
set notified_at = now()
where ticket_id = breach.ticket_id
    and type = breach.type
    and notified_at is null;
end if;
end loop;
end;
$$;
ALTER FUNCTION "public"."check_sla_breaches"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."create_article_version"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ BEGIN
INSERT INTO article_versions (
        article_id,
        title,
        content,
        category,
        tags,
        file_ids,
        created_by,
        version_number,
        change_summary
    )
VALUES (
        NEW.id,
        NEW.title,
        NEW.content,
        NEW.category,
        NEW.tags,
        NEW.file_ids,
        auth.uid(),
        get_next_version_number(NEW.id),
        'Initial version'
    );
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."create_article_version"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."create_article_version_on_update"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ BEGIN IF OLD.title != NEW.title
    OR OLD.content != NEW.content
    OR OLD.category != NEW.category
    OR OLD.tags != NEW.tags
    OR OLD.file_ids != NEW.file_ids THEN
INSERT INTO article_versions (
        article_id,
        title,
        content,
        category,
        tags,
        file_ids,
        created_by,
        version_number,
        change_summary
    )
VALUES (
        NEW.id,
        NEW.title,
        NEW.content,
        NEW.category,
        NEW.tags,
        NEW.file_ids,
        auth.uid(),
        get_next_version_number(NEW.id),
        CASE
            WHEN OLD.title != NEW.title THEN 'Updated title'
            WHEN OLD.content != NEW.content THEN 'Updated content'
            WHEN OLD.category != NEW.category THEN 'Updated category'
            WHEN OLD.tags != NEW.tags THEN 'Updated tags'
            WHEN OLD.file_ids != NEW.file_ids THEN 'Updated attachments'
            ELSE 'Updated article'
        END
    );
END IF;
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."create_article_version_on_update"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.create_ticket_from_template(
        template_id uuid,
        creator_id uuid DEFAULT auth.uid(),
        assigned_to uuid DEFAULT NULL,
        custom_subject text DEFAULT NULL,
        custom_content text DEFAULT NULL
    ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE template record;
new_ticket_id uuid;
BEGIN -- Get template
SELECT * INTO template
FROM ticket_templates
WHERE id = template_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Template not found';
END IF;
INSERT INTO tickets (
        subject,
        description,
        status,
        priority,
        creator_id,
        assigned_to,
        organization_id
    )
VALUES (
        coalesce(custom_subject, template.subject),
        coalesce(custom_content, template.content),
        'open'::ticket_status,
        template.priority::ticket_priority,
        creator_id,
        assigned_to,
        template.organization_id
    )
RETURNING id INTO new_ticket_id;
-- Add categories if present
IF array_length(template.category_ids, 1) > 0 THEN
INSERT INTO ticket_category_assignments (ticket_id, category_id)
SELECT new_ticket_id,
    unnest(template.category_ids);
END IF;
-- Add tags if present
IF array_length(template.tag_ids, 1) > 0 THEN
INSERT INTO ticket_tag_assignments (ticket_id, tag_id)
SELECT new_ticket_id,
    unnest(template.tag_ids);
END IF;
RETURN new_ticket_id;
END;
$$;
ALTER FUNCTION "public"."create_ticket_from_template"(
    "template_id" "uuid",
    "creator_id" "uuid",
    "assigned_to" "uuid",
    "custom_subject" "text",
    "custom_content" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.generate_forum_embedding(content_text text) RETURNS extensions.vector LANGUAGE plpgsql SECURITY DEFINER AS $$
declare embedding extensions.vector(1536);
response jsonb;
begin
select content::text::jsonb into response
from extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            jsonb_build_object('text', content_text)::text
        )::extensions.http_request
    );
embedding := (response->>'embedding')::extensions.vector(1536);
return embedding;
end;
$$;
ALTER FUNCTION "public"."generate_forum_embedding"("content" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.generate_ticket_embedding(
        ticket_subject text,
        ticket_description text,
        ticket_status text,
        ticket_priority text,
        ticket_categories text [],
        ticket_tags text []
    ) RETURNS extensions.vector(1536) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE combined_text text;
embedding extensions.vector(1536);
response jsonb;
BEGIN combined_text := concat_ws(
    ' ',
    'Subject: ' || coalesce(ticket_subject, ''),
    'Description: ' || coalesce(ticket_description, ''),
    'Status: ' || coalesce(ticket_status, ''),
    'Priority: ' || coalesce(ticket_priority, ''),
    'Categories: ' || array_to_string(ticket_categories, ', '),
    'Tags: ' || array_to_string(ticket_tags, ', ')
);
SELECT content::jsonb INTO response
FROM extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', combined_text)::text
        )::extensions.http_request
    );
embedding := (response->>'embedding')::extensions.vector(1536);
RETURN embedding;
END;
$$;
-- Similarly update search_tickets_by_similarity
CREATE OR REPLACE FUNCTION public.search_tickets_by_similarity(
        search_query text,
        match_threshold float8 DEFAULT 0.7,
        match_count int DEFAULT 10
    ) RETURNS TABLE (
        id uuid,
        subject text,
        similarity float8
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE search_embedding extensions.vector(1536);
response jsonb;
BEGIN -- Generate embedding via edge function
SELECT result->>'embedding' INTO response
FROM http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', search_query)::text
        )::http_request
    );
search_embedding := response::extensions.vector(1536);
RETURN QUERY
SELECT t.id,
    t.subject,
    1 - (t.content_embedding <=> search_embedding) as similarity
FROM tickets t
WHERE 1 - (t.content_embedding <=> search_embedding) > match_threshold
ORDER BY t.content_embedding <=> search_embedding
LIMIT match_count;
END;
$$;
ALTER FUNCTION "public"."generate_ticket_embedding"(
    "ticket_subject" "text",
    "ticket_description" "text",
    "ticket_status" "text",
    "ticket_priority" "text",
    "ticket_categories" "text" [],
    "ticket_tags" "text" []
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_next_version_number"("article_id" "uuid") RETURNS integer LANGUAGE "plpgsql" SECURITY DEFINER AS $_$
DECLARE next_version INTEGER;
BEGIN
SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
FROM article_versions
WHERE article_versions.article_id = $1;
RETURN next_version;
END;
$_$;
ALTER FUNCTION "public"."get_next_version_number"("article_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_trending_topics"(
        "time_window" interval DEFAULT '7 days'::interval,
        "limit_count" integer DEFAULT 5
    ) RETURNS TABLE(
        "id" "uuid",
        "title" "text",
        "content" "text",
        "category_id" "uuid",
        "created_by" "uuid",
        "is_pinned" boolean,
        "is_locked" boolean,
        "views_count" integer,
        "replies_count" integer,
        "upvotes" integer,
        "downvotes" integer,
        "last_reply_at" timestamp with time zone,
        "created_at" timestamp with time zone,
        "tags" "text" [],
        "trending_score" double precision
    ) LANGUAGE "plpgsql" SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT t.id,
    t.title,
    t.content,
    t.category_id,
    t.created_by,
    t.is_pinned,
    t.is_locked,
    t.views_count,
    t.replies_count,
    t.upvotes,
    t.downvotes,
    t.last_reply_at,
    t.created_at,
    t.tags,
    (
        t.views_count * 1.0 + (t.upvotes - t.downvotes) * 2.0 + (
            SELECT count(*)::float * 3.0
            FROM forum_replies r
            WHERE r.topic_id = t.id
                AND r.created_at > now() - time_window
        )
    ) as trending_score
FROM forum_topics t
WHERE t.created_at > now() - time_window
    OR t.last_reply_at > now() - time_window
ORDER BY trending_score DESC
LIMIT limit_count;
END;
$$;
ALTER FUNCTION "public"."get_trending_topics"("time_window" interval, "limit_count" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."increment_article_views"("article_id" "uuid") RETURNS "void" LANGUAGE "plpgsql" AS $$ BEGIN
UPDATE public.knowledge_base
SET views_count = views_count + 1
WHERE id = article_id;
END;
$$;
ALTER FUNCTION "public"."increment_article_views"("article_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."increment_topic_views"("topic_id" "uuid") RETURNS "void" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ begin
update public.forum_topics
set views_count = views_count + 1
where id = topic_id;
end;
$$;
ALTER FUNCTION "public"."increment_topic_views"("topic_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.match_forum_topics(
        query_embedding extensions.vector(1536),
        match_threshold float8 DEFAULT 0.78,
        match_count int DEFAULT 10
    ) RETURNS TABLE (
        id uuid,
        title text,
        content text,
        category_id uuid,
        created_by uuid,
        is_pinned boolean,
        is_locked boolean,
        views_count integer,
        replies_count integer,
        upvotes integer,
        downvotes integer,
        last_reply_at timestamptz,
        created_at timestamptz,
        tags text [],
        similarity float8
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT t.id,
    t.title,
    t.content,
    t.category_id,
    t.created_by,
    t.is_pinned,
    t.is_locked,
    t.views_count,
    t.replies_count,
    t.upvotes,
    t.downvotes,
    t.last_reply_at,
    t.created_at,
    t.tags,
    1 - (t.content_embedding <=> query_embedding) as similarity
FROM forum_topics t
WHERE 1 - (t.content_embedding <=> query_embedding) > match_threshold
ORDER BY t.content_embedding <=> query_embedding
LIMIT match_count;
END;
$$;
ALTER FUNCTION "public"."match_forum_topics"(
    "query_embedding" "extensions"."vector",
    "match_threshold" double precision,
    "match_count" integer
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.search_articles(
        search_query text,
        similarity_threshold double precision DEFAULT 0.7,
        use_vector_search boolean DEFAULT false
    ) RETURNS TABLE (
        id uuid,
        title text,
        content text,
        similarity double precision
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$
declare search_embedding extensions.vector(1536);
response jsonb;
begin if use_vector_search then
SELECT response_content::text::jsonb INTO response
FROM extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', search_query)::text
        )::extensions.http_request
    ) as t(response_content);
search_embedding := (response->>'embedding')::extensions.vector(1536);
return query
select kb.id,
    kb.title,
    kb.content,
    (1 - (kb.embedding <=> search_embedding))::double precision as similarity
from knowledge_base kb
where kb.embedding is not null
    and 1 - (kb.embedding <=> search_embedding) > similarity_threshold
order by kb.embedding <=> search_embedding
limit 5;
else return query
select kb.id,
    kb.title,
    kb.content,
    ts_rank(
        to_tsvector('english', kb.title || ' ' || kb.content),
        to_tsquery('english', search_query)
    )::double precision as similarity
from knowledge_base kb
where to_tsvector('english', kb.title || ' ' || kb.content) @@ to_tsquery('english', search_query)
order by similarity desc
limit 5;
end if;
end;
$$;
ALTER FUNCTION "public"."search_articles"(
    "search_query" "text",
    "similarity_threshold" double precision,
    "use_vector_search" boolean
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."search_canned_responses"(
        "search_query" "text" DEFAULT NULL::"text",
        "org_id" "uuid" DEFAULT NULL::"uuid"
    ) RETURNS TABLE(
        "id" "uuid",
        "name" "text",
        "content" "text",
        "shortcut" "text",
        "category" "text",
        "created_at" timestamp with time zone,
        "updated_at" timestamp with time zone,
        "search_rank" double precision
    ) LANGUAGE "plpgsql" SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT cr.id,
    cr.name,
    cr.content,
    cr.shortcut,
    cr.category,
    cr.created_at,
    cr.updated_at,
    CAST(
        CASE
            WHEN search_query IS NOT NULL THEN ts_rank(
                to_tsvector(
                    'english',
                    cr.name || ' ' || cr.content || ' ' || COALESCE(cr.shortcut, '') || ' ' || COALESCE(cr.category, '')
                ),
                websearch_to_tsquery('english', search_query)
            )
            ELSE 0
        END AS double precision
    ) as search_rank
FROM canned_responses cr
WHERE (
        org_id IS NULL
        OR cr.organization_id = org_id
    )
    AND (
        search_query IS NULL
        OR to_tsvector(
            'english',
            cr.name || ' ' || cr.content || ' ' || COALESCE(cr.shortcut, '') || ' ' || COALESCE(cr.category, '')
        ) @@ websearch_to_tsquery('english', search_query)
    )
ORDER BY CASE
        WHEN search_query IS NOT NULL THEN search_rank
        ELSE 0
    END DESC,
    cr.name ASC;
END;
$$;
ALTER FUNCTION "public"."search_canned_responses"("search_query" "text", "org_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."search_forum_topics"(
        "search_query" "text",
        "similarity_threshold" double precision DEFAULT 0.7,
        "use_vector_search" boolean DEFAULT false,
        "solved_only" boolean DEFAULT false
    ) RETURNS TABLE(
        "id" "uuid",
        "title" "text",
        "content" "text",
        "similarity" double precision
    ) LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare search_embedding extensions.vector(1536);
response jsonb;
begin if use_vector_search then
SELECT response_content::text::jsonb INTO response
FROM extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', search_query)::text
        )::extensions.http_request
    ) as t(response_content);
search_embedding := (response->>'embedding')::extensions.vector(1536);
return query
select ft.id,
    ft.title,
    ft.content,
    (1 - (ft.content_embedding <=> search_embedding))::double precision as similarity
from forum_topics ft
where ft.content_embedding is not null
    and 1 - (ft.content_embedding <=> search_embedding) > similarity_threshold
    and (
        not solved_only
        or exists (
            select 1
            from forum_replies fr
            where fr.topic_id = ft.id
                and fr.is_solution = true
        )
    )
order by ft.content_embedding <=> search_embedding
limit 5;
else return query
select ft.id,
    ft.title,
    ft.content,
    ts_rank(
        to_tsvector('english', ft.title || ' ' || ft.content),
        to_tsquery('english', search_query)
    )::double precision as similarity
from forum_topics ft
where to_tsvector('english', ft.title || ' ' || ft.content) @@ to_tsquery('english', search_query)
    and (
        not solved_only
        or exists (
            select 1
            from forum_replies fr
            where fr.topic_id = ft.id
                and fr.is_solution = true
        )
    )
order by similarity desc
limit 5;
end if;
end;
$$;
ALTER FUNCTION "public"."search_forum_topics"(
    "search_query" "text",
    "similarity_threshold" double precision,
    "use_vector_search" boolean,
    "solved_only" boolean
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.search_tickets(
        search_query text DEFAULT NULL,
        status_filter text DEFAULT NULL,
        priority_filter text DEFAULT NULL,
        category_ids uuid [] DEFAULT NULL,
        tag_ids uuid [] DEFAULT NULL,
        date_from timestamp without time zone DEFAULT NULL,
        date_to timestamp without time zone DEFAULT NULL,
        org_filter_id uuid DEFAULT NULL,
        assigned_to_param uuid DEFAULT NULL,
        use_vector_search boolean DEFAULT false,
        similarity_threshold double precision DEFAULT 0.7
    ) RETURNS TABLE (
        id uuid,
        subject text,
        description text,
        status text,
        priority text,
        created_at timestamptz,
        updated_at timestamptz,
        creator_id uuid,
        assignee_id uuid,
        org_id uuid,
        search_rank double precision,
        similarity_score double precision
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE search_embedding extensions.vector(1536);
response jsonb;
BEGIN IF use_vector_search
AND search_query IS NOT NULL THEN
SELECT response_content::text::jsonb INTO response
FROM extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', search_query)::text
        )::extensions.http_request
    ) AS t(response_content);
search_embedding := (response->>'embedding')::extensions.vector(1536);
END IF;
RETURN QUERY WITH filtered_tickets AS (
    SELECT DISTINCT t.*,
        CASE
            WHEN search_query IS NOT NULL THEN ts_rank(
                t.search_vector,
                websearch_to_tsquery('english', search_query)
            )::double precision
            ELSE 0::double precision
        END AS search_rank,
        CASE
            WHEN use_vector_search
            AND search_query IS NOT NULL THEN (1 - (t.content_embedding <=> search_embedding))::double precision
            ELSE 0::double precision
        END AS similarity_score
    FROM tickets t
        LEFT JOIN ticket_category_assignments tca ON t.id = tca.ticket_id
        LEFT JOIN ticket_tag_assignments tta ON t.id = tta.ticket_id
    WHERE (
            search_query IS NULL
            OR t.search_vector @@ websearch_to_tsquery('english', search_query)
        )
        AND (
            NOT use_vector_search
            OR search_query IS NULL
            OR (1 - (t.content_embedding <=> search_embedding)) > similarity_threshold
        )
        AND (
            status_filter IS NULL
            OR t.status::text = status_filter
        )
        AND (
            priority_filter IS NULL
            OR t.priority::text = priority_filter
        )
        AND (
            category_ids IS NULL
            OR tca.category_id = ANY(category_ids)
        )
        AND (
            tag_ids IS NULL
            OR tta.tag_id = ANY(tag_ids)
        )
        AND (
            date_from IS NULL
            OR t.created_at >= date_from
        )
        AND (
            date_to IS NULL
            OR t.created_at <= date_to
        )
        AND (
            org_filter_id IS NULL
            OR t.organization_id = org_filter_id
        )
        AND (
            assigned_to_param IS NULL
            OR t.assigned_to = assigned_to_param
        )
)
SELECT t.id,
    t.subject,
    t.description,
    t.status::text,
    t.priority::text,
    t.created_at,
    t.updated_at,
    t.creator_id,
    t.assigned_to AS assignee_id,
    t.organization_id AS org_id,
    t.search_rank,
    t.similarity_score
FROM filtered_tickets t
ORDER BY CASE
        WHEN use_vector_search
        AND search_query IS NOT NULL THEN (t.search_rank * 0.3 + t.similarity_score * 0.7)
        WHEN search_query IS NOT NULL THEN t.search_rank
        ELSE 0
    END DESC,
    t.created_at DESC;
END;
$$;
CREATE OR REPLACE FUNCTION public.search_tickets_by_similarity(
        search_query text,
        match_threshold double precision DEFAULT 0.7,
        match_count int DEFAULT 10
    ) RETURNS TABLE (
        id uuid,
        subject text,
        similarity double precision
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE search_embedding extensions.vector(1536);
response jsonb;
BEGIN
SELECT content::jsonb INTO response
FROM extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', search_query)::text
        )::extensions.http_request
    );
search_embedding := (response->>'embedding')::extensions.vector(1536);
RETURN QUERY
SELECT t.id,
    t.subject,
    (1 - (t.content_embedding <=> search_embedding))::double precision AS similarity
FROM tickets t
WHERE (1 - (t.content_embedding <=> search_embedding)) > match_threshold
ORDER BY t.content_embedding <=> search_embedding
LIMIT match_count;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."tickets_search_vector"(
        "subject" "text",
        "description" "text",
        "status" "text",
        "priority" "text"
    ) RETURNS "tsvector" LANGUAGE "plpgsql" IMMUTABLE AS $$ begin return (
        setweight(
            to_tsvector('english', coalesce(subject, '')),
            'A'
        ) || setweight(
            to_tsvector('english', coalesce(description, '')),
            'B'
        ) || setweight(
            to_tsvector('english', coalesce(status, '')),
            'C'
        ) || setweight(
            to_tsvector('english', coalesce(priority, '')),
            'C'
        )
    );
end;
$$;
ALTER FUNCTION "public"."tickets_search_vector"(
    "subject" "text",
    "description" "text",
    "status" "text",
    "priority" "text"
) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."tickets_search_vector_trigger"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ begin new.search_vector := tickets_search_vector(
        new.subject,
        new.description,
        new.status::text,
        new.priority::text
    );
return new;
end;
$$;
ALTER FUNCTION "public"."tickets_search_vector_trigger"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION public.update_agent_performance() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE agent_rec RECORD;
org_rec RECORD;
BEGIN -- For each agent and organization combination
FOR agent_rec IN
SELECT id
FROM profiles
WHERE role = 'agent' LOOP FOR org_rec IN
SELECT id
FROM organizations LOOP -- Insert or update performance metrics
INSERT INTO agent_performance (
        agent_id,
        organization_id,
        date,
        tickets_resolved,
        avg_response_time,
        avg_resolution_time
    )
SELECT agent_rec.id,
    org_rec.id,
    current_date,
    count(distinct t.id) filter (
        where t.status = 'closed'
    ),
    avg(tm.first_response_time) filter (
        where tm.first_response_time is not null
    ),
    avg(tm.resolution_time) filter (
        where tm.resolution_time is not null
    )
FROM tickets t
    LEFT JOIN ticket_metrics tm ON t.id = tm.ticket_id
    LEFT JOIN ticket_messages msg ON t.id = msg.ticket_id
WHERE t.organization_id = org_rec.id
    AND msg.role = 'agent'
    AND msg.creator_id = agent_rec.id
    AND t.updated_at >= current_date
    AND t.updated_at < current_date + interval '1 day'
GROUP BY agent_rec.id,
    org_rec.id,
    current_date ON CONFLICT (agent_id, date) DO
UPDATE
SET tickets_resolved = EXCLUDED.tickets_resolved,
    avg_response_time = EXCLUDED.avg_response_time,
    avg_resolution_time = EXCLUDED.avg_resolution_time,
    updated_at = now();
END LOOP;
END LOOP;
END;
$$;
ALTER FUNCTION "public"."update_agent_performance"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_forum_embedding"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ begin new.content_embedding = generate_forum_embedding(new.title || ' ' || new.content);
return new;
end;
$$;
ALTER FUNCTION "public"."update_forum_embedding"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_reply_vote_counts"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ begin if (TG_OP = 'INSERT') then
update public.forum_replies
set upvotes = case
        when NEW.vote_type = 'up' then upvotes + 1
        else upvotes
    end,
    downvotes = case
        when NEW.vote_type = 'down' then downvotes + 1
        else downvotes
    end
where id = NEW.reply_id;
elsif (TG_OP = 'DELETE') then
update public.forum_replies
set upvotes = case
        when OLD.vote_type = 'up' then upvotes - 1
        else upvotes
    end,
    downvotes = case
        when OLD.vote_type = 'down' then downvotes - 1
        else downvotes
    end
where id = OLD.reply_id;
end if;
return null;
end;
$$;
ALTER FUNCTION "public"."update_reply_vote_counts"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_ticket_embedding"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare categories text [];
tags text [];
begin -- Get categories
select array_agg(tc.name) into categories
from ticket_category_assignments tca
    join ticket_categories tc on tc.id = tca.category_id
where tca.ticket_id = new.id;
select array_agg(tt.name) into tags
from ticket_tag_assignments tta
    join ticket_tags tt on tt.id = tta.tag_id
where tta.ticket_id = new.id;
new.content_embedding := generate_ticket_embedding(
    new.subject,
    new.description,
    new.status,
    new.priority,
    categories,
    tags
);
return new;
end;
$$;
ALTER FUNCTION "public"."update_ticket_embedding"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_ticket_metrics"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
declare first_agent_message timestamptz;
last_customer_message timestamptz;
ticket_status text;
ticket_created timestamptz;
begin -- Get ticket info
select status,
    created_at into ticket_status,
    ticket_created
from tickets
where id = new.ticket_id;
select min(created_at) into first_agent_message
from ticket_messages
where ticket_id = new.ticket_id
    and role in ('agent', 'admin');
select max(created_at) into last_customer_message
from ticket_messages
where ticket_id = new.ticket_id
    and role = 'customer';
update ticket_metrics
set first_response_time = first_agent_message,
    resolution_time = case
        when ticket_status = 'closed' then now()
        else null
    end,
    replies_count = (
        select count(*)
        from ticket_messages
        where ticket_id = new.ticket_id
    ),
    reopens_count = (
        select count(*)
        from ticket_messages
        where ticket_id = new.ticket_id
            and status_change = 'reopened'
    ),
    updated_at = now()
where ticket_id = new.ticket_id;
if not found then
insert into ticket_metrics (
        ticket_id,
        first_response_time,
        resolution_time,
        replies_count,
        reopens_count
    )
values (
        new.ticket_id,
        first_agent_message,
        case
            when ticket_status = 'closed' then now()
            else null
        end,
        1,
        0
    );
end if;
return new;
end;
$$;
ALTER FUNCTION "public"."update_ticket_metrics"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_ticket_unread_counts"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ BEGIN -- Update unread counts in tickets table
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
$$;
ALTER FUNCTION "public"."update_ticket_unread_counts"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_topic_reply_stats"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ begin if (TG_OP = 'INSERT') then
update public.forum_topics
set replies_count = replies_count + 1,
    last_reply_at = new.created_at,
    last_reply_by = new.created_by,
    updated_at = now()
where id = new.topic_id;
elsif (TG_OP = 'DELETE') then
update public.forum_topics
set replies_count = replies_count - 1,
    last_reply_at = (
        select created_at
        from public.forum_replies
        where topic_id = old.topic_id
        order by created_at desc
        limit 1
    ), last_reply_by = (
        select created_by
        from public.forum_replies
        where topic_id = old.topic_id
        order by created_at desc
        limit 1
    ), updated_at = now()
where id = old.topic_id;
end if;
return null;
end;
$$;
ALTER FUNCTION "public"."update_topic_reply_stats"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_topic_vote_counts"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ begin if (TG_OP = 'INSERT') then
update public.forum_topics
set upvotes = case
        when NEW.vote_type = 'up' then upvotes + 1
        else upvotes
    end,
    downvotes = case
        when NEW.vote_type = 'down' then downvotes + 1
        else downvotes
    end
where id = NEW.topic_id;
elsif (TG_OP = 'DELETE') then
update public.forum_topics
set upvotes = case
        when OLD.vote_type = 'up' then upvotes - 1
        else upvotes
    end,
    downvotes = case
        when OLD.vote_type = 'down' then downvotes - 1
        else downvotes
    end
where id = OLD.topic_id;
end if;
return null;
end;
$$;
ALTER FUNCTION "public"."update_topic_vote_counts"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."agent_performance" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "agent_id" "uuid",
    "organization_id" "uuid",
    "date" "date" NOT NULL,
    "tickets_resolved" integer DEFAULT 0,
    "avg_response_time" interval,
    "avg_resolution_time" interval,
    "customer_satisfaction_score" numeric(3, 2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."agent_performance" OWNER TO "postgres";
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
CREATE TABLE IF NOT EXISTS "public"."article_versions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "article_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" NOT NULL,
    "tags" "text" [] DEFAULT '{}'::"text" [],
    "file_ids" "uuid" [] DEFAULT '{}'::"uuid" [],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "change_summary" "text"
);
ALTER TABLE "public"."article_versions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."canned_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "shortcut" "text",
    "category" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."canned_responses" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "file_name" "text",
    "content_type" "text",
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."files" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."forum_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "slug" "text" NOT NULL,
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."forum_categories" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."forum_replies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "content" "text" NOT NULL,
    "topic_id" "uuid",
    "created_by" "uuid",
    "is_solution" boolean DEFAULT false,
    "upvotes" integer DEFAULT 0,
    "downvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."forum_replies" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."forum_topics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category_id" "uuid",
    "created_by" "uuid",
    "organization_id" "uuid",
    "is_pinned" boolean DEFAULT false,
    "is_locked" boolean DEFAULT false,
    "views_count" integer DEFAULT 0,
    "replies_count" integer DEFAULT 0,
    "upvotes" integer DEFAULT 0,
    "downvotes" integer DEFAULT 0,
    "last_reply_at" timestamp with time zone,
    "last_reply_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tags" "text" [] DEFAULT ARRAY []::"text" [],
    "content_embedding" "extensions"."vector"(1536)
);
ALTER TABLE "public"."forum_topics" OWNER TO "postgres";
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
CREATE TABLE IF NOT EXISTS "public"."reply_votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reply_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vote_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reply_votes_vote_type_check" CHECK (
        (
            "vote_type" = ANY (ARRAY ['up'::"text", 'down'::"text"])
        )
    )
);
ALTER TABLE "public"."reply_votes" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."saved_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "query" "jsonb" NOT NULL,
    "created_by" "uuid",
    "schedule" "text",
    "recipients" "jsonb",
    "last_run_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."saved_reports" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."sla_notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid",
    "organization_id" "uuid",
    "type" "text" NOT NULL,
    "breach_time" timestamp with time zone NOT NULL,
    "notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sla_notifications_type_check" CHECK (
        (
            "type" = ANY (
                ARRAY ['first_response'::"text", 'resolution'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."sla_notifications" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."sla_policies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "priority" "text" NOT NULL,
    "first_response_time" interval NOT NULL,
    "resolution_time" interval NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."sla_policies" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."team_members" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."teams" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#94a3b8'::"text" NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ticket_categories" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_category_assignments" (
    "ticket_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ticket_category_assignments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_feedback_rating_check" CHECK (
        (
            ("rating" >= 1)
            AND ("rating" <= 5)
        )
    )
);
ALTER TABLE "public"."ticket_feedback" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_files" (
    "ticket_id" "uuid" NOT NULL,
    "file_id" "uuid" NOT NULL
);
ALTER TABLE "public"."ticket_files" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "role" "public"."message_role" NOT NULL,
    "creator_id" "uuid",
    "read_by_customer" boolean DEFAULT false NOT NULL,
    "read_by_agent" boolean DEFAULT false NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid",
    "organization_id" "uuid",
    "first_response_time" interval,
    "resolution_time" interval,
    "replies_count" integer DEFAULT 0,
    "reopens_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ticket_metrics" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_tag_assignments" (
    "ticket_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ticket_tag_assignments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#94a3b8'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."ticket_tags" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ticket_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "category_ids" "uuid" [] DEFAULT ARRAY []::"uuid" [],
    "tag_ids" "uuid" [] DEFAULT ARRAY []::"uuid" [],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_templates_priority_check" CHECK (
        (
            "priority" = ANY (
                ARRAY ['low'::"text", 'normal'::"text", 'high'::"text"]
            )
        )
    )
);
ALTER TABLE "public"."ticket_templates" OWNER TO "postgres";
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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "unread_customer_messages" integer DEFAULT 0,
    "unread_agent_messages" integer DEFAULT 0,
    "sla_policy_id" "uuid",
    "first_response_breach_at" timestamp with time zone,
    "resolution_breach_at" timestamp with time zone,
    "search_vector" "tsvector",
    "content_embedding" "extensions"."vector"(1536)
);
ALTER TABLE "public"."tickets" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."topic_votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vote_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "topic_votes_vote_type_check" CHECK (
        (
            "vote_type" = ANY (ARRAY ['up'::"text", 'down'::"text"])
        )
    )
);
ALTER TABLE "public"."topic_votes" OWNER TO "postgres";
ALTER TABLE ONLY "public"."agent_performance"
ADD CONSTRAINT "agent_performance_agent_id_date_key" UNIQUE ("agent_id", "date");
ALTER TABLE ONLY "public"."agent_performance"
ADD CONSTRAINT "agent_performance_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_interactions"
ADD CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_model_configs"
ADD CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."article_versions"
ADD CONSTRAINT "article_versions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."canned_responses"
ADD CONSTRAINT "canned_responses_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."canned_responses"
ADD CONSTRAINT "canned_responses_shortcut_key" UNIQUE ("shortcut");
ALTER TABLE ONLY "public"."files"
ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."forum_categories"
ADD CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."forum_categories"
ADD CONSTRAINT "forum_categories_slug_key" UNIQUE ("slug");
ALTER TABLE ONLY "public"."forum_replies"
ADD CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."forum_topics"
ADD CONSTRAINT "forum_topics_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."knowledge_base_files"
ADD CONSTRAINT "knowledge_base_files_pkey" PRIMARY KEY ("knowledge_base_id", "file_id");
ALTER TABLE ONLY "public"."knowledge_base"
ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."organizations"
ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."reply_votes"
ADD CONSTRAINT "reply_votes_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."reply_votes"
ADD CONSTRAINT "reply_votes_reply_id_user_id_key" UNIQUE ("reply_id", "user_id");
ALTER TABLE ONLY "public"."saved_reports"
ADD CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."sla_notifications"
ADD CONSTRAINT "sla_notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."sla_policies"
ADD CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."team_members"
ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."team_members"
ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");
ALTER TABLE ONLY "public"."teams"
ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ticket_categories"
ADD CONSTRAINT "ticket_categories_organization_id_name_key" UNIQUE ("organization_id", "name");
ALTER TABLE ONLY "public"."ticket_categories"
ADD CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ticket_category_assignments"
ADD CONSTRAINT "ticket_category_assignments_pkey" PRIMARY KEY ("ticket_id", "category_id");
ALTER TABLE ONLY "public"."ticket_feedback"
ADD CONSTRAINT "ticket_feedback_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ticket_files"
ADD CONSTRAINT "ticket_files_pkey" PRIMARY KEY ("ticket_id", "file_id");
ALTER TABLE ONLY "public"."ticket_messages"
ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ticket_metrics"
ADD CONSTRAINT "ticket_metrics_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ticket_tag_assignments"
ADD CONSTRAINT "ticket_tag_assignments_pkey" PRIMARY KEY ("ticket_id", "tag_id");
ALTER TABLE ONLY "public"."ticket_tags"
ADD CONSTRAINT "ticket_tags_organization_id_name_key" UNIQUE ("organization_id", "name");
ALTER TABLE ONLY "public"."ticket_tags"
ADD CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ticket_templates"
ADD CONSTRAINT "ticket_templates_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."topic_votes"
ADD CONSTRAINT "topic_votes_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."topic_votes"
ADD CONSTRAINT "topic_votes_topic_id_user_id_key" UNIQUE ("topic_id", "user_id");
CREATE INDEX "knowledge_base_embedding_idx" ON "public"."knowledge_base" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists" = '100');
CREATE INDEX "tickets_description_trgm_idx" ON "public"."tickets" USING "gin" ("description" "public"."gin_trgm_ops");
CREATE INDEX "tickets_embedding_idx" ON "public"."tickets" USING "ivfflat" (
    "content_embedding" "extensions"."vector_cosine_ops"
) WITH ("lists" = '100');
CREATE INDEX "tickets_search_vector_idx" ON "public"."tickets" USING "gin" ("search_vector");
CREATE INDEX "tickets_subject_trgm_idx" ON "public"."tickets" USING "gin" ("subject" "public"."gin_trgm_ops");
CREATE OR REPLACE TRIGGER "create_article_version_on_update"
AFTER
UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."create_article_version_on_update"();
CREATE OR REPLACE TRIGGER "create_initial_article_version"
AFTER
INSERT ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."create_article_version"();
CREATE OR REPLACE TRIGGER "handle_knowledge_base_updated_at" BEFORE
UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();
CREATE OR REPLACE TRIGGER "tg_forum_topics_embedding" BEFORE
INSERT
    OR
UPDATE OF "title",
    "content" ON "public"."forum_topics" FOR EACH ROW EXECUTE FUNCTION "public"."update_forum_embedding"();
CREATE OR REPLACE TRIGGER "tickets_search_vector_update" BEFORE
INSERT
    OR
UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."tickets_search_vector_trigger"();
CREATE OR REPLACE TRIGGER "trg_calculate_sla_breach_times" BEFORE
INSERT
    OR
UPDATE OF "sla_policy_id" ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_sla_breach_times"();
CREATE OR REPLACE TRIGGER "trg_calculate_ticket_metrics"
AFTER
INSERT
    OR
UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_ticket_metrics"();
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
CREATE OR REPLACE TRIGGER "trg_update_reply_votes"
AFTER
INSERT
    OR DELETE ON "public"."reply_votes" FOR EACH ROW EXECUTE FUNCTION "public"."update_reply_vote_counts"();
CREATE OR REPLACE TRIGGER "trg_update_ticket_unread_counts"
AFTER
INSERT
    OR
UPDATE OF "read_by_customer",
    "read_by_agent" ON "public"."ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_unread_counts"();
CREATE OR REPLACE TRIGGER "trg_update_topic_reply_stats"
AFTER
INSERT
    OR DELETE ON "public"."forum_replies" FOR EACH ROW EXECUTE FUNCTION "public"."update_topic_reply_stats"();
CREATE OR REPLACE TRIGGER "trg_update_topic_votes"
AFTER
INSERT
    OR DELETE ON "public"."topic_votes" FOR EACH ROW EXECUTE FUNCTION "public"."update_topic_vote_counts"();
CREATE OR REPLACE TRIGGER "update_ticket_embedding_trigger" BEFORE
INSERT
    OR
UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_embedding"();
CREATE OR REPLACE TRIGGER "update_ticket_metrics_on_message"
AFTER
INSERT ON "public"."ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_metrics"();
CREATE OR REPLACE TRIGGER "update_ticket_metrics_on_status_change"
AFTER
UPDATE OF "status" ON "public"."tickets" FOR EACH ROW
    WHEN (
        (
            "old"."status" IS DISTINCT
            FROM "new"."status"
        )
    ) EXECUTE FUNCTION "public"."update_ticket_metrics"();
ALTER TABLE ONLY "public"."agent_performance"
ADD CONSTRAINT "agent_performance_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."agent_performance"
ADD CONSTRAINT "agent_performance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_interactions"
ADD CONSTRAINT "ai_interactions_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."ai_model_configs"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."ai_interactions"
ADD CONSTRAINT "ai_interactions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."article_versions"
ADD CONSTRAINT "article_versions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."article_versions"
ADD CONSTRAINT "article_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."canned_responses"
ADD CONSTRAINT "canned_responses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."canned_responses"
ADD CONSTRAINT "canned_responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."forum_categories"
ADD CONSTRAINT "forum_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."forum_replies"
ADD CONSTRAINT "forum_replies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."forum_replies"
ADD CONSTRAINT "forum_replies_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."forum_topics"
ADD CONSTRAINT "forum_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."forum_categories"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."forum_topics"
ADD CONSTRAINT "forum_topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."forum_topics"
ADD CONSTRAINT "forum_topics_last_reply_by_fkey" FOREIGN KEY ("last_reply_by") REFERENCES "auth"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."forum_topics"
ADD CONSTRAINT "forum_topics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
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
ALTER TABLE ONLY "public"."reply_votes"
ADD CONSTRAINT "reply_votes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."forum_replies"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."reply_votes"
ADD CONSTRAINT "reply_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."saved_reports"
ADD CONSTRAINT "saved_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."saved_reports"
ADD CONSTRAINT "saved_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sla_notifications"
ADD CONSTRAINT "sla_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sla_notifications"
ADD CONSTRAINT "sla_notifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."sla_policies"
ADD CONSTRAINT "sla_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."team_members"
ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."team_members"
ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."teams"
ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_categories"
ADD CONSTRAINT "ticket_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_categories"
ADD CONSTRAINT "ticket_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."ticket_categories"("id");
ALTER TABLE ONLY "public"."ticket_category_assignments"
ADD CONSTRAINT "ticket_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_category_assignments"
ADD CONSTRAINT "ticket_category_assignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_feedback"
ADD CONSTRAINT "ticket_feedback_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_files"
ADD CONSTRAINT "ticket_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_files"
ADD CONSTRAINT "ticket_files_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_messages"
ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_metrics"
ADD CONSTRAINT "ticket_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_metrics"
ADD CONSTRAINT "ticket_metrics_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_tag_assignments"
ADD CONSTRAINT "ticket_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."ticket_tags"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_tag_assignments"
ADD CONSTRAINT "ticket_tag_assignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_tags"
ADD CONSTRAINT "ticket_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ticket_templates"
ADD CONSTRAINT "ticket_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."ticket_templates"
ADD CONSTRAINT "ticket_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE
SET NULL;
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tickets"
ADD CONSTRAINT "tickets_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "public"."sla_policies"("id");
ALTER TABLE ONLY "public"."topic_votes"
ADD CONSTRAINT "topic_votes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."topic_votes"
ADD CONSTRAINT "topic_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
CREATE POLICY "Admins can create teams" ON "public"."teams" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            "profiles"."role" = 'admin'::"public"."user_role"
                        )
                    )
            )
        )
    );
CREATE POLICY "Admins can delete teams" ON "public"."teams" FOR DELETE TO "authenticated" USING (
    (
        "organization_id" IN (
            SELECT "profiles"."organization_id"
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."role" = 'admin'::"public"."user_role"
                    )
                )
        )
    )
);
CREATE POLICY "Admins can manage SLA policies" ON "public"."sla_policies" TO "authenticated" USING (
    (
        "organization_id" IN (
            SELECT "profiles"."organization_id"
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."role" = 'admin'::"public"."user_role"
                    )
                )
        )
    )
);
CREATE POLICY "Admins can manage categories" ON "public"."ticket_categories" TO "authenticated" USING (
    (
        "organization_id" IN (
            SELECT "profiles"."organization_id"
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."role" = 'admin'::"public"."user_role"
                    )
                )
        )
    )
);
CREATE POLICY "Admins can manage tags" ON "public"."ticket_tags" TO "authenticated" USING (
    (
        "organization_id" IN (
            SELECT "profiles"."organization_id"
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."role" = 'admin'::"public"."user_role"
                    )
                )
        )
    )
);
CREATE POLICY "Admins can manage team members" ON "public"."team_members" TO "authenticated" USING (
    (
        "team_id" IN (
            SELECT "teams"."id"
            FROM "public"."teams"
            WHERE (
                    "teams"."organization_id" IN (
                        SELECT "profiles"."organization_id"
                        FROM "public"."profiles"
                        WHERE (
                                ("profiles"."id" = "auth"."uid"())
                                AND (
                                    "profiles"."role" = 'admin'::"public"."user_role"
                                )
                            )
                    )
                )
        )
    )
);
CREATE POLICY "Admins can update teams" ON "public"."teams" FOR
UPDATE TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            "profiles"."role" = 'admin'::"public"."user_role"
                        )
                    )
            )
        )
    );
CREATE POLICY "Admins can update their organization" ON "public"."organizations" FOR
UPDATE TO "authenticated" USING (
        (
            "id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            "profiles"."role" = 'admin'::"public"."user_role"
                        )
                    )
            )
        )
    );
CREATE POLICY "Agents and admins can manage canned responses" ON "public"."canned_responses" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."organization_id" = "canned_responses"."organization_id"
                    )
                    AND (
                        "profiles"."role" = ANY (
                            ARRAY ['agent'::"public"."user_role", 'admin'::"public"."user_role"]
                        )
                    )
                )
        )
    )
);
CREATE POLICY "Agents and admins can manage category assignments" ON "public"."ticket_category_assignments" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."tickets" "t"
                    JOIN "public"."profiles" "p" ON (("p"."organization_id" = "t"."organization_id"))
                )
            WHERE (
                    (
                        "t"."id" = "ticket_category_assignments"."ticket_id"
                    )
                    AND ("p"."id" = "auth"."uid"())
                    AND (
                        "p"."role" = ANY (
                            ARRAY ['admin'::"public"."user_role", 'agent'::"public"."user_role"]
                        )
                    )
                )
        )
    )
);
CREATE POLICY "Agents and admins can manage tag assignments" ON "public"."ticket_tag_assignments" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."tickets" "t"
                    JOIN "public"."profiles" "p" ON (("p"."organization_id" = "t"."organization_id"))
                )
            WHERE (
                    ("t"."id" = "ticket_tag_assignments"."ticket_id")
                    AND ("p"."id" = "auth"."uid"())
                    AND (
                        "p"."role" = ANY (
                            ARRAY ['admin'::"public"."user_role", 'agent'::"public"."user_role"]
                        )
                    )
                )
        )
    )
);
CREATE POLICY "Agents and admins can manage templates" ON "public"."ticket_templates" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."organization_id" = "ticket_templates"."organization_id"
                    )
                    AND (
                        "profiles"."role" = ANY (
                            ARRAY ['agent'::"public"."user_role", 'admin'::"public"."user_role"]
                        )
                    )
                )
        )
    )
);
CREATE POLICY "Agents and admins can update metrics" ON "public"."ticket_metrics" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM (
                    "public"."tickets" "t"
                    JOIN "public"."profiles" "p" ON (("p"."organization_id" = "t"."organization_id"))
                )
            WHERE (
                    ("t"."id" = "ticket_metrics"."ticket_id")
                    AND ("p"."id" = "auth"."uid"())
                    AND (
                        "p"."role" = ANY (
                            ARRAY ['admin'::"public"."user_role", 'agent'::"public"."user_role"]
                        )
                    )
                )
        )
    )
);
CREATE POLICY "Agents can create all types of messages" ON "public"."ticket_messages" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            (
                EXISTS (
                    SELECT 1
                    FROM (
                            "public"."tickets" "t"
                            JOIN "public"."profiles" "p" ON (("p"."organization_id" = "t"."organization_id"))
                        )
                    WHERE (
                            ("t"."id" = "ticket_messages"."ticket_id")
                            AND ("p"."id" = "auth"."uid"())
                            AND (
                                ("p"."role" = 'agent'::"public"."user_role")
                                OR ("p"."role" = 'admin'::"public"."user_role")
                            )
                        )
                )
            )
            AND (
                ("role" = 'agent'::"public"."message_role")
                OR ("role" = 'admin'::"public"."message_role")
            )
        )
    );
CREATE POLICY "Agents can create and update knowledge base articles" ON "public"."knowledge_base" TO "authenticated" USING (
    (
        EXISTS (
            SELECT 1
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        (
                            "profiles"."role" = 'agent'::"public"."user_role"
                        )
                        OR (
                            "profiles"."role" = 'admin'::"public"."user_role"
                        )
                    )
                )
        )
    )
);
CREATE POLICY "Agents can create article versions" ON "public"."article_versions" FOR
INSERT WITH CHECK (
        (
            EXISTS (
                SELECT 1
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            "profiles"."role" = ANY (
                                ARRAY ['agent'::"public"."user_role", 'admin'::"public"."user_role"]
                            )
                        )
                    )
            )
        )
    );
CREATE POLICY "Agents can create knowledge base articles for their organizatio" ON "public"."knowledge_base" FOR
INSERT WITH CHECK (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            "profiles"."role" = 'agent'::"public"."user_role"
                        )
                    )
            )
        )
    );
CREATE POLICY "Agents can delete knowledge base articles for their organizatio" ON "public"."knowledge_base" FOR DELETE USING (
    (
        "organization_id" IN (
            SELECT "profiles"."organization_id"
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."role" = 'agent'::"public"."user_role"
                    )
                )
        )
    )
);
CREATE POLICY "Agents can manage knowledge base files for their organization" ON "public"."knowledge_base_files" USING (
    (
        "knowledge_base_id" IN (
            SELECT "kb"."id"
            FROM "public"."knowledge_base" "kb"
            WHERE (
                    "kb"."organization_id" IN (
                        SELECT "profiles"."organization_id"
                        FROM "public"."profiles"
                        WHERE (
                                ("profiles"."id" = "auth"."uid"())
                                AND (
                                    "profiles"."role" = 'agent'::"public"."user_role"
                                )
                            )
                    )
                )
        )
    )
);
CREATE POLICY "Agents can mark messages as read" ON "public"."ticket_messages" FOR
UPDATE TO "authenticated" USING (
        (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."tickets" "t"
                        JOIN "public"."profiles" "p" ON (("p"."organization_id" = "t"."organization_id"))
                    )
                WHERE (
                        ("t"."id" = "ticket_messages"."ticket_id")
                        AND ("p"."id" = "auth"."uid"())
                        AND (
                            ("p"."role" = 'agent'::"public"."user_role")
                            OR ("p"."role" = 'admin'::"public"."user_role")
                        )
                    )
            )
        )
    ) WITH CHECK (("read_by_agent" = true));
CREATE POLICY "Agents can update knowledge base articles for their organizatio" ON "public"."knowledge_base" FOR
UPDATE USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            "profiles"."role" = 'agent'::"public"."user_role"
                        )
                    )
            )
        )
    );
CREATE POLICY "Agents can update tickets in their organization" ON "public"."tickets" FOR
UPDATE TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            (
                                "profiles"."role" = 'agent'::"public"."user_role"
                            )
                            OR (
                                "profiles"."role" = 'admin'::"public"."user_role"
                            )
                        )
                    )
            )
        )
    );
CREATE POLICY "Agents can view all messages in their organization" ON "public"."ticket_messages" FOR
SELECT TO "authenticated" USING (
        (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."tickets" "t"
                        JOIN "public"."profiles" "p" ON (("p"."organization_id" = "t"."organization_id"))
                    )
                WHERE (
                        ("t"."id" = "ticket_messages"."ticket_id")
                        AND ("p"."id" = "auth"."uid"())
                        AND (
                            ("p"."role" = 'agent'::"public"."user_role")
                            OR ("p"."role" = 'admin'::"public"."user_role")
                        )
                    )
            )
        )
    );
CREATE POLICY "Agents can view organization feedback" ON "public"."ticket_feedback" FOR
SELECT TO "authenticated" USING (
        (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."tickets" "t"
                        JOIN "public"."profiles" "p" ON (("p"."organization_id" = "t"."organization_id"))
                    )
                WHERE (
                        ("t"."id" = "ticket_feedback"."ticket_id")
                        AND ("p"."id" = "auth"."uid"())
                        AND (
                            ("p"."role" = 'agent'::"public"."user_role")
                            OR ("p"."role" = 'admin'::"public"."user_role")
                        )
                    )
            )
        )
    );
CREATE POLICY "Agents can view their own performance" ON "public"."agent_performance" FOR
SELECT TO "authenticated" USING (
        (
            ("agent_id" = "auth"."uid"())
            OR (
                "organization_id" IN (
                    SELECT "profiles"."organization_id"
                    FROM "public"."profiles"
                    WHERE (
                            ("profiles"."id" = "auth"."uid"())
                            AND (
                                "profiles"."role" = 'admin'::"public"."user_role"
                            )
                        )
                )
            )
        )
    );
CREATE POLICY "Allow authenticated users to create replies" ON "public"."forum_replies" FOR
INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Allow authenticated users to create topics" ON "public"."forum_topics" FOR
INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Allow authenticated users to vote on replies" ON "public"."reply_votes" FOR
INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Allow authenticated users to vote on topics" ON "public"."topic_votes" FOR
INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Allow public to view forum categories" ON "public"."forum_categories" FOR
SELECT USING (true);
CREATE POLICY "Allow public to view forum replies" ON "public"."forum_replies" FOR
SELECT USING (true);
CREATE POLICY "Allow public to view forum topics" ON "public"."forum_topics" FOR
SELECT USING (true);
CREATE POLICY "Allow users to delete their own votes on replies" ON "public"."reply_votes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Allow users to delete their own votes on topics" ON "public"."topic_votes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Allow users to update their own replies" ON "public"."forum_replies" FOR
UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));
CREATE POLICY "Allow users to update their own topics" ON "public"."forum_topics" FOR
UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));
CREATE POLICY "Allow users to view all reply votes" ON "public"."reply_votes" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "Allow users to view all topic votes" ON "public"."topic_votes" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "Anyone can view knowledge base articles" ON "public"."knowledge_base" FOR
SELECT TO "authenticated" USING (true);
CREATE POLICY "Customers can create feedback for their tickets" ON "public"."ticket_feedback" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            EXISTS (
                SELECT 1
                FROM "public"."tickets"
                WHERE (
                        ("tickets"."id" = "ticket_feedback"."ticket_id")
                        AND ("tickets"."creator_id" = "auth"."uid"())
                        AND (
                            "tickets"."status" = 'closed'::"public"."ticket_status"
                        )
                    )
            )
        )
    );
CREATE POLICY "Customers can create non-internal messages" ON "public"."ticket_messages" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            (
                "ticket_id" IN (
                    SELECT "tickets"."id"
                    FROM "public"."tickets"
                    WHERE ("tickets"."creator_id" = "auth"."uid"())
                )
            )
            AND (NOT "is_internal")
            AND ("role" = 'customer'::"public"."message_role")
        )
    );
CREATE POLICY "Customers can mark their messages as read" ON "public"."ticket_messages" FOR
UPDATE TO "authenticated" USING (
        (
            EXISTS (
                SELECT 1
                FROM "public"."tickets"
                WHERE (
                        ("tickets"."id" = "ticket_messages"."ticket_id")
                        AND ("tickets"."creator_id" = "auth"."uid"())
                    )
            )
        )
    ) WITH CHECK (("read_by_customer" = true));
CREATE POLICY "Customers can view non-internal messages for their tickets" ON "public"."ticket_messages" FOR
SELECT TO "authenticated" USING (
        (
            (
                "ticket_id" IN (
                    SELECT "tickets"."id"
                    FROM "public"."tickets"
                    WHERE ("tickets"."creator_id" = "auth"."uid"())
                )
            )
            AND (NOT "is_internal")
        )
    );
CREATE POLICY "Customers can view their own feedback" ON "public"."ticket_feedback" FOR
SELECT TO "authenticated" USING (
        (
            EXISTS (
                SELECT 1
                FROM "public"."tickets"
                WHERE (
                        ("tickets"."id" = "ticket_feedback"."ticket_id")
                        AND ("tickets"."creator_id" = "auth"."uid"())
                    )
            )
        )
    );
CREATE POLICY "Organization members can view their organization" ON "public"."organizations" FOR
SELECT TO "authenticated" USING (
        (
            "id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Public can create initial profile" ON "public"."profiles" FOR
INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Users can create reports for their organization" ON "public"."saved_reports" FOR
INSERT TO "authenticated" WITH CHECK (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE (
                        ("profiles"."id" = "auth"."uid"())
                        AND (
                            "profiles"."role" = ANY (
                                ARRAY ['admin'::"public"."user_role", 'agent'::"public"."user_role"]
                            )
                        )
                    )
            )
        )
    );
CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR
INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));
CREATE POLICY "Users can create tickets" ON "public"."tickets" FOR
INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR
UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can update their own reports" ON "public"."saved_reports" FOR
UPDATE TO "authenticated" USING (
        (
            ("created_by" = "auth"."uid"())
            OR (
                "organization_id" IN (
                    SELECT "profiles"."organization_id"
                    FROM "public"."profiles"
                    WHERE (
                            ("profiles"."id" = "auth"."uid"())
                            AND (
                                "profiles"."role" = 'admin'::"public"."user_role"
                            )
                        )
                )
            )
        )
    );
CREATE POLICY "Users can view SLA notifications in their organization" ON "public"."sla_notifications" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view SLA policies in their organization" ON "public"."sla_policies" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view article versions if they can view the article" ON "public"."article_versions" FOR
SELECT USING (
        (
            EXISTS (
                SELECT 1
                FROM (
                        "public"."knowledge_base" "kb"
                        LEFT JOIN "public"."profiles" "p" ON (("p"."organization_id" = "kb"."organization_id"))
                    )
                WHERE (
                        ("kb"."id" = "article_versions"."article_id")
                        AND ("p"."id" = "auth"."uid"())
                    )
            )
        )
    );
CREATE POLICY "Users can view canned responses in their organization" ON "public"."canned_responses" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view categories in their organization" ON "public"."ticket_categories" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view category assignments in their organization" ON "public"."ticket_category_assignments" FOR
SELECT TO "authenticated" USING (
        (
            "ticket_id" IN (
                SELECT "t"."id"
                FROM "public"."tickets" "t"
                WHERE (
                        "t"."organization_id" IN (
                            SELECT "profiles"."organization_id"
                            FROM "public"."profiles"
                            WHERE ("profiles"."id" = "auth"."uid"())
                        )
                    )
            )
        )
    );
CREATE POLICY "Users can view knowledge base articles from their organization" ON "public"."knowledge_base" FOR
SELECT USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view knowledge base files from their organization" ON "public"."knowledge_base_files" FOR
SELECT USING (
        (
            "knowledge_base_id" IN (
                SELECT "kb"."id"
                FROM "public"."knowledge_base" "kb"
                WHERE (
                        "kb"."organization_id" IN (
                            SELECT "profiles"."organization_id"
                            FROM "public"."profiles"
                            WHERE ("profiles"."id" = "auth"."uid"())
                        )
                    )
            )
        )
    );
CREATE POLICY "Users can view metrics for tickets in their organization" ON "public"."ticket_metrics" FOR
SELECT TO "authenticated" USING (
        (
            "ticket_id" IN (
                SELECT "t"."id"
                FROM "public"."tickets" "t"
                WHERE (
                        "t"."organization_id" IN (
                            SELECT "profiles"."organization_id"
                            FROM "public"."profiles"
                            WHERE ("profiles"."id" = "auth"."uid"())
                        )
                    )
            )
        )
    );
CREATE POLICY "Users can view reports for their organization" ON "public"."saved_reports" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view tag assignments in their organization" ON "public"."ticket_tag_assignments" FOR
SELECT TO "authenticated" USING (
        (
            "ticket_id" IN (
                SELECT "t"."id"
                FROM "public"."tickets" "t"
                WHERE (
                        "t"."organization_id" IN (
                            SELECT "profiles"."organization_id"
                            FROM "public"."profiles"
                            WHERE ("profiles"."id" = "auth"."uid"())
                        )
                    )
            )
        )
    );
CREATE POLICY "Users can view tags in their organization" ON "public"."ticket_tags" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view team members in their organization" ON "public"."team_members" FOR
SELECT TO "authenticated" USING (
        (
            "team_id" IN (
                SELECT "teams"."id"
                FROM "public"."teams"
                WHERE (
                        "teams"."organization_id" IN (
                            SELECT "profiles"."organization_id"
                            FROM "public"."profiles"
                            WHERE ("profiles"."id" = "auth"."uid"())
                        )
                    )
            )
        )
    );
CREATE POLICY "Users can view teams in their organization" ON "public"."teams" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view templates in their organization" ON "public"."ticket_templates" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR
SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view ticket metrics for their organization" ON "public"."ticket_metrics" FOR
SELECT TO "authenticated" USING (
        (
            "organization_id" IN (
                SELECT "profiles"."organization_id"
                FROM "public"."profiles"
                WHERE ("profiles"."id" = "auth"."uid"())
            )
        )
    );
CREATE POLICY "Users can view tickets in their organization" ON "public"."tickets" FOR
SELECT TO "authenticated" USING (
        (
            (
                "organization_id" IN (
                    SELECT "profiles"."organization_id"
                    FROM "public"."profiles"
                    WHERE ("profiles"."id" = "auth"."uid"())
                )
            )
            OR ("creator_id" = "auth"."uid"())
        )
    );
ALTER TABLE "public"."agent_performance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ai_model_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."article_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."canned_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."forum_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."forum_replies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."forum_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."knowledge_base_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reply_votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."saved_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sla_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sla_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_category_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_tag_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ticket_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."topic_votes" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_sla_breach_times"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_sla_breach_times"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_sla_breach_times"() TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_ticket_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_ticket_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_ticket_metrics"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_sla_breaches"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_sla_breaches"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_sla_breaches"() TO "service_role";
GRANT ALL ON FUNCTION "public"."create_article_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_article_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_article_version"() TO "service_role";
GRANT ALL ON FUNCTION "public"."create_article_version_on_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_article_version_on_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_article_version_on_update"() TO "service_role";
GRANT ALL ON FUNCTION "public"."create_ticket_from_template"(
        "template_id" "uuid",
        "creator_id" "uuid",
        "assigned_to" "uuid",
        "custom_subject" "text",
        "custom_content" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."create_ticket_from_template"(
        "template_id" "uuid",
        "creator_id" "uuid",
        "assigned_to" "uuid",
        "custom_subject" "text",
        "custom_content" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_ticket_from_template"(
        "template_id" "uuid",
        "creator_id" "uuid",
        "assigned_to" "uuid",
        "custom_subject" "text",
        "custom_content" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_forum_embedding"("content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_forum_embedding"("content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_forum_embedding"("content" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_ticket_embedding"(
        "ticket_subject" "text",
        "ticket_description" "text",
        "ticket_status" "text",
        "ticket_priority" "text",
        "ticket_categories" "text" [],
        "ticket_tags" "text" []
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_ticket_embedding"(
        "ticket_subject" "text",
        "ticket_description" "text",
        "ticket_status" "text",
        "ticket_priority" "text",
        "ticket_categories" "text" [],
        "ticket_tags" "text" []
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_ticket_embedding"(
        "ticket_subject" "text",
        "ticket_description" "text",
        "ticket_status" "text",
        "ticket_priority" "text",
        "ticket_categories" "text" [],
        "ticket_tags" "text" []
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_next_version_number"("article_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_version_number"("article_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_version_number"("article_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_trending_topics"("time_window" interval, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trending_topics"("time_window" interval, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trending_topics"("time_window" interval, "limit_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"(
        "text",
        "internal",
        smallint,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"(
        "text",
        "internal",
        smallint,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"(
        "text",
        "internal",
        smallint,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"(
        "text",
        "internal",
        smallint,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal",
        "internal"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal"
    ) TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"(
        "internal",
        smallint,
        "text",
        integer,
        "internal",
        "internal",
        "internal"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_article_views"("article_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_article_views"("article_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_article_views"("article_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_topic_views"("topic_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_topic_views"("topic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_topic_views"("topic_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."search_articles"(
        "search_query" "text",
        "similarity_threshold" double precision,
        "use_vector_search" boolean
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."search_articles"(
        "search_query" "text",
        "similarity_threshold" double precision,
        "use_vector_search" boolean
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_articles"(
        "search_query" "text",
        "similarity_threshold" double precision,
        "use_vector_search" boolean
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."search_canned_responses"("search_query" "text", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."search_canned_responses"("search_query" "text", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_canned_responses"("search_query" "text", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."search_forum_topics"(
        "search_query" "text",
        "similarity_threshold" double precision,
        "use_vector_search" boolean,
        "solved_only" boolean
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."search_forum_topics"(
        "search_query" "text",
        "similarity_threshold" double precision,
        "use_vector_search" boolean,
        "solved_only" boolean
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_forum_topics"(
        "search_query" "text",
        "similarity_threshold" double precision,
        "use_vector_search" boolean,
        "solved_only" boolean
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."search_tickets"(
        "search_query" "text",
        "status_filter" "text",
        "priority_filter" "text",
        "category_ids" "uuid" [],
        "tag_ids" "uuid" [],
        "date_from" timestamp without time zone,
        "date_to" timestamp without time zone,
        "organization_id" "uuid",
        "assigned_to_param" "uuid",
        "use_vector_search" boolean,
        "similarity_threshold" double precision
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."search_tickets"(
        "search_query" "text",
        "status_filter" "text",
        "priority_filter" "text",
        "category_ids" "uuid" [],
        "tag_ids" "uuid" [],
        "date_from" timestamp without time zone,
        "date_to" timestamp without time zone,
        "organization_id" "uuid",
        "assigned_to_param" "uuid",
        "use_vector_search" boolean,
        "similarity_threshold" double precision
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_tickets"(
        "search_query" "text",
        "status_filter" "text",
        "priority_filter" "text",
        "category_ids" "uuid" [],
        "tag_ids" "uuid" [],
        "date_from" timestamp without time zone,
        "date_to" timestamp without time zone,
        "organization_id" "uuid",
        "assigned_to_param" "uuid",
        "use_vector_search" boolean,
        "similarity_threshold" double precision
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."search_tickets_by_similarity"(
        "search_query" "text",
        "match_threshold" double precision,
        "match_count" integer
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."search_tickets_by_similarity"(
        "search_query" "text",
        "match_threshold" double precision,
        "match_count" integer
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_tickets_by_similarity"(
        "search_query" "text",
        "match_threshold" double precision,
        "match_count" integer
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."tickets_search_vector"(
        "subject" "text",
        "description" "text",
        "status" "text",
        "priority" "text"
    ) TO "anon";
GRANT ALL ON FUNCTION "public"."tickets_search_vector"(
        "subject" "text",
        "description" "text",
        "status" "text",
        "priority" "text"
    ) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tickets_search_vector"(
        "subject" "text",
        "description" "text",
        "status" "text",
        "priority" "text"
    ) TO "service_role";
GRANT ALL ON FUNCTION "public"."tickets_search_vector_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."tickets_search_vector_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tickets_search_vector_trigger"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_agent_performance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_performance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_performance"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_forum_embedding"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_forum_embedding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_forum_embedding"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_reply_vote_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reply_vote_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reply_vote_counts"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_ticket_embedding"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_embedding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_embedding"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_ticket_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_metrics"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_ticket_unread_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_unread_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_unread_counts"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_topic_reply_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_topic_reply_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_topic_reply_stats"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_topic_vote_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_topic_vote_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_topic_vote_counts"() TO "service_role";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
GRANT ALL ON TABLE "public"."agent_performance" TO "anon";
GRANT ALL ON TABLE "public"."agent_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_performance" TO "service_role";
GRANT ALL ON TABLE "public"."ai_interactions" TO "anon";
GRANT ALL ON TABLE "public"."ai_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_interactions" TO "service_role";
GRANT ALL ON TABLE "public"."ai_model_configs" TO "anon";
GRANT ALL ON TABLE "public"."ai_model_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_model_configs" TO "service_role";
GRANT ALL ON TABLE "public"."article_versions" TO "anon";
GRANT ALL ON TABLE "public"."article_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."article_versions" TO "service_role";
GRANT ALL ON TABLE "public"."canned_responses" TO "anon";
GRANT ALL ON TABLE "public"."canned_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."canned_responses" TO "service_role";
GRANT ALL ON TABLE "public"."files" TO "anon";
GRANT ALL ON TABLE "public"."files" TO "authenticated";
GRANT ALL ON TABLE "public"."files" TO "service_role";
GRANT ALL ON TABLE "public"."forum_categories" TO "anon";
GRANT ALL ON TABLE "public"."forum_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_categories" TO "service_role";
GRANT ALL ON TABLE "public"."forum_replies" TO "anon";
GRANT ALL ON TABLE "public"."forum_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_replies" TO "service_role";
GRANT ALL ON TABLE "public"."forum_topics" TO "anon";
GRANT ALL ON TABLE "public"."forum_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_topics" TO "service_role";
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
GRANT ALL ON TABLE "public"."reply_votes" TO "anon";
GRANT ALL ON TABLE "public"."reply_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."reply_votes" TO "service_role";
GRANT ALL ON TABLE "public"."saved_reports" TO "anon";
GRANT ALL ON TABLE "public"."saved_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_reports" TO "service_role";
GRANT ALL ON TABLE "public"."sla_notifications" TO "anon";
GRANT ALL ON TABLE "public"."sla_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."sla_notifications" TO "service_role";
GRANT ALL ON TABLE "public"."sla_policies" TO "anon";
GRANT ALL ON TABLE "public"."sla_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."sla_policies" TO "service_role";
GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";
GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_categories" TO "anon";
GRANT ALL ON TABLE "public"."ticket_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_categories" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_category_assignments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_category_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_category_assignments" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_feedback" TO "anon";
GRANT ALL ON TABLE "public"."ticket_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_feedback" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_files" TO "anon";
GRANT ALL ON TABLE "public"."ticket_files" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_files" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_metrics" TO "anon";
GRANT ALL ON TABLE "public"."ticket_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_metrics" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_tag_assignments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_tag_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_tag_assignments" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_tags" TO "anon";
GRANT ALL ON TABLE "public"."ticket_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_tags" TO "service_role";
GRANT ALL ON TABLE "public"."ticket_templates" TO "anon";
GRANT ALL ON TABLE "public"."ticket_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_templates" TO "service_role";
GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";
GRANT ALL ON TABLE "public"."topic_votes" TO "anon";
GRANT ALL ON TABLE "public"."topic_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_votes" TO "service_role";
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
--
-- Dumped schema changes for auth and storage
/* 
 * Schema changes for auth and storage systems
 */