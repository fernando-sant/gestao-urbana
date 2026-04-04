// src/app/mapa/MapaClient.tsx
'use client'
import dynamic from 'next/dynamic'

const OccurrenceMap = dynamic(() => import('@/components/OccurrenceMap'), { ssr: false })

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

export default function MapaClient({ reports }: { reports: MapReport[] }) {
  return (
    <>
      <OccurrenceMap reports={reports} />
      <div className="flex gap-4 mt-3 text-sm text-gray-600">
        <span>🔴 Aberto</span>
        <span>🟡 Em atendimento</span>
        <span>🟢 Resolvido</span>
      </div>
    </>
  )
}