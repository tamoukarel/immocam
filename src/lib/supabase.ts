import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Configuration Supabase manquante : copie .env.example vers .env et renseigne VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. La consultation des annonces fonctionne quand même, mais connexion, publication et favoris resteront indisponibles.',
  )
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // ImmoCam se connecte uniquement par téléphone + code SMS (signInWithOtp/
        // verifyOtp, voir Connexion.tsx) : aucun écran ne renvoie jamais vers l'appli
        // avec un jeton dans l'adresse (ce que detectSessionInUrl sert normalement à
        // capter, pour une connexion par lien ou par un autre service). Le désactiver
        // retire un point d'entrée inutilisé : sans ça, quelqu'un qui obtiendrait ses
        // propres jetons de connexion pourrait fabriquer un lien et, si une victime
        // l'ouvre, lui faire adopter silencieusement la session de l'attaquant.
        detectSessionInUrl: false,
      },
    })
  : null
