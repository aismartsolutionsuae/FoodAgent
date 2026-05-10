import { supabase } from '@portfolio/database'
import type { Persona } from '../types'

export async function getPersonas(projectId?: string): Promise<Persona[]> {
  let q = supabase.from('personas').select('*').eq('is_active', true)
  if (projectId) q = q.or(`project_id.eq.${projectId},project_id.is.null`)
  const { data } = await q
  return (data ?? []) as Persona[]
}
