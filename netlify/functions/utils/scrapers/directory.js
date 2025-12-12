import * as cheerio from 'cheerio'

/**
 * Scrape directory listing pages (like chamber of commerce directories)
 * Extracts the first business listing from directory pages
 */
export async function scrapeDirectoryListing(url) {
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`

    // Fetch the page with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout

    let response
    try {
      response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out while fetching the directory page')
      }
      throw fetchError
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const businessData = {
      name: '',
      description: '',
      address: '',
      phone: '',
      website: fullUrl,
      email: '',
      images: []
    }

    // For Triangle East Chamber directory pages, look for business listings
    // The page structure has business cards with h4/h5 titles and address/phone info
    
    // Try to find the first business listing
    // Look for common directory listing patterns
    const businessSelectors = [
      'article',
      '.business-card',
      '.listing',
      '.member',
      '[class*="business"]',
      '[class*="listing"]',
      '[class*="member"]',
      'div[class*="card"]',
      'div[class*="item"]'
    ]

    let businessElement = null
    for (const selector of businessSelectors) {
      const elements = $(selector)
      if (elements.length > 0) {
        businessElement = elements.first()
        break
      }
    }

    // If no specific business container found, try to extract from the page structure
    // For Triangle East Chamber, businesses are often in divs with h4/h5 headings
    if (!businessElement) {
      // Look for h4 or h5 tags that might be business names
      const headings = $('h4, h5').first()
      if (headings.length > 0) {
        // Try to find the parent container that includes the business info
        businessElement = headings.closest('div, article, section')
        if (businessElement.length === 0) {
          businessElement = headings.parent()
        }
      }
    }
    
    // Fallback: look for any div containing business-like information
    if (!businessElement || businessElement.length === 0) {
      const allDivs = $('div')
      for (let i = 0; i < Math.min(allDivs.length, 20); i++) {
        const div = $(allDivs[i])
        const text = div.text()
        // Check if this div looks like it contains business info (has address pattern or phone)
        if (text.match(/\d+[\s\w.,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr)/i) || 
            text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)) {
          businessElement = div
          break
        }
      }
    }

    if (businessElement && businessElement.length > 0) {
      // Extract business name from heading
      const nameElement = businessElement.find('h4, h5, h3, h2').first()
      if (nameElement.length > 0) {
        businessData.name = nameElement.text().trim()
      }

      // Extract address - look for patterns like "123 Street, City State ZIP"
      const text = businessElement.text()
      
      // Try multiple address patterns
      const addressPatterns = [
        /(\d+[\s\w.,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court|Highway|Hwy)[\s\w.,]*,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5})/i,
        /(\d+[\s\w.,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court|Highway|Hwy)[\s\w.,]*,\s*[\w\s]+,\s*[A-Z]{2})/i,
        /(PO Box \d+[\s\w.,]*,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5})/i,
        /(\d+[\s\w.,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr)[\s\w.,]*,\s*[\w\s]+)/i
      ]
      
      let addressMatch = null
      for (const pattern of addressPatterns) {
        addressMatch = text.match(pattern)
        if (addressMatch) {
          businessData.address = addressMatch[1].trim()
          break
        }
      }
      
      if (!addressMatch) {
        // Try to find address in structured format
        const addressText = businessElement.find('[class*="address"], address, [class*="location"]').first().text().trim()
        if (addressText && addressText.length > 10 && addressText.match(/\d/)) {
          businessData.address = addressText
        } else {
          // Try to extract from lines that look like addresses
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
          for (const line of lines) {
            if (line.match(/\d+[\s\w.,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court)/i) ||
                line.match(/PO Box \d+/i)) {
              businessData.address = line
              break
            }
          }
        }
      }

      // Extract phone - look for phone number patterns
      const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/
      const phoneMatch = text.match(phonePattern)
      if (phoneMatch) {
        businessData.phone = phoneMatch[1].trim()
      } else {
        // Try to find phone in links
        const phoneLink = businessElement.find('a[href^="tel:"]').first()
        if (phoneLink.length > 0) {
          businessData.phone = phoneLink.attr('href').replace('tel:', '').trim()
        }
      }

      // Extract description
      const description = businessElement.find('p, [class*="description"], [class*="about"]').first().text().trim()
      if (description && description.length > 20) {
        businessData.description = description.substring(0, 500) // Limit description length
      }

      // Extract website link
      const websiteLink = businessElement.find('a[href^="http"]').first()
      if (websiteLink.length > 0) {
        const href = websiteLink.attr('href')
        if (href && !href.includes('tel:') && !href.includes('mailto:')) {
          businessData.website = href
        }
      }

      // Extract email
      const emailLink = businessElement.find('a[href^="mailto:"]').first()
      if (emailLink.length > 0) {
        businessData.email = emailLink.attr('href').replace('mailto:', '').trim()
      } else {
        // Try to find email in text
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        const emailMatch = text.match(emailRegex)
        if (emailMatch) {
          businessData.email = emailMatch[0]
        }
      }

      // Extract images
      const images = businessElement.find('img')
      images.each((i, img) => {
        if (businessData.images.length < 5) {
          const src = $(img).attr('src') || $(img).attr('data-src')
          if (src) {
            const imgUrl = src.startsWith('http') ? src : new URL(src, fullUrl).href
            if (!businessData.images.includes(imgUrl)) {
              businessData.images.push(imgUrl)
            }
          }
        }
      })
    }

    // Fallback: If we didn't find a specific business, try to extract from page-level data
    if (!businessData.name) {
      // Try page title
      businessData.name = $('title').text().trim()
      
      // Try Open Graph title
      if (!businessData.name || businessData.name.length < 3) {
        businessData.name = $('meta[property="og:title"]').attr('content') || ''
      }
    }

    // If still no name, try to extract from URL or page structure
    if (!businessData.name || businessData.name.length < 3) {
      // For directory pages, we might need to return an error or extract multiple businesses
      // For now, try to get the page title
      const pageTitle = $('h1').first().text().trim()
      if (pageTitle) {
        businessData.name = pageTitle
      }
    }

    // Clean up the data
    businessData.name = businessData.name.trim()
    businessData.description = businessData.description.trim()
    businessData.address = businessData.address.trim()
    businessData.phone = businessData.phone?.trim() || ''
    businessData.website = businessData.website?.trim() || fullUrl
    businessData.email = businessData.email?.trim() || ''

    // Validate that we got at least a name
    if (!businessData.name || businessData.name.length < 2) {
      throw new Error('Could not extract business name from directory listing. This appears to be a directory page with multiple businesses. Please provide a direct link to a specific business page.')
    }

    return businessData
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out while fetching the directory page')
    }
    console.error('Directory scraper error:', error)
    throw new Error(`Failed to scrape directory listing: ${error.message}`)
  }
}

/**
 * Check if URL is a directory listing page
 */
export function isDirectoryListing(url) {
  const directoryPatterns = [
    /\/list\//,
    /\/directory/,
    /\/businesses/,
    /\/members/,
    /\/search/,
    /chamber.*directory/i,
    /business.*list/i
  ]
  
  return directoryPatterns.some(pattern => pattern.test(url))
}

