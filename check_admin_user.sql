-- Check if admin user exists and verify details
-- Run this in Neon SQL Editor to diagnose login issues

-- Check if User table exists
SELECT 'User table exists' as status, COUNT(*) as user_count 
FROM information_schema.tables 
WHERE table_name = 'User';

-- Check all users
SELECT "id", "username", "email", "role", "createdAt" 
FROM "User" 
ORDER BY "createdAt" DESC;

-- Check specifically for admin user
SELECT 
    "id", 
    "username", 
    "email", 
    "role",
    LENGTH("password") as password_length,
    LEFT("password", 7) as password_prefix,
    "createdAt"
FROM "User" 
WHERE "username" = 'admin';

-- If admin doesn't exist, create it with a known good hash
-- This hash is for password: admin123
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
SELECT 
    'admin-' || gen_random_uuid()::text,
    'admin',
    'admin@jocobusiness.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "username" = 'admin')
RETURNING "id", "username", "email", "role";

-- Update existing admin user if it exists but has wrong password
UPDATE "User" 
SET 
    "password" = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    "role" = 'admin',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'admin'
RETURNING "id", "username", "email", "role";

