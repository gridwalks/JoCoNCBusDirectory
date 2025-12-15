import { PrismaClient } from '@prisma/client'
import Groq from 'groq-sdk'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { geocodeAddress, parseAddress } from './utils/geocode.js'
import { checkDuplicate } from './utils/duplicate-check.js'

// Schedule: Daily at 2 AM UTC
export const schedule = '0 2 * * *'

const prisma = new PrismaClient()

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
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
    
    try {
      const page = await browser.newPage()
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      const html = await page.content()
      await browser.close()
      return html
    } catch (error) {
      await browser.close()
      throw new Error(`Failed to fetch with Puppeteer: ${error.message}`)
    }
  } else {
    // Use Cheerio for static pages
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)
    
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
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set')
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
      max_tokens: 2000,
    })

    const responseText = completion.choices[0].message.content
    
    // Try to extract JSON from the response (might be wrapped in markdown code blocks)
    let jsonText = responseText.trim()
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n')
      jsonText = lines.slice(1, -1).join('\n').replace(/^json\n/, '')
    }
    
    // Parse JSON
    const businesses = JSON.parse(jsonText)
    
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
      images: []
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
  try {
    // Get URLs from environment variable (comma-separated)
    const urlsEnv = process.env.SCRAPE_DIRECTORIES_URLS
    if (!urlsEnv) {
      console.log('SCRAPE_DIRECTORIES_URLS not set, skipping scheduled scrape')
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No URLs configured for scheduled scraping' }),
      }
    }

    const urls = urlsEnv.split(',').map(url => url.trim()).filter(url => url.length > 0)
    
    if (urls.length === 0) {
      console.log('No valid URLs found in SCRAPE_DIRECTORIES_URLS')
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No valid URLs found' }),
      }
    }

    // Get default category
    const defaultCategory = await prisma.category.findFirst({
      orderBy: { name: 'asc' }
    })
    
    if (!defaultCategory) {
      console.error('No default category found')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No default category found' }),
      }
    }

    const defaultCategoryId = defaultCategory.id

    const results = {
      totalUrls: urls.length,
      totalFound: 0,
      totalSaved: 0,
      totalDuplicates: 0,
      totalErrors: 0,
      urlResults: [],
      errors: [],
      timestamp: new Date().toISOString()
    }

    console.log(`Starting scheduled scrape of ${urls.length} URLs`)

    // Process each URL
    for (const url of urls) {
      const urlResult = {
        url,
        found: 0,
        saved: 0,
        duplicates: 0,
        errors: []
      }

      try {
        console.log(`Processing URL: ${url}`)
        
        // Fetch HTML
        const html = await fetchHtml(url)
        
        // Extract businesses with Groq
        const businesses = await extractBusinessesWithGroq(html, url)
        
        urlResult.found = businesses.length
        results.totalFound += businesses.length

        console.log(`Found ${businesses.length} businesses from ${url}`)

        // Process each business
        for (const business of businesses) {
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

        console.log(`URL ${url} complete: ${urlResult.saved} saved, ${urlResult.duplicates} duplicates`)

        // Add delay between URLs to avoid rate limiting
        if (urls.indexOf(url) < urls.length - 1) {
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
    }

    console.log(`Scheduled scrape complete: ${results.totalSaved} saved, ${results.totalDuplicates} duplicates, ${results.totalErrors} errors`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...results
      }),
    }
  } catch (error) {
    console.error('Scheduled scraping error:', error)
    return {
      statusCode: 500,
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
}

