-- Fix search_forum_topics function to correctly check for solved topics
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
        OR EXISTS (
            SELECT 1
            FROM forum_replies fr
            WHERE fr.topic_id = t.id
                AND fr.is_solution = true
        )
    )
ORDER BY similarity DESC;
END;
$$;
-- Grant permissions
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