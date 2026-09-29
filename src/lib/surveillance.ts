import * as Sentry from '@sentry/react'

// Surveillance de l'app en production uniquement :
// - Sentry remonte chaque erreur JS (page, appareil, ligne qui a planté)
// - Microsoft Clarity enregistre les sessions pour voir où les gens bloquent
// Les deux identifiants sont publics par conception (pas des secrets) et
// viennent des variables d'env Netlify. Sans eux, rien n'est chargé.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const clarityId = import.meta.env.VITE_CLARITY_ID

export const sentryActif = Boolean(sentryDsn && import.meta.env.PROD)

export function demarrerSurveillance() {
  if (sentryActif) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
    })
  }

  if (clarityId && import.meta.env.PROD) chargerClarity(clarityId)
}

// Équivalent du script d'installation fourni par Clarity
function chargerClarity(id: string) {
  const w = window as unknown as { clarity?: { q?: unknown[] } & ((...args: unknown[]) => void) }
  if (w.clarity) return
  const file: unknown[] = []
  const clarity = (...args: unknown[]) => { file.push(args) }
  w.clarity = Object.assign(clarity, { q: file })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`
  document.head.appendChild(script)
}

// Relie les erreurs à un utilisateur par son identifiant technique uniquement
// (jamais le téléphone ni le nom), pour savoir si un bug touche une ou
// plusieurs personnes.
export function identifierUtilisateur(id: string | null) {
  if (sentryActif) Sentry.setUser(id ? { id } : null)
}
