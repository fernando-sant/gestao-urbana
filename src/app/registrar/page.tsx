// src/app/registrar/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { createReport, getCategories } from '@/lib/reports'
import type { Category } from '@/lib/supabase'

type Step = 'categoria' | 'localizacao' | 'detalhes' | 'confirmar'

export default function RegistrarPage() {
  const router = useRouter()
  const [step, setStep]           = useState<Step>('categoria')
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory]   = useState<Category | null>(null)
  const [location, setLocation]   = useState<{lat:number;lng:number;address:string} | null>(null)
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  async function useGPS() {
    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: 'Localização atual (GPS)'
          })
          setStep('detalhes')
          resolve()
        },
        () => reject(new Error('GPS indisponível'))
      )
    })
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user!.id}/${Date.now()}.jpg`
    const { error } = await supabase.storage.from('report-photos').upload(path, file)
    if (error) { setError('Erro ao enviar foto'); return }
    const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
    setPhotoUrl(publicUrl)
  }

  async function handleSubmit() {
    if (!category || !location) return
    setLoading(true)
    setError(null)
    try {
      const report = await createReport({
        category_id: category.id,
        lat: location.lat,
        lng: location.lng,
        address_hint: location.address,
        city: 'Botucatu',
        description: description || undefined,
        photo_url: photoUrl || undefined,
      })
      router.push(`/solicitacao/${report.id}?nova=true`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        {step !== 'categoria' && (
          <button onClick={() => setStep(step === 'localizacao' ? 'categoria'
                                        : step === 'detalhes' ? 'localizacao'
                                        : 'detalhes')}
            className="text-sm text-blue-600">← Voltar</button>
        )}
        <h1 className="text-lg font-semibold">Nova solicitação</h1>
      </div>

      {/* Barra de progresso */}
      <div className="flex gap-1 mb-6">
        {(['categoria','localizacao','detalhes','confirmar'] as Step[]).map((s,i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${
            ['categoria','localizacao','detalhes','confirmar'].indexOf(step) >= i
              ? 'bg-blue-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* PASSO 1: Categoria */}
      {step === 'categoria' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Qual é o tipo do problema?</p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <button key={cat.id}
                onClick={() => { setCategory(cat); setStep('localizacao') }}
                className="flex flex-col items-center gap-2 p-4 border rounded-xl
                           hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-sm font-medium text-center">{cat.name}</span>
                <span className="text-xs text-gray-400">SLA: {cat.sla_hours}h</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PASSO 2: Localização */}
      {step === 'localizacao' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Onde está o problema?</p>
          <button onClick={useGPS}
            className="w-full flex items-center justify-center gap-2 p-4
                       bg-blue-600 text-white rounded-xl font-medium">
            📍 Usar minha localização (GPS)
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"/>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-sm text-gray-400">ou</span>
            </div>
          </div>
          <input
            type="text"
            placeholder="Digite o endereço (ex: Rua das Flores, 120)"
            className="w-full border rounded-xl p-3 text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                setLocation({ lat: -22.885, lng: -48.446, address: e.currentTarget.value })
                setStep('detalhes')
              }
            }}
          />
          <p className="text-xs text-gray-400 text-center">Pressione Enter para confirmar o endereço</p>
        </div>
      )}

      {/* PASSO 3: Detalhes */}
      {step === 'detalhes' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Detalhes adicionais (opcionais)</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Descreva brevemente o problema..."
            className="w-full border rounded-xl p-3 text-sm resize-none h-24"
          />
          <p className="text-xs text-gray-400 text-right">{description.length}/500</p>
          <label className="flex items-center justify-center gap-2 p-4
                             border-2 border-dashed rounded-xl cursor-pointer
                             hover:border-blue-400 hover:bg-blue-50 transition-all">
            📷 {photoUrl ? 'Foto anexada ✓' : 'Anexar foto (opcional)'}
            <input type="file" accept="image/*" capture="environment"
                   className="hidden" onChange={handlePhoto} />
          </label>
          {photoUrl && <img src={photoUrl} className="rounded-xl w-full h-40 object-cover" />}
          <button onClick={() => setStep('confirmar')}
            className="w-full bg-blue-600 text-white p-3 rounded-xl font-medium">
            Continuar →
          </button>
        </div>
      )}

      {/* PASSO 4: Confirmar */}
      {step === 'confirmar' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-2">Revise antes de enviar:</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-2xl">{category?.icon}</span>
              <div>
                <p className="font-medium">{category?.name}</p>
                <p className="text-gray-500 text-xs">SLA: {category?.sla_hours}h</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-gray-500 text-xs mb-1">Localização</p>
              <p>{location?.address}</p>
            </div>
            {description && (
              <div className="border-t pt-3">
                <p className="text-gray-500 text-xs mb-1">Descrição</p>
                <p>{description}</p>
              </div>
            )}
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-green-600 text-white p-4 rounded-xl font-medium text-base
                       disabled:opacity-50">
            {loading ? 'Enviando...' : '✓ Enviar solicitação'}
          </button>
        </div>
      )}
    </main>
  )
}