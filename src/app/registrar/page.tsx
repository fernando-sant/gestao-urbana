'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { createReport, getCategories, getSubcategories } from '@/lib/reports'
import type { Category } from '@/lib/supabase'

// Carrega o seletor de mapa dinamicamente para evitar erros de SSR do Leaflet
const SelectorMapa = dynamic(() => import('./SelectorMapa'), { 
  ssr: false,
  loading: () => <div className="h-72 w-full bg-slate-100 animate-pulse rounded-2xl" />
})

type Step = 'categoria' | 'subcategoria' | 'localizacao' | 'detalhes' | 'confirmar'

const STEP_INDEX: Record<Step, number> = {
  categoria: 0, subcategoria: 1, localizacao: 2, detalhes: 3, confirmar: 4
}

const SERRA_NEGRA_CENTER = { lat: -22.6126, lng: -46.7012 }

export default function RegistrarPage() {
  const router = useRouter()
  const [step, setStep]               = useState<Step>('categoria')
  const [categories, setCategories]   = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [category, setCategory]       = useState<Category | null>(null)
  const [subcategory, setSubcategory] = useState<Category | null>(null)
  
  // Estados de Localização
  const [tempCoords, setTempCoords]   = useState(SERRA_NEGRA_CENTER)
  const [location, setLocation]       = useState<{ lat: number; lng: number; address: string; city: string } | null>(null)
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl]       = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [gpsLoading, setGpsLoading]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setError('Erro ao carregar categorias'))
  }, [])

  // Autocomplete Logic com Debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (addressInput.length > 3 && step === 'localizacao') {
        try {
          const query = `${addressInput}, Serra Negra, SP`
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
          const data = await res.json()
          setSuggestions(data)
        } catch (e) { console.error(e) }
      } else {
        setSuggestions([])
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [addressInput, step])

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      const city = data.address.city || data.address.town || data.address.village || 'Serra Negra'
      const road = data.address.road || data.address.suburb || 'Localização selecionada'
      return { city, fullAddress: data.display_name || `${road}, ${city}` }
    } catch {
      return { city: 'Serra Negra', fullAddress: 'Localização via Mapa' }
    }
  }

  async function handleCategorySelect(cat: Category) {
    setCategory(cat)
    setSubcategory(null)
    try {
      const subs = await getSubcategories(cat.id)
      if (subs && subs.length > 0) {
        setSubcategories(subs)
        setStep('subcategoria')
      } else {
        setStep('localizacao')
      }
    } catch { setStep('localizacao') }
  }

  async function useGPS() {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        setTempCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => {
        setError('GPS indisponível. Use a busca ou o mapa.')
        setGpsLoading(false)
      }
    )
  }

  async function handleConfirmLocation() {
    setLoading(true)
    const geo = await reverseGeocode(tempCoords.lat, tempCoords.lng)
    setLocation({
      lat: tempCoords.lat,
      lng: tempCoords.lng,
      address: geo.fullAddress,
      city: geo.city
    })
    setLoading(false)
    setStep('detalhes')
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB.'); return }
    setPhotoPreview(URL.createObjectURL(file))
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Deslogado')
      const path = `${user.id}/${Date.now()}.jpg`
      await supabase.storage.from('report-photos').upload(path, file)
      const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
      setPhotoUrl(publicUrl)
    } catch { setError('Erro no upload da foto.') }
  }

  async function handleSubmit() {
    if (!category || !location) return
    setLoading(true)
    try {
      const report = await createReport({
        category_id: subcategory?.id ?? category.id,
        lat: location.lat,
        lng: location.lng,
        address_hint: location.address,
        city: location.city,
        description: description.trim() || undefined,
        photo_url: photoUrl || undefined,
      })
      router.push(`/solicitacao/${report.id}?nova=true`)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao enviar.')
      setLoading(false)
    }
  }

  const currentStepIndex = STEP_INDEX[step]

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setStep(prev => prev === 'categoria' ? 'categoria' : (subcategories.length > 0 && step === 'localizacao' ? 'subcategoria' : 'categoria'))} className="text-sm text-blue-600">
          ← Voltar
        </button>
        <h1 className="text-lg font-bold">Nova solicitação</h1>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1 mb-6">
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm border border-red-100">{error}</div>}

      {/* STEP 1: CATEGORIA */}
      {step === 'categoria' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => handleCategorySelect(cat)} className="flex flex-col items-center gap-2 p-4 border rounded-2xl hover:bg-blue-50 active:scale-95 transition-all">
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-sm font-bold text-center">{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: SUBCATEGORIA */}
      {step === 'subcategoria' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 grid grid-cols-2 gap-3">
          {subcategories.map(sub => (
            <button key={sub.id} onClick={() => { setSubcategory(sub); setStep('localizacao') }} className="p-4 border rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-50">
              <span className="text-3xl">{sub.icon}</span>
              <span className="text-sm font-bold text-center">{sub.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* STEP 3: LOCALIZAÇÃO (MAPA + AUTOCOMPLETE) */}
      {step === 'localizacao' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="relative z-[1001]">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Buscar rua ou bairro em Serra Negra..."
              className="w-full border-2 border-slate-100 rounded-xl p-4 shadow-sm focus:border-blue-500 outline-none transition-all"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-2xl mt-2 shadow-xl overflow-hidden">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => {
                    setTempCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                    setSuggestions([]);
                    setAddressInput(s.display_name.split(',')[0]);
                  }} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 border-b last:border-0 border-slate-50 truncate">
                    📍 {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <SelectorMapa position={[tempCoords.lat, tempCoords.lng]} onChange={(lat, lng) => setTempCoords({ lat, lng })} />

          <div className="grid grid-cols-2 gap-3">
            <button onClick={useGPS} className="bg-slate-100 text-slate-700 p-4 rounded-2xl text-xs font-bold active:scale-95 transition">
              {gpsLoading ? '...' : '🎯 Meu GPS'}
            </button>
            <button onClick={handleConfirmLocation} disabled={loading} className="bg-blue-600 text-white p-4 rounded-2xl text-xs font-bold shadow-lg active:scale-95 transition">
              Confirmar Local →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DETALHES */}
      {step === 'detalhes' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-blue-50 p-3 rounded-xl text-[10px] text-blue-700 font-medium">📍 {location?.address}</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o problema aqui..." className="w-full border-2 border-slate-100 rounded-2xl p-4 h-32 outline-none focus:border-blue-500" />
          
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
            {photoPreview ? <img src={photoPreview} className="h-32 rounded-lg object-cover" /> : <span className="text-sm text-slate-500 font-bold">📷 Anexar Foto</span>}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>

          <button onClick={() => setStep('confirmar')} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg">Continuar para Revisão →</button>
        </div>
      )}

      {/* STEP 5: CONFIRMAÇÃO */}
      {step === 'confirmar' && (
        <div className="space-y-4 animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-3xl p-6 space-y-4 border shadow-sm">
            <div className="flex gap-4 items-center">
              <span className="text-4xl bg-slate-50 p-2 rounded-2xl border">{subcategory?.icon ?? category?.icon}</span>
              <div>
                <p className="font-bold text-slate-900">{category?.name}</p>
                <p className="text-blue-600 text-xs font-bold">{subcategory?.name ?? 'Geral'}</p>
              </div>
            </div>
            <div className="border-t pt-3"><p className="text-slate-400 text-[10px] font-bold uppercase">Localização</p><p className="text-slate-700 text-sm leading-tight">{location?.address}</p></div>
            {photoPreview && <img src={photoPreview} className="rounded-2xl h-40 w-full object-cover border" />}
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-green-600 text-white p-5 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition">
            {loading ? 'Enviando...' : '✓ Confirmar e Enviar'}
          </button>
        </div>
      )}
    </main>
  )
}