import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const handler = async (event, context) => {
  // Simple auth check - you might want to add proper authentication
  const authHeader = event.headers.authorization
  const expectedToken = process.env.MIGRATION_TOKEN || 'change-this-token'
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  try {
    // Set DATABASE_URL for Prisma
    process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL
    
    // Run migrations using Prisma CLI
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.NETLIFY_DATABASE_URL,
      },
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Migrations completed',
        output: stdout,
        errors: stderr || null,
      }),
    }
  } catch (error) {
    console.error('Migration error:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        output: error.stdout?.toString() || error.toString(),
        stderr: error.stderr?.toString(),
      }),
    }
  }
}

