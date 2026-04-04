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
  const [location, setLocation]       = useState<{ lat: number; lng: number; address: string; city: string } | null>(null)
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

  // Função para descobrir cidade e endereço via coordenadas (Gratuito)
  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      const city = data.address.city || data.address.town || data.address.village || 'Cidade não identificada'
      const road = data.address.road || 'Endereço aproximado'
      return { city, fullAddress: data.display_name || `${road}, ${city}` }
    } catch {
      return { city: 'Não identificada', fullAddress: 'Localização via GPS' }
    }
  }

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
      async pos => {
        const { latitude, longitude } = pos.coords
        const geo = await reverseGeocode(latitude, longitude)
        
        setLocation({
          lat: latitude,
          lng: longitude,
          address: geo.fullAddress,
          city: geo.city
        })
        setGpsLoading(false)
        setStep('detalhes')
      },
      () => {
        setError('Não foi possível obter o GPS. Digite o endereço manualmente.')
        setGpsLoading(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  function handleAddressConfirm() {
    if (!addressInput.trim()) return
    setLocation({ lat: 0, lng: 0, address: addressInput.trim(), city: '' })
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
      // Se o endereço foi manual, a cidade pode estar vazia
      const finalCity = location.city || 'Botucatu' 

      const report = await createReport({
        category_id: subcategory?.id ?? category.id,
        lat: location.lat,
        lng: location.lng,
        address_hint: location.address,
        city: finalCity,
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
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-sm text-gray-500 mb-4">Qual é o tipo do problema?</p>
          {categories.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => handleCategorySelect(cat)}
                  className="flex flex-col items-center gap-2 p-4 border rounded-xl
                             hover:border-blue-500 hover:bg-blue-50 transition-all text-left active:scale-95">
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-center">{cat.name}</span>
                  <span className="text-[10px] text-gray-400 uppercase">SLA: {cat.sla_hours}h</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PASSO 2 — Subcategoria */}
      {step === 'subcategoria' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-sm text-gray-500 mb-1">
            Categoria: <strong>{category?.name}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-4">Qual é o problema específico?</p>
          <div className="grid grid-cols-2 gap-3">
            {subcategories.map(sub => (
              <button key={sub.id}
                onClick={() => { setSubcategory(sub); setStep('localizacao') }}
                className={`flex flex-col items-center gap-2 p-4 border rounded-xl
                           hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95
                           ${subcategory?.id === sub.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                <span className="text-3xl">{sub.icon}</span>
                <span className="text-sm font-medium text-center">{sub.name}</span>
                <span className="text-[10px] text-gray-400 uppercase">SLA: {sub.sla_hours}h</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setSubcategory(null); setStep('localizacao') }}
            className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 py-2 border border-dashed rounded-xl">
            Nenhuma opção se encaixa →
          </button>
        </div>
      )}

      {/* PASSO 3 — Localização */}
      {step === 'localizacao' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-sm text-gray-500">Onde está o problema?</p>
          <button
            onClick={useGPS}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 p-4
                       bg-blue-600 text-white rounded-xl font-medium
                       disabled:opacity-60 transition active:scale-95">
            {gpsLoading ? 'Buscando sinal GPS...' : '📍 Usar minha localização atual'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-sm text-gray-400">ou digite o endereço</span>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddressConfirm()}
              placeholder="Rua, número e ponto de referência"
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
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <p className="text-sm text-gray-500">Detalhes adicionais (opcionais)</p>

          <div className="bg-blue-50 p-3 rounded-xl text-[10px] text-blue-700 mb-2">
            📍 {location?.address}
          </div>

          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Ex: O buraco é fundo e está acumulando água..."
              className="w-full border rounded-xl p-3 text-sm resize-none h-24
                         focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{description.length}/500</p>
          </div>

          {!photoPreview ? (
            <label className="flex flex-col items-center justify-center gap-2 p-6
                               border-2 border-dashed border-gray-300 rounded-xl cursor-pointer
                               hover:border-blue-400 hover:bg-blue-50 transition-all">
              <span className="text-3xl">📷</span>
              <span className="text-sm text-gray-500 font-medium">Anexar foto do local</span>
              <span className="text-[10px] text-gray-400">Ajuda a equipe técnica a identificar o problema</span>
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
                className="absolute top-2 right-2 bg-black/50 text-white text-xs
                           px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                Remover foto
              </button>
              {!photoUrl && (
                <div className="absolute inset-0 bg-white/60 flex flex-col items-center
                                justify-center rounded-xl text-sm text-gray-600">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                  Enviando imagem...
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setStep('confirmar')}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-100">
            Revisar solicitação →
          </button>
        </div>
      )}

      {/* PASSO 5 — Confirmação */}
      {step === 'confirmar' && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <p className="text-sm text-gray-500 mb-2 font-medium">Tudo certo? Revise os dados:</p>

          <div className="bg-white rounded-2xl p-4 space-y-4 text-sm border shadow-sm">

            <div className="flex gap-4 items-center">
              <span className="text-4xl bg-gray-50 p-2 rounded-xl border">
                {subcategory?.icon ?? category?.icon}
              </span>
              <div>
                <p className="font-bold text-gray-900">{category?.name}</p>
                {subcategory && (
                  <p className="text-blue-600 text-xs font-medium">{subcategory.name}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
                  Prazo: {subcategory?.sla_hours ?? category?.sla_hours} horas
                </p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1">
              <p className="text-gray-400 text-[10px] uppercase font-bold">Localização</p>
              <p className="text-gray-700 leading-tight">{location?.address}</p>
            </div>

            {description && (
              <div className="border-t pt-3 space-y-1">
                <p className="text-gray-400 text-[10px] uppercase font-bold">Sua descrição</p>
                <p className="text-gray-700 italic">"{description}"</p>
              </div>
            )}

            {photoPreview && (
              <div className="border-t pt-3">
                <img src={photoPreview} className="rounded-xl h-32 object-cover w-full border" />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || (!!photoPreview && !photoUrl)}
            className="w-full bg-green-600 text-white p-4 rounded-2xl font-bold text-lg
                       shadow-lg shadow-green-100 disabled:opacity-50 transition active:scale-95">
            {loading ? 'Enviando chamado...' : '✓ Confirmar e Enviar'}
          </button>

          {photoPreview && !photoUrl && (
            <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded-lg">
              Aguarde o carregamento da foto para finalizar.
            </p>
          )}
        </div>
      )}
    </main>
  )
}