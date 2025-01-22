-- Fix search_articles function to use correct column name
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
    1 - (a.embedding <=> query_embedding) as similarity
FROM knowledge_base a
WHERE 1 - (a.embedding <=> query_embedding) > similarity_threshold
ORDER BY similarity DESC;
END;
$$;
-- Grant permissions
GRANT ALL ON FUNCTION public.search_articles(text, extensions.vector, double precision) TO anon;
GRANT ALL ON FUNCTION public.search_articles(text, extensions.vector, double precision) TO authenticated;
GRANT ALL ON FUNCTION public.search_articles(text, extensions.vector, double precision) TO service_role;