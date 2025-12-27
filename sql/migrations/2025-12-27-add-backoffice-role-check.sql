-- Update users_role_check constraint to allow 'BackOffice' role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('Admin', 'Commercial', 'BackOffice'));
