'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import type { Transition } from 'framer-motion'
import {
  MapPin, Camera, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, X, AlertCircle, Navigation
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getCategories, getSubcategories, createReport } from '@/lib/reports'
import type { Category } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const SelectorMapa = dynamic(() => import('./SelectorMapa'), { ssr: false })

// ─── Tipos estritos ────────────────────────────────────────────────────────

type Step = 'categoria' | 'subcategoria' | 'localizacao' | 'detalhes' | 'confirmar'

interface LocationState {
  lat: number
  lng: number
  address: string
}

interface FormState {
  category:     Category | null
  subcategory:  Category | null
  location:     LocationState | null
  description:  string
  photoUrl:     string | null
  photoPreview: string | null
}

interface DraftState extends Omit<FormState, 'photoPreview'> {
  step: Step
}

// ─── Constantes ────────────────────────────────────────────────────────────

const STEPS: Step[] = ['categoria', 'subcategoria', 'localizacao', 'detalhes', 'confirmar']
const DRAFT_KEY = 'registrar_draft_v1'

const STEP_LABELS: Record<Step, string> = {
  categoria:    'Categoria',
  subcategoria: 'Detalhe',
  localizacao:  'Local',
  detalhes:     'Detalhes',
  confirmar:    'Confirmar',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function stepIndex(s: Step): number {
  return STEPS.indexOf(s)
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX_W = 800
      const ratio = Math.min(1, MAX_W / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem'))
        },
        'image/jpeg',
        0.7
      )
    }
    img.onerror = () => reject(new Error('Imagem inválida'))
    img.src = url
  })
}

function saveDraft(step: Step, form: FormState) {
  try {
    const draft: DraftState = {
      step,
      category:    form.category,
      subcategory: form.subcategory,
      location:    form.location,
      description: form.description,
      photoUrl:    form.photoUrl,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {}
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as DraftState) : null
  } catch {
    return null
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

// ─── Variantes de animação ─────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
}


const transition: Transition = { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }


// ─── Componentes auxiliares ────────────────────────────────────────────────

function CategorySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}
          className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-start gap-2 bg-red-50 border border-red-200
                 text-red-700 rounded-2xl p-3 text-sm mb-4"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70">
        <X size={14} />
      </button>
    </motion.div>
  )
}

interface StepProgressProps {
  current: Step
  visibleSteps: Step[]
}

function StepProgress({ current, visibleSteps }: StepProgressProps) {
  const idx = visibleSteps.indexOf(current)
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {visibleSteps.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5 flex-1">
          <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i <= idx ? 'bg-blue-600' : 'bg-slate-200'
          }`} />
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────

export default function RegistrarPage() {
  const router = useRouter()

  const [step, setStep]           = useState<Step>('categoria')
  const [direction, setDirection] = useState(1)
  const [categories, setCategories]     = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [catLoading, setCatLoading]     = useState(true)
  const [form, setForm] = useState<FormState>({
    category:    null,
    subcategory: null,
    location:    null,
    description: '',
    photoUrl:    null,
    photoPreview: null,
  })
  const [photoUploading, setPhotoUploading] = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [gpsLoading, setGpsLoading]         = useState(false)
  const [addressInput, setAddressInput]     = useState('')
  const [useMap, setUseMap]                 = useState(false)
  const prevStepRef = useRef<Step>('categoria')

  // Visibilidade dos steps na barra de progresso
  const visibleSteps: Step[] = form.subcategory !== null || subcategories.length > 0
    ? STEPS
    : STEPS.filter(s => s !== 'subcategoria')

  // ── Restaurar rascunho ──────────────────────────────────────────────────
  useEffect(() => {
    const draft = loadDraft()
    if (!draft) return
    setForm(prev => ({
      ...prev,
      category:    draft.category,
      subcategory: draft.subcategory,
      location:    draft.location,
      description: draft.description,
      photoUrl:    draft.photoUrl,
      photoPreview: draft.photoUrl ?? null,
    }))
    setStep(draft.step)
  }, [])

  // ── Salvar rascunho ao mudar ────────────────────────────────────────────
  useEffect(() => {
    saveDraft(step, form)
  }, [step, form])

  // ── Carregar categorias ─────────────────────────────────────────────────
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setError('Erro ao carregar categorias. Tente novamente.'))
      .finally(() => setCatLoading(false))
  }, [])

  // ── Navegação entre steps ───────────────────────────────────────────────
  const goTo = useCallback((next: Step) => {
    const dir = stepIndex(next) > stepIndex(prevStepRef.current) ? 1 : -1
    setDirection(dir)
    prevStepRef.current = next
    setStep(next)
    setError(null)
  }, [])

  function goBack() {
    if (step === 'subcategoria') return goTo('categoria')
    if (step === 'localizacao')  return goTo(subcategories.length > 0 ? 'subcategoria' : 'categoria')
    if (step === 'detalhes')     return goTo('localizacao')
    if (step === 'confirmar')    return goTo('detalhes')
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleCategorySelect(cat: Category) {
    setForm(prev => ({ ...prev, category: cat, subcategory: null }))
    setError(null)
    try {
      const subs = await getSubcategories(cat.id)
      setSubcategories(subs ?? [])
      goTo(subs && subs.length > 0 ? 'subcategoria' : 'localizacao')
    } catch {
      setSubcategories([])
      goTo('localizacao')
    }
  }

  function handleSubcategorySelect(sub: Category | null) {
    setForm(prev => ({ ...prev, subcategory: sub }))
    goTo('localizacao')
  }

  async function handleGPS() {
    setGpsLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(prev => ({
          ...prev,
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: 'Localização atual (GPS)',
          },
        }))
        setGpsLoading(false)
        goTo('detalhes')
      },
      () => {
        setError('Não foi possível obter o GPS. Use o mapa ou digite o endereço.')
        setGpsLoading(false)
      },
      { timeout: 10000 }
    )
  }

  function handleAddressConfirm() {
    if (!addressInput.trim()) return
    setForm(prev => ({
      ...prev,
      location: { lat: 0, lng: 0, address: addressInput.trim() },
    }))
    goTo('detalhes')
  }

  function handleMapSelect(loc: LocationState) {
    setForm(prev => ({ ...prev, location: loc }))
  }

  function confirmMapLocation() {
    if (!form.location) return
    goTo('detalhes')
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Foto muito grande. Máximo 10 MB.')
      return
    }
    setError(null)
    setPhotoUploading(true)
    const preview = URL.createObjectURL(file)
    setForm(prev => ({ ...prev, photoPreview: preview, photoUrl: null }))
    try {
      const compressed = await compressImage(file)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Faça login para anexar foto.'); setPhotoUploading(false); return }
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('report-photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage
        .from('report-photos').getPublicUrl(path)
      setForm(prev => ({ ...prev, photoUrl: publicUrl }))
    } catch {
      setError('Erro ao enviar foto. Tente novamente.')
      setForm(prev => ({ ...prev, photoPreview: null, photoUrl: null }))
    } finally {
      setPhotoUploading(false)
    }
  }

  function removePhoto() {
    setForm(prev => ({ ...prev, photoUrl: null, photoPreview: null }))
  }

  async function handleSubmit() {
    if (!form.category || !form.location) return
    setSubmitting(true)
    setError(null)
    try {
      const report = await createReport({
        category_id: form.subcategory?.id ?? form.category.id,
        lat: form.location.lat,
        lng: form.location.lng,
        address_hint: form.location.address,
        city: 'Botucatu',
        description: form.description.trim() || undefined,
        photo_url: form.photoUrl || undefined,
      })
      clearDraft()
      router.push(`/solicitacao/${report.id}?nova=true`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar solicitação.'
      setError(msg)
      setSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-slate-50 flex flex-col items-center justify-start min-h-[100dvh]">
      <div className="w-full max-w-2xl flex flex-col min-h-[100dvh] bg-white
                      md:min-h-0 md:my-8 md:rounded-[2rem] md:shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-slate-100">
          {step !== 'categoria' ? (
            <button
              onClick={goBack}
              className="p-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-all">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
          ) : (
            <a href="/"
              className="p-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-all">
              <ChevronLeft size={20} className="text-slate-600" />
            </a>
          )}
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800">Nova solicitação</h1>
            <p className="text-xs text-slate-400">{STEP_LABELS[step]}</p>
          </div>
          {/* Indicador de rascunho salvo */}
          <span className="text-xs text-slate-300 select-none">rascunho salvo</span>
        </div>

        {/* Barra de progresso */}
        <div className="px-5 pt-4">
          <StepProgress current={step} visibleSteps={visibleSteps} />
        </div>

        {/* Erro */}
        <div className="px-5">
          <AnimatePresence>
            {error && (
              <ErrorBanner message={error} onClose={() => setError(null)} />
            )}
          </AnimatePresence>
        </div>

        {/* Conteúdo com animação slide */}
        <div className="flex-1 overflow-hidden relative px-5 pb-6">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="w-full"
            >

              {/* ── PASSO 1: Categoria ─────────────────────────────────── */}
              {step === 'categoria' && (
                <div className="pt-2">
                  <p className="text-sm text-slate-500 mb-4">
                    Qual é o tipo do problema?
                  </p>
                  {catLoading ? <CategorySkeleton /> : (
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map(cat => (
                        <button key={cat.id}
                          onClick={() => handleCategorySelect(cat)}
                          className="flex flex-col items-center gap-2 p-4 border border-slate-200
                                     rounded-2xl hover:border-blue-400 hover:bg-blue-50
                                     hover:shadow-md active:scale-95 transition-all text-left
                                     group">
                          <span className="text-3xl group-hover:scale-110 transition-transform">
                            {cat.icon}
                          </span>
                          <span className="text-sm font-medium text-slate-700 text-center leading-tight">
                            {cat.name}
                          </span>
                          <span className="text-[11px] text-slate-400">SLA {cat.sla_hours}h</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── PASSO 2: Subcategoria ──────────────────────────────── */}
              {step === 'subcategoria' && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{form.category?.icon}</span>
                    <div>
                      <p className="text-xs text-slate-400">Categoria selecionada</p>
                      <p className="text-sm font-medium text-slate-700">{form.category?.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Qual é o problema específico?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {subcategories.map(sub => (
                      <button key={sub.id}
                        onClick={() => handleSubcategorySelect(sub)}
                        className={`flex flex-col items-center gap-2 p-4 border rounded-2xl
                                   hover:border-blue-400 hover:bg-blue-50 hover:shadow-md
                                   active:scale-95 transition-all group
                                   ${form.subcategory?.id === sub.id
                                     ? 'border-blue-500 bg-blue-50'
                                     : 'border-slate-200'}`}>
                        <span className="text-3xl group-hover:scale-110 transition-transform">
                          {sub.icon}
                        </span>
                        <span className="text-sm font-medium text-slate-700 text-center leading-tight">
                          {sub.name}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSubcategorySelect(null)}
                    className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600
                               py-3 rounded-2xl hover:bg-slate-50 transition-all">
                    Nenhuma opção se encaixa →
                  </button>
                </div>
              )}

              {/* ── PASSO 3: Localização ───────────────────────────────── */}
              {step === 'localizacao' && (
                <div className="pt-2 space-y-3">
                  <p className="text-sm text-slate-500">Onde está o problema?</p>

                  {/* GPS */}
                  <button
                    onClick={handleGPS}
                    disabled={gpsLoading}
                    className="w-full flex items-center justify-center gap-2 p-4
                               bg-gradient-to-r from-blue-600 to-indigo-700
                               text-white rounded-2xl font-medium shadow-sm
                               hover:shadow-lg active:scale-[0.98] disabled:opacity-60
                               transition-all">
                    {gpsLoading
                      ? <Loader2 size={18} className="animate-spin" />
                      : <Navigation size={18} />}
                    {gpsLoading ? 'Obtendo localização...' : 'Usar minha localização (GPS)'}
                  </button>

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400">ou</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Toggle mapa / endereço */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUseMap(false)}
                      className={`flex-1 py-2.5 text-sm rounded-2xl border transition-all
                                 ${!useMap
                                   ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                   : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      Digitar endereço
                    </button>
                    <button
                      onClick={() => setUseMap(true)}
                      className={`flex-1 py-2.5 text-sm rounded-2xl border transition-all
                                 ${useMap
                                   ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                   : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      Usar mapa
                    </button>
                  </div>

                  {!useMap ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={addressInput}
                        onChange={e => setAddressInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddressConfirm()}
                        placeholder="Ex: Rua das Flores, 120 — próx. ao mercado"
                        className="w-full border border-slate-200 rounded-2xl px-4 py-3
                                   text-sm focus:outline-none focus:ring-2 focus:ring-blue-300
                                   bg-slate-50 placeholder:text-slate-400"
                      />
                      <button
                        onClick={handleAddressConfirm}
                        disabled={!addressInput.trim()}
                        className="w-full border border-blue-500 text-blue-600 py-3
                                   rounded-2xl text-sm font-medium hover:bg-blue-50
                                   active:scale-[0.98] disabled:opacity-40 transition-all">
                        Confirmar endereço →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SelectorMapa onSelect={handleMapSelect} />
                      {form.location && (
                        <p className="text-xs text-slate-400 text-center">
                          {form.location.address}
                        </p>
                      )}
                      <button
                        onClick={confirmMapLocation}
                        disabled={!form.location}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-700
                                   text-white py-3 rounded-2xl text-sm font-medium shadow-sm
                                   hover:shadow-lg active:scale-[0.98] disabled:opacity-40
                                   transition-all flex items-center justify-center gap-2">
                        <MapPin size={16} />
                        Confirmar local no mapa
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── PASSO 4: Detalhes ──────────────────────────────────── */}
              {step === 'detalhes' && (
                <div className="pt-2 space-y-4">
                  <p className="text-sm text-slate-500">Detalhes adicionais (opcionais)</p>

                  <div>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      maxLength={500}
                      placeholder="Descreva brevemente o problema..."
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3
                                 text-sm resize-none h-28 bg-slate-50 placeholder:text-slate-400
                                 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <p className="text-xs text-slate-400 text-right mt-1">
                      {form.description.length}/500
                    </p>
                  </div>

                  {/* Foto */}
                  {!form.photoPreview ? (
                    <label className="flex items-center justify-center gap-2 p-5
                                      border-2 border-dashed border-slate-200 rounded-2xl
                                      cursor-pointer hover:border-blue-400 hover:bg-blue-50
                                      transition-all group">
                      <Camera size={18} className="text-slate-400 group-hover:text-blue-500" />
                      <span className="text-sm text-slate-500 group-hover:text-blue-600">
                        Anexar foto (opcional)
                      </span>
                      <input
                        type="file" accept="image/*" capture="environment"
                        className="hidden" onChange={handlePhoto}
                      />
                    </label>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden">
                      <img
                        src={form.photoPreview}
                        className="w-full h-48 object-cover"
                        alt="Preview"
                      />
                      {photoUploading && (
                        <div className="absolute inset-0 bg-white/70 flex flex-col
                                        items-center justify-center gap-2">
                          <Loader2 size={24} className="animate-spin text-blue-600" />
                          <span className="text-xs text-slate-600">Enviando foto...</span>
                        </div>
                      )}
                      {!photoUploading && (
                        <button
                          onClick={removePhoto}
                          className="absolute top-2 right-2 bg-white/90 text-slate-600
                                     p-1.5 rounded-xl hover:bg-white transition shadow-sm">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => goTo('confirmar')}
                    disabled={photoUploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700
                               text-white py-4 rounded-2xl font-medium shadow-sm
                               hover:shadow-lg active:scale-[0.98] disabled:opacity-60
                               transition-all flex items-center justify-center gap-2">
                    Continuar
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* ── PASSO 5: Confirmar ─────────────────────────────────── */}
              {step === 'confirmar' && (
                <div className="pt-2 space-y-4">
                  <p className="text-sm text-slate-500">Revise antes de enviar:</p>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">

                    {/* Categoria */}
                    <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                      <span className="text-2xl">
                        {form.subcategory?.icon ?? form.category?.icon}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Problema</p>
                        <p className="text-sm font-medium text-slate-700">{form.category?.name}</p>
                        {form.subcategory && (
                          <p className="text-xs text-slate-500">{form.subcategory.name}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        SLA {form.subcategory?.sla_hours ?? form.category?.sla_hours}h
                      </span>
                    </div>

                    {/* Local */}
                    <div className="flex items-start gap-3 p-4 border-b border-slate-100">
                      <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Localização</p>
                        <p className="text-sm text-slate-700">{form.location?.address}</p>
                      </div>
                    </div>

                    {/* Descrição */}
                    {form.description && (
                      <div className="p-4 border-b border-slate-100">
                        <p className="text-xs text-slate-400 mb-1">Descrição</p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {form.description}
                        </p>
                      </div>
                    )}

                    {/* Foto */}
                    {form.photoPreview && (
                      <div className="p-4">
                        <p className="text-xs text-slate-400 mb-2">Foto</p>
                        <img
                          src={form.photoPreview}
                          className="rounded-xl w-full h-36 object-cover"
                          alt="Foto da ocorrência"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (!!form.photoPreview && !form.photoUrl)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700
                               text-white py-4 rounded-2xl font-semibold text-base shadow-sm
                               hover:shadow-lg active:scale-[0.98] disabled:opacity-60
                               transition-all flex items-center justify-center gap-2">
                    {submitting
                      ? <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                      : <><CheckCircle2 size={18} /> Enviar solicitação</>}
                  </button>

                  {form.photoPreview && !form.photoUrl && (
                    <p className="text-xs text-center text-slate-400">
                      Aguardando upload da foto...
                    </p>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}