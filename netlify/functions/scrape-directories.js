import prisma from './utils/prisma.js'
import jwt from 'jsonwebtoken'
import Groq from 'groq-sdk'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { geocodeAddress, parseAddress } from './utils/geocode.js'
import { checkDuplicate } from './utils/duplicate-check.js'

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

/**
 * Determine if URL needs Puppeteer (dynamic/JS) or can use Cheerio (static)
 */
function needsPuppeteer(url) {
  const dynamicPatterns = [
    /sosnc\.gov/i,
    /javascript/i,
    /\.aspx/i,
    /\.php\?/i
  ]
  return dynamicPatterns.some(pattern => pattern.test(url))
}

/**
 * Fetch HTML content from URL
 */
async function fetchHtml(url) {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`
  
  if (needsPuppeteer(fullUrl)) {
    // Use Puppeteer for dynamic/JS-rendered pages
    let browser = null
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
      
      const page = await browser.newPage()
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 20000 })
      const html = await page.content()
      await browser.close()
      browser = null
      return html
    } catch (error) {
      if (browser) {
        try {
          await browser.close()
        } catch (closeError) {
          console.error('Error closing browser:', closeError)
        }
      }
      throw new Error(`Failed to fetch with Puppeteer: ${error.message}`)
    }
  } else {
    // Use Cheerio for static pages
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.text()
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out while fetching the page')
      }
      throw fetchError
    }
  }
}

/**
 * Extract businesses using Groq AI
 */
async function extractBusinessesWithGroq(html, url) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set')
  }

  let client
  try {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  } catch (error) {
    throw new Error(`Failed to initialize Groq client: ${error.message}`)
  }
  
  // Load HTML and extract text content
  const $ = cheerio.load(html)
  const bodyText = $('body').text()
  
  // Truncate to ~8000 characters to stay within token limits
  const truncatedContent = bodyText.substring(0, 8000)
  
  const prompt = `Extract all Johnston County businesses from this directory page as a JSON array. 
Format: [{"name": "", "address": "", "phone": "", "website": "", "email": "", "description": ""}]
Only include businesses with valid names and addresses. 
If a field is not available, use an empty string.
Raw HTML content: ${truncatedContent}`

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Invalid response from Groq API')
    }

    const responseText = completion.choices[0].message.content
    
    if (!responseText) {
      throw new Error('Empty response from Groq API')
    }
    
    // Try to extract JSON from the response (might be wrapped in markdown code blocks)
    let jsonText = responseText.trim()
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n')
      jsonText = lines.slice(1, -1).join('\n').replace(/^json\n/, '')
    }
    
    // Parse JSON
    let businesses
    try {
      businesses = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Response text:', jsonText.substring(0, 500))
      throw new Error(`Failed to parse JSON from Groq response: ${parseError.message}`)
    }
    
    if (!Array.isArray(businesses)) {
      throw new Error('Groq response is not an array')
    }
    
    // Add source URL to each business
    return businesses.map(b => ({
      ...b,
      source: url
    }))
  } catch (error) {
    console.error('Groq extraction error:', error)
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      throw new Error(`Groq API request timed out: ${error.message}`)
    }
    throw new Error(`Failed to extract businesses with Groq: ${error.message}`)
  }
}

/**
 * Process and save a single business
 */
async function processBusiness(businessData, defaultCategoryId, url) {
  const results = {
    saved: false,
    duplicate: false,
    error: null,
    business: null
  }
  
  try {
    // Validate required fields
    if (!businessData.name || !businessData.address) {
      results.error = 'Missing required fields: name and address'
      return results
    }
    
    // Check for duplicates
    const duplicate = await checkDuplicate({
      name: businessData.name,
      address: businessData.address,
      website: businessData.website || null,
      phone: businessData.phone || null
    }, prisma)
    
    if (duplicate) {
      results.duplicate = true
      return results
    }
    
    // Parse address
    const addressParts = parseAddress(businessData.address)
    
    // Geocode address
    let coordinates = null
    if (businessData.address) {
      coordinates = await geocodeAddress(businessData.address)
    }
    
    // Prepare business data
    const businessToSave = {
      name: businessData.name.trim(),
      description: (businessData.description || '').trim().substring(0, 1000),
      address: addressParts.address || businessData.address || '',
      city: addressParts.city || 'Smithfield',
      state: addressParts.state || 'NC',
      zip: addressParts.zip || '',
      phone: businessData.phone?.trim() || null,
      email: businessData.email?.trim() || null,
      website: businessData.website?.trim() || null,
      categoryId: defaultCategoryId,
      latitude: coordinates?.latitude || null,
      longitude: coordinates?.longitude || null,
      images: [],
      source: businessData.source || url || 'directory'
    }
    
    // Save to database
    const savedBusiness = await prisma.business.create({
      data: businessToSave,
      include: {
        category: true
      }
    })
    
    results.saved = true
    results.business = savedBusiness
    return results
  } catch (error) {
    console.error('Error processing business:', error)
    results.error = error.message
    return results
  }
}

export const handler = async (event, context) => {
  const startTime = Date.now()
  // Netlify functions timeout is 60 seconds, but we'll use 55 seconds as a safety margin
  const MAX_EXECUTION_TIME = 55000 // 55 seconds in milliseconds
  const TIME_BUFFER = 5000 // 5 seconds buffer before timeout

  try {
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
      const { urls, categoryId } = body

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'URLs array is required' }),
        }
      }

      // Get default category if not provided
      let defaultCategoryId = categoryId
      if (!defaultCategoryId) {
        const defaultCategory = await prisma.category.findFirst({
          orderBy: { name: 'asc' }
        })
        if (!defaultCategory) {
          return {
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'No category provided and no default category found' }),
          }
        }
        defaultCategoryId = defaultCategory.id
      }

      const results = {
        totalUrls: urls.length,
        totalFound: 0,
        totalSaved: 0,
        totalDuplicates: 0,
        totalErrors: 0,
        urlResults: [],
        errors: [],
        partial: false,
        processedUrls: 0
      }

      // Helper function to check if we're running out of time
      const checkTimeRemaining = () => {
        const elapsed = Date.now() - startTime
        return elapsed < (MAX_EXECUTION_TIME - TIME_BUFFER)
      }

      // Process each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        
        // Check if we're running out of time
        if (!checkTimeRemaining()) {
          console.log(`Timeout approaching, stopping after ${i} URLs`)
          results.partial = true
          results.errors.push({
            url: 'Timeout',
            error: `Function timeout approaching. Processed ${i} of ${urls.length} URLs. Please try with fewer URLs or process in batches.`
          })
          break
        }

        const urlResult = {
          url,
          found: 0,
          saved: 0,
          duplicates: 0,
          errors: []
        }

        try {
          console.log(`Processing URL ${i + 1}/${urls.length}: ${url}`)
          
          // Fetch HTML with timeout protection
          const html = await fetchHtml(url)
          
          // Check time again after fetching
          if (!checkTimeRemaining()) {
            console.log(`Timeout after fetching HTML for ${url}`)
            urlResult.errors.push({
              business: 'URL processing',
              error: 'Timeout after fetching HTML'
            })
            results.totalErrors++
            results.urlResults.push(urlResult)
            results.partial = true
            break
          }
          
          // Extract businesses with Groq
          const businesses = await extractBusinessesWithGroq(html, url)
          
          urlResult.found = businesses.length
          results.totalFound += businesses.length

          // Process each business (limit to prevent timeout)
          const maxBusinessesPerUrl = 50 // Limit businesses per URL to prevent timeout
          const businessesToProcess = businesses.slice(0, maxBusinessesPerUrl)
          
          if (businesses.length > maxBusinessesPerUrl) {
            urlResult.errors.push({
              business: 'Processing limit',
              error: `Only processing first ${maxBusinessesPerUrl} of ${businesses.length} businesses to prevent timeout`
            })
          }

          for (const business of businessesToProcess) {
            // Check time before processing each business
            if (!checkTimeRemaining()) {
              console.log(`Timeout while processing businesses for ${url}`)
              results.partial = true
              break
            }

            const processResult = await processBusiness(business, defaultCategoryId, url)
            
            if (processResult.saved) {
              urlResult.saved++
              results.totalSaved++
            } else if (processResult.duplicate) {
              urlResult.duplicates++
              results.totalDuplicates++
            } else if (processResult.error) {
              urlResult.errors.push({
                business: business.name,
                error: processResult.error
              })
              results.totalErrors++
            }
          }

          // Add delay between URLs to avoid rate limiting (only if not last URL and not timing out)
          if (i < urls.length - 1 && checkTimeRemaining()) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } catch (error) {
          console.error(`Error processing URL ${url}:`, error)
          urlResult.errors.push({
            business: 'URL processing',
            error: error.message
          })
          results.totalErrors++
          results.errors.push({
            url,
            error: error.message
          })
        }

        results.urlResults.push(urlResult)
        results.processedUrls = i + 1
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          ...results
        }),
      }
    } catch (error) {
      console.error('Scraping error:', error)
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Failed to scrape directories',
          message: error.message,
        }),
      }
    } finally {
      try {
        await prisma.$disconnect()
      } catch (disconnectError) {
        console.error('Error disconnecting Prisma:', disconnectError)
      }
    }
  } catch (outerError) {
    console.error('Handler initialization error:', outerError)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Function initialization error',
        message: outerError.message || 'Unknown error occurred',
      }),
    }
  }
}

