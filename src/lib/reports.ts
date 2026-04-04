// src/lib/reports.ts
import { createClient } from './supabase'

/**
 * 1. Busca categorias principais (Pai)
 */
export async function getCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('name')
  if (error) throw error
  return data || []
}

/**
 * 2. Busca subcategorias de um pai específico
 */
export async function getSubcategories(parentId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

/**
 * 3. Cria uma nova solicitação
 */
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
  if (!user) throw new Error('Usuário não autenticado')

  // Gera protocolo único: URB-2024-HASH
  const protocol = `URB-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

  const { data, error } = await supabase
    .from('reports')
    .insert({
      protocol,
      user_id: user.id,
      category_id: payload.category_id,
      // Formato PostGIS: 'POINT(longitude latitude)'
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

/**
 * 4. Lista solicitações do usuário logado (usada na /solicitacoes)
 */
export async function getUserReports() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return [] // Retorna vazio se não estiver logado

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      categories (
        name,
        icon,
        sla_hours
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 5. Busca detalhes de um chamado específico + Histórico (usada na /solicitacao/[id])
 */
export async function getReportDetails(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      categories (name, icon, sla_hours),
      report_history (
        id,
        old_status,
        new_status,
        note,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  
  // Ordenar o histórico cronologicamente
  if (data?.report_history) {
    data.report_history.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }
  
  return data
}

/**
 * 6. Lista TODOS os chamados (Painel do Gestor)
 */
export async function getAllReports() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*, categories(name, icon), profiles(full_name)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

/**
 * 7. Atualiza Status e gera registro no Histórico
 */
export async function updateReportStatus(reportId: string, newStatus: string, oldStatus: string, note?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Atualiza o status no report
  const { error: updateError } = await supabase
    .from('reports')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', reportId)

  if (updateError) throw updateError

  // 2. Cria a entrada no histórico
  const { error: historyError } = await supabase
    .from('report_history')
    .insert({
      report_id: reportId,
      changed_by: user?.id,
      old_status: oldStatus,
      new_status: newStatus,
      note: note
    })

  if (historyError) throw historyError
  return true
}