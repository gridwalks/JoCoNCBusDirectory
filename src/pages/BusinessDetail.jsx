import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import ReviewForm from '../components/ReviewForm'
import ContactForm from '../components/ContactForm'
import { businessesAPI, reviewsAPI } from '../services/api'

function BusinessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBusiness()
    loadReviews()
  }, [id])

  const loadBusiness = async () => {
    try {
      const response = await businessesAPI.getById(id)
      setBusiness(response.data)
    } catch (error) {
      console.error('Failed to load business:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      const response = await reviewsAPI.getByBusiness(id)
      setReviews(response.data)
    } catch (error) {
      console.error('Failed to load reviews:', error)
    }
  }

  const handleReviewSubmitted = () => {
    loadReviews()
    if (business) {
      loadBusiness() // Reload to update average rating
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-gray-500">Loading business details...</div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Business not found</h2>
          <button
            onClick={() => navigate('/businesses')}
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Businesses
          </button>
        </div>
      </div>
    )
  }

  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/businesses')}
        className="text-primary-600 hover:text-primary-700 mb-4"
      >
        ← Back to Businesses
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {business.logo && (
          <div className="h-64 bg-gray-200 overflow-hidden">
            <img
              src={business.logo}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {business.name}
              </h1>
              {business.category && (
                <span className="inline-block px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded">
                  {business.category.name}
                </span>
              )}
            </div>
            {averageRating && (
              <div className="text-right">
                <div className="text-2xl font-bold">{averageRating}</div>
                <div className="text-yellow-500">⭐</div>
                <div className="text-sm text-gray-500">
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          {business.description && (
            <p className="text-gray-700 mb-4">{business.description}</p>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
              <div className="space-y-1 text-gray-600">
                <p>{business.address}</p>
                <p>{business.city}, {business.state} {business.zip}</p>
                {business.phone && <p>Phone: {business.phone}</p>}
                {business.email && <p>Email: {business.email}</p>}
                {business.website && (
                  <p>
                    Website:{' '}
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {business.website}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {business.latitude && business.longitude && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                <MapView businesses={[business]} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-gray-500">No reviews yet. Be the first to review!</p>
          ) : (
            <div className="space-y-4 mb-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white p-4 rounded-lg shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">
                      {review.userName || 'Anonymous'}
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-500 mr-1">
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700">{review.comment}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          <ReviewForm
            businessId={id}
            onReviewSubmitted={handleReviewSubmitted}
          />
        </div>

        <div>
          <ContactForm businessId={id} />
        </div>
      </div>
    </div>
  )
}

export default BusinessDetail

