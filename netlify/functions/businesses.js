import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch businesses' }),
    }
  } finally {
    await prisma.$disconnect()
  }
}

