-- Enable RLS on services table
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Allow public read access for all services (for public services page)
CREATE POLICY "Enable read access for all users" ON public.services
FOR SELECT USING (true);

-- Allow authenticated users to manage services (for admin panel)
CREATE POLICY "Enable all access for authenticated users" ON public.services
FOR ALL USING (auth.role() = 'authenticated');
