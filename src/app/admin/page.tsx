'use client'
import { useEffect, useState } from 'react'
import { getAllReports, updateReportStatus } from '@/lib/reports'

const STATUS_COLORS: any = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

export default function AdminDashboard() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    const data = await getAllReports()
    setReports(data)
    setLoading(false)
  }

  async function handleStatusChange(report: any, nextStatus: string) {
    const note = prompt('Deseja adicionar uma observação para o cidadão?') || ''
    try {
      await updateReportStatus(report.id, nextStatus, report.status, note)
      alert('Status atualizado!')
      loadReports() // Recarrega a lista
    } catch (err) {
      alert('Erro ao atualizar. Você tem permissão de gestor?')
    }
  }

  if (loading) return <div className="p-10 text-center">Carregando painel...</div>

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold italic text-blue-900">Gestão Urbana 🏙️</h1>
        <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-500">Painel Administrativo</span>
      </div>

      <div className="overflow-x-auto bg-white border rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Protocolo</th>
              <th className="p-4">Cidadão / Categoria</th>
              <th className="p-4">Status Atual</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-mono text-xs">{r.protocol}</td>
                <td className="p-4">
                  <div className="font-medium text-gray-900">{r.profiles?.full_name || 'Anônimo'}</div>
                  <div className="text-gray-500 flex items-center gap-1">
                    {r.categories?.icon} {r.categories?.name}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-4">
                  <select 
                    className="border rounded-lg p-1 text-xs outline-none focus:ring-2 focus:ring-blue-300"
                    value={r.status}
                    onChange={(e) => handleStatusChange(r, e.target.value)}
                  >
                    <option value="open">Abrir</option>
                    <option value="in_progress">Analisar</option>
                    <option value="resolved">Resolver</option>
                    <option value="rejected">Recusar</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}