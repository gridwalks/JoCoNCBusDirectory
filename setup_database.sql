-- Johnston County Business Directory Database Setup
-- Run this script in your Neon SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Category table
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Business table
CREATE TABLE IF NOT EXISTS "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Smithfield',
    "state" TEXT NOT NULL DEFAULT 'NC',
    "zip" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "categoryId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "logo" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Business_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Review table
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create ContactSubmission table
CREATE TABLE IF NOT EXISTS "ContactSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactSubmission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Review_businessId_idx" ON "Review"("businessId");
CREATE INDEX IF NOT EXISTS "ContactSubmission_businessId_idx" ON "ContactSubmission"("businessId");

-- Insert default categories
INSERT INTO "Category" ("id", "name", "description", "icon", "createdAt", "updatedAt")
VALUES 
    ('cat-restaurant', 'Restaurants', 'Dining establishments', '🍽️', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-retail', 'Retail', 'Retail stores and shops', '🛍️', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-services', 'Services', 'Professional services', '🔧', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-healthcare', 'Healthcare', 'Healthcare providers', '🏥', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Create admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt (10 rounds)
-- This is a valid bcrypt hash for password: admin123
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
    )
ON CONFLICT ("username") DO UPDATE 
SET 
    "password" = EXCLUDED."password",
    "role" = 'admin',
    "updatedAt" = CURRENT_TIMESTAMP;

-- Insert sample businesses
INSERT INTO "Business" (
    "id", "name", "description", "address", "city", "state", "zip", 
    "phone", "email", "website", "categoryId", "latitude", "longitude",
    "createdAt", "updatedAt"
)
VALUES 
    (
        'biz-' || gen_random_uuid()::text,
        'Smithfield BBQ',
        'Authentic North Carolina barbecue restaurant',
        '123 Main Street',
        'Smithfield',
        'NC',
        '27577',
        '(919) 555-0100',
        'info@smithfieldbbq.com',
        'https://smithfieldbbq.com',
        'cat-restaurant',
        35.5073,
        -78.3394,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'biz-' || gen_random_uuid()::text,
        'Johnston County Hardware',
        'Full-service hardware store',
        '456 Commerce Drive',
        'Smithfield',
        'NC',
        '27577',
        '(919) 555-0200',
        'info@jchardware.com',
        NULL,
        'cat-retail',
        35.5100,
        -78.3400,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT DO NOTHING;

-- Verify tables were created
SELECT 'Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

