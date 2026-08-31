import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, PlusCircle, User } from 'lucide-react'
import { useLang } from '../lib/LangContext'
import { useAuth } from '../lib/AuthContext'
import { compterNouvellesCorrespondances } from '../lib/alertes'
import { compterEcheancesProches } from '../lib/gestionLocative'
import { Pastille } from './Pastille'

const LIENS = [
  { to: '/', cle: 'nav.accueil', icone: Home, fin: true },
  { to: '/annonces', cle: 'nav.annonces', icone: Search, fin: false },
  { to: '/publier', cle: 'nav.publier', icone: PlusCircle, fin: false },
  { to: '/profil', cle: 'nav.profil', icone: User, fin: false },
] as const

export function BottomNav() {
  const { t } = useLang()
  const { profil } = useAuth()
  const location = useLocation()
  const [nouvellesAlertes, setNouvellesAlertes] = useState(0)
  const [echeancesProches, setEcheancesProches] = useState(0)

  useEffect(() => {
    if (!profil) {
      setNouvellesAlertes(0)
      setEcheancesProches(0)
      return
    }
    compterNouvellesCorrespondances(profil.id).then(setNouvellesAlertes)
    compterEcheancesProches(profil.id).then(setEcheancesProches)
  }, [profil, location.pathname])

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-slate-100 shadow-[0_-4px_20px_rgba(11,59,145,0.08)]">
      <div className="max-w-md md:max-w-xl mx-auto flex pt-2 pb-4">
        {LIENS.map(({ to, cle, icone: Icone, fin }) => (
          <NavLink
            key={to}
            to={to}
            end={fin}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-1 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`
            }
          >
            <span className="relative">
              <Icone size={22} strokeWidth={2.2} />
              {to === '/profil' && <Pastille n={nouvellesAlertes + echeancesProches} />}
            </span>
            <span className="text-[11px] font-semibold">{t(cle)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
