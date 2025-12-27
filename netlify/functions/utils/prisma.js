import { PrismaClient } from '@prisma/client'

// Ensure DATABASE_URL is set from NETLIFY_DATABASE_URL if needed
// Prisma schema uses env("NETLIFY_DATABASE_URL"), but Prisma Client also checks DATABASE_URL
if (process.env.NETLIFY_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL
}

// Get the database URL
const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL

if (!dbUrl) {
  console.error('ERROR: NETLIFY_DATABASE_URL environment variable is not set!')
  console.error('Please set NETLIFY_DATABASE_URL in your Netlify environment variables.')
  console.error('This will cause database connection errors.')
}

// Create Prisma client
// Prisma will read NETLIFY_DATABASE_URL from the schema, but we also set it explicitly
// in datasources to ensure it's used correctly
const prismaConfig = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
}

// Only set datasource URL if we have one (prevents errors during module load)
if (dbUrl) {
  prismaConfig.datasources = {
    db: {
      url: dbUrl,
    },
  }
}

const prisma = new PrismaClient(prismaConfig)

export default prisma

