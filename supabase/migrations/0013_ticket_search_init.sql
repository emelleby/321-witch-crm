-- Enable the pg_trgm extension for similarity search
create extension if not exists pg_trgm;
-- Add search vector column to tickets table
alter table tickets
add column if not exists search_vector tsvector;
-- Create function to generate search vector
create or replace function tickets_search_vector(
        subject text,
        description text,
        status text,
        priority text
    ) returns tsvector as $$ begin return (
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
$$ language plpgsql immutable;
-- Create trigger function
create or replace function tickets_search_vector_trigger() returns trigger as $$ begin new.search_vector := tickets_search_vector(
        new.subject,
        new.description,
        new.status,
        new.priority
    );
return new;
end;
$$ language plpgsql;
-- Create trigger
drop trigger if exists tickets_search_vector_update on tickets;
create trigger tickets_search_vector_update before
insert
    or
update on tickets for each row execute function tickets_search_vector_trigger();
-- Create GIN index for full text search
create index if not exists tickets_search_vector_idx on tickets using gin(search_vector);
-- Create GIN index for trigram similarity search on subject
create index if not exists tickets_subject_trgm_idx on tickets using gin(subject gin_trgm_ops);
-- Create GIN index for trigram similarity search on description
create index if not exists tickets_description_trgm_idx on tickets using gin(description gin_trgm_ops);
-- Function to search tickets with various filters
create or replace function search_tickets(
        search_query text default null,
        status_filter text default null,
        priority_filter text default null,
        category_ids uuid [] default null,
        tag_ids uuid [] default null,
        date_from timestamp default null,
        date_to timestamp default null,
        organization_id uuid default null,
        assigned_to uuid default null,
        use_vector_search boolean default false,
        similarity_threshold float default 0.7
    ) returns table (
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
        search_rank float,
        similarity_score float
    ) as $$
declare search_embedding vector(1536);
begin if use_vector_search
and search_query is not null then -- Generate embedding for search query
select embedding_vector into search_embedding
from openai.embeddings(search_query);
end if;
return query with filtered_tickets as (
    select distinct t.*,
        case
            when search_query is not null then ts_rank(
                t.search_vector,
                websearch_to_tsquery('english', search_query)
            )
            else 0
        end as search_rank,
        case
            when use_vector_search
            and search_query is not null then 1 - (t.content_embedding <=> search_embedding)
            else 0
        end as similarity_score
    from tickets t
        left join ticket_category_assignments tca on t.id = tca.ticket_id
        left join ticket_tag_assignments tta on t.id = tta.ticket_id
    where -- Full text search on search_vector if search_query is provided
        (
            search_query is null
            or search_vector @@ websearch_to_tsquery('english', search_query)
        ) -- Vector similarity search if enabled
        and (
            not use_vector_search
            or search_query is null
            or 1 - (t.content_embedding <=> search_embedding) > similarity_threshold
        ) -- Filter by status if provided
        and (
            status_filter is null
            or t.status = status_filter
        ) -- Filter by priority if provided
        and (
            priority_filter is null
            or t.priority = priority_filter
        ) -- Filter by categories if provided
        and (
            category_ids is null
            or tca.category_id = any(category_ids)
        ) -- Filter by tags if provided
        and (
            tag_ids is null
            or tta.tag_id = any(tag_ids)
        ) -- Filter by date range if provided
        and (
            date_from is null
            or t.created_at >= date_from
        )
        and (
            date_to is null
            or t.created_at <= date_to
        ) -- Filter by organization if provided
        and (
            organization_id is null
            or t.organization_id = organization_id
        ) -- Filter by assigned agent if provided
        and (
            assigned_to is null
            or t.assigned_to = assigned_to
        )
)
select t.id,
    t.subject,
    t.description,
    t.status,
    t.priority,
    t.created_at,
    t.updated_at,
    t.creator_id,
    t.assigned_to as assignee_id,
    t.organization_id as org_id,
    t.search_rank,
    t.similarity_score
from filtered_tickets t
order by -- Rank by combination of text search rank and vector similarity
    case
        when use_vector_search
        and search_query is not null then (t.search_rank * 0.3 + t.similarity_score * 0.7)
        when search_query is not null then t.search_rank
        else 0
    end desc,
    t.created_at desc;
end;
$$ language plpgsql security definer;