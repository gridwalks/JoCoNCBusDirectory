import prismaDefault from './prisma.js'

// Note: Prisma client should be passed in or created at the function level
// This utility accepts prisma as a parameter to avoid connection management issues

/**
 * Check for duplicate businesses
 * Returns existing business if found, null otherwise
 * @param {Object} businessData - Business data to check
 * @param {PrismaClient} prismaClient - Prisma client instance (optional, uses default if not provided)
 */
export async function checkDuplicate(businessData, prismaClient = null) {
  const prisma = prismaClient || prismaDefault
  const shouldDisconnect = !prismaClient
  
  try {
    const { name, address, website, phone } = businessData

    // Normalize data for comparison
    const normalizeName = (str) => str?.toLowerCase().trim().replace(/\s+/g, ' ')
    const normalizePhone = (str) => str?.replace(/\D/g, '') // Remove non-digits
    const normalizeUrl = (str) => {
      if (!str) return ''
      try {
        const url = new URL(str.startsWith('http') ? str : `https://${str}`)
        return url.hostname.replace(/^www\./, '').toLowerCase()
      } catch {
        return str.toLowerCase().replace(/^www\./, '').replace(/\/$/, '')
      }
    }

    const normalizedName = normalizeName(name)
    const normalizedPhone = phone ? normalizePhone(phone) : null
    const normalizedWebsite = website ? normalizeUrl(website) : null

    // Check by name + address (most reliable)
    if (normalizedName && address) {
      const byNameAndAddress = await prisma.business.findFirst({
        where: {
          AND: [
            {
              name: {
                equals: name,
                mode: 'insensitive'
              }
            },
            {
              address: {
                contains: address.split(',')[0], // Check street address part
                mode: 'insensitive'
              }
            }
          ]
        },
        include: {
          category: true
        }
      })

      if (byNameAndAddress) {
        return {
          match: 'name_and_address',
          business: byNameAndAddress
        }
      }
    }

    // Check by website
    if (normalizedWebsite) {
      const businesses = await prisma.business.findMany({
        where: {
          website: {
            not: null
          }
        },
        include: {
          category: true
        }
      })

      const byWebsite = businesses.find(b => {
        if (!b.website) return false
        const bWebsite = normalizeUrl(b.website)
        return bWebsite === normalizedWebsite
      })

      if (byWebsite) {
        return {
          match: 'website',
          business: byWebsite
        }
      }
    }

    // Check by phone number
    if (normalizedPhone && normalizedPhone.length >= 10) {
      const businesses = await prisma.business.findMany({
        where: {
          phone: {
            not: null
          }
        },
        include: {
          category: true
        }
      })

      const byPhone = businesses.find(b => {
        if (!b.phone) return false
        const bPhone = normalizePhone(b.phone)
        // Match if last 10 digits are the same (handles different formats)
        return bPhone.slice(-10) === normalizedPhone.slice(-10)
      })

      if (byPhone) {
        return {
          match: 'phone',
          business: byPhone
        }
      }
    }

    // Check by name only (less reliable, but useful for fuzzy matching)
    if (normalizedName) {
      const byName = await prisma.business.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          }
        },
        include: {
          category: true
        }
      })

      if (byName) {
        // Only return if name is very similar (exact match after normalization)
        const existingName = normalizeName(byName.name)
        if (existingName === normalizedName) {
          return {
            match: 'name',
            business: byName
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Duplicate check error:', error)
    return null
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect()
    }
  }
}

