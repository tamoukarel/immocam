export type TypeAnnonce = 'location' | 'vente'
export type StatutAnnonce = 'dispo' | 'loue'

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
  'Garoua',
  'Buea',
  'Bamenda',
  'Maroua',
  'Ngaoundéré',
] as const

export const TYPES_PIECES = ['Studio', '2 pièces', '3 pièces', '4 pièces', '5+ pièces', 'Villa'] as const
