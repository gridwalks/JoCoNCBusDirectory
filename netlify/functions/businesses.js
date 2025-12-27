import prisma from './utils/prisma.js'

export const handler = async (event, context) => {
  // Wrap everything in try-catch to catch initialization errors
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
        body: '',
      }
    }

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Method not allowed' }),
      }
    }

    // Check if database URL is configured
    if (!process.env.NETLIFY_DATABASE_URL && !process.env.DATABASE_URL) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Database configuration error',
          message: 'NETLIFY_DATABASE_URL environment variable is not set. Please configure it in Netlify environment variables.',
        }),
      }
    }

    try {
      const { category, search } = event.queryStringParameters || {}
    
    const where = {}
    
    if (category) {
      const categoryIds = category.split(',')
      where.categoryId = { in: categoryIds }
    }
    
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
      
      if (where.categoryId) {
        // Combine category filter with search
        where.AND = [
          { categoryId: where.categoryId },
          { OR: searchConditions },
        ]
        delete where.categoryId
      } else {
        where.OR = searchConditions
      }
    }

    const businesses = await prisma.business.findMany({
      where,
      include: {
        category: true,
        reviews: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(businesses),
    }
    } catch (error) {
    console.error('Error fetching businesses:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Check if it's a database connection error
    const isConnectionError = error.code === 'P1001' || 
                              error.code === 'P1000' ||
                              error.code === 'P1017' ||
                              error.message?.toLowerCase().includes('connection') ||
                              error.message?.toLowerCase().includes('connect') ||
                              error.message?.toLowerCase().includes('timeout')
    
    // Determine user-friendly error message
    let userMessage = error.message || 'Unknown error occurred'
    if (error.code === 'P1001') {
      userMessage = 'Cannot reach database server. Please check your database connection string and ensure the database is running.'
    } else if (error.code === 'P1000') {
      userMessage = 'Database authentication failed. Please check your database credentials.'
    } else if (error.code === 'P1017') {
      userMessage = 'Database connection was closed. Please try again.'
    } else if (error.code === 'P2022') {
      // Column doesn't exist - schema mismatch
      userMessage = 'Database schema is out of sync. The database tables do not match the expected schema. Please run database migrations: npm run prisma:migrate:deploy'
    } else if (error.message?.includes('does not exist')) {
      userMessage = 'Database tables or columns do not exist. Please run database migrations: npm run prisma:migrate:deploy'
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch businesses',
        message: userMessage,
        code: error.code,
        isConnectionError,
        // Include original error message for debugging
        originalMessage: error.message,
        // Only include detailed error in development
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error.stack,
          fullError: error.toString()
        })
      }),
    }
    } finally {
      try {
        await prisma.$disconnect()
      } catch (disconnectError) {
        console.error('Error disconnecting Prisma:', disconnectError)
      }
    }
  } catch (outerError) {
    // Catch any errors during initialization or handler setup
    console.error('Handler initialization error:', outerError)
    console.error('Error stack:', outerError.stack)
    console.error('Error name:', outerError.name)
    console.error('Error message:', outerError.message)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Function initialization error',
        message: outerError.message || 'Unknown error occurred',
        type: outerError.name || 'Error',
        // Include stack in development
        ...(process.env.NODE_ENV === 'development' && { 
          stack: outerError.stack 
        })
      }),
    }
  }
}

