-- =========================================================================
-- 🚀 ADMIN VENDOR ONBOARDING: Access Token → Store Auto-Link
-- =========================================================================
-- Adds store_id column to access_tokens so that when an admin generates
-- an onboarding token for a pre-provisioned store, the vendor claiming
-- the token gets automatically inserted into store_users as OWNER.

-- 1. Add store_id column to access_tokens (nullable, for backward compat)
ALTER TABLE public.access_tokens 
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.access_tokens.store_id IS 
  'If set, claiming this token auto-links the user as OWNER of this store.';

-- 2. Update claim_access_token to also create store_users record if store_id is set
CREATE OR REPLACE FUNCTION public.claim_access_token(p_token text)
RETURNS boolean AS $$
DECLARE
    v_valid boolean;
    v_store_id UUID;
BEGIN
    -- Check if token is valid and not used
    SELECT EXISTS (
        SELECT 1 FROM public.access_tokens 
        WHERE UPPER(token) = UPPER(p_token) AND is_used = FALSE
    ) INTO v_valid;

    -- Also capture the store_id if attached
    SELECT store_id INTO v_store_id
    FROM public.access_tokens 
    WHERE UPPER(token) = UPPER(p_token) AND is_used = FALSE
    LIMIT 1;

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

        -- If this token was linked to a store, auto-assign the claimer as OWNER
        IF v_store_id IS NOT NULL THEN
            INSERT INTO public.store_users (store_id, user_id, role, created_at, updated_at)
            VALUES (v_store_id, auth.uid(), 'OWNER', now(), now())
            ON CONFLICT (store_id, user_id) DO UPDATE
              SET role = 'OWNER', updated_at = now();
        END IF;

        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Grant super-admin full access to access_tokens table
DROP POLICY IF EXISTS "Super admin access on access_tokens" ON public.access_tokens;
CREATE POLICY "Super admin access on access_tokens" ON public.access_tokens 
    FOR ALL TO authenticated 
    USING (public.user_is_super_admin()) 
    WITH CHECK (public.user_is_super_admin());
