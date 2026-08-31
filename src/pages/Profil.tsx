import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, Heart, MessageCircle, Bell, Settings, Phone, User, Flag, BadgeCheck, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { NUMERO_SUPPORT, lienWhatsapp } from '../lib/whatsapp'
import { urlPhoto } from '../lib/photos'
import { useLang } from '../lib/LangContext'
import { compterNouvellesCorrespondances } from '../lib/alertes'
import { compterEcheancesProches } from '../lib/gestionLocative'
import { Pastille } from '../components/Pastille'

export function Profil() {
  const { profil } = useAuth()
  const navigate = useNavigate()
  const { t } = useLang()
  const [stats, setStats] = useState({ annonces: 0, favoris: 0, messages: 0 })
  const [nouvellesAlertes, setNouvellesAlertes] = useState(0)
  const [echeancesProches, setEcheancesProches] = useState(0)

  const MENU = [
    { to: '/profil/mes-annonces', icone: Home, label: t('profil.menu.mesAnnonces'), badge: 0 },
    { to: '/profil/gestion-locative', icone: Building2, label: t('profil.menu.gestionLocative'), badge: echeancesProches },
    { to: '/profil/favoris', icone: Heart, label: t('profil.menu.favoris'), badge: 0 },
    { to: '/profil/messages', icone: MessageCircle, label: t('profil.menu.messages'), badge: 0 },
    { to: '/profil/alertes', icone: Bell, label: t('profil.menu.alertes'), badge: nouvellesAlertes },
    { to: '/profil/parametres', icone: Settings, label: t('profil.menu.parametres'), badge: 0 },
  ]

  useEffect(() => {
    if (!supabase || !profil) return
    Promise.all([
      supabase.from('annonces').select('id', { count: 'exact', head: true }).eq('proprietaire_id', profil.id),
      supabase.from('favoris').select('id', { count: 'exact', head: true }).eq('utilisateur_id', profil.id),
      supabase.from('demandes_contact').select('id', { count: 'exact', head: true }).eq('proprietaire_id', profil.id),
    ]).then(([a, f, m]) => setStats({ annonces: a.count ?? 0, favoris: f.count ?? 0, messages: m.count ?? 0 }))
    compterNouvellesCorrespondances(profil.id).then(setNouvellesAlertes)
    compterEcheancesProches(profil.id).then(setEcheancesProches)
  }, [profil])

  async function seDeconnecter() {
    await supabase?.auth.signOut()
    navigate('/')
  }

  return (
    <div>
      <div className="md:max-w-lg md:mx-auto">
        <div className="px-5 pt-6 pb-2 text-center">
          <div className="w-[72px] h-[72px] rounded-full bg-blue-light flex items-center justify-center mx-auto mb-2.5 border-2 border-slate-100 overflow-hidden">
            {profil?.photo ? <img src={urlPhoto(profil.photo)} className="w-full h-full object-cover" /> : <User size={30} className="text-brand-blue" />}
          </div>
          <div className="font-heading font-extrabold text-lg text-navy mb-1">{profil?.nom || profil?.telephone || t('profil.monProfil')}</div>
          <span className="text-[10px] text-brand-blue bg-blue-light border border-brand-blue/20 rounded-full px-3.5 py-1 font-semibold font-heading">
            {t('profil.role')}
          </span>
        </div>

        <div className="flex px-5 gap-2.5 mt-4 mb-1">
          <StatBox valeur={stats.annonces} label={t('profil.stat.annonces')} />
          <StatBox valeur={stats.favoris} label={t('profil.stat.favoris')} />
          <StatBox valeur={stats.messages} label={t('profil.stat.messages')} />
        </div>

        <div className="px-5 pt-5 pb-2.5 font-heading font-extrabold text-xs text-navy uppercase tracking-wide">{t('profil.monCompte')}</div>
        <div className="mx-5 bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
          {MENU.map(({ to, icone: Icone, label, badge }) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-blue-light">
              <span className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0">
                <Icone size={16} />
                <Pastille n={badge} />
              </span>
              <span className="flex-1 text-sm">{label}</span>
              <span className="text-brand-blue text-lg">›</span>
            </Link>
          ))}
          <a
            href={lienWhatsapp(NUMERO_SUPPORT, t('profil.aideMessage'))}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-teal-light"
          >
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal to-[#fe4701] flex items-center justify-center text-white flex-shrink-0">
              <Phone size={16} />
            </span>
            <span className="flex-1 text-sm">{t('profil.supportWhatsapp')}</span>
            <span className="text-brand-blue text-lg">›</span>
          </a>
        </div>

        {profil?.estAdmin && (
          <>
            <div className="px-5 pt-5 pb-2.5 font-heading font-extrabold text-xs text-red-500 uppercase tracking-wide">{t('profil.administration')}</div>
            <div className="mx-5 bg-white rounded-2xl border-2 border-red-100 overflow-hidden shadow-sm">
              <Link to="/profil/signalements" className="flex items-center gap-3 px-4 py-3.5 border-b border-red-100 hover:bg-red-50">
                <span className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center text-white flex-shrink-0">
                  <Flag size={16} />
                </span>
                <span className="flex-1 text-sm">{t('profil.signalements')}</span>
                <span className="text-brand-blue text-lg">›</span>
              </Link>
              <Link to="/profil/verification-profils" className="flex items-center gap-3 px-4 py-3.5 hover:bg-red-50">
                <span className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center text-white flex-shrink-0">
                  <BadgeCheck size={16} />
                </span>
                <span className="flex-1 text-sm">{t('profil.verificationProfils')}</span>
                <span className="text-brand-blue text-lg">›</span>
              </Link>
            </div>
          </>
        )}

        <div className="text-center py-6 text-[11px] text-slate-400">
          {t('profil.pays')}
          <br />
          <span className="text-teal font-semibold">{t('profil.propulsePar')}</span>
          <br />
          <button onClick={seDeconnecter} className="text-brand-blue font-semibold mt-3">
            {t('profil.seDeconnecter')}
          </button>
        </div>
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
