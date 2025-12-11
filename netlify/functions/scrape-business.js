import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { geocodeAddress, parseAddress } from './utils/geocode.js'
import { checkDuplicate } from './utils/duplicate-check.js'
import { scrapeGoogleBusiness, isGoogleUrl } from './utils/scrapers/google.js'
import { scrapeYelpBusiness, isYelpUrl } from './utils/scrapers/yelp.js'
import { scrapeGeneralWebsite } from './utils/scrapers/general.js'

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

function detectSource(url) {
  if (isGoogleUrl(url)) return 'google'
  if (isYelpUrl(url)) return 'yelp'
  return 'general'
}

async function scrapeBusinessData(url, source) {
  const detectedSource = source || detectSource(url)
  
  switch (detectedSource) {
    case 'google':
      return await scrapeGoogleBusiness(url)
    case 'yelp':
      return await scrapeYelpBusiness(url)
    case 'general':
      return await scrapeGeneralWebsite(url)
    default:
      throw new Error(`Unknown source: ${detectedSource}`)
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  // Verify admin authentication
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
    const body = JSON.parse(event.body || '{}')
    const { url, source, categoryId, saveToDatabase = false } = body

    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'URL is required' }),
      }
    }

    // Validate URL format
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid URL format' }),
      }
    }

    // Scrape business data
    const scrapedData = await scrapeBusinessData(url, source)

    // Parse address into components
    const addressParts = parseAddress(scrapedData.address)
    
    // Geocode address
    let coordinates = null
    if (scrapedData.address) {
      coordinates = await geocodeAddress(scrapedData.address)
    }

    // Check for duplicates (pass prisma instance to avoid connection issues)
    const duplicate = await checkDuplicate({
      name: scrapedData.name,
      address: scrapedData.address,
      website: scrapedData.website,
      phone: scrapedData.phone
    }, prisma)

    // Prepare business data
    const businessData = {
      name: scrapedData.name,
      description: scrapedData.description || '',
      address: addressParts.address || scrapedData.address || '',
      city: addressParts.city || 'Smithfield',
      state: addressParts.state || 'NC',
      zip: addressParts.zip || '',
      phone: scrapedData.phone || null,
      email: scrapedData.email || null,
      website: scrapedData.website || null,
      categoryId: categoryId || null,
      latitude: coordinates?.latitude || null,
      longitude: coordinates?.longitude || null,
      images: scrapedData.images || []
    }

    // If saveToDatabase is true and no duplicate found, save to database
    let savedBusiness = null
    if (saveToDatabase && !duplicate) {
      // Validate required fields
      if (!businessData.name || !businessData.address) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            error: 'Missing required fields: name and address are required',
            scrapedData: businessData,
            duplicate
          }),
        }
      }

      // Get default category if none provided
      if (!businessData.categoryId) {
        const defaultCategory = await prisma.category.findFirst({
          orderBy: { name: 'asc' }
        })
        if (defaultCategory) {
          businessData.categoryId = defaultCategory.id
        } else {
          return {
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ 
              error: 'No category provided and no default category found',
              scrapedData: businessData
            }),
          }
        }
      }

      // Create business
      savedBusiness = await prisma.business.create({
        data: businessData,
        include: {
          category: true
        }
      })
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        scrapedData: businessData,
        duplicate: duplicate ? {
          match: duplicate.match,
          business: duplicate.business
        } : null,
        savedBusiness,
        source: source || detectSource(url),
        geocoded: coordinates !== null
      }),
    }
  } catch (error) {
    console.error('Scraping error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Failed to scrape business',
        message: error.message 
      }),
    }
  } finally {
    await prisma.$disconnect()
  }
}

