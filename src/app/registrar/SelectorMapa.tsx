'use client'
import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'

interface LocationState {
  lat: number
  lng: number
  address: string
}

export interface SelectorMapaRef {
  flyTo: (lat: number, lng: number) => void
}

interface SelectorMapaProps {
  initialLocation?: { lat: number; lng: number }
  onSelect: (loc: LocationState) => void
}

const SelectorMapa = forwardRef<SelectorMapaRef, SelectorMapaProps>(
  ({ initialLocation, onSelect }, ref) => {
    const mapRef      = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<any>(null)

    // Centro padrão: Serra Negra – SP
    const DEFAULT_CENTER = { lat: -22.1197, lng: -46.7003 }
    const center = initialLocation ?? DEFAULT_CENTER

    const handleMapMove = useCallback((map: any) => {
      const c = map.getCenter()
      onSelect({
        lat: parseFloat(c.lat.toFixed(6)),
        lng: parseFloat(c.lng.toFixed(6)),
        address: `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`,
      })
    }, [onSelect])

    // Expõe flyTo para o componente pai
    useImperativeHandle(ref, () => ({
      flyTo(lat: number, lng: number) {
        mapInstance.current?.flyTo([lat, lng], 17, { duration: 1.2 })
      },
    }))

    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return
      let cancelled = false

      import('leaflet').then((L) => {
        if (cancelled || !mapRef.current || mapInstance.current) return

        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const map = L.map(mapRef.current!, {
          center: [center.lat, center.lng],
          zoom: 15,
          zoomControl: true,
          attributionControl: false,
        })

        mapInstance.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

        const ro = new ResizeObserver(() => map.invalidateSize())
        ro.observe(mapRef.current!)

        map.on('moveend', () => handleMapMove(map))
        map.on('zoomend', () => handleMapMove(map))

        // Estado inicial
        handleMapMove(map)
      })

      return () => {
        cancelled = true
        if (mapInstance.current) {
          mapInstance.current.remove()
          mapInstance.current = null
        }
      }
    }, [])

    return (
      <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-slate-200">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        <div ref={mapRef} className="w-full h-full" />

        {/* Pin fixo no centro */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 1000 }}
        >
          <div className="flex flex-col items-center" style={{ marginTop: '-28px' }}>
            <div className="w-8 h-8 rounded-full bg-blue-600 border-4 border-white shadow-lg
                            flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <div className="w-3 h-1.5 rounded-full bg-black/20 mt-0.5" />
          </div>
        </div>

        {/* Instrução */}
        <div
          className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2
                     bg-white/90 backdrop-blur-sm text-xs text-slate-600
                     px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap"
          style={{ zIndex: 1000 }}
        >
          Mova o mapa para posicionar o pin
        </div>
      </div>
    )
  }
)

SelectorMapa.displayName = 'SelectorMapa'
export default SelectorMapa