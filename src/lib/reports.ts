// src/lib/reports.ts
import { createClient } from './supabase'

export async function getCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('name')
  if (error) throw error
  return data
}

export async function createReport(payload: {
  category_id: string
  lat: number
  lng: number
  address_hint: string
  city: string
  description?: string
  photo_url?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const protocol = `URB-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`

  const { data, error } = await supabase
    .from('reports')
    .insert({
      protocol,
      user_id: user.id,
      category_id: payload.category_id,
      location: `POINT(${payload.lng} ${payload.lat})`,
      address_hint: payload.address_hint,
      city: payload.city,
      description: payload.description,
      photo_url: payload.photo_url,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMyReports() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*, categories(name, icon)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}