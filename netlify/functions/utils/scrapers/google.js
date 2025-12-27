import * as cheerio from 'cheerio'

/**
 * Scrape Google Business Profile / Google Maps
 */
export async function scrapeGoogleBusiness(url) {
  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract business data from Google Maps page
    // Note: Google Maps structure can change, so we try multiple selectors
    const businessData = {
      name: '',
      description: '',
      address: '',
      phone: '',
      website: '',
      email: '',
      images: []
    }

    // Try to extract from JSON-LD structured data
    const jsonLd = $('script[type="application/ld+json"]')
    jsonLd.each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html())
        if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Restaurant' || data['@type'] === 'Store') {
          if (data.name && !businessData.name) businessData.name = data.name
          if (data.description && !businessData.description) businessData.description = data.description
          if (data.address) {
            if (typeof data.address === 'string') {
              businessData.address = data.address
            } else if (data.address.streetAddress) {
              businessData.address = `${data.address.streetAddress}, ${data.address.addressLocality || ''}, ${data.address.addressRegion || ''} ${data.address.postalCode || ''}`.trim()
            }
          }
          if (data.telephone && !businessData.phone) businessData.phone = data.telephone
          if (data.url && !businessData.website) businessData.website = data.url
          if (data.email && !businessData.email) businessData.email = data.email
          if (data.image) {
            const images = Array.isArray(data.image) ? data.image : [data.image]
            businessData.images = images.filter(img => img && typeof img === 'string')
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    })

    // Extract from meta tags if JSON-LD didn't work
    if (!businessData.name) {
      businessData.name = $('meta[property="og:title"]').attr('content') || 
                         $('meta[name="title"]').attr('content') ||
                         $('h1').first().text().trim() ||
                         $('title').text().split(' - ')[0].trim()
    }

    if (!businessData.description) {
      businessData.description = $('meta[property="og:description"]').attr('content') ||
                                 $('meta[name="description"]').attr('content') ||
                                 ''
    }

    // Try to extract address from various selectors
    if (!businessData.address) {
      const addressSelectors = [
        '[data-value="Address"]',
        '.Io6YTe',
        '[data-value="address"]',
        '.rogA2c .Io6YTe',
        '.LrzXr'
      ]

      for (const selector of addressSelectors) {
        const addressText = $(selector).first().text().trim()
        if (addressText) {
          businessData.address = addressText
          break
        }
      }
    }

    // Try to extract phone
    if (!businessData.phone) {
      const phoneSelectors = [
        '[data-value="Phone"]',
        '[data-value="phone"]',
        'a[href^="tel:"]',
        '.rogA2c a[href^="tel:"]'
      ]

      for (const selector of phoneSelectors) {
        const phoneText = $(selector).first().text().trim() || $(selector).first().attr('href')?.replace('tel:', '')
        if (phoneText) {
          businessData.phone = phoneText
          break
        }
      }
    }

    // Try to extract website
    if (!businessData.website) {
      const websiteLink = $('a[data-value="Website"]').attr('href') ||
                         $('a[data-value="website"]').attr('href') ||
                         $('a[aria-label*="Website"]').attr('href') ||
                         $('a[href^="http"]').not('[href*="google"]').first().attr('href')
      
      if (websiteLink) {
        businessData.website = websiteLink
      }
    }

    // Clean up the data
    businessData.name = businessData.name.trim()
    businessData.description = businessData.description.trim()
    businessData.address = businessData.address.trim()
    businessData.phone = businessData.phone?.trim() || ''
    businessData.website = businessData.website?.trim() || ''
    businessData.email = businessData.email?.trim() || ''

    // Validate that we got at least a name
    if (!businessData.name) {
      throw new Error('Could not extract business name from Google Maps page')
    }

    return businessData
  } catch (error) {
    console.error('Google scraper error:', error)
    throw new Error(`Failed to scrape Google Business: ${error.message}`)
  }
}

/**
 * Detect if URL is a Google Maps/Business URL
 */
export function isGoogleUrl(url) {
  if (!url) return false
  return url.includes('google.com/maps') || 
         url.includes('google.com/place') ||
         url.includes('maps.google.com')
}


