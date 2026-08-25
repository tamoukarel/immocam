import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-md md:max-w-3xl lg:max-w-6xl mx-auto relative pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
