-- Create forum categories table
create table public.forum_categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    slug text not null unique,
    organization_id uuid references public.organizations(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- Create forum topics table
create table public.forum_topics (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    content text not null,
    category_id uuid references public.forum_categories(id) on delete cascade,
    created_by uuid references auth.users(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    is_pinned boolean default false,
    is_locked boolean default false,
    views_count integer default 0,
    replies_count integer default 0,
    upvotes integer default 0,
    downvotes integer default 0,
    last_reply_at timestamptz,
    last_reply_by uuid references auth.users(id) on delete
    set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        tags text [] default array []::text [],
        content_embedding vector(1536)
);
-- Create forum replies table
create table public.forum_replies (
    id uuid primary key default uuid_generate_v4(),
    content text not null,
    topic_id uuid references public.forum_topics(id) on delete cascade,
    created_by uuid references auth.users(id) on delete cascade,
    is_solution boolean default false,
    upvotes integer default 0,
    downvotes integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- Create topic_votes table
create table public.topic_votes (
    id uuid primary key default uuid_generate_v4(),
    topic_id uuid not null references public.forum_topics(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    vote_type text not null check (vote_type in ('up', 'down')),
    created_at timestamptz default now(),
    unique(topic_id, user_id)
);
-- Create reply_votes table
create table public.reply_votes (
    id uuid primary key default uuid_generate_v4(),
    reply_id uuid not null references public.forum_replies(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    vote_type text not null check (vote_type in ('up', 'down')),
    created_at timestamptz default now(),
    unique(reply_id, user_id)
);
-- Function to update topic reply counts and last reply info
create or replace function public.update_topic_reply_stats() returns trigger as $$ begin if (TG_OP = 'INSERT') then
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
$$ language plpgsql security definer;
-- Function to update topic vote counts
create or replace function public.update_topic_vote_counts() returns trigger as $$ begin if (TG_OP = 'INSERT') then
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
$$ language plpgsql security definer;
-- Function to update reply vote counts
create or replace function public.update_reply_vote_counts() returns trigger as $$ begin if (TG_OP = 'INSERT') then
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
$$ language plpgsql security definer;
-- Function to increment topic views
create or replace function public.increment_topic_views(topic_id uuid) returns void as $$ begin
update public.forum_topics
set views_count = views_count + 1
where id = topic_id;
end;
$$ language plpgsql security definer;
-- Function to get trending topics
create or replace function public.get_trending_topics(
        time_window interval default interval '7 days',
        limit_count integer default 5
    ) returns table (
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
        trending_score float
    ) as $$ begin return query
select t.*,
    (
        -- Base score from views
        t.views_count * 1.0 + -- Weighted upvotes (upvotes - downvotes)
        (t.upvotes - t.downvotes) * 2.0 + -- Recent replies weight
        (
            select count(*)::float * 3.0
            from forum_replies r
            where r.topic_id = t.id
                and r.created_at > now() - time_window
        )
    ) as trending_score
from forum_topics t
where t.created_at > now() - time_window
    or t.last_reply_at > now() - time_window
order by trending_score desc
limit limit_count;
end;
$$ language plpgsql security definer;
-- Enable vector extension
create extension if not exists vector;
-- Function to generate embeddings (this will call the Edge Function)
create or replace function generate_forum_embedding(content text) returns vector language plpgsql security definer as $$
declare embedding vector(1536);
begin
select content::vector into embedding
from (
        select content
        from http(
                (
                    'POST',
                    'http://host.docker.internal:54321/functions/v1/generate-embedding',
                    ARRAY [http_header('Authorization', current_setting('app.edge_secret'))],
                    'application/json',
                    json_build_object('text', content)::text
                )
            ).content::json->>'embedding'
    ) as t;
return embedding;
end;
$$;
-- Function to match forum topics by similarity
create or replace function match_forum_topics(
        query_embedding vector(1536),
        match_threshold float default 0.78,
        match_count int default 10
    ) returns table (
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
        similarity float
    ) language plpgsql as $$ begin return query
select t.*,
    1 - (t.content_embedding <=> query_embedding) as similarity
from forum_topics t
where 1 - (t.content_embedding <=> query_embedding) > match_threshold
order by t.content_embedding <=> query_embedding
limit match_count;
end;
$$;
-- Create trigger for updating topic embeddings
create or replace function update_forum_embedding() returns trigger language plpgsql as $$ begin new.content_embedding = generate_forum_embedding(new.title || ' ' || new.content);
return new;
end;
$$;
-- Triggers
create trigger trg_update_topic_reply_stats
after
insert
    or delete on public.forum_replies for each row execute function public.update_topic_reply_stats();
create trigger trg_update_topic_votes
after
insert
    or delete on public.topic_votes for each row execute function public.update_topic_vote_counts();
create trigger trg_update_reply_votes
after
insert
    or delete on public.reply_votes for each row execute function public.update_reply_vote_counts();
create trigger tg_forum_topics_embedding before
insert
    or
update of title,
    content on forum_topics for each row execute function update_forum_embedding();
-- Enable RLS
alter table public.forum_categories enable row level security;
alter table public.forum_topics enable row level security;
alter table public.forum_replies enable row level security;
alter table public.topic_votes enable row level security;
alter table public.reply_votes enable row level security;
-- Public access policies
create policy "Allow public to view forum categories" on public.forum_categories for
select using (true);
create policy "Allow public to view forum topics" on public.forum_topics for
select using (true);
create policy "Allow public to view forum replies" on public.forum_replies for
select using (true);
-- Authenticated user policies
create policy "Allow authenticated users to create topics" on public.forum_topics for
insert to authenticated with check (true);
create policy "Allow users to update their own topics" on public.forum_topics for
update to authenticated using (auth.uid() = created_by);
create policy "Allow authenticated users to create replies" on public.forum_replies for
insert to authenticated with check (true);
create policy "Allow users to update their own replies" on public.forum_replies for
update to authenticated using (auth.uid() = created_by);
-- Vote policies
create policy "Allow authenticated users to vote on topics" on public.topic_votes for
insert to authenticated with check (true);
create policy "Allow users to delete their own votes on topics" on public.topic_votes for delete to authenticated using (auth.uid() = user_id);
create policy "Allow users to view all topic votes" on public.topic_votes for
select to authenticated using (true);
create policy "Allow authenticated users to vote on replies" on public.reply_votes for
insert to authenticated with check (true);
create policy "Allow users to delete their own votes on replies" on public.reply_votes for delete to authenticated using (auth.uid() = user_id);
create policy "Allow users to view all reply votes" on public.reply_votes for
select to authenticated using (true);