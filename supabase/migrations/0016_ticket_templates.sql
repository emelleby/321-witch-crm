-- Create ticket templates table
create table public.ticket_templates (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    subject text not null,
    content text not null,
    priority text not null check (priority in ('low', 'normal', 'high')),
    category_ids uuid [] default array []::uuid [],
    tag_ids uuid [] default array []::uuid [],
    created_by uuid references auth.users(id) on delete
    set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
);
-- Enable RLS
alter table ticket_templates enable row level security;
-- Create policies
create policy "Users can view templates in their organization" on ticket_templates for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
create policy "Agents and admins can manage templates" on ticket_templates for all to authenticated using (
    exists (
        select 1
        from profiles
        where id = auth.uid()
            and organization_id = ticket_templates.organization_id
            and role in ('agent', 'admin')
    )
);
-- Function to create a ticket from a template
create or replace function create_ticket_from_template(
        template_id uuid,
        creator_id uuid default auth.uid(),
        assigned_to uuid default null,
        custom_subject text default null,
        custom_content text default null
    ) returns uuid as $$
declare template record;
new_ticket_id uuid;
begin -- Get template
select * into template
from ticket_templates
where id = template_id;
if not found then raise exception 'Template not found';
end if;
-- Create ticket
insert into tickets (
        subject,
        description,
        status,
        priority,
        creator_id,
        assigned_to,
        organization_id
    )
values (
        coalesce(custom_subject, template.subject),
        coalesce(custom_content, template.content),
        'open',
        template.priority,
        creator_id,
        assigned_to,
        template.organization_id
    )
returning id into new_ticket_id;
-- Assign categories
if array_length(template.category_ids, 1) > 0 then
insert into ticket_category_assignments (ticket_id, category_id)
select new_ticket_id,
    unnest(template.category_ids);
end if;
-- Assign tags
if array_length(template.tag_ids, 1) > 0 then
insert into ticket_tag_assignments (ticket_id, tag_id)
select new_ticket_id,
    unnest(template.tag_ids);
end if;
return new_ticket_id;
end;
$$ language plpgsql security definer;