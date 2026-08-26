import { supabase } from './supabase'
import { libellePiece, type Annonce } from './types'
import { traduire, type Lang } from './i18n'

export function lienWhatsapp(numero: string, texte: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`
}

// "237697002986" -> "+237 697 002 986" (groupes de 3, comme le placeholder
// des champs WhatsApp). Repli sur la valeur brute si le format est inattendu.
export function formaterTelephone(brut: string): string {
  const chiffres = brut.replace(/\D/g, '')
  const indicatif = chiffres.startsWith('237') ? chiffres.slice(0, 3) : null
  const reste = indicatif ? chiffres.slice(3) : chiffres
  if (!indicatif || reste.length !== 9) return brut
  return `+${indicatif} ${reste.slice(0, 3)} ${reste.slice(3, 6)} ${reste.slice(6)}`
}

// Ouvre WhatsApp (la conversation se passe entièrement là-bas) et, si
// l'utilisateur est connecté, journalise le contact pour que le
// propriétaire le retrouve dans "Messages reçus".
export async function contacterProprietaire(annonce: Annonce, utilisateurId: string | null, lang: Lang) {
  if (supabase && utilisateurId && utilisateurId !== annonce.proprietaire_id) {
    void supabase.from('demandes_contact').insert({
      annonce_id: annonce.id,
      proprietaire_id: annonce.proprietaire_id,
      expediteur_id: utilisateurId,
    })
  }
  const texte = traduire(lang, 'whatsapp.interesse', { annonce: `${libellePiece(annonce.pieces, lang)} ${annonce.quartier}` })
  window.open(lienWhatsapp(annonce.whatsapp, texte), '_blank')
}

export const NUMERO_SUPPORT = '237653905975'
