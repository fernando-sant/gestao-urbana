'use client'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

// Corrige o ícone padrão do Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 16)
  }, [center, map])
  return null
}

function MapEvents({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter()
      onMove(center.lat, center.lng)
    },
  })
  return null
}

export default function SelectorMapa({ 
  position, 
  onChange 
}: { 
  position: [number, number], 
  onChange: (lat: number, lng: number) => void 
}) {
  return (
    <div className="h-72 w-full rounded-2xl overflow-hidden border-2 border-blue-100 shadow-inner relative z-0">
      <MapContainer 
        center={position} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ChangeView center={position} />
        <MapEvents onMove={onChange} />
        
        {/* Pin central fixo (Overlay) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40px] z-[1000] pointer-events-none">
          <span className="text-4xl drop-shadow-lg scale-110 block">📍</span>
        </div>
      </MapContainer>
      <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl z-[1000] text-[10px] text-center text-slate-600 font-bold uppercase tracking-wider shadow-sm">
        Arraste o mapa para o local exato
      </div>
    </div>
  )
}