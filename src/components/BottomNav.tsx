import { NavLink } from 'react-router-dom'
import { Home, Search, PlusCircle, User } from 'lucide-react'

const LIENS = [
  { to: '/', label: 'Accueil', icone: Home, fin: true },
  { to: '/annonces', label: 'Annonces', icone: Search, fin: false },
  { to: '/publier', label: 'Publier', icone: PlusCircle, fin: false },
  { to: '/profil', label: 'Profil', icone: User, fin: false },
] as const

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-slate-100 shadow-[0_-4px_20px_rgba(11,59,145,0.08)]">
      <div className="max-w-md md:max-w-xl mx-auto flex pt-2 pb-4">
        {LIENS.map(({ to, label, icone: Icone, fin }) => (
          <NavLink
            key={to}
            to={to}
            end={fin}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-1 ${isActive ? 'text-brand-blue' : 'text-slate-400'}`
            }
          >
            <Icone size={22} strokeWidth={2.2} />
            <span className="text-[11px] font-semibold">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
