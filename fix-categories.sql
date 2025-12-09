-- Fix categories table and insert default categories
-- Run this in Railway PostgreSQL Query tab

-- Step 1: Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Insert default categories
INSERT INTO categories (name, description) VALUES
('Oracle Fusion - Access Issue', 'Login and access problems with Oracle Fusion'),
('Oracle Fusion - PR/PO', 'Purchase Request and Purchase Order issues'),
('Finance / Invoice', 'Financial and invoicing related issues'),
('Network / VPN', 'Network connectivity and VPN problems'),
('Teams / Communication', 'Microsoft Teams and communication issues'),
('Training Needed', 'Users requiring training or guidance'),
('General IT', 'General IT support requests')
ON CONFLICT (name) DO NOTHING;

-- Step 3: Verify categories were inserted
SELECT id, name, description FROM categories ORDER BY id;
