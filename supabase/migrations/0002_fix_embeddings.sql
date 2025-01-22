-- Fix embedding generation approach
-- Drop existing functions that generate embeddings internally
DROP FUNCTION IF EXISTS public.generate_forum_embedding(text);
DROP FUNCTION IF EXISTS public.generate_ticket_embedding(text, text, text, text, text [], text []);
-- Create new functions that accept pre-generated embeddings
CREATE OR REPLACE FUNCTION public.store_forum_embedding(
        content_text text,
        embedding_vector extensions.vector(1536)
    ) RETURNS extensions.vector(1536) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN embedding_vector;
END;
$$;
CREATE OR REPLACE FUNCTION public.store_ticket_embedding(
        ticket_subject text,
        ticket_description text,
        ticket_status text,
        ticket_priority text,
        ticket_categories text [],
        ticket_tags text [],
        embedding_vector extensions.vector(1536)
    ) RETURNS extensions.vector(1536) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN embedding_vector;
END;
$$;
-- Update search functions to use pre-generated embeddings
CREATE OR REPLACE FUNCTION public.search_articles(
        search_query text,
        query_embedding extensions.vector(1536),
        similarity_threshold double precision DEFAULT 0.7
    ) RETURNS TABLE (
        id uuid,
        title text,
        content text,
        similarity double precision
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT a.id,
    a.title,
    a.content,
    1 - (a.content_embedding <=> query_embedding) as similarity
FROM knowledge_base a
WHERE 1 - (a.content_embedding <=> query_embedding) > similarity_threshold
ORDER BY similarity DESC;
END;
$$;
CREATE OR REPLACE FUNCTION public.search_forum_topics(
        search_query text,
        query_embedding extensions.vector(1536),
        similarity_threshold double precision DEFAULT 0.7,
        solved_only boolean DEFAULT false
    ) RETURNS TABLE (
        id uuid,
        title text,
        content text,
        similarity double precision
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT t.id,
    t.title,
    t.content,
    1 - (t.content_embedding <=> query_embedding) as similarity
FROM forum_topics t
WHERE 1 - (t.content_embedding <=> query_embedding) > similarity_threshold
    AND (
        NOT solved_only
        OR t.is_solved = true
    )
ORDER BY similarity DESC;
END;
$$;
-- Update triggers to use new functions
CREATE OR REPLACE FUNCTION public.update_forum_embedding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE embedding extensions.vector(1536);
BEGIN -- This will be populated by the application before insert/update
new.content_embedding := new.content_embedding;
RETURN new;
END;
$$;
CREATE OR REPLACE FUNCTION public.update_ticket_embedding() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN -- This will be populated by the application before insert/update
    new.content_embedding := new.content_embedding;
RETURN new;
END;
$$;
-- Grant permissions
GRANT ALL ON FUNCTION public.store_forum_embedding(text, extensions.vector) TO anon;
GRANT ALL ON FUNCTION public.store_forum_embedding(text, extensions.vector) TO authenticated;
GRANT ALL ON FUNCTION public.store_forum_embedding(text, extensions.vector) TO service_role;
GRANT ALL ON FUNCTION public.store_ticket_embedding(
        text,
        text,
        text,
        text,
        text [],
        text [],
        extensions.vector
    ) TO anon;
GRANT ALL ON FUNCTION public.store_ticket_embedding(
        text,
        text,
        text,
        text,
        text [],
        text [],
        extensions.vector
    ) TO authenticated;
GRANT ALL ON FUNCTION public.store_ticket_embedding(
        text,
        text,
        text,
        text,
        text [],
        text [],
        extensions.vector
    ) TO service_role;
GRANT ALL ON FUNCTION public.search_articles(text, extensions.vector, double precision) TO anon;
GRANT ALL ON FUNCTION public.search_articles(text, extensions.vector, double precision) TO authenticated;
GRANT ALL ON FUNCTION public.search_articles(text, extensions.vector, double precision) TO service_role;
GRANT ALL ON FUNCTION public.search_forum_topics(
        text,
        extensions.vector,
        double precision,
        boolean
    ) TO anon;
GRANT ALL ON FUNCTION public.search_forum_topics(
        text,
        extensions.vector,
        double precision,
        boolean
    ) TO authenticated;
GRANT ALL ON FUNCTION public.search_forum_topics(
        text,
        extensions.vector,
        double precision,
        boolean
    ) TO service_role;