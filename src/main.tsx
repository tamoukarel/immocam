import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
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
