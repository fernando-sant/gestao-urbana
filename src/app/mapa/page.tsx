import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import MapaLoader from './MapaLoader' // Importamos o novo Loader

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
  })).filter(r => r.lat !== 0)

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mapa de Ocorrências</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Serra Negra - SP</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">
          ← Voltar
        </Link>
      </div>

      <div className="flex-1 relative">
        {/* Usamos o Loader aqui */}
        <MapaLoader reports={mapReports} />
      </div>
    </main>
  )
}