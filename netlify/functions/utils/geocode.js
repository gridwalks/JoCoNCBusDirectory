/**
 * Geocoding utility using OpenStreetMap Nominatim API
 * Converts addresses to latitude/longitude coordinates
 */

export async function geocodeAddress(address) {
  if (!address) {
    return null
  }

  try {
    // Construct full address string
    const fullAddress = typeof address === 'string' 
      ? address 
      : `${address.address || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()

    if (!fullAddress) {
      return null
    }

    // Use Nominatim API (free, no API key required)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JoCoNCBusDirectory/1.0' // Required by Nominatim
      }
    })

    if (!response.ok) {
      console.error('Geocoding API error:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    
    if (data && data.length > 0) {
      const result = data[0]
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Parse address string into components
 */
export function parseAddress(addressString) {
  if (!addressString) {
    return { address: '', city: '', state: '', zip: '' }
  }

  // Common patterns for US addresses
  // Format: "123 Main St, City, ST 12345" or "123 Main St, City, ST"
  const patterns = [
    // Full address with ZIP: "123 Main St, City, ST 12345"
    /^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/,
    // Address without ZIP: "123 Main St, City, ST"
    /^(.+?),\s*(.+?),\s*([A-Z]{2})$/,
    // Just city and state: "City, ST"
    /^(.+?),\s*([A-Z]{2})$/,
  ]

  for (const pattern of patterns) {
    const match = addressString.match(pattern)
    if (match) {
      if (match.length === 5) {
        // Full address with ZIP
        return {
          address: match[1].trim(),
          city: match[2].trim(),
          state: match[3].trim(),
          zip: match[4].trim()
        }
      } else if (match.length === 4) {
        // Address without ZIP
        return {
          address: match[1].trim(),
          city: match[2].trim(),
          state: match[3].trim(),
          zip: ''
        }
      } else if (match.length === 3) {
        // Just city and state
        return {
          address: '',
          city: match[1].trim(),
          state: match[2].trim(),
          zip: ''
        }
      }
    }
  }

  // If no pattern matches, try to extract at least city and state
  const parts = addressString.split(',').map(p => p.trim())
  if (parts.length >= 2) {
    const stateZip = parts[parts.length - 1]
    const stateMatch = stateZip.match(/^([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/)
    
    if (stateMatch) {
      return {
        address: parts.slice(0, -2).join(', '),
        city: parts[parts.length - 2] || '',
        state: stateMatch[1],
        zip: stateMatch[2] || ''
      }
    }
  }

  // Fallback: return as-is in address field
  return {
    address: addressString,
    city: '',
    state: '',
    zip: ''
  }
}


