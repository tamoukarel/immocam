import { supabase } from './supabase'

const BUCKET = 'annonces'
const DIMENSION_MAX = 1600
const QUALITE_JPEG = 0.75

// Redimensionne et recompresse en JPEG côté client avant l'upload : une
// photo de smartphone brute (3-8 Mo) est trop lourde à envoyer/charger sur
// la 3G/4G locale. Repli silencieux sur le fichier d'origine si le
// navigateur ne sait pas décoder l'image (ex: format non supporté).
async function comprimerImage(fichier: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(fichier)
    const echelle = Math.min(1, DIMENSION_MAX / Math.max(bitmap.width, bitmap.height))
    const largeur = Math.round(bitmap.width * echelle)
    const hauteur = Math.round(bitmap.height * echelle)

    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    const ctx = canvas.getContext('2d')
    if (!ctx) return fichier

    ctx.drawImage(bitmap, 0, 0, largeur, hauteur)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITE_JPEG))
    return blob && blob.size < fichier.size ? blob : fichier
  } catch {
    return fichier
  }
}

// Chemin {user_id}/{horodatage}-{nom} : c'est le premier segment que les
// policies Storage vérifient (voir supabase/schema.sql).
export async function televerserPhoto(fichier: File, userId: string): Promise<string> {
  const contenu = await comprimerImage(fichier)
  const chemin = `${userId}/${Date.now()}-${fichier.name.replace(/\.\w+$/, '')}.jpg`
  const { error } = await supabase!.storage.from(BUCKET).upload(chemin, contenu, { contentType: 'image/jpeg' })
  if (error) throw error
  return chemin
}

export function urlPhoto(chemin: string): string {
  return supabase!.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl
}

// Aligné sur le file_size_limit du bucket Storage "annonces" (voir schema.sql)
export const MAX_VIDEO_OCTETS = 15 * 1024 * 1024

// Pas de compression côté client pour la vidéo (contrairement aux photos) :
// on se contente de plafonner la taille à 15 Mo avant l'envoi, la
// compression vidéo dans le navigateur est trop coûteuse/peu fiable.
export async function televerserVideo(fichier: File, userId: string): Promise<string> {
  if (fichier.size > MAX_VIDEO_OCTETS) throw new Error('Vidéo trop lourde (max 15 Mo)')
  const chemin = `${userId}/${Date.now()}-${fichier.name}`
  const { error } = await supabase!.storage.from(BUCKET).upload(chemin, fichier, { contentType: fichier.type || 'video/mp4' })
  if (error) throw error
  return chemin
}
