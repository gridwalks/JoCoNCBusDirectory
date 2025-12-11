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
    const { id } = event.queryStringParameters || {}
    
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Business ID is required' }),
      }
    }

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!business) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Business not found' }),
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(business),
    }
  } catch (error) {
    console.error('Error fetching business:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch business' }),
    }
  } finally {
    await prisma.$disconnect()
  }
}

