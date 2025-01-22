drop publication if exists supabase_realtime;
create publication supabase_realtime for all tables;
-- Enable realtime for future tables
alter default privileges in schema public
grant select on tables to postgres,
    anon,
    authenticated;