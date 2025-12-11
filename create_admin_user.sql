-- Create Admin User Script
-- Run this AFTER running setup_database.sql
-- This creates an admin user with password: admin123

-- First, generate the bcrypt hash for 'admin123' using Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(console.log)"
-- Then replace the hash below with the output

-- Example hash (replace with your generated hash):
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- Insert admin user
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES 
    (
        'admin-' || gen_random_uuid()::text,
        'admin',
        'admin@jocobusiness.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Replace with your generated hash
        'admin',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("username") DO UPDATE 
SET 
    "password" = EXCLUDED."password",
    "role" = 'admin',
    "updatedAt" = CURRENT_TIMESTAMP;

-- Verify admin user was created
SELECT "id", "username", "email", "role", "createdAt" FROM "User" WHERE "username" = 'admin';

