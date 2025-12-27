// Import polyfills FIRST before any other imports to ensure File global is available
import './utils/polyfills.js'

import prisma from './utils/prisma.js'
import jwt from 'jsonwebtoken'
import Groq from 'groq-sdk'
import * as cheerio from 'cheerio'
// Use native fetch (available in Node 18+) instead of node-fetch to avoid undici compatibility issues
// Lazy load Chromium and Puppeteer only when needed
// import chromium from '@sparticuz/chromium'
// import puppeteer from 'puppeteer-core'
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
    // Lazy load Chromium and Puppeteer only when needed
    let browser = null
    try {
      console.log('Initializing Puppeteer for:', fullUrl)
      
      // Dynamically import Chromium and Puppeteer
      let chromium, puppeteer
      try {
        const chromiumModule = await import('@sparticuz/chromium')
        chromium = chromiumModule.default || chromiumModule
        const puppeteerModule = await import('puppeteer-core')
        puppeteer = puppeteerModule.default || puppeteerModule
        console.log('Chromium and Puppeteer modules loaded')
      } catch (importError) {
        console.error('Failed to import Chromium/Puppeteer:', importError)
        throw new Error(`Failed to load browser dependencies: ${importError.message}`)
      }
      
      // Get Chromium executable path with timeout
      let executablePath
      try {
        executablePath = await Promise.race([
          chromium.executablePath(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Chromium executable path timeout')), 10000)
          )
        ])
        console.log('Chromium executable path obtained')
      } catch (chromiumError) {
        console.error('Failed to get Chromium executable path:', chromiumError)
        throw new Error(`Chromium initialization failed: ${chromiumError.message}`)
      }
      
      console.log('Launching browser...')
      browser = await Promise.race([
        puppeteer.launch({
          args: chromium.args,
          executablePath: executablePath,
          headless: chromium.headless,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Browser launch timeout')), 15000)
        )
      ])
      
      console.log('Browser launched, creating page...')
      const page = await browser.newPage()
      
      console.log('Navigating to URL...')
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 15000 })
      
      console.log('Extracting HTML...')
      const html = await page.content()
      
      console.log('Closing browser...')
      await browser.close()
      browser = null
      
      return html
    } catch (error) {
      console.error('Puppeteer error:', error)
      if (browser) {
        try {
          await browser.close()
        } catch (closeError) {
          console.error('Error closing browser:', closeError)
        }
      }
      // If Puppeteer fails, try to fall back to fetch (won't work for JS pages, but better than nothing)
      console.warn('Puppeteer failed, attempting fallback to fetch:', error.message)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
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
      } catch (fallbackError) {
        throw new Error(`Failed to fetch with Puppeteer: ${error.message}. Fallback also failed: ${fallbackError.message}`)
      }
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
  
  const prompt = `Extract all Johnston County businesses from this directory page. Return ONLY a valid JSON array, no explanatory text.

Required format: [{"name": "", "address": "", "phone": "", "website": "", "email": "", "description": ""}]

Rules:
- Only include businesses with valid names and addresses
- If a field is not available, use an empty string
- Return ONLY the JSON array, no other text
- If no businesses are found, return an empty array: []

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
    
    // Try to extract JSON from the response
    // Groq may include explanatory text before/after the JSON
    let jsonText = responseText.trim()
    
    // First, try to find JSON in markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*(\[[\s\S]*?\])\s*```/g
    const codeBlockMatch = codeBlockRegex.exec(jsonText)
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonText = codeBlockMatch[1].trim()
    } else {
      // If no code block, try to find JSON array directly
      // Look for array pattern: starts with [ and ends with ]
      const arrayStart = jsonText.indexOf('[')
      const arrayEnd = jsonText.lastIndexOf(']')
      
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        jsonText = jsonText.substring(arrayStart, arrayEnd + 1)
      } else {
        // Last resort: try parsing the whole thing
        jsonText = jsonText.trim()
      }
    }
    
    // Parse JSON
    let businesses
    try {
      businesses = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Response text:', responseText.substring(0, 500))
      console.error('Extracted JSON text:', jsonText.substring(0, 500))
      
      // Try one more time: look for any JSON-like structure
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          businesses = JSON.parse(jsonMatch[0])
          console.log('Successfully parsed JSON after second attempt')
        } catch (secondParseError) {
          throw new Error(`Failed to parse JSON from Groq response: ${parseError.message}. Extracted text: ${jsonText.substring(0, 200)}`)
        }
      } else {
        throw new Error(`Failed to parse JSON from Groq response: ${parseError.message}. Response: ${responseText.substring(0, 200)}`)
      }
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
  // Log function start for debugging
  console.log('=== scrape-directories handler started ===')
  console.log('Method:', event.httpMethod)
  console.log('Has body:', !!event.body)
  
  // Catch any errors during handler initialization
  let startTime
  try {
    startTime = Date.now()
  } catch (initError) {
    console.error('Error initializing handler:', initError)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Handler initialization error',
        message: initError.message || 'Unknown initialization error',
      }),
    }
  }

  // Netlify functions timeout is 60 seconds, but we'll use 55 seconds as a safety margin
  const MAX_EXECUTION_TIME = 55000 // 55 seconds in milliseconds
  const TIME_BUFFER = 5000 // 5 seconds buffer before timeout

  try {
    console.log('Handler started, method:', event.httpMethod)
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
      console.log('Parsing request body...')
      let body
      try {
        body = JSON.parse(event.body || '{}')
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Invalid JSON in request body', message: parseError.message }),
        }
      }

      const { urls, categoryId } = body
      console.log('URLs received:', urls?.length || 0)

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
      console.log('Getting category...')
      let defaultCategoryId = categoryId
      if (!defaultCategoryId) {
        try {
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
          console.log('Using default category:', defaultCategoryId)
        } catch (dbError) {
          console.error('Database error getting category:', dbError)
          return {
            statusCode: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Database error', message: dbError.message }),
          }
        }
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
          let html
          try {
            html = await fetchHtml(url)
            console.log(`Successfully fetched HTML for ${url}, length: ${html?.length || 0}`)
          } catch (fetchError) {
            console.error(`Failed to fetch HTML for ${url}:`, fetchError)
            throw fetchError
          }
          
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
          console.log(`Extracting businesses with Groq for ${url}...`)
          let businesses
          try {
            businesses = await extractBusinessesWithGroq(html, url)
            console.log(`Extracted ${businesses.length} businesses from ${url}`)
          } catch (groqError) {
            console.error(`Groq extraction failed for ${url}:`, groqError)
            throw groqError
          }
          
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
    console.error('=== Handler outer error ===')
    console.error('Error type:', outerError?.constructor?.name)
    console.error('Error message:', outerError?.message)
    console.error('Error stack:', outerError?.stack)
    console.error('Full error:', JSON.stringify(outerError, Object.getOwnPropertyNames(outerError)))
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Function initialization error',
        message: outerError?.message || 'Unknown error occurred',
        type: outerError?.constructor?.name || 'Unknown',
      }),
    }
  } finally {
    console.log('=== scrape-directories handler finished ===')
  }
}

