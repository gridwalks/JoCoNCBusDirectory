-- Fix Admin User Script
-- Run this if you're getting 401 errors on login
-- This ensures the admin user exists with the correct password hash

-- Delete any existing admin users (cleanup)
DELETE FROM "User" WHERE "username" = 'admin';

-- Create admin user with correct password hash for 'admin123'
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES 
    (
        'admin-' || gen_random_uuid()::text,
        'admin',
        'admin@jocobusiness.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'admin',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Verify the user was created
SELECT 
    "id", 
    "username", 
    "email", 
    "role",
    CASE 
        WHEN LENGTH("password") = 60 THEN 'Password hash looks correct (60 chars)'
        ELSE 'WARNING: Password hash length is ' || LENGTH("password") || ' (should be 60)'
    END as password_status,
    "createdAt"
FROM "User" 
WHERE "username" = 'admin';

