// src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Tipos úteis
export type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'rejected'

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  sla_hours: number
  parent_id: string | null
}

export interface Report {
  id: string
  protocol: string
  user_id: string
  category_id: string
  address_hint: string
  city: string
  description: string | null
  photo_url: string | null
  status: ReportStatus
  criticality_score: number
  created_at: string
  categories?: Category
}