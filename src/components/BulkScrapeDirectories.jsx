import { useState } from 'react'
import { scrapeAPI } from '../services/api'

function BulkScrapeDirectories({ categories, onBusinessesScraped }) {
  const [urls, setUrls] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleScrape = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)

    // Parse URLs from textarea (one per line)
    const urlArray = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    if (urlArray.length === 0) {
      setError('Please enter at least one URL')
      setLoading(false)
      return
    }

    try {
      const response = await scrapeAPI.scrapeDirectories({
        urls: urlArray,
        categoryId: categoryId || null
      })

      setResults(response.data)
      
      // Reload businesses if callback provided
      if (onBusinessesScraped && response.data.totalSaved > 0) {
        onBusinessesScraped()
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to scrape directories'
      setError(errorMessage)
      console.error('Scraping error:', err)
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setUrls('')
    setCategoryId('')
    setResults(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Bulk Scrape Directories</h2>
        <p className="text-gray-600 mb-6">
          Enter multiple directory URLs (one per line) to automatically extract and save businesses using AI.
          The system will extract all businesses from each directory page.
        </p>
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md mb-4">
          <p className="text-sm">
            <strong>Note:</strong> Due to function timeout limits, it's recommended to process 1-3 URLs at a time. 
            If you have many URLs, process them in batches.
          </p>
        </div>

        <form onSubmit={handleScrape} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Directory URLs (one per line)
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://www.city-data.com/locations/Johnston-County-NC.html&#10;https://www.sosnc.gov/online_services/search/by_title/_Business_Registration_Search"
              required
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter one URL per line. The system will automatically detect if pages need JavaScript rendering.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Category (optional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Use default category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              If not specified, the first category alphabetically will be used.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !urls.trim()}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Scraping...' : 'Start Bulk Scrape'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Scraping Results</h3>
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>

          {results.partial && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
              <p className="font-medium">⚠️ Partial Results</p>
              <p className="text-sm mt-1">
                The function timed out after processing {results.processedUrls || results.urlResults.length} of {results.totalUrls} URLs. 
                Please try processing fewer URLs at a time or process in batches.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">URLs Processed</p>
              <p className="text-2xl font-bold text-blue-600">
                {results.processedUrls || results.urlResults.length} / {results.totalUrls}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Businesses Found</p>
              <p className="text-2xl font-bold text-green-600">{results.totalFound}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Successfully Saved</p>
              <p className="text-2xl font-bold text-purple-600">{results.totalSaved}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Duplicates Skipped</p>
              <p className="text-2xl font-bold text-yellow-600">{results.totalDuplicates}</p>
            </div>
          </div>

          {results.totalErrors > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-red-600 mb-2">
                Errors: {results.totalErrors}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-semibold">Results by URL:</h4>
            {results.urlResults.map((urlResult, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <a
                    href={urlResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 break-all"
                  >
                    {urlResult.url}
                  </a>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-600">Found: </span>
                    <span className="font-semibold">{urlResult.found}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Saved: </span>
                    <span className="font-semibold text-green-600">{urlResult.saved}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duplicates: </span>
                    <span className="font-semibold text-yellow-600">{urlResult.duplicates}</span>
                  </div>
                </div>
                {urlResult.errors.length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium text-red-600">Errors:</p>
                    <ul className="list-disc list-inside text-red-600">
                      {urlResult.errors.slice(0, 5).map((err, errIndex) => (
                        <li key={errIndex}>
                          {err.business}: {err.error}
                        </li>
                      ))}
                      {urlResult.errors.length > 5 && (
                        <li>... and {urlResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.errors && results.errors.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-700 mb-2">URL Processing Errors:</p>
              <ul className="list-disc list-inside text-sm text-red-600">
                {results.errors.map((err, index) => (
                  <li key={index}>
                    <span className="font-medium">{err.url}:</span> {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BulkScrapeDirectories


