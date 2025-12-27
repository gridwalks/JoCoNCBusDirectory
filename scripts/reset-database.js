#!/usr/bin/env node

/**
 * Script to reset the Neon database:
 * 1. Drop all existing tables
 * 2. Recreate tables using Prisma migrations
 * 3. Seed the database with initial data
 * 
 * Usage:
 *   node scripts/reset-database.js
 * 
 * Or with environment variable:
 *   NETLIFY_DATABASE_URL="your-connection-string" node scripts/reset-database.js
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Get database URL from environment
const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL

if (!dbUrl) {
  console.error('❌ ERROR: NETLIFY_DATABASE_URL or DATABASE_URL environment variable is not set!')
  console.error('')
  console.error('Please set it before running this script:')
  console.error('  Windows PowerShell: $env:NETLIFY_DATABASE_URL="your-connection-string"')
  console.error('  Mac/Linux: export NETLIFY_DATABASE_URL="your-connection-string"')
  console.error('')
  process.exit(1)
}

// Set DATABASE_URL for Prisma (Prisma schema uses NETLIFY_DATABASE_URL, but migrations use DATABASE_URL)
process.env.DATABASE_URL = dbUrl

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
})

async function dropAllTables() {
  console.log('🗑️  Dropping all existing tables...')
  
  try {
    // Get all table names from the public schema
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `
    
    if (tables.length === 0) {
      console.log('   No tables found to drop.')
      return
    }
    
    console.log(`   Found ${tables.length} table(s) to drop:`)
    tables.forEach(table => {
      console.log(`   - ${table.tablename}`)
    })
    
    // Disable foreign key checks temporarily
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;')
    
    // Drop all tables
    for (const table of tables) {
      const tableName = table.tablename
      console.log(`   Dropping table: ${tableName}`)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`)
    }
    
    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;')
    
    console.log('✅ All tables dropped successfully!')
  } catch (error) {
    console.error('❌ Error dropping tables:', error.message)
    throw error
  }
}

async function runMigrations() {
  console.log('')
  console.log('🔄 Running Prisma migrations...')
  
  try {
    // First, try to run migrations if they exist
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
        },
      })
      
      if (stdout) {
        console.log(stdout)
      }
      if (stderr && !stderr.includes('warning') && !stderr.includes('No migrations found')) {
        console.error('⚠️  Warnings:', stderr)
      }
      
      console.log('✅ Migrations completed successfully!')
    } catch (migrateError) {
      // If no migrations exist, use db push instead
      if (migrateError.message.includes('No migrations found') || 
          migrateError.message.includes('migration') && migrateError.message.includes('not found')) {
        console.log('   No migration files found. Using prisma db push instead...')
        console.log('')
        
        const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
          env: {
            ...process.env,
            DATABASE_URL: dbUrl,
          },
        })
        
        if (stdout) {
          console.log(stdout)
        }
        if (stderr && !stderr.includes('warning')) {
          console.error('⚠️  Warnings:', stderr)
        }
        
        console.log('✅ Database schema pushed successfully!')
        console.log('')
        console.log('💡 Tip: Consider creating migrations for production:')
        console.log('   npx prisma migrate dev --name init')
      } else {
        throw migrateError
      }
    }
  } catch (error) {
    console.error('❌ Error running migrations:', error.message)
    throw error
  }
}

async function seedDatabase() {
  console.log('')
  console.log('🌱 Seeding database...')
  
  try {
    // Import and run the seed script
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const { stdout, stderr } = await execAsync('node prisma/seed.js', {
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        NETLIFY_DATABASE_URL: dbUrl,
      },
    })
    
    if (stdout) {
      console.log(stdout)
    }
    if (stderr) {
      console.error('⚠️  Warnings:', stderr)
    }
    
    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error.message)
    throw error
  }
}

async function listTables() {
  console.log('')
  console.log('📋 Listing all tables in the database...')
  
  try {
    const tables = await prisma.$queryRaw`
      SELECT 
        tablename,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    
    if (tables.length === 0) {
      console.log('   No tables found.')
      return
    }
    
    console.log(`   Found ${tables.length} table(s):`)
    console.log('')
    
    for (const table of tables) {
      console.log(`   📊 ${table.tablename} (${table.column_count} columns)`)
      
      // Get column details
      const columns = await prisma.$queryRawUnsafe(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = '${table.tablename}'
        ORDER BY ordinal_position
      `)
      
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'nullable' : 'required'
        const defaultVal = col.column_default ? ` (default: ${col.column_default})` : ''
        console.log(`      - ${col.column_name}: ${col.data_type} (${nullable})${defaultVal}`)
      })
      console.log('')
    }
    
    // Get row counts for each table
    console.log('   Row counts:')
    for (const table of tables) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table.tablename}"`)
        console.log(`      - ${table.tablename}: ${count[0].count} rows`)
      } catch (error) {
        console.log(`      - ${table.tablename}: (unable to count)`)
      }
    }
    
    console.log('')
    console.log('✅ Table listing complete!')
  } catch (error) {
    console.error('❌ Error listing tables:', error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting database reset process...')
  console.log('')
  console.log('⚠️  WARNING: This will DELETE ALL DATA in your database!')
  console.log('   Database URL:', dbUrl.substring(0, 30) + '...')
  console.log('')
  
  // Small delay to let user see the warning
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  try {
    // Step 1: Drop all tables
    await dropAllTables()
    
    // Step 2: Run migrations to recreate tables
    await runMigrations()
    
    // Step 3: Seed the database
    await seedDatabase()
    
    // Step 4: List all tables
    await listTables()
    
    console.log('')
    console.log('🎉 Database reset completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Verify your site is working: https://joconcbusdir.netlify.app')
    console.log('  2. Test admin login (username: admin, password: admin123)')
    console.log('')
    
  } catch (error) {
    console.error('')
    console.error('❌ Database reset failed!')
    console.error('Error:', error.message)
    console.error('')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()

