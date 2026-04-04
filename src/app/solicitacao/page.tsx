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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-gray-500">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      Carregando seus chamados...
    </div>
  )

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen bg-slate-50">
      {/* HEADER CORRIGIDO COM BOTÃO VOLTAR */}
      <header className="flex flex-col gap-4 mb-6 pt-2">
        <div className="flex justify-between items-center">
          <Link 
            href="/" 
            className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline transition-all"
          >
            ← Voltar ao Início
          </Link>
          <Link href="/registrar" className="text-xs bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-blue-100 active:scale-95 transition-all">
            + Novo Registro
          </Link>
        </div>
        
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Minhas Solicitações</h1>
          <p className="text-xs text-slate-500">Acompanhe o andamento dos seus protocolos em Serra Negra.</p>
        </div>
      </header>

      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl px-6">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-slate-500 font-medium">Você ainda não registrou nenhum problema.</p>
            <Link href="/registrar" className="text-blue-600 text-sm font-bold mt-2 block underline">
              Começar agora
            </Link>
          </div>
        ) : (
          reports.map((report) => (
            <Link 
              key={report.id} 
              href={`/solicitacao/${report.id}`}
              className="block bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-100 transition-all active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl border border-slate-100">
                    {report.categories?.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{report.categories?.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">📍 {report.address_hint}</p>
                  </div>
                </div>
                <span className={`text-[9px] uppercase font-black px-2 py-1 rounded-lg tracking-wider ${STATUS_CONFIG[report.status]?.color || 'bg-gray-100'}`}>
                  {STATUS_CONFIG[report.status]?.label || 'Status'}
                </span>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                <div className="flex flex-col">
                   <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Protocolo</span>
                   <span className="text-[11px] font-mono font-bold text-slate-700">{report.protocol}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-md">
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