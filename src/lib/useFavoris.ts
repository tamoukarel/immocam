import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

// Centralise les favoris (chargement + bascule) pour que toutes les pages
// affichant des annonces (Accueil, Annonces, Budget, Favoris...) restent
// synchronisées sans recharger chacune leur propre copie.
export function useFavoris() {
  const { profil } = useAuth()
  const [favoris, setFavoris] = useState<Set<string>>(new Set())

  const recharger = useCallback(async () => {
    if (!supabase || !profil) {
      setFavoris(new Set())
      return
    }
    const { data } = await supabase.from('favoris').select('annonce_id').eq('utilisateur_id', profil.id)
    setFavoris(new Set((data ?? []).map((f) => f.annonce_id as string)))
  }, [profil])

  useEffect(() => {
    recharger()
  }, [recharger])

  async function basculer(annonceId: string) {
    if (!supabase || !profil) return false
    if (favoris.has(annonceId)) {
      await supabase.from('favoris').delete().eq('utilisateur_id', profil.id).eq('annonce_id', annonceId)
      setFavoris((prev) => {
        const next = new Set(prev)
        next.delete(annonceId)
        return next
      })
    } else {
      await supabase.from('favoris').insert({ utilisateur_id: profil.id, annonce_id: annonceId })
      setFavoris((prev) => new Set(prev).add(annonceId))
    }
    return true
  }

  return { favoris, basculer, connecte: Boolean(profil) }
}
