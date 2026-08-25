import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, GraduationCap, Wallet, Palmtree, Home as HomeIcon, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Annonce } from '../lib/types'
import { VILLES } from '../lib/types'
import { AnnonceCard } from '../components/AnnonceCard'

const ICONES_VILLE: Record<string, string> = {
  Yaoundé: '🏛️',
  Douala: '⚓',
  Bafoussam: '🌿',
  Bamenda: '⛰️',
  Garoua: '☀️',
  Maroua: '🌵',
  Ngaoundéré: '🐄',
  Bertoua: '🌳',
  Ebolowa: '🌴',
  Kribi: '🏖️',
  Limbe: '🌊',
  Buea: '🌋',
  Kumba: '🌾',
  Edéa: '💧',
  Dschang: '🎓',
  Nkongsamba: '🏔️',
  Foumban: '🏺',
}

const MODULES = [
  { to: '/annonces', icone: HomeIcon, num: '01', titre: 'Trouver sans agence', pts: ['Propriétaires directs', '0 FCFA commission'] },
  { to: '/coloc', icone: GraduationCap, num: '02', titre: 'Colocation étudiants', pts: ['Trouver un colocataire', 'Loyer divisé par 2'] },
  { to: '/budget', icone: Wallet, num: '03', titre: 'Recherche par budget', pts: ['Filtre mensuel', '0 visite inutile'] },
  { to: '/courte-duree', icone: Palmtree, num: '04', titre: 'Location courte durée', pts: ['Louer à la nuit', 'Idéal touristes'] },
] as const

export function Accueil() {
  const navigate = useNavigate()
  const [recherche, setRecherche] = useState('')
  const [ville, setVille] = useState<string>(VILLES[0])
  const [annonces, setAnnonces] = useState<Annonce[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('annonces')
      .select('*')
      .eq('ville', ville)
      .eq('statut', 'dispo')
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setAnnonces((data as Annonce[]) ?? []))
  }, [ville])

  function chercher() {
    navigate(recherche.trim() ? `/annonces?q=${encodeURIComponent(recherche.trim())}` : '/annonces')
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-navy via-brand-blue to-teal px-5 pt-5 pb-5 relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-full px-3 py-1 text-[10px] text-white font-bold font-heading mb-2.5">
          ✦ Plateforme immobilière au Cameroun
        </div>
        <h1 className="font-heading font-black text-lg text-white leading-tight">
          Votre <em className="not-italic text-gold">logement idéal</em>
          <br />
          sans agence ni commission
        </h1>
        <p className="text-[11px] text-white/80 mb-3.5">
          Propriétaires directs · <strong className="text-gold">0 FCFA</strong> de frais
        </p>
        <div className="bg-white rounded-2xl p-3 shadow-lg relative z-10">
          <div className="flex gap-2">
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && chercher()}
              placeholder="Quartier, ville…"
              className="flex-1 min-w-0 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm bg-bg outline-none focus:border-brand-blue"
            />
            <button
              onClick={chercher}
              className="flex-shrink-0 whitespace-nowrap bg-gradient-to-br from-navy via-brand-blue to-teal text-white rounded-lg px-4 text-xs font-bold font-heading flex items-center gap-1"
            >
              <Search size={14} /> Chercher
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-2.5">
        <SectionTitle titre="Choisir une ville" />
      </div>
      <div className="flex gap-2 px-5 pb-3.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
        {VILLES.map((v) => (
          <button
            key={v}
            onClick={() => setVille(v)}
            className={`inline-flex items-center gap-1 border-2 rounded-full px-3 py-1.5 text-xs font-semibold font-heading whitespace-nowrap flex-shrink-0 ${
              v === ville ? 'bg-navy text-white border-navy' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {ICONES_VILLE[v]} {v}
          </button>
        ))}
      </div>

      <div className="px-5 pb-2.5">
        <SectionTitle titre="Nos fonctionnalités" />
      </div>
      <div className="flex gap-2.5 px-5 pb-3.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
        {MODULES.map(({ to, icone: Icone, num, titre, pts }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="min-w-[165px] text-left bg-white rounded-2xl p-3.5 border-2 border-slate-100 shadow-sm flex-shrink-0 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-navy via-brand-blue to-teal" />
            <Icone size={26} className="text-brand-blue mb-1.5" />
            <div className="text-[8px] font-bold text-brand-blue tracking-wide font-heading uppercase mb-0.5">
              App {num}/04
            </div>
            <div className="font-heading font-extrabold text-xs text-navy mb-1.5 leading-tight">{titre}</div>
            <ul className="flex flex-col gap-0.5">
              {pts.map((p) => (
                <li key={p} className="text-[10px] text-slate-500 flex gap-1 leading-tight">
                  <span className="text-teal font-bold">✓</span> {p}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="px-5 pt-2.5 pb-2.5 flex items-center justify-between">
        <SectionTitle titre="Annonces récentes" />
        <button onClick={() => navigate('/annonces')} className="text-[11px] text-brand-blue font-bold font-heading border-2 border-brand-blue rounded-full px-3 py-1 flex items-center gap-1">
          Voir tout <ArrowRight size={12} />
        </button>
      </div>
      <div className="px-5 pb-4 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {annonces.length === 0 && <p className="col-span-full text-sm text-slate-400 text-center py-6">Aucune annonce à {ville} pour l'instant.</p>}
        {annonces.map((a) => (
          <AnnonceCard key={a.id} annonce={a} />
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ titre }: { titre: string }) {
  return (
    <div className="font-heading font-extrabold text-sm text-navy flex items-center gap-1.5">
      <span className="block w-1 h-4 bg-gradient-to-b from-navy to-teal rounded-sm" />
      {titre}
    </div>
  )
}
