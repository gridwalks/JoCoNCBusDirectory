import { Link } from 'react-router-dom'

function BusinessCard({ business }) {
  const averageRating = business.reviews?.length
    ? (
        business.reviews.reduce((sum, r) => sum + r.rating, 0) /
        business.reviews.length
      ).toFixed(1)
    : null

  return (
    <Link
      to={`/businesses/${business.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
    >
      {business.logo && (
        <div className="h-48 bg-gray-200 overflow-hidden">
          <img
            src={business.logo}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {business.name}
        </h3>
        {business.category && (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded mb-2">
            {business.category.name}
          </span>
        )}
        {business.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {business.description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{business.city}, {business.state}</span>
          {averageRating && (
            <div className="flex items-center">
              <span className="text-yellow-500 mr-1">⭐</span>
              <span>{averageRating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default BusinessCard

