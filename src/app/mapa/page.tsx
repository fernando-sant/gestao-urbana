// src/app/mapa/page.tsx  ← Server Component (busca dados)
import MapaClient from './MapaClient'
import { createClient } from '@/lib/supabase'

export default async function MapaPage() {
  const supabase = createClient()
  const { data: reports } = await supabase
    .from('reports')
    .select('id, protocol, address_hint, status, location, categories(name,icon)')
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(200)

  const mapReports = (reports || []).map((r: any) => ({
    id: r.id,
    protocol: r.protocol,
    lat: r.location?.coordinates?.[1] ?? 0,
    lng: r.location?.coordinates?.[0] ?? 0,
    category_name: r.categories?.name ?? '',
    category_icon: r.categories?.icon ?? '📋',
    address_hint: r.address_hint ?? '',
    status: r.status,
  }))

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Mapa de ocorrências</h1>
      <MapaClient reports={mapReports} />
    </main>
  )
}