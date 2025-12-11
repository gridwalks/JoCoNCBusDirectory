import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import BusinessCard from '../components/BusinessCard'
import CategoryFilter from '../components/CategoryFilter'
import MapView from '../components/MapView'
import SearchBar from '../components/SearchBar'
import { businessesAPI } from '../services/api'

function BusinessList() {
  const [searchParams] = useSearchParams()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'map'
  const searchQuery = searchParams.get('search')

  useEffect(() => {
    loadBusinesses()
  }, [selectedCategories, searchQuery])

  const loadBusinesses = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedCategories.length > 0) {
        params.category = selectedCategories.join(',')
      }
      if (searchQuery) {
        params.search = searchQuery
      }

      const response = await businessesAPI.getAll(params)
      setBusinesses(response.data)
    } catch (error) {
      console.error('Failed to load businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Loading businesses...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <SearchBar />
      </div>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-2 rounded-md ${
            viewMode === 'grid'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Grid View
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`px-4 py-2 rounded-md ${
            viewMode === 'map'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Map View
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <CategoryFilter
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
          />
        </div>

        <div className="lg:col-span-3">
          {viewMode === 'map' ? (
            <MapView businesses={businesses} />
          ) : (
            <>
              <div className="mb-4 text-gray-600">
                Found {businesses.length} business{businesses.length !== 1 ? 'es' : ''}
              </div>
              {businesses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No businesses found. Try adjusting your filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {businesses.map((business) => (
                    <BusinessCard key={business.id} business={business} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default BusinessList

