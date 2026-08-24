import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, LayoutGrid } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Annonce, TypeAnnonce } from '../lib/types'
import { AnnonceCard } from '../components/AnnonceCard'

const TRANCHES_PRIX = [
  { label: 'Tous prix', min: 0, max: Infinity },
  { label: '- 60k F', min: 0, max: 60000 },
  { label: '60k–120k', min: 60000, max: 120000 },
  { label: '120k–250k', min: 120000, max: 250000 },
  { label: '+ 250k', min: 250000, max: Infinity },
] as const

export function Annonces() {
  const [params] = useSearchParams()
  const recherche = params.get('q')?.toLowerCase().trim() ?? ''

  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [chargement, setChargement] = useState(true)
  const [type, setType] = useState<TypeAnnonce | 'all'>('all')
  const [tranche, setTranche] = useState(0)
  const [tri, setTri] = useState<'recent' | 'price-asc' | 'price-desc'>('recent')
  const [vue, setVue] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    if (!supabase) return
    setChargement(true)
    supabase
      .from('annonces')
      .select('*')
      .then(({ data }) => {
        setAnnonces((data as Annonce[]) ?? [])
        setChargement(false)
      })
  }, [])

  const filtrees = useMemo(() => {
    const { min, max } = TRANCHES_PRIX[tranche]
    let liste = annonces.filter((a) => a.prix >= min && a.prix < max)
    if (type !== 'all') liste = liste.filter((a) => a.type === type)
    if (recherche) {
      liste = liste.filter(
        (a) =>
          a.quartier.toLowerCase().includes(recherche) ||
          a.ville.toLowerCase().includes(recherche) ||
          a.description.toLowerCase().includes(recherche) ||
          a.pieces.toLowerCase().includes(recherche),
      )
    }
    if (tri === 'price-asc') liste = [...liste].sort((a, b) => a.prix - b.prix)
    else if (tri === 'price-desc') liste = [...liste].sort((a, b) => b.prix - a.prix)
    else liste = [...liste].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    return liste
  }, [annonces, type, tranche, tri, recherche])

  return (
    <div>
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading font-extrabold text-lg text-navy">🏠 Toutes les annonces</h2>
        <p className="text-xs text-slate-500">Propriétaires directs · 0 FCFA de commission</p>
      </div>

      <div className="px-5 pb-2 flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <Chip actif={type === 'all'} onClick={() => setType('all')}>
            Tout
          </Chip>
          <Chip actif={type === 'location'} onClick={() => setType('location')}>
            🔑 Location
          </Chip>
          <Chip actif={type === 'vente'} onClick={() => setType('vente')}>
            💰 Vente
          </Chip>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TRANCHES_PRIX.map((t, i) => (
            <Chip key={t.label} actif={tranche === i} onClick={() => setTranche(i)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Trier :</span>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as typeof tri)}
            className="border-2 border-slate-100 rounded-full px-2.5 py-1 text-[11px] text-slate-600"
          >
            <option value="recent">Plus récentes</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setVue('list')}
              className={`w-[30px] h-[30px] rounded-lg border-2 flex items-center justify-center ${vue === 'list' ? 'bg-brand-blue border-brand-blue text-white' : 'border-slate-100 text-slate-500'}`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setVue('grid')}
              className={`w-[30px] h-[30px] rounded-lg border-2 flex items-center justify-center ${vue === 'grid' ? 'bg-brand-blue border-brand-blue text-white' : 'border-slate-100 text-slate-500'}`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium px-5 pb-2">
        {chargement ? 'Chargement…' : `${filtrees.length} annonce${filtrees.length > 1 ? 's' : ''} trouvée${filtrees.length > 1 ? 's' : ''}`}
      </p>

      <div className={`px-5 pb-4 ${vue === 'grid' ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-3'}`}>
        {!chargement && filtrees.length === 0 && (
          <div className="col-span-2 text-center py-11">
            <div className="text-5xl mb-3">🔍</div>
            <strong className="block font-heading text-navy mb-1.5">Aucun résultat</strong>
            <p className="text-sm text-slate-500">Essayez d'autres filtres</p>
          </div>
        )}
        {filtrees.map((a) => (
          <AnnonceCard key={a.id} annonce={a} />
        ))}
      </div>
    </div>
  )
}

function Chip({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 border-2 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${
        actif ? 'border-brand-blue text-brand-blue bg-blue-light' : 'border-slate-100 text-slate-500 bg-white'
      }`}
    >
      {children}
    </button>
  )
}
