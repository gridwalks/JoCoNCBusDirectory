import prisma from './utils/prisma.js'

export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
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
    
    // Check if it's a database connection error
    const isConnectionError = error.code === 'P1001' || 
                              error.code === 'P1000' || 
                              error.message?.includes('connection') ||
                              error.message?.includes('connect')
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch businesses',
        message: error.message,
        code: error.code,
        isConnectionError,
        // Only include detailed error in development
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }),
    }
  } finally {
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      console.error('Error disconnecting Prisma:', disconnectError)
    }
  }
}

