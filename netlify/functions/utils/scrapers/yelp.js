import * as cheerio from 'cheerio'

/**
 * Scrape Yelp business page
 */
export async function scrapeYelpBusiness(url) {
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

    const businessData = {
      name: '',
      description: '',
      address: '',
      phone: '',
      website: '',
      email: '',
      images: []
    }

    // Extract from JSON-LD structured data (Yelp uses this)
    const jsonLd = $('script[type="application/ld+json"]')
    jsonLd.each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html())
        if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Restaurant' || data['@type'] === 'FoodEstablishment') {
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

    // Extract from meta tags
    if (!businessData.name) {
      businessData.name = $('meta[property="og:title"]').attr('content') ||
                         $('meta[name="yelp-biz-name"]').attr('content') ||
                         $('h1').first().text().trim() ||
                         $('title').text().split(' - ')[0].trim()
    }

    if (!businessData.description) {
      businessData.description = $('meta[property="og:description"]').attr('content') ||
                                 $('meta[name="description"]').attr('content') ||
                                 $('p[class*="comment"]').first().text().trim() ||
                                 ''
    }

    // Extract address from Yelp-specific selectors
    if (!businessData.address) {
      const addressSelectors = [
        '[class*="address"]',
        '[class*="Address"]',
        'address',
        '[data-testid="address"]',
        '.css-1vhakgw'
      ]

      for (const selector of addressSelectors) {
        const addressText = $(selector).first().text().trim()
        if (addressText && addressText.length > 10) {
          businessData.address = addressText
          break
        }
      }
    }

    // Extract phone
    if (!businessData.phone) {
      const phoneSelectors = [
        'a[href^="tel:"]',
        '[class*="phone"]',
        '[class*="Phone"]',
        '[data-testid="phone"]'
      ]

      for (const selector of phoneSelectors) {
        const phoneText = $(selector).first().text().trim() || 
                         $(selector).first().attr('href')?.replace('tel:', '')
        if (phoneText && phoneText.length >= 10) {
          businessData.phone = phoneText
          break
        }
      }
    }

    // Extract website
    if (!businessData.website) {
      const websiteLink = $('a[class*="website"]').attr('href') ||
                         $('a[class*="Website"]').attr('href') ||
                         $('a[data-testid="website"]').attr('href') ||
                         $('a[href^="http"]').not('[href*="yelp"]').not('[href*="facebook"]').first().attr('href')
      
      if (websiteLink && !websiteLink.includes('yelp.com')) {
        businessData.website = websiteLink
      }
    }

    // Extract images
    if (businessData.images.length === 0) {
      $('img[class*="photo"]').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src')
        if (src && !src.includes('yelp') && businessData.images.length < 5) {
          businessData.images.push(src)
        }
      })
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
      throw new Error('Could not extract business name from Yelp page')
    }

    return businessData
  } catch (error) {
    console.error('Yelp scraper error:', error)
    throw new Error(`Failed to scrape Yelp business: ${error.message}`)
  }
}

/**
 * Detect if URL is a Yelp URL
 */
export function isYelpUrl(url) {
  if (!url) return false
  return url.includes('yelp.com/biz/') || url.includes('yelp.com/')
}

