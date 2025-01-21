-- Update existing tickets with search vectors
update tickets
set search_vector = tickets_search_vector(
        subject,
        description,
        status::text,
        priority::text
    );
-- Create trigger function
create or replace function tickets_search_vector_trigger() returns trigger as $$ begin new.search_vector := tickets_search_vector(
        new.subject,
        new.description,
        new.status::text,
        new.priority::text
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