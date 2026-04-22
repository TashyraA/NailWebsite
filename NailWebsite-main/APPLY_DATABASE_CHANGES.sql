-- Run this SQL directly in your Supabase dashboard SQL editor
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor

-- Add balance payment tracking fields to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS balance_payment_method VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS balance_stripe_session_id VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_balance_paid_at ON public.appointments (balance_paid_at);
CREATE INDEX IF NOT EXISTS idx_appointments_balance_session_id ON public.appointments (balance_stripe_session_id);

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
ALTER TABLE public.time_slots DROP CONSTRAINT IF EXISTS unique_time_slot;
ALTER TABLE public.time_slots ADD CONSTRAINT unique_time_slot UNIQUE (time);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_slots_enabled ON public.time_slots (enabled);
CREATE INDEX IF NOT EXISTS idx_time_slots_time ON public.time_slots (time);

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.time_slots;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.time_slots;

-- Create policies for time_slots table
-- Allow read access to all users (for booking page)
CREATE POLICY "Enable read access for all users" ON public.time_slots
FOR SELECT USING (true);

-- Allow full access for authenticated users (for admin panel)
CREATE POLICY "Enable all access for authenticated users" ON public.time_slots
FOR ALL USING (true);

-- Add a computed column to check if balance is fully paid
CREATE OR REPLACE FUNCTION is_balance_paid(appointment_row appointments) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN appointment_row.balance_due = 0 OR appointment_row.balance_paid_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;