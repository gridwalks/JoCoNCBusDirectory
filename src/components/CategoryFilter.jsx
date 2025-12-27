import { useState, useEffect } from 'react'
import { categoriesAPI } from '../services/api'

function CategoryFilter({ selectedCategories, onCategoryChange }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoriesAPI
      .getAll()
      .then((res) => {
        setCategories(res.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load categories:', err)
        setLoading(false)
      })
  }, [])

  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoryChange(selectedCategories.filter((id) => id !== categoryId))
    } else {
      onCategoryChange([...selectedCategories, categoryId])
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading categories...</div>
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <label
            key={category.id}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
          >
            <input
              type="checkbox"
              checked={selectedCategories.includes(category.id)}
              onChange={() => toggleCategory(category.id)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">{category.name}</span>
          </label>
        ))}
      </div>
      {selectedCategories.length > 0 && (
        <button
          onClick={() => onCategoryChange([])}
          className="mt-4 text-sm text-primary-600 hover:text-primary-700"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

export default CategoryFilter


