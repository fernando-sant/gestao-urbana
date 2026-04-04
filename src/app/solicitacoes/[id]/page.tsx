'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getReportDetails } from '@/lib/reports'

const STATUS_BR: any = { 
  open: 'Aberto', in_progress: 'Em Análise', resolved: 'Resolvido', rejected: 'Cancelado' 
}

export default function DetalhePage() {
  const { id } = useParams()
  const router = useRouter()
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    getReportDetails(id as string).then(setReport).catch(() => router.push('/solicitacoes'))
  }, [id])

  if (!report) return <div className="p-10 text-center">Carregando detalhes...</div>

  return (
    <main className="max-w-md mx-auto p-4 pb-20">
      <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4">← Voltar</button>

      <section className="bg-white border rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{report.categories?.icon}</span>
          <div>
            <h1 className="text-xl font-bold">{report.categories?.name}</h1>
            <p className="text-xs text-gray-400">Protocolo: {report.protocol}</p>
          </div>
        </div>
        <div className="text-sm space-y-2 border-t pt-4">
          <p><strong>Status:</strong> {STATUS_BR[report.status]}</p>
          <p><strong>Local:</strong> {report.address_hint}</p>
          {report.description && <p className="text-gray-600 italic">"{report.description}"</p>}
        </div>
      </section>

      <h2 className="font-bold mb-4 ml-1 text-gray-700">Histórico</h2>
      <div className="relative ml-4 border-l-2 border-blue-100 pl-6 space-y-8">
        {/* Item de Criação */}
        <div className="relative">
          <div className="absolute -left-[33px] top-1 bg-blue-500 w-4 h-4 rounded-full border-4 border-white" />
          <p className="text-[10px] text-gray-400">{new Date(report.created_at).toLocaleString()}</p>
          <p className="text-sm font-medium">Solicitação enviada</p>
        </div>

        {/* Histórico do Banco */}
        {report.report_history?.map((h: any) => (
          <div key={h.id} className="relative">
            <div className="absolute -left-[33px] top-1 bg-blue-500 w-4 h-4 rounded-full border-4 border-white" />
            <p className="text-[10px] text-gray-400">{new Date(h.created_at).toLocaleString()}</p>
            <p className="text-sm font-medium italic text-blue-600">{STATUS_BR[h.new_status]}</p>
            {h.note && <p className="text-xs bg-gray-50 p-2 rounded mt-1 border">{h.note}</p>}
          </div>
        ))}
      </div>
    </main>
  )
}