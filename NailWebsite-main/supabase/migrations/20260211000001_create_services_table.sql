-- Create services table for proper service management
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    deposit DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60, -- in minutes
    category TEXT NOT NULL,
    images JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default services if table is empty
INSERT INTO services (title, description, price, deposit, duration, category, images, is_active)
SELECT 
    'Gel Manicure',
    'Long-lasting gel polish manicure with cuticle care',
    35.00,
    15.00,
    60,
    'Manicure',
    '["https://via.placeholder.com/300x200"]'::jsonb,
    true
WHERE NOT EXISTS (SELECT 1 FROM services LIMIT 1);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_price ON services(price);