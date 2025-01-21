-- Create teams table
create table public.teams (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    organization_id uuid references public.organizations(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- Create team_members table
create table public.team_members (
    id uuid primary key default uuid_generate_v4(),
    team_id uuid references public.teams(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(team_id, user_id)
);
-- Create RLS policies
alter table teams enable row level security;
alter table team_members enable row level security;
-- Policies for teams
create policy "Users can view teams in their organization" on teams for
select to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
        )
    );
create policy "Admins can create teams" on teams for
insert to authenticated with check (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
                and role = 'admin'
        )
    );
create policy "Admins can update teams" on teams for
update to authenticated using (
        organization_id in (
            select organization_id
            from profiles
            where id = auth.uid()
                and role = 'admin'
        )
    );
create policy "Admins can delete teams" on teams for delete to authenticated using (
    organization_id in (
        select organization_id
        from profiles
        where id = auth.uid()
            and role = 'admin'
    )
);
-- Policies for team_members
create policy "Users can view team members in their organization" on team_members for
select to authenticated using (
        team_id in (
            select id
            from teams
            where organization_id in (
                    select organization_id
                    from profiles
                    where id = auth.uid()
                )
        )
    );
create policy "Admins can manage team members" on team_members for all to authenticated using (
    team_id in (
        select id
        from teams
        where organization_id in (
                select organization_id
                from profiles
                where id = auth.uid()
                    and role = 'admin'
            )
    )
);