// src/app/mapa/page.tsx  ← rota pública /mapa
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'

const OccurrenceMap = dynamic(() => import('@/components/OccurrenceMap'), { ssr: false })

export default async function MapaPage() {
  const supabase = createClient()
  const { data: reports } = await supabase
    .from('reports')
    .select('id, protocol, address_hint, status, location, categories(name,icon)')
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(200)

  const mapReports = (reports || []).map((r: any) => {
    const coords = r.location  // PostGIS retorna { type:'Point', coordinates:[lng,lat] }
    return {
      id: r.id,
      protocol: r.protocol,
      lat: coords?.coordinates?.[1] ?? 0,
      lng: coords?.coordinates?.[0] ?? 0,
      category_name: r.categories?.name ?? '',
      category_icon: r.categories?.icon ?? '📋',
      address_hint: r.address_hint ?? '',
      status: r.status,
    }
  })

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Mapa de ocorrências</h1>
      <OccurrenceMap reports={mapReports} />
      <div className="flex gap-4 mt-3 text-sm text-gray-600">
        <span>🔴 Aberto</span>
        <span>🟡 Em atendimento</span>
        <span>🟢 Resolvido</span>
      </div>
    </main>
  )
}