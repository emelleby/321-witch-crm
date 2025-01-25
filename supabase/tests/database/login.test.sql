begin;
-- Plan the tests
select plan(5);
-- Schema Requirements
select has_table(
        'auth',
        'users',
        'should have an auth.users table for authentication'
    );
select has_table(
        'public',
        'profiles',
        'should have a profiles table linked to auth.users'
    );
-- Test: Basic User Login Validation
SELECT lives_ok(
        $$ WITH new_user AS (
            INSERT INTO auth.users (
                    id,
                    email,
                    encrypted_password,
                    email_confirmed_at
                )
            VALUES (
                    gen_random_uuid(),
                    'test@example.com',
                    crypt('password123', gen_salt('bf')),
                    NOW()
                )
            RETURNING id
        )
        INSERT INTO public.profiles (id, full_name, role)
        SELECT id,
            'Test User',
            'customer'
        FROM new_user;
$$,
'should be able to create a user with valid credentials'
);
-- Test: Email Confirmation Required
SELECT throws_ok(
        $$
        INSERT INTO auth.users (
                id,
                email,
                encrypted_password,
                email_confirmed_at,
                last_sign_in_at
            )
        VALUES (
                gen_random_uuid(),
                'unconfirmed@example.com',
                crypt('password123', gen_salt('bf')),
                NULL,
                NOW()
            );
$$,
'23514',
'new row for relation "users" violates check constraint "users_email_confirmed_at_check"',
'should not allow login without email confirmation'
);
-- Test: Password Requirements
SELECT throws_ok(
        $$
        INSERT INTO auth.users (id, email, encrypted_password)
        VALUES (
                gen_random_uuid(),
                'weak@example.com',
                'short_hash' -- This is shorter than 59 characters
            );
$$,
'23514',
'new row for relation "users" violates check constraint "users_encrypted_password_check"',
'should enforce password requirements'
);
-- Clean up
SELECT *
FROM finish();
rollback;