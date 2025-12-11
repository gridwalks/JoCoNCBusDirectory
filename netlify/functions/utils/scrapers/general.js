import * as cheerio from 'cheerio'

/**
 * Scrape general business website
 * Extracts structured data (JSON-LD, microdata, meta tags)
 */
export async function scrapeGeneralWebsite(url) {
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`

    // Fetch the page
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

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

    // Extract from JSON-LD structured data (most reliable)
    const jsonLd = $('script[type="application/ld+json"]')
    jsonLd.each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html())
        
        // Handle different schema types
        const schemaTypes = ['LocalBusiness', 'Restaurant', 'Store', 'Organization', 'Business', 'FoodEstablishment']
        const isBusinessSchema = schemaTypes.some(type => 
          data['@type'] === type || 
          (Array.isArray(data['@type']) && data['@type'].includes(type))
        )

        if (isBusinessSchema || data['@type'] === 'Organization') {
          if (data.name && !businessData.name) businessData.name = data.name
          if (data.description && !businessData.description) businessData.description = data.description
          
          // Handle address
          if (data.address) {
            if (typeof data.address === 'string') {
              businessData.address = data.address
            } else if (data.address.streetAddress) {
              const addr = data.address
              businessData.address = `${addr.streetAddress || ''}, ${addr.addressLocality || ''}, ${addr.addressRegion || ''} ${addr.postalCode || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
            }
          }

          // Handle contact info
          if (data.telephone && !businessData.phone) businessData.phone = data.telephone
          if (data.url && !businessData.website) businessData.website = data.url
          if (data.email && !businessData.email) businessData.email = data.email
          
          // Handle images
          if (data.image) {
            const images = Array.isArray(data.image) ? data.image : [data.image]
            businessData.images = images
              .filter(img => img && typeof img === 'string')
              .map(img => img.startsWith('http') ? img : new URL(img, fullUrl).href)
              .slice(0, 5)
          }

          // Handle logo
          if (data.logo && !businessData.images.includes(data.logo)) {
            const logoUrl = data.logo.startsWith('http') ? data.logo : new URL(data.logo, fullUrl).href
            businessData.images.unshift(logoUrl)
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    })

    // Extract from Open Graph meta tags
    if (!businessData.name) {
      businessData.name = $('meta[property="og:title"]').attr('content') ||
                         $('meta[property="og:site_name"]').attr('content') ||
                         $('title').text().trim() ||
                         ''
    }

    if (!businessData.description) {
      businessData.description = $('meta[property="og:description"]').attr('content') ||
                                 $('meta[name="description"]').attr('content') ||
                                 ''
    }

    // Extract from microdata
    const microdataName = $('[itemprop="name"]').first().text().trim()
    if (microdataName && !businessData.name) {
      businessData.name = microdataName
    }

    const microdataDescription = $('[itemprop="description"]').first().text().trim()
    if (microdataDescription && !businessData.description) {
      businessData.description = microdataDescription
    }

    // Extract address from various patterns
    if (!businessData.address) {
      // Try microdata
      const streetAddress = $('[itemprop="streetAddress"]').text().trim()
      const addressLocality = $('[itemprop="addressLocality"]').text().trim()
      const addressRegion = $('[itemprop="addressRegion"]').text().trim()
      const postalCode = $('[itemprop="postalCode"]').text().trim()

      if (streetAddress) {
        businessData.address = `${streetAddress}, ${addressLocality}, ${addressRegion} ${postalCode}`.trim()
      } else {
        // Try common address patterns
        const addressSelectors = [
          '[class*="address"]',
          '[id*="address"]',
          'address',
          '[class*="contact"] [class*="address"]',
          '.address',
          '#address'
        ]

        for (const selector of addressSelectors) {
          const addressText = $(selector).first().text().trim()
          if (addressText && addressText.length > 10 && addressText.match(/\d/)) {
            businessData.address = addressText
            break
          }
        }
      }
    }

    // Extract phone
    if (!businessData.phone) {
      // Try microdata
      const phone = $('[itemprop="telephone"]').text().trim() || 
                   $('[itemprop="telephone"]').attr('content')
      if (phone) {
        businessData.phone = phone
      } else {
        // Try common phone patterns
        const phoneSelectors = [
          'a[href^="tel:"]',
          '[class*="phone"]',
          '[id*="phone"]',
          '[class*="contact"] [class*="phone"]'
        ]

        for (const selector of phoneSelectors) {
          const phoneText = $(selector).first().text().trim() || 
                           $(selector).first().attr('href')?.replace('tel:', '')
          if (phoneText && phoneText.match(/\d/)) {
            businessData.phone = phoneText
            break
          }
        }
      }
    }

    // Extract email
    if (!businessData.email) {
      const emailLink = $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '')
      if (emailLink) {
        businessData.email = emailLink
      } else {
        // Try to find email in text
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        const bodyText = $('body').text()
        const emailMatch = bodyText.match(emailRegex)
        if (emailMatch && emailMatch[0]) {
          businessData.email = emailMatch[0]
        }
      }
    }

    // Extract images if not already found
    if (businessData.images.length === 0) {
      // Try Open Graph image
      const ogImage = $('meta[property="og:image"]').attr('content')
      if (ogImage) {
        businessData.images.push(ogImage.startsWith('http') ? ogImage : new URL(ogImage, fullUrl).href)
      }

      // Try to find logo or main images
      const imageSelectors = [
        'img[class*="logo"]',
        'img[class*="Logo"]',
        'img[id*="logo"]',
        'img[alt*="logo"]',
        'img[alt*="Logo"]'
      ]

      imageSelectors.forEach(selector => {
        const img = $(selector).first()
        const src = img.attr('src') || img.attr('data-src')
        if (src && businessData.images.length < 5) {
          const imgUrl = src.startsWith('http') ? src : new URL(src, fullUrl).href
          if (!businessData.images.includes(imgUrl)) {
            businessData.images.push(imgUrl)
          }
        }
      })
    }

    // Clean up the data
    businessData.name = businessData.name.trim()
    businessData.description = businessData.description.trim()
    businessData.address = businessData.address.trim()
    businessData.phone = businessData.phone?.trim() || ''
    businessData.website = businessData.website?.trim() || fullUrl
    businessData.email = businessData.email?.trim() || ''

    // Validate that we got at least a name
    if (!businessData.name) {
      // Fallback to domain name
      try {
        const urlObj = new URL(fullUrl)
        businessData.name = urlObj.hostname.replace(/^www\./, '').split('.')[0]
        businessData.name = businessData.name.charAt(0).toUpperCase() + businessData.name.slice(1)
      } catch {
        throw new Error('Could not extract business name from website')
      }
    }

    return businessData
  } catch (error) {
    console.error('General scraper error:', error)
    throw new Error(`Failed to scrape website: ${error.message}`)
  }
}

