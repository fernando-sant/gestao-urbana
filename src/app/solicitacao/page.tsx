// src/app/minhas-solicitacoes/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, ClipboardList, ChevronRight, Clock } from 'lucide-react'
import { getUserReports } from '@/lib/reports'
import type { Report, Category, ReportStatus } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────

interface ReportWithCategory extends Omit<Report, 'categories'> {
  categories: Category
}

// ─── Constantes ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReportStatus, {
  label: string
  bg: string
  text: string
  dot: string
}> = {
  open:        { label: 'Aberto',       bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  in_progress: { label: 'Em análise',   bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'  },
  resolved:    { label: 'Resolvido',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  rejected:    { label: 'Arquivado',    bg: 'bg-slate-100', text: 'text-slate-500',  dot: 'bg-slate-400' },
}

const FILTER_OPTIONS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'Todos'      },
  { value: 'open',       label: 'Abertos'    },
  { value: 'in_progress',label: 'Em análise' },
  { value: 'resolved',   label: 'Resolvidos' },
  { value: 'rejected',   label: 'Arquivados' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60)  return `há ${mins}min`
  if (hours < 24)  return `há ${hours}h`
  if (days  < 30)  return `há ${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

// ─── Sub-componentes ──────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 bg-slate-100 rounded-full w-2/3" />
          <div className="h-3 bg-slate-100 rounded-full w-1/2" />
        </div>
        <div className="h-6 w-20 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-px bg-slate-50" />
      <div className="flex justify-between">
        <div className="h-3 bg-slate-100 rounded-full w-28" />
        <div className="h-3 bg-slate-100 rounded-full w-16" />
      </div>
    </div>
  )
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-6
                 bg-white border-2 border-dashed border-slate-200 rounded-3xl"
    >
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <ClipboardList size={28} className="text-slate-300" />
      </div>
      <p className="text-slate-600 font-medium text-center mb-1">
        {filter === 'all'
          ? 'Nenhuma solicitação ainda'
          : `Nenhum chamado com status "${FILTER_OPTIONS.find(f => f.value === filter)?.label}"`}
      </p>
      <p className="text-slate-400 text-sm text-center">
        {filter === 'all'
          ? 'Registre o primeiro problema da sua cidade.'
          : 'Tente outro filtro.'}
      </p>
    </motion.div>
  )
}

interface ReportCardProps {
  report: ReportWithCategory
  index: number
}

function ReportCard({ report, index }: ReportCardProps) {
  const router = useRouter()
  const cfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.open

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 340, damping: 30 }}
    >
      <button
        onClick={() => router.push(`/solicitacao/${report.id}`)}
        className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4
                   hover:border-blue-200 hover:shadow-md active:scale-[0.98]
                   transition-all group"
      >
        {/* Linha superior */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl
                          flex items-center justify-center text-2xl shrink-0
                          group-hover:border-blue-100 transition-colors">
            {report.categories?.icon ?? '📋'}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
              {report.categories?.name ?? 'Ocorrência'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {report.address_hint || 'Localização registrada'}
            </p>
          </div>

          {/* Badge de status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl shrink-0
                          ${cfg.bg}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span className={`text-[11px] font-semibold ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Linha inferior */}
        <div className="flex items-center justify-between mt-3 pt-3
                        border-t border-slate-50">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                Protocolo
              </p>
              <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                {report.protocol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-slate-300" />
            <span className="text-[11px] text-slate-400">
              {timeAgo(report.created_at)}
            </span>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400
                                               group-hover:translate-x-0.5 transition-all ml-1" />
          </div>
        </div>
      </button>
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function MinhasSolicitacoesPage() {
  const router = useRouter()
  const [reports, setReports]   = useState<ReportWithCategory[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<ReportStatus | 'all'>('all')
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    getUserReports()
      .then(data => setReports(data as ReportWithCategory[]))
      .catch(() => setError('Não foi possível carregar seus chamados.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter)

  // Contagem por status para os filtros
  const counts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    acc.all = (acc.all ?? 0) + 1
    return acc
  }, { all: 0 })

  return (
    <div className="bg-slate-50 min-h-[100dvh]">
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-[100dvh]
                      md:min-h-0 md:my-8 md:rounded-[2rem] md:shadow-xl
                      bg-white overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-all">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>

            <button
              onClick={() => router.push('/registrar')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                         bg-gradient-to-r from-blue-600 to-indigo-700
                         text-white text-sm font-medium shadow-sm
                         hover:shadow-lg active:scale-95 transition-all">
              <Plus size={15} />
              Novo registro
            </button>
          </div>

          <h1 className="text-xl font-semibold text-slate-800">Minhas solicitações</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Serra Negra · {reports.length} {reports.length === 1 ? 'chamado' : 'chamados'}
          </p>
        </div>

        {/* Filtros */}
        <div className="px-5 py-3 border-b border-slate-100 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {FILTER_OPTIONS.map(opt => {
              const count = counts[opt.value] ?? 0
              const active = filter === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs
                             font-medium whitespace-nowrap transition-all active:scale-95
                             ${active
                               ? 'bg-blue-600 text-white shadow-sm'
                               : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {opt.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md
                                     ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                            rounded-2xl p-4 text-center">
              {error}
            </div>
          )}

          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <EmptyState key="empty" filter={filter} />
              ) : (
                <motion.div
                  key={filter}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {filtered.map((report, i) => (
                    <ReportCard key={report.id} report={report} index={i} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}