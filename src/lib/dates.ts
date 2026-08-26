import { traduire, type Lang } from './i18n'

export function ilYA(dateIso: string, lang: Lang): string {
  const secondes = Math.max(0, (Date.now() - new Date(dateIso).getTime()) / 1000)
  if (secondes < 3600) return traduire(lang, 'date.instant')
  if (secondes < 86400) return traduire(lang, 'date.heures', { n: Math.floor(secondes / 3600) })
  const jours = Math.floor(secondes / 86400)
  if (jours < 7) return traduire(lang, 'date.jours', { n: jours })
  if (jours < 30) return traduire(lang, 'date.semaines', { n: Math.floor(jours / 7) })
  return new Date(dateIso).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Ancienneté d'un compte, pour afficher "Membre depuis X" sur la fiche
// détail (élément de confiance : un compte récent inspire moins confiance
// qu'un compte actif depuis des mois).
export function membreDepuis(dateIso: string, lang: Lang): string {
  const jours = Math.max(0, (Date.now() - new Date(dateIso).getTime()) / 86400000)
  if (jours < 30) return traduire(lang, 'date.moinsUnMois')
  const mois = Math.floor(jours / 30)
  if (mois < 12) return traduire(lang, 'date.mois', { n: mois, s: mois > 1 ? 's' : '' })
  const ans = Math.floor(mois / 12)
  return traduire(lang, 'date.ans', { n: ans, s: ans > 1 ? 's' : '' })
}
