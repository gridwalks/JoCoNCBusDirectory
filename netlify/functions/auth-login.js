import prisma from './utils/prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}')

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Username and password are required' }),
      }
    }

    console.log('Login attempt for username:', username)

    const user = await prisma.user.findUnique({
      where: { username },
    })

    console.log('User found:', user ? { id: user.id, username: user.username, role: user.role } : 'NOT FOUND')

    if (!user) {
      console.log('User not found in database')
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid credentials - user not found' }),
      }
    }

    if (user.role !== 'admin') {
      console.log('User found but role is not admin:', user.role)
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid credentials - not an admin user' }),
      }
    }

    console.log('Password comparison starting...')
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isValidPassword)

    if (!isValidPassword) {
      console.log('Password does not match')
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid credentials - password incorrect' }),
      }
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ token }),
    }
  } catch (error) {
    console.error('Error during login:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    }
  } finally {
    await prisma.$disconnect()
  }
}

