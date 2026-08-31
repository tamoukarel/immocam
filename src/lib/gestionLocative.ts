import { supabase } from './supabase'
import type { BienGere, LocataireGere, PaiementLoyer } from './types'

export function premierJourMoisCourant(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export interface LocataireAvecStatut extends LocataireGere {
  bien: BienGere
  paiement: PaiementLoyer | null
  // Négatif = en retard de N jours, positif = échéance dans N jours.
  joursAvantEcheance: number
}

// Récupère, pour un propriétaire, tous ses locataires actifs avec le statut
// de paiement du mois courant. Deux requêtes (biens+locataires, puis
// paiements du mois) plutôt qu'une jointure à trois niveaux filtrée, plus
// simple à composer côté client.
export async function chargerTableauDeBord(profilId: string): Promise<LocataireAvecStatut[]> {
  if (!supabase) return []

  const { data: biens } = await supabase
    .from('biens_geres')
    .select('*, locataires_geres(*)')
    .eq('proprietaire_id', profilId)

  type BienAvecLocataires = BienGere & { locataires_geres: LocataireGere[] }
  const liste = (biens as unknown as BienAvecLocataires[]) ?? []
  const locataireIds = liste.flatMap((b) => b.locataires_geres.filter((l) => l.actif).map((l) => l.id))
  if (locataireIds.length === 0) return []

  const mois = premierJourMoisCourant()
  const { data: paiements } = await supabase.from('paiements_loyer').select('*').eq('mois', mois).in('locataire_id', locataireIds)
  const paiementParLocataire = new Map((paiements as PaiementLoyer[] | null)?.map((p) => [p.locataire_id, p]) ?? [])

  const aujourdHui = new Date().getDate()

  const resultat: LocataireAvecStatut[] = []
  for (const bien of liste) {
    for (const locataire of bien.locataires_geres) {
      if (!locataire.actif) continue
      const { locataires_geres, ...bienSeul } = bien
      void locataires_geres
      resultat.push({
        ...locataire,
        bien: bienSeul,
        paiement: paiementParLocataire.get(locataire.id) ?? null,
        joursAvantEcheance: bien.jour_echeance - aujourdHui,
      })
    }
  }
  return resultat
}

// Nombre de locataires dont le paiement du mois n'est pas encore enregistré
// ET dont l'échéance est dans les 7 prochains jours ou déjà passée. Utilisé
// pour la pastille sur Profil et BottomNav.
export async function compterEcheancesProches(profilId: string): Promise<number> {
  const tableau = await chargerTableauDeBord(profilId)
  return tableau.filter((l) => !l.paiement && l.joursAvantEcheance <= 7).length
}

export const LIMITE_LOCATAIRES_GRATUIT = 3

// Nombre total de locataires actifs suivis par ce propriétaire, tous biens
// confondus — c'est le facteur qui détermine la limite freemium (voir
// policy "creer un locataire selon limite freemium" dans schema.sql).
export async function compterLocatairesActifs(profilId: string): Promise<number> {
  if (!supabase) return 0
  const { count } = await supabase
    .from('locataires_geres')
    .select('id, biens_geres!inner(proprietaire_id)', { count: 'exact', head: true })
    .eq('actif', true)
    .eq('biens_geres.proprietaire_id', profilId)
  return count ?? 0
}
