import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import MapaLoader from './MapaLoader'

export default async function MapaPage() {
  const supabase = createClient()
  
  // Chamando a função RPC que criamos no SQL
  const { data: reports, error } = await supabase.rpc('get_reports_for_map')

  if (error) {
    console.error("Erro ao carregar dados do mapa:", error)
  }

  // Agora os dados já vêm formatados da RPC, não precisa de mapeamento complexo
  const mapReports = (reports || [])
  .map((r: any) => ({
    id: r.id,
    protocol: r.protocol,
    lat: Number(r.lat),
    lng: Number(r.lng),
    category_name: r.category_name,
    category_icon: r.category_icon,
    address_hint: r.address_hint,
    status: r.status,
  }))
  .filter((r: any) => !isNaN(r.lat) && !isNaN(r.lng))

  return (
    <main className="min-h-screen flex flex-col">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
        <h1 className="text-xl font-bold">Mapa de Serra Negra</h1>
        <Link href="/" className="text-blue-600 font-bold text-sm">← Sair</Link>
      </div>

      <div className="flex-1 relative">
        <MapaLoader reports={mapReports} />
      </div>
    </main>
  )
}