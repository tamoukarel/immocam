import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const ToastContext = createContext<(texte: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const afficher = useCallback((texte: string) => {
    setMessage(texte)
    setTimeout(() => setMessage(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={afficher}>
      {children}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-navy text-white px-5 py-2.5 rounded-full text-xs font-bold font-heading shadow-lg transition-opacity pointer-events-none whitespace-nowrap ${message ? 'opacity-100' : 'opacity-0'}`}
      >
        {message}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
