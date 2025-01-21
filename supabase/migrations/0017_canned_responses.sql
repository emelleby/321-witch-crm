-- Create canned responses table
create table public.canned_responses (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    content text not null,
    shortcut text unique,
    category text,
    created_by uuid references auth.users(id) on delete
    set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);
-- Enable RLS
alter table canned_responses enable row level security;
-- Create policies
create policy "Users can view canned responses in their organization" on canned_responses for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
create policy "Agents and admins can manage canned responses" on canned_responses for all to authenticated using (
    exists (
        select 1
        from profiles
        where id = auth.uid()
            and organization_id = canned_responses.organization_id
            and role in ('agent', 'admin')
    )
);
-- Create function to search canned responses
create or replace function search_canned_responses(
        search_query text default null,
        org_id uuid default null
    ) returns table (
        id uuid,
        name text,
        content text,
        shortcut text,
        category text,
        created_at timestamptz,
        updated_at timestamptz,
        search_rank float
    ) as $$ begin return query
select cr.id,
    cr.name,
    cr.content,
    cr.shortcut,
    cr.category,
    cr.created_at,
    cr.updated_at,
    case
        when search_query is not null then ts_rank(
            to_tsvector(
                'english',
                cr.name || ' ' || cr.content || ' ' || coalesce(cr.shortcut, '') || ' ' || coalesce(cr.category, '')
            ),
            websearch_to_tsquery('english', search_query)
        )
        else 0
    end as search_rank
from canned_responses cr
where (
        org_id is null
        or cr.organization_id = org_id
    )
    and (
        search_query is null
        or to_tsvector(
            'english',
            cr.name || ' ' || cr.content || ' ' || coalesce(cr.shortcut, '') || ' ' || coalesce(cr.category, '')
        ) @@ websearch_to_tsquery('english', search_query)
    )
order by case
        when search_query is not null then search_rank
        else 0
    end desc,
    cr.name asc;
end;
$$ language plpgsql security definer;