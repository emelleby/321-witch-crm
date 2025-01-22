-- Allow agents and admins to create organizations
CREATE POLICY "Agents and admins can create organizations" ON "public"."organizations" FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role IN ('agent', 'admin')
        )
    );
-- Enable RLS on organizations table if not already enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;