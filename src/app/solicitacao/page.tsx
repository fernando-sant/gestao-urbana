'use client'
import { useEffect, useState } from 'react'
import { getUserReports } from '@/lib/reports'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  open:        { label: 'Aberto',      color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'Em Análise',  color: 'bg-blue-100 text-blue-700' },
  resolved:    { label: 'Resolvido',   color: 'bg-green-100 text-green-700' },
  rejected:    { label: 'Arquivado',   color: 'bg-gray-100 text-gray-700' },
}

export default function Minhassolicitacao() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserReports()
      .then(setReports)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando seus chamados...</div>

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
        <Link href="/registrar" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg">
          + Novo
        </Link>
      </header>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-2xl">
            <p className="text-gray-400">Você ainda não registrou nenhum problema.</p>
          </div>
        ) : (
          reports.map((report) => (
            <Link 
              key={report.id} 
              href={`/solicitacao/${report.id}`}
              className="block bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <span className="text-2xl">{report.categories?.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{report.categories?.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{report.address_hint}</p>
                  </div>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${STATUS_CONFIG[report.status].color}`}>
                  {STATUS_CONFIG[report.status].label}
                </span>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                <span className="text-[10px] text-gray-400">
                  Protocolo: <span className="font-mono">{report.protocol}</span>
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(report.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}