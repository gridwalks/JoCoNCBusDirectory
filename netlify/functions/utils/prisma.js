import { PrismaClient } from '@prisma/client'

// The Prisma schema uses env("NETLIFY_DATABASE_URL")
// Prisma Client will automatically read from NETLIFY_DATABASE_URL at runtime
// However, we also set DATABASE_URL as a fallback for compatibility
if (process.env.NETLIFY_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL
}

// Verify that we have a database URL
const hasDbUrl = !!(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL)
if (!hasDbUrl) {
  console.error('ERROR: NETLIFY_DATABASE_URL environment variable is not set!')
  console.error('Please set NETLIFY_DATABASE_URL in your Netlify environment variables.')
  // Only log available env vars in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')))
  }
}

// Create Prisma client instance
// Note: In serverless, each function invocation may get a new instance
// but we use a singleton pattern to reuse connections within the same invocation
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export default prisma

