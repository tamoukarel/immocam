import { supabase } from './supabase'

const BUCKET = 'annonces'

// Chemin {user_id}/{horodatage}-{nom} : c'est le premier segment que les
// policies Storage vérifient (voir supabase/schema.sql).
export async function televerserPhoto(fichier: File, userId: string): Promise<string> {
  const chemin = `${userId}/${Date.now()}-${fichier.name}`
  const { error } = await supabase!.storage.from(BUCKET).upload(chemin, fichier)
  if (error) throw error
  return chemin
}

export function urlPhoto(chemin: string): string {
  return supabase!.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl
}
