import { Outlet, Link } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b-2 border-slate-100">
        <div className="max-w-md md:max-w-3xl lg:max-w-6xl mx-auto px-5 py-2.5">
          <Link to="/" className="inline-flex items-center gap-1.5">
            <img src="/logo-icon.png" alt="ImmoCam" className="w-7 h-7" />
            <span className="font-heading font-extrabold text-base">
              <span className="bg-gradient-to-br from-navy to-brand-blue bg-clip-text text-transparent">immo</span>
              <span className="bg-gradient-to-br from-orange-600 to-amber-400 bg-clip-text text-transparent">cam</span>
            </span>
          </Link>
        </div>
      </header>
      <div className="max-w-md md:max-w-3xl lg:max-w-6xl mx-auto relative pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
