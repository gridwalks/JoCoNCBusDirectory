import { PrismaClient } from '@prisma/client'

// Set DATABASE_URL from NETLIFY_DATABASE_URL if not already set
if (!process.env.DATABASE_URL && process.env.NETLIFY_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL
}

// Create a singleton Prisma client instance
let prisma

if (!prisma) {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export default prisma

