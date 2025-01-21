-- Create ticket_metrics table for tracking response times and SLAs
create table public.ticket_metrics (
    id uuid primary key default uuid_generate_v4(),
    ticket_id uuid references public.tickets(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    first_response_time interval,
    resolution_time interval,
    replies_count integer default 0,
    reopens_count integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- Create agent_performance table
create table public.agent_performance (
    id uuid primary key default uuid_generate_v4(),
    agent_id uuid references auth.users(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    date date not null,
    tickets_resolved integer default 0,
    avg_response_time interval,
    avg_resolution_time interval,
    customer_satisfaction_score numeric(3, 2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(agent_id, date)
);
-- Create saved_reports table for custom reports
create table public.saved_reports (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    description text,
    query jsonb not null,
    created_by uuid references auth.users(id) on delete cascade,
    schedule text,
    -- For scheduled reports (daily, weekly, monthly)
    recipients jsonb,
    -- Array of email addresses
    last_run_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- Function to calculate ticket metrics
create or replace function calculate_ticket_metrics() returns trigger as $$
declare first_response interval;
resolution interval;
begin -- Calculate first response time
select min(created_at) - tickets.created_at into first_response
from ticket_messages
where ticket_id = NEW.id
    and created_by in (
        select id
        from profiles
        where organization_id = NEW.organization_id
            and role = 'agent'
    );
-- Calculate resolution time if ticket is closed
if NEW.status = 'closed' then resolution := NEW.updated_at - NEW.created_at;
end if;
-- Insert or update metrics
insert into ticket_metrics (
        ticket_id,
        organization_id,
        first_response_time,
        resolution_time,
        replies_count
    )
values (
        NEW.id,
        NEW.organization_id,
        first_response,
        resolution,
        (
            select count(*)
            from ticket_messages
            where ticket_id = NEW.id
        )
    ) on conflict (ticket_id) do
update
set first_response_time = EXCLUDED.first_response_time,
    resolution_time = EXCLUDED.resolution_time,
    replies_count = EXCLUDED.replies_count,
    updated_at = now();
return NEW;
end;
$$ language plpgsql security definer;
-- Trigger for ticket metrics
create trigger trg_calculate_ticket_metrics
after
insert
    or
update on tickets for each row execute function calculate_ticket_metrics();
-- Function to update agent performance metrics daily
create or replace function update_agent_performance() returns void as $$
declare org record;
agent record;
begin -- Loop through each organization
for org in
select id
from organizations loop -- Loop through each agent in the organization
    for agent in
select id
from profiles
where organization_id = org.id
    and role = 'agent' loop -- Calculate and insert/update daily metrics
insert into agent_performance (
        agent_id,
        organization_id,
        date,
        tickets_resolved,
        avg_response_time,
        avg_resolution_time
    )
select agent.id,
    org.id,
    current_date,
    count(distinct t.id) filter (
        where t.status = 'closed'
    ),
    avg(tm.first_response_time) filter (
        where tm.first_response_time is not null
    ),
    avg(tm.resolution_time) filter (
        where tm.resolution_time is not null
    )
from tickets t
    left join ticket_metrics tm on t.id = tm.ticket_id
where t.organization_id = org.id
    and exists (
        select 1
        from ticket_messages
        where ticket_id = t.id
            and created_by = agent.id
    )
    and t.updated_at >= current_date
    and t.updated_at < current_date + interval '1 day'
group by agent.id,
    org.id,
    current_date on conflict (agent_id, date) do
update
set tickets_resolved = EXCLUDED.tickets_resolved,
    avg_response_time = EXCLUDED.avg_response_time,
    avg_resolution_time = EXCLUDED.avg_resolution_time,
    updated_at = now();
end loop;
end loop;
end;
$$ language plpgsql security definer;
-- Create RLS policies
alter table ticket_metrics enable row level security;
alter table agent_performance enable row level security;
alter table saved_reports enable row level security;
-- Policies for ticket_metrics
create policy "Users can view ticket metrics for their organization" on ticket_metrics for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
-- Policies for agent_performance
create policy "Agents can view their own performance" on agent_performance for
select to authenticated using (
        agent_id = auth.uid()
        or organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
                and role = 'admin'
        )
    );
-- Policies for saved_reports
create policy "Users can view reports for their organization" on saved_reports for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
create policy "Users can create reports for their organization" on saved_reports for
insert to authenticated with check (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
                and role in ('admin', 'agent')
        )
    );
create policy "Users can update their own reports" on saved_reports for
update to authenticated using (
        created_by = auth.uid()
        or organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
                and role = 'admin'
        )
    );