import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'

function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Johnston County
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Discover local businesses in Johnston County, North Carolina
        </p>
        <div className="max-w-2xl mx-auto">
          <SearchBar />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2">Search Businesses</h2>
          <p className="text-gray-600 mb-4">
            Find businesses by name, category, or location
          </p>
          <Link
            to="/businesses"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Browse All →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-4xl mb-4">📍</div>
          <h2 className="text-xl font-semibold mb-2">Interactive Map</h2>
          <p className="text-gray-600 mb-4">
            Explore businesses on our interactive map
          </p>
          <Link
            to="/businesses"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View Map →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-4xl mb-4">⭐</div>
          <h2 className="text-xl font-semibold mb-2">Reviews & Ratings</h2>
          <p className="text-gray-600 mb-4">
            Read reviews and ratings from the community
          </p>
          <Link
            to="/businesses"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            See Reviews →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home

