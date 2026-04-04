import MapaClient from './MapaClient'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

// Força a revalidação dos dados a cada 60 segundos (opcional)
export const revalidate = 60 

export default async function MapaPage() {
  const supabase = createClient()

  // Buscamos os dados com um join eficiente
  const { data: reports, error } = await supabase
    .from('reports')
    .select(`
      id, 
      protocol, 
      address_hint, 
      status, 
      location, 
      created_at,
      categories(name, icon)
    `)
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500">Erro ao carregar o mapa. Tente novamente mais tarde.</p>
      </div>
    )
  }

  // Transformação de dados com tratamento de nulos
  const mapReports = (reports || []).map((r: any) => ({
    id: r.id,
    protocol: r.protocol,
    // O PostGIS retorna [lng, lat], garantimos a ordem correta aqui
    lat: r.location?.coordinates?.[1] ?? 0,
    lng: r.location?.coordinates?.[0] ?? 0,
    category_name: r.categories?.name ?? 'Outros',
    category_icon: r.categories?.icon ?? '📋',
    address_hint: r.address_hint ?? 'Endereço não informado',
    status: r.status,
    date: new Date(r.created_at).toLocaleDateString('pt-BR')
  })).filter(r => r.lat !== 0) // Remove pontos sem coordenada válida

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header do Mapa */}
      <div className="bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-blue-600">📍</span> Mapa de Ocorrências
          </h1>
          <p className="text-sm text-slate-500">
            Visualize os {mapReports.length} chamados ativos na cidade.
          </p>
        </div>
        
        <Link 
          href="/registrar" 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all text-center shadow-lg shadow-blue-200"
        >
          + Registrar Problema
        </Link>
      </div>

      {/* Área do Mapa (Ocupa o resto da tela) */}
      <div className="flex-1 relative">
        <MapaClient reports={mapReports} />
      </div>
    </main>
  )
}