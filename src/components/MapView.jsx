import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapView({ businesses, onBusinessClick }) {
  // Center on Johnston County, NC
  const center = [35.5073, -78.3394]
  const mapRef = useRef(null)

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden shadow-md">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {businesses
          .filter((b) => b.latitude && b.longitude)
          .map((business) => (
            <Marker
              key={business.id}
              position={[business.latitude, business.longitude]}
            >
              <Popup>
                <div>
                  <h3 className="font-semibold">{business.name}</h3>
                  <p className="text-sm text-gray-600">{business.address}</p>
                  {onBusinessClick && (
                    <button
                      onClick={() => onBusinessClick(business.id)}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}

export default MapView

