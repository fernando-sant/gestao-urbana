'use client'
import dynamic from 'next/dynamic'

// Aqui o dynamic funciona porque este arquivo é um Client Component ('use client')
const MapaClient = dynamic(() => import('./MapaClient'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-medium">
      Carregando mapa em Serra Negra...
    </div>
  )
})

export default function MapaLoader({ reports }: { reports: any[] }) {
  return <MapaClient reports={reports} />
}