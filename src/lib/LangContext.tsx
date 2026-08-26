import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { traduire, type Lang } from './i18n'

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
  t: (cle: string, vars?: Record<string, string | number>) => string
}

const CLE_STOCKAGE = 'immocam_lang'

const LangContext = createContext<LangState>({
  lang: 'fr',
  setLang: () => {},
  t: (cle) => cle,
})

function detecterLangueInitiale(): Lang {
  try {
    const stockee = localStorage.getItem(CLE_STOCKAGE)
    if (stockee === 'fr' || stockee === 'en') return stockee
  } catch {
    // localStorage indisponible (navigation privée...) : on retombe sur la
    // détection navigateur puis le français par défaut.
  }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detecterLangueInitiale)

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE, lang)
    } catch {
      // Pas grave si on ne peut pas persister : la session en cours garde
      // le choix, seul le prochain lancement retombera sur la détection.
    }
  }, [lang])

  function setLang(l: Lang) {
    setLangState(l)
  }

  function t(cle: string, vars?: Record<string, string | number>) {
    return traduire(lang, cle, vars)
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
