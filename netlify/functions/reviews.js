import prisma from './utils/prisma.js'
import { z } from 'zod'

const reviewSchema = z.object({
  businessId: z.string(),
  userName: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const { businessId } = event.queryStringParameters || {}
      
      if (!businessId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Business ID is required' }),
        }
      }

      const reviews = await prisma.review.findMany({
        where: { businessId },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(reviews),
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch reviews' }),
      }
    } finally {
      await prisma.$disconnect()
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}')
      const validatedData = reviewSchema.parse(body)

      const review = await prisma.review.create({
        data: validatedData,
      })

      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(review),
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Invalid input', details: error.errors }),
        }
      }
      console.error('Error creating review:', error)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to create review' }),
      }
    } finally {
      await prisma.$disconnect()
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  }
}


