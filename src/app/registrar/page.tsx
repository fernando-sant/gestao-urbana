'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { getCategories, getSubcategories, createReport } from '@/lib/reports'
import type { Category } from '@/lib/supabase'

// Carregamento dinâmico do seletor de mapa para evitar erro de 'window is not defined'
const SelectorMapa = dynamic(() => import('./SelectorMapa'), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">Carregando mapa...</div>
})

type Step = 'categoria' | 'subcategoria' | 'localizacao' | 'detalhes' | 'confirmar'
const STEP_ORDER: Step[] = ['categoria', 'subcategoria', 'localizacao', 'detalhes', 'confirmar']

export default function RegistrarPage() {
  const router = useRouter()
  
  // Estados de Fluxo
  const [step, setStep] = useState<Step>('categoria')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados de Dados
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategory, setSubcategory] = useState<Category | null>(null)
  
  // Estados de Localização (Default: Serra Negra)
  const [coords, setCoords] = useState({ lat: -22.6126, lng: -46.7012 })
  const [addressInput, setAddressInput] = useState('')
  const [finalLocation, setFinalLocation] = useState<{address: string, city: string} | null>(null)

  // Estados de Conteúdo
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // 1. Carrega categorias principais no início
  useEffect(() => {
    getCategories().then(setCategories).catch(() => setError("Erro ao carregar categorias."))
  }, [])

  // 2. Função para buscar subcategorias e decidir o próximo passo
  async function handleCategorySelect(cat: Category) {
  console.log("👉 Categoria selecionada:", cat.name, "ID:", cat.id) // DEBUG
  setCategory(cat)
  setSubcategory(null)
  setLoading(true)
  setError(null)

  try {
    const subs = await getSubcategories(cat.id)
    console.log("🔍 Subcategorias retornadas:", subs) // DEBUG

    if (subs && subs.length > 0) {
      setSubcategories(subs)
      setStep('subcategoria')
      console.log("✅ Indo para passo: subcategoria")
    } else {
      console.log("⚠️ Nenhuma subcategoria encontrada, pulando para mapa.")
      setSubcategories([])
      setStep('localizacao')
    }
  } catch (err) {
    console.error("❌ Erro fatal ao buscar subs:", err)
    setStep('localizacao')
  } finally {
    setLoading(false)
  }
}

  // 3. Atualiza endereço baseado nas coordenadas do mapa (Reverse Geocoding)
  const updateAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      const addr = data.display_name.split(',').slice(0, 3).join(',')
      setAddressInput(addr)
      setFinalLocation({
        address: data.display_name,
        city: data.address.city || data.address.town || 'Serra Negra'
      })
    } catch (e) {
      setAddressInput("Localização selecionada no mapa")
    }
  }, [])

  // 4. Upload e Compressão de Foto
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setPhotoPreview(URL.createObjectURL(file))
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const path = `${user.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('report-photos').upload(path, file)
      if (upErr) throw upErr
      
      const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
      setPhotoUrl(publicUrl)
    } catch (err: any) {
      setError(err.message || "Erro no upload da foto")
    } finally {
      setLoading(false)
    }
  }

  // 5. Envio Final para o Banco
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
    } catch (e) {
      setError("Erro ao salvar solicitação. Tente novamente.")
      setLoading(false)
    }
  }

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step)
    if (idx === 0) router.push('/')
    else setStep(STEP_ORDER[idx - 1])
  }

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen bg-slate-50 flex flex-col">
      {/* Header e Progresso */}
      <header className="mb-6">
        <button onClick={goBack} className="text-blue-600 font-bold text-sm flex items-center gap-1 mb-4">
          ← Voltar
        </button>
        <div className="flex gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= STEP_ORDER.indexOf(step) ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>
      </header>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-2xl mb-4 text-xs font-bold border border-red-200">{error}</div>}

      {/* STEP 1: CATEGORIA */}
      {step === 'categoria' && (
        <div className="space-y-4 animate-in fade-in">
          <h2 className="text-xl font-black text-slate-800">O que deseja reportar?</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => handleCategorySelect(cat)}
                className="p-6 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm hover:border-blue-200">
                <span className="text-4xl">{cat.icon}</span>
                <span className="text-sm font-bold text-slate-700 text-center">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: SUBCATEGORIA */}
      {step === 'subcategoria' && (
        <div className="space-y-4 animate-in fade-in">
          <h2 className="text-xl font-black text-slate-800">Especifique o problema:</h2>
          <div className="grid grid-cols-1 gap-2">
            {subcategories.map(sub => (
              <button key={sub.id} onClick={() => { setSubcategory(sub); setStep('localizacao') }}
                className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all text-left shadow-sm">
                <span className="text-2xl">{sub.icon}</span>
                <span className="font-bold text-slate-700">{sub.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: LOCALIZAÇÃO */}
      {step === 'localizacao' && (
        <div className="space-y-4 animate-in fade-in flex-1 flex flex-col">
          <h2 className="text-xl font-black text-slate-800">Onde está o problema?</h2>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold truncate">
             📍 {addressInput || "Mova o mapa para ajustar"}
          </div>
          
          <div className="flex-1 min-h-[300px] rounded-3xl overflow-hidden border-2 border-white shadow-inner relative">
            <SelectorMapa 
              position={[coords.lat, coords.lng]} 
              onChange={(lat: number, lng: number) => { 
                setCoords({lat, lng}); 
                updateAddressFromCoords(lat, lng); 
              }} 
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none">
                <span className="text-4xl drop-shadow-lg">📍</span>
            </div>
          </div>

          <button onClick={() => setStep('detalhes')} disabled={!finalLocation}
            className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 disabled:opacity-50">
            Confirmar Localização
          </button>
        </div>
      )}

      {/* STEP 4: DETALHES */}
      {step === 'detalhes' && (
        <div className="space-y-4 animate-in fade-in">
          <h2 className="text-xl font-black text-slate-800">Conte-nos mais</h2>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="Descreva o problema (opcional)..."
            className="w-full p-4 bg-white rounded-2xl h-32 border-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
          />

          <label className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
            {photoPreview ? (
              <img src={photoPreview} className="h-40 rounded-2xl object-cover shadow-md" />
            ) : (
              <>
                <span className="text-4xl mb-2">📸</span>
                <span className="text-sm font-bold text-slate-500">Tirar ou anexar foto</span>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>

          <button onClick={() => setStep('confirmar')} className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl">
            Revisar Solicitação →
          </button>
        </div>
      )}

      {/* STEP 5: CONFIRMAÇÃO */}
      {step === 'confirmar' && (
        <div className="space-y-4 animate-in zoom-in-95">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex gap-4 items-center">
              <span className="text-5xl bg-slate-50 p-2 rounded-2xl border">{subcategory?.icon ?? category?.icon}</span>
              <div>
                <p className="font-black text-lg text-slate-900 leading-tight">{category?.name}</p>
                <p className="text-blue-600 font-bold text-xs uppercase tracking-wider">{subcategory?.name ?? 'Geral'}</p>
              </div>
            </div>
            <div className="border-t border-slate-50 pt-4">
              <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Localização</p>
              <p className="text-slate-700 text-sm font-medium leading-snug">{finalLocation?.address}</p>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full p-6 bg-green-600 text-white rounded-3xl font-black text-xl shadow-2xl shadow-green-100 active:scale-95 transition-all">
            {loading ? "Enviando..." : "✓ Confirmar e Enviar"}
          </button>
        </div>
      )}
    </main>
  )
}