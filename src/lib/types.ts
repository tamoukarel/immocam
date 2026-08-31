import { traduire, type Lang } from './i18n'

export type TypeAnnonce = 'location' | 'vente'
export type StatutAnnonce = 'dispo' | 'loue'
export type Niveau = 'rdc' | 'etage'

export function libelleNiveau(niveau: Niveau, lang: Lang): string {
  return traduire(lang, niveau === 'rdc' ? 'statut.rdc' : 'statut.etage')
}

// Le statut 'loue' sert aussi bien aux locations qu'aux ventes (un seul
// booléen "pris/dispo" en base) — seul le libellé change selon le type.
export function libellePris(type: TypeAnnonce, lang: Lang): string {
  return traduire(lang, type === 'vente' ? 'statut.vendu' : 'statut.loue')
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

export interface ProfilPublic {
  nom: string | null
  photo: string | null
  created_at: string
  est_verifie: boolean
}

export type AnnonceAvecProprietaire = Annonce & { profils: ProfilPublic | null }

export interface BienGere {
  id: string
  proprietaire_id: string
  nom: string
  adresse: string
  loyer_mensuel: number
  jour_echeance: number
  created_at: string
}

export interface LocataireGere {
  id: string
  bien_id: string
  nom: string
  telephone: string
  date_debut_bail: string | null
  actif: boolean
  created_at: string
}

export interface PaiementLoyer {
  id: string
  locataire_id: string
  mois: string
  loyer_nu: number
  charges: number
  date_paiement: string
  note: string
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
  derniere_vue_at: string
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

// La valeur stockée en base (et utilisée pour filtrer) reste toujours ce
// libellé français canonique — seul l'affichage est traduit selon la langue.
const CLES_PIECES: Record<string, string> = {
  'Chambre simple': 'piece.chambreSimple',
  'Chambre moderne': 'piece.chambreModerne',
  'Chambre salon': 'piece.chambreSalon',
  'Chambre meublée': 'piece.chambreMeublee',
  'Studio simple': 'piece.studioSimple',
  'Studio moderne': 'piece.studioModerne',
  'Studio meublé': 'piece.studioMeuble',
  'Appartement simple': 'piece.appartementSimple',
  'Appartement moderne': 'piece.appartementModerne',
  'Appartement meublé': 'piece.appartementMeuble',
  Duplex: 'piece.duplex',
  Villa: 'piece.villa',
  Terrain: 'piece.terrain',
  'Salle de fêtes': 'piece.salleDeFetes',
}

const CLES_DISTANCE: Record<string, string> = {
  'Sur le goudron': 'distance.surLeGoudron',
  '< 100m': 'distance.moins100',
  '< 200m': 'distance.moins200',
  '< 500m': 'distance.moins500',
  '+ 500m': 'distance.plus500',
}

export function libellePiece(piece: string, lang: Lang): string {
  const cle = CLES_PIECES[piece]
  return cle ? traduire(lang, cle) : piece
}

export function libelleDistance(distance: string, lang: Lang): string {
  const cle = CLES_DISTANCE[distance]
  return cle ? traduire(lang, cle) : distance
}
