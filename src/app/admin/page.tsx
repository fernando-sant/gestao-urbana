'use client'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const MapaLoader = dynamic(() => import('../mapa/MapaLoader'), { ssr: false })

export default function AdminDashboard() {
  const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data } = await supabase.rpc('get_reports_for_map')
    setReports(data || [])
    setLoading(false)
  }

  const total = reports.length
  const open = reports.filter(r => r.status === 'open').length
  const resolved = reports.filter(r => r.status === 'resolved').length

  const categoryMap: any = {}
  reports.forEach(r => {
    const key = r.category_name || 'Outros'
    categoryMap[key] = (categoryMap[key] || 0) + 1
  })

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name, value
  }))

  async function markResolved(id: string) {
    await supabase.from('reports')
      .update({ status: 'resolved' })
      .eq('id', id)

    fetchData()
  }

  if (loading) return <div className="p-6">Carregando...</div>

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white p-6 space-y-6">
        <div>
          <h1 className="text-lg font-bold">Prefeitura Digital</h1>
          <p className="text-xs text-gray-400">Gestão Urbana</p>
        </div>

        <nav className="space-y-3 text-sm">
          <div className="bg-slate-800 p-3 rounded-lg">📊 Dashboard</div>
          <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">📍 Ocorrências</div>
          <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">📈 Relatórios</div>
          <div className="hover:bg-slate-800 p-3 rounded-lg cursor-pointer">⚙️ Configurações</div>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Painel de Gestão Urbana
            </h2>
            <p className="text-sm text-gray-500">
              Monitoramento operacional em tempo real
            </p>
          </div>

          <div className="text-sm text-gray-500">
            Última atualização: agora
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">

          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <p className="text-xs text-gray-500 uppercase">Total de Ocorrências</p>
            <p className="text-3xl font-bold text-slate-900">{total}</p>
          </div>

          <div className="bg-yellow-50 p-5 rounded-xl border shadow-sm">
            <p className="text-xs text-gray-500 uppercase">Em Aberto</p>
            <p className="text-3xl font-bold text-yellow-700">{open}</p>
          </div>

          <div className="bg-green-50 p-5 rounded-xl border shadow-sm">
            <p className="text-xs text-gray-500 uppercase">Resolvidas</p>
            <p className="text-3xl font-bold text-green-700">{resolved}</p>
          </div>

        </div>

        {/* MAPA */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b font-semibold text-slate-700">
            Distribuição Geográfica das Ocorrências
          </div>

          <div className="h-[420px]">
            <MapaLoader reports={reports} />
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-2 gap-4">

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">
              Ocorrências por Categoria
            </h3>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              (Espaço para evolução temporal ou ranking de bairros)
            </p>
          </div>

        </div>

        {/* TABELA */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">

          <div className="p-4 border-b font-semibold text-slate-700">
            Fila Operacional de Ocorrências
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3 text-left">Protocolo</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Local</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">

                  <td className="p-3 font-mono text-xs">
                    {r.protocol}
                  </td>

                  <td>{r.category_name}</td>

                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      r.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                      r.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>

                  <td className="truncate max-w-[250px]">
                    {r.address_hint}
                  </td>

                  <td>
                    {r.status !== 'resolved' && (
                      <button
                        onClick={() => markResolved(r.id)}
                        className="text-green-600 font-bold hover:underline"
                      >
                        Marcar como resolvido
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>

        </div>

      </main>
    </div>
  )
}