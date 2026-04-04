'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// 1. Componente para forçar o mapa a ocupar 100% da tela após carregar
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }, [map])
  return null
}

// 2. Componente para capturar o movimento do mapa
function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter()
      onChange(center.lat, center.lng)
    },
  })
  return null
}

interface SelectorMapaProps {
  position: { lat: number; lng: number }
  onChange: (lat: number, lng: number) => void
}

export default function SelectorMapa({ position, onChange }: SelectorMapaProps) {
  return (
    /* O "relative" aqui é o segredo para o Pin e o Botão flutuarem */
    <div className="relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden border-2 border-white shadow-md">
      
      <MapContainer 
        center={[position.lat, position.lng]} 
        zoom={16} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapResizer />
        <MapEvents onChange={onChange} />
      </MapContainer>

      {/* PIN CENTRAL: Agora fora do MapContainer para não ser "esmagado" pelo Leaflet */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none"
        style={{ zIndex: 1000 }} 
      >
        <span className="text-5xl drop-shadow-2xl">📍</span>
      </div>

      {/* BOTÃO GPS */}
      <button
        type="button"
        onClick={() => {
          navigator.geolocation.getCurrentPosition(pos => {
            onChange(pos.coords.latitude, pos.coords.longitude)
          })
        }}
        className="absolute top-4 right-4 bg-white p-3 rounded-2xl shadow-xl active:scale-95 transition-transform"
        style={{ zIndex: 1000 }}
      >
        <span className="text-xl">🎯</span>
      </button>
    </div>
  )
}