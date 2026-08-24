import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, Heart, MessageCircle, Bell, Settings, Phone, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { NUMERO_SUPPORT, lienWhatsapp } from '../lib/whatsapp'

const MENU = [
  { to: '/profil/mes-annonces', icone: Home, label: 'Mes annonces' },
  { to: '/profil/favoris', icone: Heart, label: 'Favoris sauvés' },
  { to: '/profil/messages', icone: MessageCircle, label: 'Messages reçus' },
  { to: '/profil/alertes', icone: Bell, label: 'Alertes de prix' },
  { to: '/profil/parametres', icone: Settings, label: 'Paramètres' },
] as const

export function Profil() {
  const { profil } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ annonces: 0, favoris: 0, messages: 0 })

  useEffect(() => {
    if (!supabase || !profil) return
    Promise.all([
      supabase.from('annonces').select('id', { count: 'exact', head: true }).eq('proprietaire_id', profil.id),
      supabase.from('favoris').select('id', { count: 'exact', head: true }).eq('utilisateur_id', profil.id),
      supabase.from('demandes_contact').select('id', { count: 'exact', head: true }).eq('proprietaire_id', profil.id),
    ]).then(([a, f, m]) => setStats({ annonces: a.count ?? 0, favoris: f.count ?? 0, messages: m.count ?? 0 }))
  }, [profil])

  async function seDeconnecter() {
    await supabase?.auth.signOut()
    navigate('/')
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-navy via-brand-blue to-teal pt-6 pb-10 px-5 text-center relative">
        <div className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center mx-auto mb-2.5 border-4 border-white/40 shadow">
          <User size={30} className="text-brand-blue" />
        </div>
        <div className="font-heading font-extrabold text-lg text-white mb-1">{profil?.nom || profil?.telephone || 'Mon Profil'}</div>
        <span className="text-[10px] text-white/85 bg-white/20 border border-white/30 rounded-full px-3.5 py-1 font-semibold font-heading">
          ✦ Propriétaire / Locataire
        </span>
      </div>

      <div className="flex px-5 gap-2.5 -mt-6 mb-1">
        <StatBox valeur={stats.annonces} label="Annonces" />
        <StatBox valeur={stats.favoris} label="Favoris" />
        <StatBox valeur={stats.messages} label="Messages" />
      </div>

      <div className="px-5 pt-5 pb-2.5 font-heading font-extrabold text-xs text-navy uppercase tracking-wide">⚙️ Mon compte</div>
      <div className="mx-5 bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
        {MENU.map(({ to, icone: Icone, label }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-blue-light">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0">
              <Icone size={16} />
            </span>
            <span className="flex-1 text-sm">{label}</span>
            <span className="text-brand-blue text-lg">›</span>
          </Link>
        ))}
        <a
          href={lienWhatsapp(NUMERO_SUPPORT, "Bonjour, j'ai besoin d'aide sur ImmoCam.")}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-teal-light"
        >
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal to-[#00a896] flex items-center justify-center text-white flex-shrink-0">
            <Phone size={16} />
          </span>
          <span className="flex-1 text-sm">Support WhatsApp</span>
          <span className="text-brand-blue text-lg">›</span>
        </a>
      </div>

      <div className="text-center py-6 text-[11px] text-slate-400">
        ImmoCam · 🇨🇲 Cameroun
        <br />
        <span className="text-teal font-semibold">Propulsé par ledigitalpourtous</span>
        <br />
        <button onClick={seDeconnecter} className="text-brand-blue font-semibold mt-3">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

function StatBox({ valeur, label }: { valeur: number; label: string }) {
  return (
    <div className="flex-1 bg-white rounded-2xl py-3 text-center border-2 border-slate-100 shadow-sm">
      <div className="font-heading font-extrabold text-lg text-navy">{valeur}</div>
      <div className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">{label}</div>
    </div>
  )
}
