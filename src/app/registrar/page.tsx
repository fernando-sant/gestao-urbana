'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { createReport, getCategories, getSubcategories } from '@/lib/reports'
import type { Category } from '@/lib/supabase'

// Carregamento Seguro do Mapa (Client-side only)
const SelectorMapa = dynamic(() => import('./SelectorMapa'), { 
  ssr: false,
  loading: () => <div className="h-72 w-full bg-slate-100 animate-pulse rounded-2xl" />
})

type Step = 'categoria' | 'subcategoria' | 'localizacao' | 'detalhes' | 'confirmar'
const STEP_ORDER: Step[] = ['categoria', 'subcategoria', 'localizacao', 'detalhes', 'confirmar']

export default function RegistrarPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('categoria')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados de Dados
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategory, setSubcategory] = useState<Category | null>(null)
  
  // Estados de Localização (Serra Negra Default)
  const [coords, setCoords] = useState({ lat: -22.6126, lng: -46.7012 })
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [finalLocation, setFinalLocation] = useState<{address: string, city: string} | null>(null)

  // Estados de Conteúdo
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // 1. Carregamento Inicial
  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  // 2. Auto-GPS ao chegar no Step de Localização (Melhoria UX)
  useEffect(() => {
    if (step === 'localizacao') {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("GPS negado, usando padrão"),
        { enableHighAccuracy: true }
      )
    }
  }, [step])

  // 3. Autocomplete com Debounce e Bias Geográfico
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (addressInput.length > 3 && step === 'localizacao' && !finalLocation) {
        const query = `${addressInput}, Serra Negra, SP`
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&viewbox=${coords.lng-0.1},${coords.lat+0.1},${coords.lng+0.1},${coords.lat-0.1}&bounded=1`
        )
        const data = await res.json()
        setSuggestions(data)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [addressInput, step, coords, finalLocation])

  // 4. Reverse Geocode ao mover o mapa
  const updateAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      setAddressInput(data.display_name.split(',')[0] + ', ' + (data.address.suburb || ''))
    } catch (e) { console.error(e) }
  }, [])

  // 5. Compressão de Imagem (Melhoria Performance)
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setPhotoPreview(URL.createObjectURL(file))
    setLoading(true)

    try {
      // Compressão simples usando Canvas
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const MAX_SIZE = 1024
      let { width, height } = bitmap
      if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE }
      else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE }
      
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
      
      const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.8))
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user?.id}/${Date.now()}.jpg`
      
      const { error: upErr } = await supabase.storage.from('report-photos').upload(path, blob)
      if (upErr) throw upErr
      
      const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
      setPhotoUrl(publicUrl)
    } catch (err) { setError("Erro ao processar foto.") } 
    finally { setLoading(false) }
  }

  // Navegação robusta
  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step)
    if (idx === 0) router.push('/')
    else setStep(STEP_ORDER[idx - 1])
  }
async function handleCategorySelect(cat: Category) {
  setCategory(cat)
  setSubcategory(null) // Reseta sub anterior
  setError(null)
  setLoading(true) // Opcional: para mostrar um feedback de carregamento

  try {
    // Busca no banco as subcategorias desta categoria
    const subs = await getSubcategories(cat.id)
    
    if (subs && subs.length > 0) {
      setSubcategories(subs) // Guarda as subs no estado
      setStep('subcategoria') // Muda para a tela de escolha específica
    } else {
      setSubcategories([])
      setStep('localizacao') // Se não tiver sub, vai direto pro mapa
    }
  } catch (err) {
    console.error("Erro ao carregar subcategorias:", err)
    setStep('localizacao') // Fallback: se der erro, não trava o usuário
  } finally {
    setLoading(false)
  }
}
  const handleConfirmLocation = async () => {
    setLoading(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`)
      const data = await res.json()
      setFinalLocation({
        address: data.display_name,
        city: data.address.city || data.address.town || 'Serra Negra'
      })
      setStep('detalhes')
    } finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!category || !finalLocation) return
    setLoading(true)
    try {
      const report = await createReport({
        category_id: subcategory?.id ?? category.id,
        lat: coords.lat,
        lng: coords.lng,
        address_hint: finalLocation.address,
        city: finalLocation.city,
        description: description.trim(),
        photo_url: photoUrl || undefined,
      })
      router.push(`/solicitacao/${report.id}?nova=true`)
    } catch (e) { setError("Erro ao enviar."); setLoading(false) }
  }

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen bg-white">
      {/* Header com Progresso */}
      <header className="mb-6">
        <button onClick={goBack} className="text-blue-600 font-bold text-sm mb-4">← Voltar</button>
        <div className="flex gap-1">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= STEP_ORDER.indexOf(step) ? 'bg-blue-600' : 'bg-slate-100'}`} />
          ))}
        </div>
      </header>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-2xl mb-4 text-sm font-medium border border-red-100">{error}</div>}

      {/* STEP 1: CATEGORIA */}
      {step === 'categoria' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-2 gap-3">
          {categories.map(cat => (
  <button 
    key={cat.id}
    onClick={() => handleCategorySelect(cat)} // <--- CHAME A FUNÇÃO AQUI
    className="p-6 border-2 border-slate-50 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-transform hover:bg-blue-50"
  >
    <span className="text-4xl">{cat.icon}</span>
    <span className="text-sm font-bold text-slate-800">{cat.name}</span>
  </button>
))}
        </div>
      )}

      {/* STEP 3: LOCALIZAÇÃO (O Coração do App) */}
      {step === 'localizacao' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="relative z-[1001]">
            <input 
              type="text" 
              value={addressInput} 
              onChange={e => { setAddressInput(e.target.value); setFinalLocation(null); }}
              placeholder="Aponte no mapa ou digite aqui..."
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl mt-2 overflow-hidden border">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setCoords({lat: parseFloat(s.lat), lng: parseFloat(s.lon)}); setSuggestions([]); setAddressInput(s.display_name.split(',')[0]) }}
                    className="w-full p-4 text-left text-sm hover:bg-blue-50 border-b last:border-0 border-slate-50 truncate font-medium">
                    📍 {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <SelectorMapa 
            position={[coords.lat, coords.lng]} 
            onChange={(lat: number, lng: number) => { setCoords({lat, lng}); updateAddressFromCoords(lat, lng); }} 
          />

          <button onClick={handleConfirmLocation} disabled={loading}
            className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">
            {loading ? "Processando..." : "Confirmar este local →"}
          </button>
        </div>
      )}

      {/* STEP 4: DETALHES */}
      {step === 'detalhes' && (
        <div className="space-y-4 animate-in slide-in-from-right-4">
          <div className="p-4 bg-blue-50 rounded-2xl text-xs font-bold text-blue-700">📍 {finalLocation?.address}</div>
          
          <textarea value={description} onChange={e => setDescription(e.target.value)} 
            placeholder="O que está acontecendo? (opcional)"
            className="w-full p-4 bg-slate-50 rounded-2xl h-32 border-none focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all">
            {photoPreview ? (
              <img src={photoPreview} className="h-40 rounded-2xl object-cover shadow-lg" />
            ) : (
              <>
                <span className="text-4xl mb-2">📸</span>
                <span className="text-sm font-bold text-slate-500">Adicionar uma foto</span>
                <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Ajuda muito na análise</span>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>

          <button onClick={() => setStep('confirmar')} className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl">
            Revisar antes de enviar →
          </button>
        </div>
      )}

      {/* STEP 5: CONFIRMAÇÃO (Fechamento) */}
      {step === 'confirmar' && (
        <div className="space-y-4 animate-in zoom-in-95">
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex gap-4 items-center">
              <span className="text-5xl bg-slate-50 p-3 rounded-2xl">{subcategory?.icon ?? category?.icon}</span>
              <div>
                <p className="font-black text-xl text-slate-900 leading-tight">{category?.name}</p>
                <p className="text-blue-600 font-bold text-sm">{subcategory?.name ?? 'Geral'}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Localização Selecionada</p>
              <p className="text-slate-700 font-medium text-sm leading-snug">{finalLocation?.address}</p>
            </div>
            {photoPreview && <img src={photoPreview} className="w-full h-48 rounded-2xl object-cover border" />}
          </div>

          <p className="text-center text-xs text-slate-400 px-6">Ao enviar, sua solicitação será encaminhada para a equipe de gestão urbana da prefeitura.</p>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full p-6 bg-green-600 text-white rounded-3xl font-black text-xl shadow-2xl shadow-green-100 active:scale-95 transition-all">
            {loading ? "Enviando..." : "✓ Confirmar e Enviar"}
          </button>
        </div>
      )}
    </main>
  )
}