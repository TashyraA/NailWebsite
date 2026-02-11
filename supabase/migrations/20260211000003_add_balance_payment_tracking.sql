-- Add balance payment tracking fields to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS balance_payment_method VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS balance_stripe_session_id VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_balance_paid_at ON public.appointments (balance_paid_at);
CREATE INDEX IF NOT EXISTS idx_appointments_balance_session_id ON public.appointments (balance_stripe_session_id);

-- Add a computed column to check if balance is fully paid
-- This will be true if balance_due is 0 or if balance_paid_at is not null
CREATE OR REPLACE FUNCTION is_balance_paid(appointment_row appointments) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN appointment_row.balance_due = 0 OR appointment_row.balance_paid_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;