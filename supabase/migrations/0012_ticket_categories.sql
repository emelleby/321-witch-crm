-- Create ticket categories table
create table public.ticket_categories (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    color text not null default '#94a3b8',
    parent_id uuid references public.ticket_categories(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(organization_id, name)
);
-- Create ticket tags table
create table public.ticket_tags (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    color text not null default '#94a3b8',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(organization_id, name)
);
-- Create junction table for tickets and categories
create table public.ticket_category_assignments (
    ticket_id uuid references public.tickets(id) on delete cascade,
    category_id uuid references public.ticket_categories(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (ticket_id, category_id)
);
-- Create junction table for tickets and tags
create table public.ticket_tag_assignments (
    ticket_id uuid references public.tickets(id) on delete cascade,
    tag_id uuid references public.ticket_tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (ticket_id, tag_id)
);
-- Enable RLS
alter table ticket_categories enable row level security;
alter table ticket_tags enable row level security;
alter table ticket_category_assignments enable row level security;
alter table ticket_tag_assignments enable row level security;
-- Policies for ticket categories
create policy "Users can view categories in their organization" on ticket_categories for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
create policy "Admins can manage categories" on ticket_categories for all to authenticated using (
    organization_id in (
        select organization_id
        from profiles
        where id = auth.uid()
            and role = 'admin'
    )
);
-- Policies for ticket tags
create policy "Users can view tags in their organization" on ticket_tags for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
create policy "Admins can manage tags" on ticket_tags for all to authenticated using (
    organization_id in (
        select organization_id
        from profiles
        where id = auth.uid()
            and role = 'admin'
    )
);
-- Policies for category assignments
create policy "Users can view category assignments in their organization" on ticket_category_assignments for
select to authenticated using (
        ticket_id in (
            select t.id
            from tickets t
            where t.organization_id in (
                    select organization_id
                    from profiles
                    where id = auth.uid()
                )
        )
    );
create policy "Agents and admins can manage category assignments" on ticket_category_assignments for all to authenticated using (
    exists (
        select 1
        from tickets t
            join profiles p on p.organization_id = t.organization_id
        where t.id = ticket_id
            and p.id = auth.uid()
            and p.role in ('admin', 'agent')
    )
);
-- Policies for tag assignments
create policy "Users can view tag assignments in their organization" on ticket_tag_assignments for
select to authenticated using (
        ticket_id in (
            select t.id
            from tickets t
            where t.organization_id in (
                    select organization_id
                    from profiles
                    where id = auth.uid()
                )
        )
    );
create policy "Agents and admins can manage tag assignments" on ticket_tag_assignments for all to authenticated using (
    exists (
        select 1
        from tickets t
            join profiles p on p.organization_id = t.organization_id
        where t.id = ticket_id
            and p.id = auth.uid()
            and p.role in ('admin', 'agent')
    )
);
-- Add default categories
insert into public.ticket_categories (organization_id, name, description, color)
select id as organization_id,
    'General' as name,
    'General inquiries and requests' as description,
    '#94a3b8' as color
from organizations;
insert into public.ticket_categories (organization_id, name, description, color)
select id as organization_id,
    'Technical Support' as name,
    'Technical issues and troubleshooting' as description,
    '#3b82f6' as color
from organizations;
insert into public.ticket_categories (organization_id, name, description, color)
select id as organization_id,
    'Billing' as name,
    'Billing and payment related inquiries' as description,
    '#22c55e' as color
from organizations;
-- Add default tags
insert into public.ticket_tags (organization_id, name, description, color)
select id as organization_id,
    'Bug' as name,
    'Software bugs and defects' as description,
    '#ef4444' as color
from organizations;
insert into public.ticket_tags (organization_id, name, description, color)
select id as organization_id,
    'Feature Request' as name,
    'New feature suggestions' as description,
    '#8b5cf6' as color
from organizations;
insert into public.ticket_tags (organization_id, name, description, color)
select id as organization_id,
    'Urgent' as name,
    'Requires immediate attention' as description,
    '#f97316' as color
from organizations;