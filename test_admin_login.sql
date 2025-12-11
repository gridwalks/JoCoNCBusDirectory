-- Test Admin User Setup
-- Run this in Neon SQL Editor to verify admin user is set up correctly

-- 1. Check if User table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') 
        THEN '✓ User table exists'
        ELSE '✗ User table does NOT exist - run setup_database.sql first!'
    END as table_status;

-- 2. Check if admin user exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM "User" WHERE "username" = 'admin')
        THEN '✓ Admin user exists'
        ELSE '✗ Admin user does NOT exist - run fix_admin_user.sql!'
    END as user_status;

-- 3. Show admin user details
SELECT 
    "id",
    "username",
    "email",
    "role",
    CASE 
        WHEN LENGTH("password") = 60 THEN '✓ Password hash length correct (60 chars)'
        ELSE '✗ Password hash length incorrect: ' || LENGTH("password") || ' (should be 60)'
    END as password_status,
    LEFT("password", 7) as hash_prefix,
    "createdAt"
FROM "User" 
WHERE "username" = 'admin';

-- 4. Count total users
SELECT COUNT(*) as total_users FROM "User";

-- 5. List all users (for debugging)
SELECT "username", "email", "role", "createdAt" 
FROM "User" 
ORDER BY "createdAt" DESC;

