'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getReportDetails } from '@/lib/reports'
import Link from 'next/link'

const STATUS_BR: any = { 
  open: 'Aberto', in_progress: 'Em Análise', resolved: 'Resolvido', rejected: 'Cancelado' 
}

export default function DetalhePage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNova = searchParams.get('nova') === 'true'
  
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    getReportDetails(id as string)
      .then(setReport)
      .catch(() => router.push('/solicitacoes'))
  }, [id])

  if (!report) return <div className="p-10 text-center animate-pulse">Carregando detalhes...</div>

  return (
    <main className="max-w-md mx-auto p-4 pb-20">
      
      {/* Alerta de Sucesso se for uma nova solicitação */}
      {isNova && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-800 font-bold">Solicitação enviada!</h3>
            <p className="text-green-700 text-xs">
              O protocolo **{report.protocol}** foi gerado com sucesso. Você pode acompanhar o progresso nesta tela.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/solicitacoes')} className="text-blue-600 text-sm">
          ← Ver todas
        </button>
        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
          ID: {id?.toString().substring(0, 8)}...
        </span>
      </div>

      <section className="bg-white border rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{report.categories?.icon}</span>
          <div>
            <h1 className="text-xl font-bold">{report.categories?.name}</h1>
            <p className="text-xs text-gray-400">Criado em {new Date(report.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 p-2 rounded-lg border">
            <p className="text-[10px] text-gray-500 uppercase">Status</p>
            <p className="text-sm font-bold">{STATUS_BR[report.status]}</p>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg border">
            <p className="text-[10px] text-gray-500 uppercase">Prazo Est. (SLA)</p>
            <p className="text-sm font-bold">{report.categories?.sla_hours}h</p>
          </div>
        </div>

        <div className="text-sm space-y-3 pt-2">
          <p><strong>📍 Local:</strong> {report.address_hint}</p>
          {report.description && (
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <p className="text-gray-700">"{report.description}"</p>
            </div>
          )}
          {report.photo_url && (
            <img 
              src={report.photo_url} 
              className="rounded-xl w-full h-48 object-cover mt-2 border shadow-inner" 
              alt="Foto anexada" 
            />
          )}
        </div>
      </section>

      {/* Timeline Simplificada */}
      <h2 className="font-bold mb-4 ml-1 text-gray-700">Linha do Tempo</h2>
      <div className="relative ml-4 border-l-2 border-blue-100 pl-6 space-y-6">
        {report.report_history?.length === 0 && (
          <div className="relative">
            <div className="absolute -left-[33px] top-1 bg-blue-500 w-4 h-4 rounded-full border-4 border-white shadow-sm" />
            <p className="text-[10px] text-gray-400 font-medium">AGUARDANDO ANÁLISE</p>
            <p className="text-sm text-gray-600">Sua solicitação foi recebida e está na fila para triagem pela secretaria responsável.</p>
          </div>
        )}

        {report.report_history?.map((h: any) => (
          <div key={h.id} className="relative">
            <div className="absolute -left-[33px] top-1 bg-blue-500 w-4 h-4 rounded-full border-4 border-white shadow-sm" />
            <p className="text-[10px] text-gray-400">{new Date(h.created_at).toLocaleString()}</p>
            <p className="text-sm font-bold text-blue-900">{STATUS_BR[h.new_status]}</p>
            {h.note && (
              <div className="mt-1 p-2 bg-gray-50 rounded border text-xs text-gray-600">
                {h.note}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botão Flutuante para Voltar ou Novo Chamado */}
      <div className="fixed bottom-6 left-0 right-0 px-4 max-w-md mx-auto">
        <Link 
          href="/registrar"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white p-4 rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-transform"
        >
          <span>➕</span> Registrar outro problema
        </Link>
      </div>
    </main>
  )
}