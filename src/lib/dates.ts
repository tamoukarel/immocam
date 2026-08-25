export function ilYA(dateIso: string): string {
  const secondes = Math.max(0, (Date.now() - new Date(dateIso).getTime()) / 1000)
  if (secondes < 3600) return 'À l\'instant'
  if (secondes < 86400) return `Il y a ${Math.floor(secondes / 3600)} h`
  const jours = Math.floor(secondes / 86400)
  if (jours < 7) return `Il y a ${jours} j`
  if (jours < 30) return `Il y a ${Math.floor(jours / 7)} sem.`
  return new Date(dateIso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Ancienneté d'un compte, pour afficher "Membre depuis X" sur la fiche
// détail (élément de confiance : un compte récent inspire moins confiance
// qu'un compte actif depuis des mois).
export function membreDepuis(dateIso: string): string {
  const jours = Math.max(0, (Date.now() - new Date(dateIso).getTime()) / 86400000)
  if (jours < 30) return "moins d'un mois"
  const mois = Math.floor(jours / 30)
  if (mois < 12) return `${mois} mois`
  const ans = Math.floor(mois / 12)
  return `${ans} an${ans > 1 ? 's' : ''}`
}
