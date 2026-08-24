import { supabase } from './supabase'
import type { Annonce } from './types'

export function lienWhatsapp(numero: string, texte: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`
}

// Ouvre WhatsApp (la conversation se passe entièrement là-bas) et, si
// l'utilisateur est connecté, journalise le contact pour que le
// propriétaire le retrouve dans "Messages reçus".
export async function contacterProprietaire(annonce: Annonce, utilisateurId: string | null) {
  if (supabase && utilisateurId && utilisateurId !== annonce.proprietaire_id) {
    void supabase.from('demandes_contact').insert({
      annonce_id: annonce.id,
      proprietaire_id: annonce.proprietaire_id,
      expediteur_id: utilisateurId,
    })
  }
  const texte = `Bonjour, je suis intéressé(e) par : "${annonce.pieces} ${annonce.quartier}" sur ImmoCam 🏠🇨🇲`
  window.open(lienWhatsapp(annonce.whatsapp, texte), '_blank')
}

export const NUMERO_SUPPORT = '237653905975'
