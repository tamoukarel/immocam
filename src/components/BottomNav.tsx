import { NavLink } from 'react-router-dom'
import { Home, Search, PlusCircle, User } from 'lucide-react'
import { useLang } from '../lib/LangContext'

const LIENS = [
  { to: '/', cle: 'nav.accueil', icone: Home, fin: true },
  { to: '/annonces', cle: 'nav.annonces', icone: Search, fin: false },
  { to: '/publier', cle: 'nav.publier', icone: PlusCircle, fin: false },
  { to: '/profil', cle: 'nav.profil', icone: User, fin: false },
] as const

export function BottomNav() {
  const { t } = useLang()
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
            <Icone size={22} strokeWidth={2.2} />
            <span className="text-[11px] font-semibold">{t(cle)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
