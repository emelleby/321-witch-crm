-- Function to search articles using both text search and vector similarity
create or replace function public.search_articles(
        search_query text,
        similarity_threshold float default 0.7,
        use_vector_search boolean default false
    ) returns table (
        id uuid,
        title text,
        content text,
        similarity float
    ) language plpgsql security definer as $$
declare search_embedding vector(1536);
begin if use_vector_search then -- Generate embedding for search query using the Edge Function
select result->>'embedding' into search_embedding
from extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', search_query)::text
        )::extensions.http_request
    );
-- Return results based on vector similarity
return query
select kb.id,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> search_embedding) as similarity
from knowledge_base kb
where kb.embedding is not null
    and 1 - (kb.embedding <=> search_embedding) > similarity_threshold
order by kb.embedding <=> search_embedding
limit 5;
else -- Fallback to text search if vector search is disabled
return query
select kb.id,
    kb.title,
    kb.content,
    ts_rank(
        to_tsvector('english', kb.title || ' ' || kb.content),
        to_tsquery('english', search_query)
    ) as similarity
from knowledge_base kb
where to_tsvector('english', kb.title || ' ' || kb.content) @@ to_tsquery('english', search_query)
order by similarity desc
limit 5;
end if;
end;
$$;
-- Function to search forum topics using both text search and vector similarity
create or replace function public.search_forum_topics(
        search_query text,
        similarity_threshold float default 0.7,
        use_vector_search boolean default false,
        solved_only boolean default false
    ) returns table (
        id uuid,
        title text,
        content text,
        similarity float
    ) language plpgsql security definer as $$
declare search_embedding vector(1536);
begin if use_vector_search then -- Generate embedding for search query using the Edge Function
select result->>'embedding' into search_embedding
from extensions.http(
        (
            'POST',
            'http://host.docker.internal:54321/functions/v1/generate-embedding',
            ARRAY [extensions.http_header('Authorization', current_setting('app.edge_secret'))],
            'application/json',
            json_build_object('text', search_query)::text
        )::extensions.http_request
    );
-- Return results based on vector similarity
return query
select ft.id,
    ft.title,
    ft.content,
    1 - (ft.content_embedding <=> search_embedding) as similarity
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
else -- Fallback to text search if vector search is disabled
return query
select ft.id,
    ft.title,
    ft.content,
    ts_rank(
        to_tsvector('english', ft.title || ' ' || ft.content),
        to_tsquery('english', search_query)
    ) as similarity
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