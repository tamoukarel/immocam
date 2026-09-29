import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { demarrerSurveillance, sentryActif } from './lib/surveillance'

demarrerSurveillance()

registerSW({ immediate: true })

// Les erreurs de rendu React partent aussi vers Sentry quand il est actif
createRoot(
  document.getElementById('root')!,
  sentryActif ? { onUncaughtError: Sentry.reactErrorHandler(), onCaughtError: Sentry.reactErrorHandler() } : undefined,
).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// L'écran de chargement statique (index.html) masque le flash blanc pendant
// que le bundle JS se charge ; on l'enlève une fois le premier rendu peint.
requestAnimationFrame(() => {
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.style.opacity = '0'
  setTimeout(() => splash.remove(), 250)
})
