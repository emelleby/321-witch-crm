-- Create SLA configuration tables
create table public.sla_policies (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    priority text not null,
    first_response_time interval not null,
    resolution_time interval not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- Add SLA fields to tickets table
alter table public.tickets
add column priority text not null default 'normal',
    add column sla_policy_id uuid references public.sla_policies(id),
    add column first_response_breach_at timestamptz,
    add column resolution_breach_at timestamptz;
-- Create SLA breach notifications table
create table public.sla_notifications (
    id uuid primary key default uuid_generate_v4(),
    ticket_id uuid references public.tickets(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    type text not null check (type in ('first_response', 'resolution')),
    breach_time timestamptz not null,
    notified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- Function to calculate SLA breach times
create or replace function calculate_sla_breach_times() returns trigger as $$
declare policy record;
begin -- Only calculate breach times if SLA policy is set
if NEW.sla_policy_id is not null then
select * into policy
from sla_policies
where id = NEW.sla_policy_id;
-- Calculate breach times based on policy
NEW.first_response_breach_at := NEW.created_at + policy.first_response_time;
NEW.resolution_breach_at := NEW.created_at + policy.resolution_time;
-- Create notification records
insert into sla_notifications (
        ticket_id,
        organization_id,
        type,
        breach_time
    )
values (
        NEW.id,
        NEW.organization_id,
        'first_response',
        NEW.first_response_breach_at
    ),
    (
        NEW.id,
        NEW.organization_id,
        'resolution',
        NEW.resolution_breach_at
    );
end if;
return NEW;
end;
$$ language plpgsql security definer;
-- Trigger for SLA calculations
create trigger trg_calculate_sla_breach_times before
insert
    or
update of sla_policy_id on tickets for each row execute function calculate_sla_breach_times();
-- Function to check for SLA breaches
create or replace function check_sla_breaches() returns void as $$
declare breach record;
begin -- Check for first response breaches
for breach in
select t.id as ticket_id,
    t.organization_id,
    'first_response' as type,
    tm.first_response_time is null as is_breached
from tickets t
    left join ticket_metrics tm on t.id = tm.ticket_id
where t.status != 'closed'
    and t.first_response_breach_at <= now()
    and not exists (
        select 1
        from sla_notifications
        where ticket_id = t.id
            and type = 'first_response'
            and notified_at is not null
    ) loop if breach.is_breached then -- Update notification record
update sla_notifications
set notified_at = now()
where ticket_id = breach.ticket_id
    and type = breach.type
    and notified_at is null;
-- Here you would typically trigger a notification
-- This will be handled by the application layer
end if;
end loop;
-- Check for resolution breaches
for breach in
select t.id as ticket_id,
    t.organization_id,
    'resolution' as type,
    t.status != 'closed' as is_breached
from tickets t
where t.status != 'closed'
    and t.resolution_breach_at <= now()
    and not exists (
        select 1
        from sla_notifications
        where ticket_id = t.id
            and type = 'resolution'
            and notified_at is not null
    ) loop if breach.is_breached then -- Update notification record
update sla_notifications
set notified_at = now()
where ticket_id = breach.ticket_id
    and type = breach.type
    and notified_at is null;
-- Here you would typically trigger a notification
-- This will be handled by the application layer
end if;
end loop;
end;
$$ language plpgsql security definer;
-- Create RLS policies
alter table sla_policies enable row level security;
alter table sla_notifications enable row level security;
-- Policies for SLA policies
create policy "Users can view SLA policies in their organization" on sla_policies for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
create policy "Admins can manage SLA policies" on sla_policies for all to authenticated using (
    organization_id in (
        select organization_id
        from profiles
        where id = auth.uid()
            and role = 'admin'
    )
);
-- Policies for SLA notifications
create policy "Users can view SLA notifications in their organization" on sla_notifications for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
-- Add default SLA policies
insert into public.sla_policies (
        organization_id,
        name,
        description,
        priority,
        first_response_time,
        resolution_time
    )
select id as organization_id,
    'Urgent' as name,
    'Critical business impact' as description,
    'urgent' as priority,
    interval '1 hour' as first_response_time,
    interval '4 hours' as resolution_time
from organizations
union all
select id as organization_id,
    'High' as name,
    'Major functionality affected' as description,
    'high' as priority,
    interval '4 hours' as first_response_time,
    interval '8 hours' as resolution_time
from organizations
union all
select id as organization_id,
    'Normal' as name,
    'Minor functionality affected' as description,
    'normal' as priority,
    interval '8 hours' as first_response_time,
    interval '24 hours' as resolution_time
from organizations
union all
select id as organization_id,
    'Low' as name,
    'Minimal impact' as description,
    'low' as priority,
    interval '24 hours' as first_response_time,
    interval '72 hours' as resolution_time
from organizations;