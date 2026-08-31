import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface Profil {
  id: string
  telephone: string
  nom: string | null
  photo: string | null
  estAdmin: boolean
  estVerifie: boolean
  estPremiumGestion: boolean
}

interface AuthState {
  session: Session | null
  profil: Profil | null
  loading: boolean
  mettreAJourNom: (nom: string) => Promise<void>
  mettreAJourPhoto: (photo: string) => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  profil: null,
  loading: true,
  mettreAJourNom: async () => {},
  mettreAJourPhoto: async () => {},
})

function versProfil(data: {
  id: string
  nom: string | null
  photo: string | null
  est_admin: boolean
  est_verifie: boolean
  est_premium_gestion: boolean
  profils_prive: { telephone: string } | { telephone: string }[] | null
}): Profil {
  const prive = Array.isArray(data.profils_prive) ? data.profils_prive[0] : data.profils_prive
  return {
    id: data.id,
    nom: data.nom,
    photo: data.photo,
    estAdmin: data.est_admin,
    estVerifie: data.est_verifie,
    estPremiumGestion: data.est_premium_gestion,
    telephone: prive?.telephone ?? '',
  }
}

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
      // Le téléphone vit dans profils_prive (jamais public, voir schema.sql) ;
      // on le rejoint ici puisqu'on lit son propre profil.
      const { data, error } = await supabase!
        .from('profils')
        .select('id, nom, photo, est_admin, est_verifie, est_premium_gestion, profils_prive(telephone)')
        .eq('id', session!.user.id)
        .single()

      if (data) {
        if (!cancelled) {
          setProfil(versProfil(data))
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
        .insert({ id: session!.user.id })
        .select('id, nom, photo, est_admin, est_verifie, est_premium_gestion')
        .single()

      if (nouveauProfil) {
        await supabase!.from('profils_prive').insert({ id: session!.user.id, telephone: session!.user.phone ?? '' })
      }

      if (!cancelled) {
        setProfil(
          nouveauProfil
            ? {
                id: nouveauProfil.id,
                nom: nouveauProfil.nom,
                photo: nouveauProfil.photo,
                estAdmin: nouveauProfil.est_admin,
                estVerifie: nouveauProfil.est_verifie,
                estPremiumGestion: nouveauProfil.est_premium_gestion,
                telephone: session!.user.phone ?? '',
              }
            : null,
        )
        setLoading(false)
      }
    }

    chargerOuCreerProfil()

    return () => {
      cancelled = true
    }
  }, [session])

  async function mettreAJourNom(nom: string) {
    if (!supabase || !profil) return
    const { error } = await supabase.from('profils').update({ nom }).eq('id', profil.id)
    if (!error) setProfil((prev) => (prev ? { ...prev, nom } : prev))
  }

  async function mettreAJourPhoto(photo: string) {
    if (!supabase || !profil) return
    const { error } = await supabase.from('profils').update({ photo }).eq('id', profil.id)
    if (!error) setProfil((prev) => (prev ? { ...prev, photo } : prev))
  }

  return (
    <AuthContext.Provider value={{ session, profil, loading, mettreAJourNom, mettreAJourPhoto }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
