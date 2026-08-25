export type TypeAnnonce = 'location' | 'vente'
export type StatutAnnonce = 'dispo' | 'loue'
export type Niveau = 'rdc' | 'etage'

export function libelleNiveau(niveau: Niveau): string {
  return niveau === 'rdc' ? 'Rez-de-chaussée' : 'Étage'
}

// Le statut 'loue' sert aussi bien aux locations qu'aux ventes (un seul
// booléen "pris/dispo" en base) — seul le libellé change selon le type.
export function libellePris(type: TypeAnnonce): string {
  return type === 'vente' ? 'Vendu' : 'Loué'
}

export interface Annonce {
  id: string
  proprietaire_id: string
  type: TypeAnnonce
  ville: string
  quartier: string
  pieces: string
  prix: number
  unite: string
  description: string
  whatsapp: string
  photos: string[]
  statut: StatutAnnonce
  est_courte_duree: boolean
  avance_mois: number | null
  caution_mois: number | null
  niveau: Niveau | null
  distance_route: string | null
  vues: number
  video: string | null
  created_at: string
}

export interface ProfilColoc {
  utilisateur_id: string
  universite: string
  filiere: string
  budget: number
  created_at: string
  profils: { nom: string | null } | null
}

export interface AlertePrix {
  id: string
  utilisateur_id: string
  ville: string
  budget_max: number
  type: TypeAnnonce
  created_at: string
}

export interface DemandeContact {
  id: string
  annonce_id: string
  proprietaire_id: string
  expediteur_id: string | null
  created_at: string
  annonces: { ville: string; quartier: string; pieces: string } | null
}

export const VILLES = [
  'Yaoundé',
  'Douala',
  'Bafoussam',
  'Bamenda',
  'Garoua',
  'Maroua',
  'Ngaoundéré',
  'Bertoua',
  'Ebolowa',
  'Kribi',
  'Limbe',
  'Buea',
  'Kumba',
  'Edéa',
  'Dschang',
  'Nkongsamba',
  'Foumban',
] as const

export const DISTANCES_ROUTE = ['Sur le goudron', '< 100m', '< 200m', '< 500m', '+ 500m'] as const

export const TYPES_PIECES = [
  'Chambre simple',
  'Chambre moderne',
  'Chambre salon',
  'Chambre meublée',
  'Studio simple',
  'Studio moderne',
  'Studio meublé',
  'Appartement simple',
  'Appartement moderne',
  'Appartement meublé',
  'Duplex',
  'Villa',
  'Terrain',
  'Salle de fêtes',
] as const
