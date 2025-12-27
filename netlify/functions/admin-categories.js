import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function verifyToken(event) {
  const authHeader = event.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
  } catch (error) {
    return null
  }
}

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    }
  }

  const user = verifyToken(event)
  if (!user || user.role !== 'admin') {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  try {
    if (event.httpMethod === 'GET') {
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
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      
      // Generate a unique ID if not provided
      const id = body.id || `cat-${randomBytes(8).toString('hex')}`
      
      const category = await prisma.category.create({
        data: {
          id,
          name: body.name,
          description: body.description || null,
          icon: body.icon || null,
        },
      })

      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(category),
      }
    }

    if (event.httpMethod === 'PUT') {
      const { id } = event.queryStringParameters || {}
      if (!id) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Category ID is required' }),
        }
      }

      const body = JSON.parse(event.body || '{}')
      const category = await prisma.category.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description,
          icon: body.icon,
        },
      })

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(category),
      }
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {}
      if (!id) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Category ID is required' }),
        }
      }

      await prisma.category.delete({
        where: { id },
      })

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Category deleted successfully' }),
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Error in admin categories:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  } finally {
    await prisma.$disconnect()
  }
}


