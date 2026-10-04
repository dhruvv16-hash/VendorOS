-- Migration: Supabase Authentication Sync & Access Token Control
-- Date: 2026-05-30

-- 1. Create Access Tokens Table
CREATE TABLE IF NOT EXISTS public.access_tokens (
    token TEXT PRIMARY KEY,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_to_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at TIMESTAMPTZ
);

-- Enable RLS on access_tokens (no public policies, read/write only via SECURITY DEFINER functions)
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Modify Users Table to link Access Token
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS access_token_used TEXT REFERENCES public.access_tokens(token);

-- 3. Verify Access Token RPC Function (returns if token exists and is not used)
CREATE OR REPLACE FUNCTION public.verify_access_token(p_token text)
RETURNS boolean AS $$
DECLARE
    v_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.access_tokens 
        WHERE UPPER(token) = UPPER(p_token) AND is_used = FALSE
    ) INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Claim Access Token RPC Function (binds to authenticated user and marks as used)
CREATE OR REPLACE FUNCTION public.claim_access_token(p_token text)
RETURNS boolean AS $$
DECLARE
    v_valid boolean;
BEGIN
    -- Check if token is valid and not used
    SELECT EXISTS (
        SELECT 1 FROM public.access_tokens 
        WHERE UPPER(token) = UPPER(p_token) AND is_used = FALSE
    ) INTO v_valid;

    IF v_valid THEN
        -- Mark token as used
        UPDATE public.access_tokens 
        SET is_used = TRUE, 
            used_at = now(), 
            assigned_to_email = COALESCE(
                (SELECT email FROM auth.users WHERE id = auth.uid()),
                'oauth_user'
            )
        WHERE UPPER(token) = UPPER(p_token);

        -- Ensure user profile exists in public.users before setting the token
        INSERT INTO public.users (id, name, email, created_at, updated_at)
        VALUES (
            auth.uid(),
            COALESCE(
                (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = auth.uid()),
                split_part((SELECT email FROM auth.users WHERE id = auth.uid()), '@', 1),
                'Staff User'
            ),
            COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), 'oauth_user@example.com'),
            now(),
            now()
        )
        ON CONFLICT (id) DO NOTHING;

        -- Update user's access token claim in public profile
        UPDATE public.users 
        SET access_token_used = UPPER(p_token),
            updated_at = now()
        WHERE id = auth.uid();

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. User Sync Trigger Function (automatic public.users profile creation on auth sign up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, phone, created_at, updated_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        new.phone,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Pre-seed Testing Tokens
INSERT INTO public.access_tokens (token, is_used)
VALUES 
    ('TEST-TOKEN-123', FALSE),
    ('VENDOR-PRO-999', FALSE)
ON CONFLICT (token) DO NOTHING;
