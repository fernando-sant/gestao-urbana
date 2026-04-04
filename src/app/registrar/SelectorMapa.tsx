'use client'

import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function MapEvents({ onMove }: any) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter()
      onMove(c.lat, c.lng)
    }
  })
  return null
}

export default function SelectorMapa({ position, onChange }: any) {
  return (
    <div className="relative h-72 rounded-2xl overflow-hidden">
      <MapContainer center={position} zoom={16} style={{ height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onMove={onChange} />

        {/* Pin central */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-10 text-3xl pointer-events-none">
          📍
        </div>
      </MapContainer>

      {/* Botão GPS */}
      <button
        onClick={() => {
          navigator.geolocation.getCurrentPosition(pos => {
            onChange(pos.coords.latitude, pos.coords.longitude)
          })
        }}
        className="absolute top-3 right-3 bg-white p-2 rounded-xl shadow"
      >
        🎯
      </button>
    </div>
  )
}