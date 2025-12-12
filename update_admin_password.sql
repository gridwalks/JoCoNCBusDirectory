-- Quick Fix: Update Admin Password Hash
-- Run this in Neon SQL Editor to fix the password issue
-- This updates the existing admin user with the correct password hash for 'admin123'

UPDATE "User" 
SET 
    "password" = '$2a$10$iwL3PlvgL4Z4.9bc3Yh.keUVkO7/qQ6cp6FSuerUzuM7GUW1Bi8.W',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'admin';

-- Verify the update
SELECT 
    "username",
    "role",
    LENGTH("password") as password_length,
    LEFT("password", 7) as hash_prefix,
    "updatedAt"
FROM "User" 
WHERE "username" = 'admin';

-- Expected result:
-- username: admin
-- role: admin
-- password_length: 60
-- hash_prefix: $2a$10$

