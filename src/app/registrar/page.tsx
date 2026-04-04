// src/app/registrar/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { createReport, getCategories, getSubcategories } from '@/lib/reports'
import type { Category } from '@/lib/supabase'

type Step = 'categoria' | 'subcategoria' | 'localizacao' | 'detalhes' | 'confirmar'

const STEP_INDEX: Record<Step, number> = {
  categoria: 0, subcategoria: 1, localizacao: 2, detalhes: 3, confirmar: 4
}

export default function RegistrarPage() {
  const router = useRouter()
  const [step, setStep]               = useState<Step>('categoria')
  const [categories, setCategories]   = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [category, setCategory]       = useState<Category | null>(null)
  const [subcategory, setSubcategory] = useState<Category | null>(null)
  const [location, setLocation]       = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [addressInput, setAddressInput] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl]       = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [gpsLoading, setGpsLoading]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setError('Erro ao carregar categorias'))
  }, [])

  async function handleCategorySelect(cat: Category) {
    setCategory(cat)
    setSubcategory(null)
    setError(null)
    try {
      const subs = await getSubcategories(cat.id)
      if (subs && subs.length > 0) {
        setSubcategories(subs)
        setStep('subcategoria')
      } else {
        setSubcategories([])
        setStep('localizacao')
      }
    } catch {
      setSubcategories([])
      setStep('localizacao')
    }
  }

  function getPrevStep(current: Step): Step {
    if (current === 'subcategoria') return 'categoria'
    if (current === 'localizacao')  return subcategories.length > 0 ? 'subcategoria' : 'categoria'
    if (current === 'detalhes')     return 'localizacao'
    if (current === 'confirmar')    return 'detalhes'
    return 'categoria'
  }

  async function useGPS() {
    setGpsLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Localização atual (GPS)',
        })
        setGpsLoading(false)
        setStep('detalhes')
      },
      () => {
        setError('Não foi possível obter o GPS. Digite o endereço manualmente.')
        setGpsLoading(false)
      },
      { timeout: 10000 }
    )
  }

  function handleAddressConfirm() {
    if (!addressInput.trim()) return
    setLocation({ lat: 0, lng: 0, address: addressInput.trim() })
    setStep('detalhes')
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Foto muito grande. Máximo 5 MB.')
      return
    }
    setError(null)
    const preview = URL.createObjectURL(file)
    setPhotoPreview(preview)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Você precisa estar logado para anexar foto.'); return }
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) { setError('Erro ao enviar foto.'); return }
      const { data: { publicUrl } } = supabase.storage
        .from('report-photos')
        .getPublicUrl(path)
      setPhotoUrl(publicUrl)
    } catch {
      setError('Erro ao enviar foto.')
    }
  }

  function removePhoto() {
    setPhotoUrl(null)
    setPhotoPreview(null)
  }

  async function handleSubmit() {
    if (!category || !location) return
    setLoading(true)
    setError(null)
    try {
      const report = await createReport({
        category_id: subcategory?.id ?? category.id,
        lat: location.lat,
        lng: location.lng,
        address_hint: location.address,
        city: 'Botucatu',
        description: description.trim() || undefined,
        photo_url: photoUrl || undefined,
      })
      router.push(`/solicitacao/${report.id}?nova=true`)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao enviar solicitação.')
      setLoading(false)
    }
  }

  const currentStepIndex = STEP_INDEX[step]
  const totalSteps = 5

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        {step !== 'categoria' ? (
          <button
            onClick={() => setStep(getPrevStep(step))}
            className="text-sm text-blue-600 hover:underline">
            ← Voltar
          </button>
        ) : (
          <a href="/" className="text-sm text-blue-600 hover:underline">← Início</a>
        )}
        <h1 className="text-lg font-semibold">Nova solicitação</h1>
      </div>

      {/* Barra de progresso */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
            i <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Erro global */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {/* PASSO 1 — Categoria */}
      {step === 'categoria' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Qual é o tipo do problema?</p>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Carregando categorias...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => handleCategorySelect(cat)}
                  className="flex flex-col items-center gap-2 p-4 border rounded-xl
                             hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-center">{cat.name}</span>
                  <span className="text-xs text-gray-400">SLA: {cat.sla_hours}h</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PASSO 2 — Subcategoria */}
      {step === 'subcategoria' && (
        <div>
          <p className="text-sm text-gray-500 mb-1">
            Categoria: <strong>{category?.name}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-4">Qual é o problema específico?</p>
          <div className="grid grid-cols-2 gap-3">
            {subcategories.map(sub => (
              <button key={sub.id}
                onClick={() => { setSubcategory(sub); setStep('localizacao') }}
                className={`flex flex-col items-center gap-2 p-4 border rounded-xl
                           hover:border-blue-500 hover:bg-blue-50 transition-all
                           ${subcategory?.id === sub.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                <span className="text-3xl">{sub.icon}</span>
                <span className="text-sm font-medium text-center">{sub.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setSubcategory(null); setStep('localizacao') }}
            className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2">
            Nenhuma opção se encaixa →
          </button>
        </div>
      )}

      {/* PASSO 3 — Localização */}
      {step === 'localizacao' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Onde está o problema?</p>
          <button
            onClick={useGPS}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 p-4
                       bg-blue-600 text-white rounded-xl font-medium
                       disabled:opacity-60 transition">
            {gpsLoading ? 'Obtendo localização...' : '📍 Usar minha localização (GPS)'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-sm text-gray-400">ou</span>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddressConfirm()}
              placeholder="Ex: Rua das Flores, 120 — próx. ao mercado"
              className="w-full border rounded-xl p-3 text-sm focus:outline-none
                         focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={handleAddressConfirm}
              disabled={!addressInput.trim()}
              className="w-full border border-blue-500 text-blue-600 p-3 rounded-xl
                         text-sm font-medium hover:bg-blue-50 disabled:opacity-40 transition">
              Confirmar endereço →
            </button>
          </div>
        </div>
      )}

      {/* PASSO 4 — Detalhes opcionais */}
      {step === 'detalhes' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Detalhes adicionais (opcionais)</p>

          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Descreva brevemente o problema..."
              className="w-full border rounded-xl p-3 text-sm resize-none h-24
                         focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{description.length}/500</p>
          </div>

          {!photoPreview ? (
            <label className="flex items-center justify-center gap-2 p-4
                               border-2 border-dashed border-gray-300 rounded-xl cursor-pointer
                               hover:border-blue-400 hover:bg-blue-50 transition-all">
              <span className="text-sm text-gray-500">📷 Anexar foto (opcional)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
            </label>
          ) : (
            <div className="relative">
              <img src={photoPreview} className="rounded-xl w-full h-44 object-cover" />
              <button
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-white text-gray-600 text-xs
                           px-2 py-1 rounded-lg border hover:bg-gray-50">
                Remover
              </button>
              {!photoUrl && (
                <div className="absolute inset-0 bg-white/60 flex items-center
                                justify-center rounded-xl text-sm text-gray-500">
                  Enviando foto...
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setStep('confirmar')}
            className="w-full bg-blue-600 text-white p-3 rounded-xl font-medium">
            Continuar →
          </button>
        </div>
      )}

      {/* PASSO 5 — Confirmação */}
      {step === 'confirmar' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-2">Revise antes de enviar:</p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm border">

            <div className="flex gap-3 items-start">
              <span className="text-2xl">{subcategory?.icon ?? category?.icon}</span>
              <div>
                <p className="font-medium">{category?.name}</p>
                {subcategory && (
                  <p className="text-gray-500 text-xs mt-0.5">{subcategory.name}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  SLA: {subcategory?.sla_hours ?? category?.sla_hours}h
                </p>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-gray-500 text-xs mb-1">Localização</p>
              <p>{location?.address}</p>
            </div>

            {description && (
              <div className="border-t pt-3">
                <p className="text-gray-500 text-xs mb-1">Descrição</p>
                <p className="text-gray-700">{description}</p>
              </div>
            )}

            {photoPreview && (
              <div className="border-t pt-3">
                <p className="text-gray-500 text-xs mb-2">Foto</p>
                <img src={photoPreview} className="rounded-lg h-28 object-cover w-full" />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || (!!photoPreview && !photoUrl)}
            className="w-full bg-green-600 text-white p-4 rounded-xl font-medium text-base
                       disabled:opacity-50 transition">
            {loading ? 'Enviando...' : '✓ Enviar solicitação'}
          </button>

          {photoPreview && !photoUrl && (
            <p className="text-xs text-center text-gray-400">
              Aguardando upload da foto antes de enviar...
            </p>
          )}
        </div>
      )}
    </main>
  )
}