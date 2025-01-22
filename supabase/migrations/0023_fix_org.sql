-- Drop the complicated policy
DROP POLICY "Allow organization creation during signup" ON organizations;
-- Keep the simple "Anyone can create organizations" policy which has WITH CHECK (true)