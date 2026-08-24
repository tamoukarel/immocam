import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-slate-500 max-w-sm text-sm">
          L'application n'est pas encore branchée à Supabase. Cette section sera accessible une fois le backend configuré.
        </p>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Chargement…</div>
  }

  if (!session) {
    return <Navigate to="/connexion" replace state={{ retourVers: location.pathname }} />
  }

  return <Outlet />
}
