import { supabase } from './supabase'

// Compte, toutes alertes confondues, le nombre total de nouvelles
// correspondances (annonces publiées depuis la dernière visite de chaque
// alerte). Utilisé pour la pastille sur Profil et BottomNav — partagé pour
// éviter de tripler la même requête à trois endroits différents.
export async function compterNouvellesCorrespondances(profilId: string): Promise<number> {
  if (!supabase) return 0

  const { data } = await supabase.from('alertes_prix').select('*').eq('utilisateur_id', profilId)
  const alertes = data ?? []
  if (alertes.length === 0) return 0

  const comptes = await Promise.all(
    alertes.map(async (a) => {
      const { count } = await supabase!
        .from('annonces')
        .select('id', { count: 'exact', head: true })
        .eq('ville', a.ville)
        .eq('type', a.type)
        .lte('prix', a.budget_max)
        .eq('statut', 'dispo')
        .neq('proprietaire_id', profilId)
        .gt('created_at', a.derniere_vue_at)
      return count ?? 0
    }),
  )

  return comptes.reduce((total, n) => total + n, 0)
}
