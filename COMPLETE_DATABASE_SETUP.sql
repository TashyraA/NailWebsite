-- Run this SQL directly in your Supabase dashboard SQL editor
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor

-- Drop the tables if they exist (to start fresh)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS blocked_dates CASCADE;
DROP TABLE IF EXISTS blocked_times CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;

-- Create appointments table with correct column names and balance payment tracking
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposit_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  balance_paid_at TIMESTAMP WITH TIME ZONE,
  balance_payment_method VARCHAR(50) DEFAULT 'stripe',
  balance_stripe_session_id VARCHAR(255),
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

-- Create blocked_dates table
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blocked_times table
CREATE TABLE blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_date_time UNIQUE (date, time)
);

-- Create time_slots table for managing available appointment times
CREATE TABLE time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  time VARCHAR(5) NOT NULL, -- Format: HH:MM (e.g., '09:00', '14:30')
  enabled BOOLEAN DEFAULT true,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_time_slot UNIQUE (time)
);

-- Create indexes for appointments
CREATE INDEX idx_appointments_email ON appointments(customer_email);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_balance_paid_at ON appointments(balance_paid_at);
CREATE INDEX idx_appointments_balance_session_id ON appointments(balance_stripe_session_id);

-- Create indexes for blocked tables
CREATE INDEX idx_blocked_dates_date ON blocked_dates(date);
CREATE INDEX idx_blocked_times_date ON blocked_times(date);
CREATE INDEX idx_blocked_times_time ON blocked_times(time);
CREATE INDEX idx_blocked_times_date_time ON blocked_times(date, time);

-- Create indexes for time_slots
CREATE INDEX idx_time_slots_enabled ON time_slots(enabled);
CREATE INDEX idx_time_slots_time ON time_slots(time);

-- Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at
  BEFORE UPDATE ON time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing (you can restrict later)
CREATE POLICY "Allow all operations" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON blocked_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON blocked_times FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON time_slots FOR ALL USING (true) WITH CHECK (true);

-- Insert default time slots
INSERT INTO time_slots (time, enabled, duration_minutes) VALUES
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
('17:00', true, 60);

-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('appointments', 'blocked_dates', 'blocked_times', 'time_slots');

SELECT 'Database setup complete!' as status;