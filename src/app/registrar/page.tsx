'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { getCategories, getSubcategories, createReport } from '@/lib/reports'
import type { Category } from '@/lib/supabase'

const SelectorMapa = dynamic(() => import('./SelectorMapa'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Carregando mapa...</div>
})

type Step = 'categoria' | 'subcategoria' | 'localizacao' | 'detalhes' | 'confirmar'
const STEP_ORDER: Step[] = ['categoria', 'subcategoria', 'localizacao', 'detalhes', 'confirmar']

export default function RegistrarPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('categoria')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategory, setSubcategory] = useState<Category | null>(null)
  const [coords, setCoords] = useState({ lat: -22.6126, lng: -46.7012 })
  const [addressInput, setAddressInput] = useState('')
  const [finalLocation, setFinalLocation] = useState<{address: string, city: string} | null>(null)
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setError("Erro de conexão."))
  }, [])

  async function handleCategorySelect(cat: Category) {
    setCategory(cat)
    setSubcategory(null)
    setLoading(true)
    try {
      const subs = await getSubcategories(cat.id)
      if (subs && subs.length > 0) {
        setSubcategories(subs)
        setStep('subcategoria')
      } else {
        setStep('localizacao')
      }
    } catch { setStep('localizacao') }
    finally { setLoading(false) }
  }

  const updateAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      setAddressInput(data.display_name.split(',').slice(0, 2).join(','))
      setFinalLocation({ address: data.display_name, city: data.address.city || 'Serra Negra' })
    } catch { setAddressInput("Local selecionado") }
  }, [])

  const handleSubmit = async () => {
    if (!category || !finalLocation) return
    setLoading(true)
    try {
      const report = await createReport({
        category_id: subcategory?.id ?? category.id,
        lat: coords.lat, lng: coords.lng,
        address_hint: finalLocation.address, city: finalLocation.city,
        description, photo_url: photoUrl || undefined,
      })
      router.push(`/solicitacao/${report.id}?nova=true`)
    } catch { setError("Erro ao salvar."); setLoading(false); }
  }

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step)
    idx === 0 ? router.push('/') : setStep(STEP_ORDER[idx - 1])
  }

  return (
    // h-[100dvh] usa a altura dinâmica real do navegador mobile (ignora barra de busca)
    <main className="flex flex-col h-[100dvh] bg-slate-50 font-sans antialiased overflow-hidden">
      
      {/* Header Fixo - Adaptado para Safe Areas de iPhone */}
      <header className="bg-white border-b border-slate-100 px-4 pt-4 pb-3 sm:px-6 shadow-sm shrink-0">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="p-2 -ml-2 text-blue-600 font-bold hover:bg-blue-50 rounded-full transition-colors">
              <span className="text-xl">←</span>
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              Passo {STEP_ORDER.indexOf(step) + 1} de 5
            </span>
          </div>
          <div className="flex gap-1.5 h-1.5 w-full">
            {STEP_ORDER.map((s, i) => (
              <div key={s} className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= STEP_ORDER.indexOf(step) ? 'bg-blue-600' : 'bg-slate-100'}`} />
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo Rolável - Centralizado em telas grandes */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 scroll-smooth">
        <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold animate-bounce">
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: CATEGORIA - Grid Adaptável (1 col mobile, 2 col tablet+) */}
          {step === 'categoria' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black text-slate-800 leading-tight">O que está acontecendo?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => handleCategorySelect(cat)}
                    className="group p-5 bg-white border border-slate-200 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 sm:hover:scale-105 transition-all shadow-sm hover:border-blue-300 hover:shadow-md">
                    <span className="text-4xl sm:text-5xl transition-transform group-hover:rotate-12">{cat.icon}</span>
                    <span className="text-sm font-black text-slate-700 text-center leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: SUBCATEGORIA - Lista limpa */}
          {step === 'subcategoria' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-black text-slate-800 italic uppercase tracking-tighter">Detalhes do problema</h2>
              <div className="space-y-2">
                {subcategories.map(sub => (
                  <button key={sub.id} onClick={() => { setSubcategory(sub); setStep('localizacao') }}
                    className="w-full p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all text-left shadow-sm hover:bg-slate-50">
                    <span className="text-3xl">{sub.icon}</span>
                    <span className="font-bold text-slate-700 text-lg">{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: LOCALIZAÇÃO - Mapa que ocupa o espaço disponível */}
          {step === 'localizacao' && (
            <div className="flex-1 flex flex-col gap-4 animate-in fade-in">
              <h2 className="text-2xl font-black text-slate-800">Onde fica o local?</h2>
              <div className="p-4 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-200 truncate">
                 📍 {addressInput || "Ajuste o marcador no mapa"}
              </div>
              <div className="flex-1 min-h-[300px] rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative">
                <SelectorMapa 
                  position={[coords.lat, coords.lng]} 
                  onChange={(lat: number, lng: number) => { setCoords({lat, lng}); updateAddressFromCoords(lat, lng); }} 
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-[1000] pointer-events-none">
                    <span className="text-5xl drop-shadow-2xl">📍</span>
                </div>
              </div>
              <button onClick={() => setStep('detalhes')} disabled={!finalLocation}
                className="w-full p-5 bg-slate-900 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl disabled:opacity-50 active:scale-95 transition-all">
                Próximo Passo
              </button>
            </div>
          )}

          {/* STEP 4: DETALHES - Formulário clean */}
          {step === 'detalhes' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-black text-slate-800 leading-none">Mais informações</h2>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Ex: Próximo ao poste de luz, em frente à padaria..."
                className="w-full p-5 bg-white rounded-2xl h-40 border-none focus:ring-4 focus:ring-blue-100 shadow-sm text-base font-medium transition-all"
              />
              <label className="flex flex-col items-center justify-center p-10 bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm">
                {photoPreview ? (
                  <img src={photoPreview} className="max-h-64 rounded-2xl object-cover shadow-2xl" />
                ) : (
                  <>
                    <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📸</span>
                    <span className="text-base font-black text-slate-600 uppercase tracking-tight">Adicionar Foto</span>
                    <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Ajuda na agilidade da prefeitura</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="hidden" />
              </label>
              <button onClick={() => setStep('confirmar')} className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-100 active:scale-95 transition-all">
                Revisar Registro →
              </button>
            </div>
          )}

          {/* STEP 5: CONFIRMAÇÃO - Card Final */}
          {step === 'confirmar' && (
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
                <div className="flex gap-6 items-center relative">
                  <span className="text-6xl bg-slate-50 p-4 rounded-3xl border-2 border-white shadow-sm italic">{subcategory?.icon ?? category?.icon}</span>
                  <div>
                    <p className="font-black text-3xl text-slate-900 leading-none">{category?.name}</p>
                    <p className="text-blue-600 font-black text-sm uppercase mt-2 tracking-widest">{subcategory?.name ?? 'Registro Geral'}</p>
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <p className="text-[10px] uppercase font-black text-slate-300 tracking-widest">Local do Incidente</p>
                  <p className="text-slate-800 text-lg font-bold leading-tight">{finalLocation?.address}</p>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={loading}
                className="w-full p-6 bg-green-500 text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-green-100 active:scale-95 transition-all uppercase tracking-tighter">
                {loading ? "Registrando..." : "Enviar para Prefeitura"}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Footer Visual de Segurança (Opcional) */}
      <footer className="h-4 bg-slate-50 shrink-0" />
    </main>
  )
}