import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface Profil {
  id: string
  telephone: string
  nom: string | null
}

interface AuthState {
  session: Session | null
  profil: Profil | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, profil: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) {
        setProfil(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) return
    let cancelled = false

    async function chargerOuCreerProfil() {
      const { data, error } = await supabase!
        .from('profils')
        .select('id, telephone, nom')
        .eq('id', session!.user.id)
        .single()

      if (data) {
        if (!cancelled) {
          setProfil(data as Profil)
          setLoading(false)
        }
        return
      }

      // PGRST116 = "aucune ligne" : première connexion, on crée le profil
      // à partir du numéro vérifié par l'OTP.
      if (error && error.code !== 'PGRST116') {
        if (!cancelled) setLoading(false)
        return
      }

      const { data: nouveauProfil } = await supabase!
        .from('profils')
        .insert({ id: session!.user.id, telephone: session!.user.phone ?? '' })
        .select()
        .single()

      if (!cancelled) {
        setProfil(nouveauProfil as Profil | null)
        setLoading(false)
      }
    }

    chargerOuCreerProfil()

    return () => {
      cancelled = true
    }
  }, [session])

  return <AuthContext.Provider value={{ session, profil, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
