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
    const { q } = event.queryStringParameters || {}
    
    if (!q) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Search query is required' }),
      }
    }

    const businesses = await prisma.business.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
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
    console.error('Error searching businesses:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to search businesses' }),
    }
  } finally {
    await prisma.$disconnect()
  }
}


