-- Rayspeed Stock Tracker Database Setup
-- Run this in your Supabase SQL Editor

-- Create the tracked_urls table
CREATE TABLE tracked_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    product_name TEXT,
    image_url TEXT,
    stock_status TEXT,
    product_code TEXT,
    beedspeed_code TEXT,
    stock_selector TEXT NOT NULL,
    name_selector TEXT NOT NULL,
    image_selector TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on updated_at for better performance when sorting
CREATE INDEX idx_tracked_urls_updated_at ON tracked_urls(updated_at DESC);

-- Create an index on url for faster lookups
CREATE INDEX idx_tracked_urls_url ON tracked_urls(url);

-- Enable Row Level Security (recommended for production)
ALTER TABLE tracked_urls ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for development)
-- In production, you should create more restrictive policies
CREATE POLICY "Allow all operations" ON tracked_urls FOR ALL USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_tracked_urls_updated_at 
    BEFORE UPDATE ON tracked_urls 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Add some sample data for testing
-- INSERT INTO tracked_urls (url, stock_selector, name_selector, image_selector) VALUES
--     ('https://example.com/product1', '.stock-status', '.product-title', '.product-image img'),
--     ('https://example.com/product2', '#availability', 'h1', '.main-image');

-- Grant necessary permissions (if using custom roles)
-- GRANT ALL ON tracked_urls TO authenticated;
-- GRANT ALL ON tracked_urls TO anon;

-- Add beedspeed_code column to existing databases (run this if you already have the table)
-- ALTER TABLE tracked_urls ADD COLUMN beedspeed_code TEXT; 