import prisma from './utils/prisma.js'

/**
 * Diagnostic endpoint to test database connection
 * Access at: /.netlify/functions/test-db
 */
export const handler = async (event, context) => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      hasNetlifyDbUrl: !!process.env.NETLIFY_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    prisma: {
      initialized: false,
      error: null,
    },
    database: {
      connected: false,
      error: null,
      tableCount: null,
    },
  }

  // Check environment variables
  if (process.env.NETLIFY_DATABASE_URL) {
    results.environment.dbUrlPreview = process.env.NETLIFY_DATABASE_URL.substring(0, 30) + '...'
  }

  // Test Prisma client initialization
  try {
    results.prisma.initialized = !!prisma
  } catch (error) {
    results.prisma.error = error.message
    results.prisma.initialized = false
  }

  // Test database connection
  if (results.prisma.initialized) {
    try {
      // Try a simple query to test connection - check if we can query the database
      // First try to count businesses (if table exists)
      try {
        const businessCount = await prisma.business.count()
        results.database.connected = true
        results.database.businessCount = businessCount
        results.database.tablesExist = true
      } catch (tableError) {
        // If business table doesn't exist, try a raw query to check connection
        if (tableError.code === 'P2021' || tableError.message?.includes('does not exist')) {
          results.database.connected = true // Connection works, but tables don't exist
          results.database.tablesExist = false
          results.database.error = 'Database connected but tables do not exist. Please run migrations.'
        } else {
          throw tableError // Re-throw if it's a different error
        }
      }
    } catch (error) {
      results.database.error = {
        message: error.message,
        code: error.code,
        name: error.name,
      }
      results.database.connected = false
    } finally {
      try {
        await prisma.$disconnect()
      } catch (disconnectError) {
        console.error('Error disconnecting:', disconnectError)
      }
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(results, null, 2),
  }
}

