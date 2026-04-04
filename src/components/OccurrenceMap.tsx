// src/components/OccurrenceMap.tsx
'use client'
import { useEffect, useRef } from 'react'

interface MapReport {
  id: string
  protocol: string
  lat: number
  lng: number
  category_name: string
  category_icon: string
  address_hint: string
  status: string
}

export default function OccurrenceMap({ reports }: { reports: MapReport[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Import dinâmico do Leaflet (só no browser)
    import('leaflet').then(L => {
      import('leaflet/dist/leaflet.css')

      const map = L.map(mapRef.current!).setView([-22.885, -48.446], 13)
      mapInstance.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      const statusColor: Record<string,string> = {
        open:        '#ef4444',
        in_progress: '#f59e0b',
        resolved:    '#22c55e',
      }

      reports.forEach(r => {
        const color = statusColor[r.status] || '#6b7280'
        const icon = L.divIcon({
          html: `<div style="background:${color};width:32px;height:32px;
                      border-radius:50%;border:3px solid white;
                      display:flex;align-items:center;justify-content:center;
                      font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.3)">
                   ${r.category_icon}
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: ''
        })

        L.marker([r.lat, r.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;font-size:13px;min-width:180px">
              <p style="font-weight:600;margin:0 0 4px">${r.protocol}</p>
              <p style="margin:0 0 2px;color:#555">${r.category_name}</p>
              <p style="margin:0 0 6px;color:#777;font-size:11px">${r.address_hint}</p>
              <span style="background:${color};color:white;padding:2px 8px;
                           border-radius:10px;font-size:11px">
                ${r.status === 'open' ? 'Aberto' : r.status === 'in_progress' ? 'Em atendimento' : 'Resolvido'}
              </span>
            </div>
          `)
      })
    })

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [])

  return <div ref={mapRef} style={{ height: '500px', width: '100%', borderRadius: '12px' }} />
}