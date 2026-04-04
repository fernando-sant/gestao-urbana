'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { createReport, getCategories, getSubcategories } from '@/lib/reports'
import type { Category } from '@/lib/supabase'

const SelectorMapa = dynamic(() => import('./SelectorMapa'), { 
  ssr: false,
  loading: () => <div className="h-72 w-full bg-slate-100 animate-pulse rounded-2xl" />
})

type Step = 'categoria' | 'subcategoria' | 'localizacao' | 'detalhes' | 'confirmar'
const STEP_ORDER: Step[] = ['categoria','subcategoria','localizacao','detalhes','confirmar']

const SERRA_NEGRA_CENTER = { lat: -22.6126, lng: -46.7012 }

export default function RegistrarPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('categoria')
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategory, setSubcategory] = useState<Category | null>(null)

  const [tempCoords, setTempCoords] = useState(SERRA_NEGRA_CENTER)
  const [location, setLocation] = useState<any>(null)

  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])

  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  // GPS automático ao entrar no step
  useEffect(() => {
    if (step === 'localizacao') {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setTempCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          })
        },
        () => {}
      )
    }
  }, [step])

  // Autocomplete inteligente
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (addressInput.length > 3 && step === 'localizacao') {
        const query = `${addressInput}, Serra Negra, São Paulo`
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        )
        const data = await res.json()
        setSuggestions(data)
      } else {
        setSuggestions([])
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [addressInput, step])

  async function reverseGeocode(lat: number, lng: number) {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    )
    const data = await res.json()
    return {
      city: data.address.city || 'Serra Negra',
      address: data.display_name
    }
  }

  async function handleCategorySelect(cat: Category) {
    navigator.vibrate?.(10)
    setCategory(cat)

    const subs = await getSubcategories(cat.id)
    if (subs?.length) {
      setSubcategories(subs)
      setStep('subcategoria')
    } else {
      setStep('localizacao')
    }
  }

  function goBack() {
    const i = STEP_ORDER.indexOf(step)
    if (i > 0) setStep(STEP_ORDER[i - 1])
  }

  async function handleConfirmLocation() {
    setLoading(true)
    const geo = await reverseGeocode(tempCoords.lat, tempCoords.lng)
    setLocation({
      ...tempCoords,
      address: geo.address,
      city: geo.city
    })
    setLoading(false)
    setStep('detalhes')
  }

  async function compressImage(file: File) {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    const MAX = 1200
    let { width, height } = bitmap

    if (width > MAX) {
      height *= MAX / width
      width = MAX
    }

    canvas.width = width
    canvas.height = height
    ctx.drawImage(bitmap, 0, 0)

    return new Promise<Blob>(resolve =>
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.7)
    )
  }

  async function handlePhoto(e: any) {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoPreview(URL.createObjectURL(file))

    const compressed = await compressImage(file)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const path = `${user?.id}/${Date.now()}.jpg`
    await supabase.storage.from('report-photos').upload(path, compressed)

    const { data } = supabase.storage.from('report-photos').getPublicUrl(path)
    setPhotoUrl(data.publicUrl)
  }

  async function handleSubmit() {
    setLoading(true)

    const report = await createReport({
      category_id: subcategory?.id ?? category!.id,
      lat: location.lat,
      lng: location.lng,
      address_hint: location.address,
      city: location.city,
      description,
      photo_url: photoUrl || undefined
    })

    router.push(`/solicitacao/${report.id}?nova=true`)
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-20">
      
      {/* Header */}
      <div className="flex gap-3 mb-5">
        <button onClick={goBack} className="text-blue-600 text-sm">← Voltar</button>
        <h1 className="font-bold">Nova solicitação</h1>
      </div>

      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

      {/* CATEGORIA */}
      {step === 'categoria' && (
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat)}
              className="p-4 border rounded-2xl active:scale-95 transition"
            >
              <div className="text-3xl">{cat.icon}</div>
              <div className="text-sm font-bold">{cat.name}</div>
            </button>
          ))}
        </div>
      )}

      {/* LOCALIZAÇÃO */}
      {step === 'localizacao' && (
        <div className="space-y-4">
          <input
            value={addressInput}
            onChange={e => setAddressInput(e.target.value)}
            placeholder="Buscar endereço..."
            className="w-full p-4 border rounded-xl"
          />

          <SelectorMapa
            position={[tempCoords.lat, tempCoords.lng]}
            onChange={(lat, lng) => setTempCoords({ lat, lng })}
          />

          <button
            onClick={handleConfirmLocation}
            className="w-full bg-blue-600 text-white p-4 rounded-xl"
          >
            Este é o local do problema
          </button>
        </div>
      )}

      {/* DETALHES */}
      {step === 'detalhes' && (
        <div className="space-y-4">
          <textarea
            placeholder="Descreva o problema"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-4 border rounded-xl"
          />

          <input type="file" onChange={handlePhoto} />

          <button
            onClick={() => setStep('confirmar')}
            className="w-full bg-blue-600 text-white p-4 rounded-xl"
          >
            Revisar antes de enviar →
          </button>
        </div>
      )}

      {/* CONFIRMAR */}
      {step === 'confirmar' && (
        <div className="space-y-4">
          <div>{category?.name}</div>
          <div>{location?.address}</div>

          <button
            onClick={handleSubmit}
            className="w-full bg-green-600 text-white p-4 rounded-xl"
          >
            Confirmar e enviar
          </button>
        </div>
      )}
    </main>
  )
}