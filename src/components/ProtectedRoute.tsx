import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { useLang } from '../lib/LangContext'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const { t } = useLang()

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-slate-500 max-w-sm text-sm">{t('connexion.backendNonConfigureSection')}</p>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">{t('detail.chargement')}</div>
  }

  if (!session) {
    return <Navigate to="/connexion" replace state={{ retourVers: location.pathname }} />
  }

  return <Outlet />
}
