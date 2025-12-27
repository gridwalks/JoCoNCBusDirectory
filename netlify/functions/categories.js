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
    const categories = await prisma.category.findMany({
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
      body: JSON.stringify(categories),
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch categories' }),
    }
  } finally {
    await prisma.$disconnect()
  }
}


