import { useState } from 'react'
import { scrapeAPI } from '../services/api'

function ScrapeBusiness({ categories, onBusinessScraped }) {
  const [url, setUrl] = useState('')
  const [source, setSource] = useState('auto')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [scrapedData, setScrapedData] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)

  const handleScrape = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setScrapedData(null)
    setSuccess(null)

    try {
      const response = await scrapeAPI.scrapeBusiness({
        url,
        source: source === 'auto' ? null : source,
        categoryId: categoryId || null,
        saveToDatabase: false
      })

      setScrapedData(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to scrape business')
      console.error('Scraping error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!scrapedData || !scrapedData.scrapedData) {
      setError('No scraped data to save')
      return
    }

    if (scrapedData.duplicate) {
      setError('A duplicate business was found. Please review the existing business.')
      return
    }

    if (!categoryId) {
      setError('Please select a category before saving')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await scrapeAPI.scrapeBusiness({
        url,
        source: source === 'auto' ? null : source,
        categoryId,
        saveToDatabase: true
      })

      setSuccess('Business saved successfully!')
      setScrapedData(null)
      setUrl('')
      setCategoryId('')
      
      if (onBusinessScraped) {
        onBusinessScraped(response.data.savedBusiness)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save business')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setUrl('')
    setSource('auto')
    setCategoryId('')
    setScrapedData(null)
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Scrape Business</h2>
        <p className="text-gray-600 mb-6">
          Enter a business URL from Google Maps, Yelp, or a general website to extract business information.
        </p>

        <form onSubmit={handleScrape} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.google.com/maps/place/..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source (optional - auto-detected if not specified)
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="auto">Auto-detect</option>
              <option value="google">Google Business / Maps</option>
              <option value="yelp">Yelp</option>
              <option value="general">General Website</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (required for saving)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a category...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !url}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Scraping...' : 'Scrape Business'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          <p className="font-medium">Success</p>
          <p>{success}</p>
        </div>
      )}

      {scrapedData && scrapedData.scrapedData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Scraped Data Preview</h3>
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>

          {scrapedData.duplicate && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-4">
              <p className="font-medium">Duplicate Business Found</p>
              <p className="text-sm mt-1">
                A business with the same {scrapedData.duplicate.match} was found:
              </p>
              <p className="text-sm font-semibold mt-2">
                {scrapedData.duplicate.business.name}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-gray-900">{scrapedData.scrapedData.name || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-gray-900">
                {scrapedData.scrapedData.description || 'No description available'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-gray-900">{scrapedData.scrapedData.address || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City, State ZIP</label>
                <p className="mt-1 text-gray-900">
                  {scrapedData.scrapedData.city}, {scrapedData.scrapedData.state} {scrapedData.scrapedData.zip}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-gray-900">{scrapedData.scrapedData.phone || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{scrapedData.scrapedData.email || 'N/A'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <p className="mt-1">
                {scrapedData.scrapedData.website ? (
                  <a
                    href={scrapedData.scrapedData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {scrapedData.scrapedData.website}
                  </a>
                ) : (
                  'N/A'
                )}
              </p>
            </div>

            {scrapedData.scrapedData.latitude && scrapedData.scrapedData.longitude && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Coordinates</label>
                <p className="mt-1 text-gray-900">
                  {scrapedData.scrapedData.latitude.toFixed(6)}, {scrapedData.scrapedData.longitude.toFixed(6)}
                </p>
              </div>
            )}

            {scrapedData.scrapedData.images && scrapedData.scrapedData.images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images ({scrapedData.scrapedData.images.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {scrapedData.scrapedData.images.slice(0, 4).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Business image ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving || scrapedData.duplicate || !categoryId}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save to Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScrapeBusiness

