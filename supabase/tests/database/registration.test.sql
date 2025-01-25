BEGIN;

-- Plan the tests
SELECT
    plan (13);

-- Basic schema + 6 registration tests
-- Schema Requirements
SELECT
    has_table (
        'public',
        'user_profiles',
        'should have a user_profiles table to store user information'
    );

SELECT
    has_table (
        'public',
        'organizations',
        'should have an organizations table to store company information'
    );

-- Profile Requirements
SELECT
    col_not_null (
        'public',
        'user_profiles',
        'display_name',
        'user_profiles should require a display name'
    );

SELECT
    col_not_null (
        'public',
        'user_profiles',
        'user_role',
        'user_profiles should have a required role'
    );

-- Organization Requirements
SELECT
    col_not_null (
        'public',
        'organizations',
        'domain',
        'organizations must have a domain'
    );

-- Test: Customer Registration (no organization needed)
SELECT
    lives_ok (
        $$ WITH new_user AS (
            INSERT INTO auth.users (id, email)
            VALUES (gen_random_uuid(), 'customer@test.com')
            RETURNING id
        )
        INSERT INTO public.user_profiles (id, display_name, user_role)
        SELECT id,
            'Test Customer',
            'customer'
        FROM new_user;
$$,
        'customers should be able to register without an organization'
    );

-- Test: Organization Domain Uniqueness
SELECT
    throws_ok (
        $$
        INSERT INTO public.organizations (id, name, domain)
        VALUES (gen_random_uuid(), 'Org 1', 'example.com'),
            (gen_random_uuid(), 'Org 2', 'example.com');
$$,
        '23505',
        'duplicate key value violates unique constraint "organizations_domain_unique"',
        'organizations should not be able to share the same domain'
    );

-- Test: Agent Registration with New Organization
SELECT
    lives_ok (
        $$ WITH new_org AS (
            INSERT INTO public.organizations (id, name, domain)
            VALUES (gen_random_uuid(), 'New Org', 'neworg.com')
            RETURNING id
        ),
        new_user AS (
            INSERT INTO auth.users (id, email)
            VALUES (gen_random_uuid(), 'admin@neworg.com')
            RETURNING id
        )
        INSERT INTO public.user_profiles (id, display_name, user_role, organization_id)
        SELECT new_user.id,
            'Test Admin',
            'admin',
            new_org.id
        FROM new_user,
            new_org;
$$,
        'agents should be able to create and join a new organization as admin'
    );

-- Test: Agent Email Domain Must Match Organization
SELECT
    throws_ok (
        $$ WITH new_org AS (
            INSERT INTO public.organizations (id, name, domain)
            VALUES (gen_random_uuid(), 'Domain Test', 'company.com')
            RETURNING id
        ),
        new_user AS (
            INSERT INTO auth.users (id, email)
            VALUES (gen_random_uuid(), 'agent@different.com')
            RETURNING id
        )
        INSERT INTO public.user_profiles (id, display_name, user_role, organization_id)
        SELECT new_user.id,
            'Test Agent',
            'agent',
            new_org.id
        FROM new_user,
            new_org;
$$,
        'P0001',
        'Agent email domain must match organization domain',
        'agent email domain must match organization domain'
    );

-- Test: Only Valid Roles Allowed
SELECT
    throws_ok (
        $$ WITH new_user AS (
            INSERT INTO auth.users (id, email)
            VALUES (gen_random_uuid(), 'test@example.com')
            RETURNING id
        )
        INSERT INTO public.user_profiles (id, display_name, user_role)
        SELECT id,
            'Test User',
            'invalid_role'
        FROM new_user;
$$,
        '22P02',
        'invalid input value for enum user_role: "invalid_role"',
        'should only allow valid roles (customer, agent, admin)'
    );

-- Test: Agent Registration with Existing Organization
SELECT
    lives_ok (
        $$ WITH existing_org AS (
            INSERT INTO public.organizations (id, name, domain)
            VALUES (
                    gen_random_uuid(),
                    'Existing Org',
                    'existingorg.com'
                )
            RETURNING id
        ),
        first_user AS (
            INSERT INTO auth.users (id, email)
            VALUES (gen_random_uuid(), 'admin@existingorg.com')
            RETURNING id
        ),
        first_profile AS (
            INSERT INTO public.user_profiles (id, display_name, user_role, organization_id)
            SELECT first_user.id,
                'First Admin',
                'admin',
                existing_org.id
            FROM first_user,
                existing_org
            RETURNING organization_id
        ),
        second_user AS (
            INSERT INTO auth.users (id, email)
            VALUES (gen_random_uuid(), 'agent@existingorg.com')
            RETURNING id
        )
        INSERT INTO public.user_profiles (id, display_name, user_role, organization_id)
        SELECT second_user.id,
            'Second Agent',
            'agent',
            first_profile.organization_id
        FROM second_user,
            first_profile;
$$,
        'should allow additional agents to join an existing organization'
    );

-- Test: Organization Name Required
SELECT
    col_not_null (
        'public',
        'organizations',
        'name',
        'organizations must have a name'
    );

-- Test: RLS Policy for Profile Access
SELECT
    lives_ok (
        $$ -- Create test organization
        WITH test_org AS (
            INSERT INTO public.organizations (id, name, domain)
            VALUES (
                    '22222222-2222-2222-2222-222222222222',
                    'Test Org',
                    'testorg.com'
                )
            RETURNING id
        ),
        -- Create test user
        test_user AS (
            INSERT INTO auth.users (id, email)
            VALUES (
                    '11111111-1111-1111-1111-111111111111',
                    'agent@testorg.com'
                )
            RETURNING id
        ) -- Create test profile
        INSERT INTO public.user_profiles (id, display_name, user_role, organization_id)
        SELECT test_user.id,
            'Test User',
            'agent',
            test_org.id
        FROM test_user,
            test_org;
$$,
        'should allow agent profile creation with organization'
    );

-- Clean up
SELECT
    *
FROM
    finish ();

ROLLBACK;