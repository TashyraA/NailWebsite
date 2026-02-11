-- Create time_slots table for managing available appointment times
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  time VARCHAR(5) NOT NULL, -- Format: HH:MM (e.g., '09:00', '14:30')
  enabled BOOLEAN DEFAULT true,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique constraint on time to prevent duplicates
ALTER TABLE public.time_slots ADD CONSTRAINT unique_time_slot UNIQUE (time);

-- Add indexes for better performance
CREATE INDEX idx_time_slots_enabled ON public.time_slots (enabled);
CREATE INDEX idx_time_slots_time ON public.time_slots (time);

-- Insert default time slots
INSERT INTO public.time_slots (time, enabled, duration_minutes) VALUES
('09:00', true, 60),
('09:30', true, 60),
('10:00', true, 60),
('10:30', true, 60),
('11:00', true, 60),
('11:30', true, 60),
('12:00', true, 60),
('12:30', true, 60),
('13:00', true, 60),
('13:30', true, 60),
('14:00', true, 60),
('14:30', true, 60),
('15:00', true, 60),
('15:30', true, 60),
('16:00', true, 60),
('16:30', true, 60),
('17:00', true, 60)
ON CONFLICT (time) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

-- Create policies for time_slots table
-- Allow read access to all users (for booking page)
CREATE POLICY "Enable read access for all users" ON public.time_slots
FOR SELECT USING (true);

-- Allow full access for authenticated users (for admin panel)
-- Note: In a production app, you'd want more specific policies for admin access
CREATE POLICY "Enable all access for authenticated users" ON public.time_slots
FOR ALL USING (auth.role() = 'authenticated');