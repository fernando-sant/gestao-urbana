'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'

// Corrigir ícone padrão do Leaflet no Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// Tipos
type StatusType = 'open' | 'in_progress' | 'resolved' | string

interface Report {
  id: string
  protocol: string
  lat: number
  lng: number
  category_name: string
  category_icon: string
  address_hint: string
  status: StatusType
  date?: string
}

// Configurações visuais
const STATUS_COLORS: Record<string, string> = {
  open: '#EAB308',
  in_progress: '#3B82F6',
  resolved: '#22C55E',
}

const STATUS_BR: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Análise',
  resolved: 'Resolvido',
}

export default function MapaClient({ reports }: { reports: Report[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [isMounted, setIsMounted] = useState(false)

  // Evita erro de hidratação
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Normalização + validação de dados
  const safeReports = (reports || [])
    .map((r) => ({
      ...r,
      lat: Number(r.lat),
      lng: Number(r.lng),
      status: r.status?.toLowerCase?.() || '',
    }))
    .filter(
      (r) =>
        typeof r.lat === 'number' &&
        typeof r.lng === 'number' &&
        !isNaN(r.lat) &&
        !isNaN(r.lng)
    )

  // Filtro
  const filteredReports =
    filter === 'all'
      ? safeReports
      : safeReports.filter((r) => r.status === filter)

  // Debug (remover depois)
  console.log('REPORTS:', safeReports)
  console.log('FILTERED:', filteredReports)

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">
        Carregando mapa...
      </div>
    )
  }

  // Centro do mapa dinâmico
  const defaultCenter: [number, number] = [-22.6126, -46.7012]
  const mapCenter: [number, number] =
    filteredReports.length > 0
      ? [filteredReports[0].lat, filteredReports[0].lng]
      : defaultCenter

  return (
    <div className="relative h-[calc(100vh-140px)] w-full">
      {/* Filtros */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap gap-2 pointer-events-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold shadow-md transition-all ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600'
          }`}
        >
          Todos ({safeReports.length})
        </button>

        {Object.keys(STATUS_BR).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-full text-xs font-bold shadow-md transition-all ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600'
            }`}
          >
            {STATUS_BR[key]}
          </button>
        ))}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup chunkedLoading>
          {filteredReports.map((report) => (
            <Marker
              key={report.id}
              position={[report.lat, report.lng]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">
                      {report.category_icon || '📍'}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-none">
                        {report.category_name}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">
                        {report.protocol}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 line-clamp-2 italic">
                    "{report.address_hint}"
                  </p>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          (STATUS_COLORS[report.status] || '#999') + '20',
                        color: STATUS_COLORS[report.status] || '#999',
                      }}
                    >
                      {STATUS_BR[report.status] || report.status}
                    </span>

                    <Link
                      href={`/solicitacao/${report.id}`}
                      className="text-blue-600 text-xs font-bold hover:underline"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Estilo do popup */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          padding: 4px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
      `}</style>
    </div>
  )
}