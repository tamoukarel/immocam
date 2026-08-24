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
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
