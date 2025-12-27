    -- ============================================================================
    -- Database Reset Script for Neon PostgreSQL
    -- ============================================================================
    -- This script will:
    --   1. Drop all existing tables (CASCADE to handle foreign keys)
    --   2. Create all tables according to Prisma schema
    --   3. Create indexes
    --   4. Seed initial data
    --
    -- Usage:
    --   psql "your-connection-string" -f scripts/reset-database.sql
    --   Or run in Neon SQL Editor
    --
    -- WARNING: This will DELETE ALL DATA in your database!
    -- ============================================================================

    -- Drop all existing tables (CASCADE handles foreign key constraints)
    DROP TABLE IF EXISTS "ContactSubmission" CASCADE;
    DROP TABLE IF EXISTS "Review" CASCADE;
    DROP TABLE IF EXISTS "Business" CASCADE;
    DROP TABLE IF EXISTS "Category" CASCADE;
    DROP TABLE IF EXISTS "User" CASCADE;

    -- Drop any existing sequences
    DROP SEQUENCE IF EXISTS "_prisma_migrations_id_seq" CASCADE;

    -- ============================================================================
    -- Create Tables
    -- ============================================================================

    -- Category table
    CREATE TABLE "Category" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "icon" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
    );

    -- User table
    CREATE TABLE "User" (
        "id" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );

    -- Business table
    CREATE TABLE "Business" (
        "id" TEXT NOT NULL,
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
        "source" TEXT DEFAULT 'manual',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
    );

    -- Review table
    CREATE TABLE "Review" (
        "id" TEXT NOT NULL,
        "businessId" TEXT NOT NULL,
        "userId" TEXT,
        "userName" TEXT,
        "rating" SMALLINT NOT NULL,
        "comment" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
    );

    -- ContactSubmission table
    CREATE TABLE "ContactSubmission" (
        "id" TEXT NOT NULL,
        "businessId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
    );

    -- ============================================================================
    -- Create Foreign Key Constraints
    -- ============================================================================

    ALTER TABLE "Business" ADD CONSTRAINT "Business_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    ALTER TABLE "Review" ADD CONSTRAINT "Review_businessId_fkey" 
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_businessId_fkey" 
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- ============================================================================
    -- Create Unique Constraints
    -- ============================================================================

    CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

    -- ============================================================================
    -- Create Indexes
    -- ============================================================================

    CREATE INDEX "Review_businessId_idx" ON "Review"("businessId");
    CREATE INDEX "ContactSubmission_businessId_idx" ON "ContactSubmission"("businessId");

    -- ============================================================================
    -- Seed Initial Data
    -- ============================================================================

    -- Insert Categories
    INSERT INTO "Category" ("id", "name", "description", "icon", "createdAt", "updatedAt") VALUES
        ('cat-restaurant', 'Restaurants', 'Dining establishments', '🍽️', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('cat-retail', 'Retail', 'Retail stores and shops', '🛍️', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('cat-services', 'Services', 'Professional services', '🔧', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('cat-healthcare', 'Healthcare', 'Healthcare providers', '🏥', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING;

    -- Insert Admin User
    -- Password: admin123 (bcrypt hash)
    -- WARNING: Change this password in production!
    INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt") VALUES
        ('user-admin', 'admin', 'admin@jocobusiness.com', '$2a$10$JBrV5lYhCIVI0VThF4KEzeTC.YriH8z4tq6FtF4GO6vOPaB90iD6m', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("username") DO NOTHING;

    -- Note: Default password is "admin123"
    -- To generate a new password hash, run:
    --   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(console.log)"

    -- Insert Sample Businesses
    INSERT INTO "Business" (
        "id", "name", "description", "address", "city", "state", "zip", 
        "phone", "email", "website", "categoryId", "latitude", "longitude", 
        "source", "createdAt", "updatedAt"
    ) VALUES
        (
            'biz-smithfield-bbq',
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
            'manual',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ),
        (
            'biz-jc-hardware',
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
            'manual',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
    ON CONFLICT ("id") DO NOTHING;

    -- ============================================================================
    -- Verify Tables
    -- ============================================================================

    -- List all tables
    SELECT 
        tablename,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;

    -- Show row counts
    SELECT 'Category' as table_name, COUNT(*) as row_count FROM "Category"
    UNION ALL
    SELECT 'User', COUNT(*) FROM "User"
    UNION ALL
    SELECT 'Business', COUNT(*) FROM "Business"
    UNION ALL
    SELECT 'Review', COUNT(*) FROM "Review"
    UNION ALL
    SELECT 'ContactSubmission', COUNT(*) FROM "ContactSubmission";

    -- ============================================================================
    -- Script Complete
    -- ============================================================================

