import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import MapaLoader from './MapaLoader'

export default async function MapaPage() {
  const supabase = createClient()
  
  const { data: reports } = await supabase
    .from('reports')
    .select('id, protocol, address_hint, status, location, categories(name,icon)')
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(200)

  // Tratamento do dado binário/JSON para coordenadas legíveis
  const mapReports = (reports || []).map((r: any) => {
    let lat = 0;
    let lng = 0;

    // Se o PostGIS/Supabase retornar como objeto GeoJSON
    if (r.location?.coordinates) {
      lng = r.location.coordinates[0];
      lat = r.location.coordinates[1];
    } 
    // Caso o dado venha como a String Hexadecimal que você enviou, 
    // o Supabase geralmente tenta converter para objeto. 
    // Se lat continuar 0, use r.location.lat se disponível.

    return {
      id: r.id,
      protocol: r.protocol,
      lat,
      lng,
      category_name: r.categories?.name ?? 'Geral',
      category_icon: r.categories?.icon ?? '📍',
      address_hint: r.address_hint ?? '',
      status: r.status,
    };
  }).filter(r => r.lat !== 0 && r.lat !== null);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-900">Mapa de Ocorrências</h1>
        <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">
          ← Voltar
        </Link>
      </div>

      <div className="flex-1 relative">
        <MapaLoader reports={mapReports} />
      </div>
    </main>
  )
}