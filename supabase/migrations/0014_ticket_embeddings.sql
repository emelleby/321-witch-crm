-- Enable the vector extension
create extension if not exists vector;
-- Add embedding column to tickets
alter table tickets
add column if not exists content_embedding vector(1536);
-- Function to generate embeddings using Supabase's OpenAI integration
create or replace function generate_ticket_embedding(
        ticket_subject text,
        ticket_description text,
        ticket_status text,
        ticket_priority text,
        ticket_categories text [],
        ticket_tags text []
    ) returns vector as $$
declare combined_text text;
embedding vector(1536);
begin -- Combine all ticket information into a single text
combined_text := concat_ws(
    ' ',
    'Subject: ' || coalesce(ticket_subject, ''),
    'Description: ' || coalesce(ticket_description, ''),
    'Status: ' || coalesce(ticket_status, ''),
    'Priority: ' || coalesce(ticket_priority, ''),
    'Categories: ' || array_to_string(ticket_categories, ', '),
    'Tags: ' || array_to_string(ticket_tags, ', ')
);
-- Generate embedding using Supabase's OpenAI integration
select embedding_vector into embedding
from openai.embeddings(combined_text);
return embedding;
end;
$$ language plpgsql security definer;
-- Function to update ticket embeddings
create or replace function update_ticket_embedding() returns trigger as $$
declare categories text [];
tags text [];
begin -- Get categories
select array_agg(tc.name) into categories
from ticket_category_assignments tca
    join ticket_categories tc on tc.id = tca.category_id
where tca.ticket_id = new.id;
-- Get tags
select array_agg(tt.name) into tags
from ticket_tag_assignments tta
    join ticket_tags tt on tt.id = tta.tag_id
where tta.ticket_id = new.id;
-- Update embedding
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
$$ language plpgsql security definer;
-- Create trigger for updating embeddings
create trigger update_ticket_embedding_trigger before
insert
    or
update on tickets for each row execute function update_ticket_embedding();
-- Create index for vector similarity search
create index if not exists tickets_embedding_idx on tickets using ivfflat (content_embedding vector_cosine_ops) with (lists = 100);
-- Function to search tickets by similarity
create or replace function search_tickets_by_similarity(
        search_query text,
        match_threshold float default 0.7,
        match_count int default 10
    ) returns table (
        id uuid,
        subject text,
        similarity float
    ) as $$
declare search_embedding vector(1536);
begin -- Generate embedding for search query
select embedding_vector into search_embedding
from openai.embeddings(search_query);
-- Return similar tickets
return query
select t.id,
    t.subject,
    1 - (t.content_embedding <=> search_embedding) as similarity
from tickets t
where 1 - (t.content_embedding <=> search_embedding) > match_threshold
order by t.content_embedding <=> search_embedding
limit match_count;
end;
$$ language plpgsql security definer;
-- Update existing tickets with embeddings
do $$
declare t record;
categories text [];
tags text [];
begin for t in
select *
from tickets loop -- Get categories
select array_agg(tc.name) into categories
from ticket_category_assignments tca
    join ticket_categories tc on tc.id = tca.category_id
where tca.ticket_id = t.id;
-- Get tags
select array_agg(tt.name) into tags
from ticket_tag_assignments tta
    join ticket_tags tt on tt.id = tta.tag_id
where tta.ticket_id = t.id;
-- Update embedding
update tickets
set content_embedding = generate_ticket_embedding(
        t.subject,
        t.description,
        t.status,
        t.priority,
        categories,
        tags
    )
where id = t.id;
end loop;
end;
$$;