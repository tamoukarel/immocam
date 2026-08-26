import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, LayoutGrid } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { TYPES_PIECES, libellePiece, type Annonce, type TypeAnnonce } from '../lib/types'
import { AnnonceCard } from '../components/AnnonceCard'
import { useLang } from '../lib/LangContext'

const TRANCHES_PRIX = [
  { cle: 'annonces.filtre.tousPrix', min: 0, max: Infinity },
  { cle: 'annonces.trancheMoins', min: 0, max: 60000 },
  { cle: 'annonces.tranche1', min: 60000, max: 120000 },
  { cle: 'annonces.tranche2', min: 120000, max: 250000 },
  { cle: 'annonces.tranchePlus', min: 250000, max: Infinity },
] as const

const TAILLE_PAGE = 20

export function Annonces() {
  const [params] = useSearchParams()
  const recherche = params.get('q')?.toLowerCase().trim() ?? ''
  const { lang, t } = useLang()

  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementPlus, setChargementPlus] = useState(false)
  const [encoreDesRes, setEncoreDesRes] = useState(false)
  const [type, setType] = useState<TypeAnnonce | 'all'>('all')
  const [pieces, setPieces] = useState<string>('all')
  const [tranche, setTranche] = useState(0)
  const [tri, setTri] = useState<'recent' | 'price-asc' | 'price-desc'>('recent')
  const [vue, setVue] = useState<'list' | 'grid'>('list')

  // Filtrage, tri et pagination se font côté serveur (pas en mémoire) pour
  // que la page reste rapide même quand le catalogue dépasse quelques
  // centaines d'annonces.
  function construireRequete(page: number) {
    let requete = supabase!.from('annonces').select('*').eq('statut', 'dispo')

    if (type !== 'all') requete = requete.eq('type', type)
    if (pieces !== 'all') requete = requete.eq('pieces', pieces)

    const { min, max } = TRANCHES_PRIX[tranche]
    requete = requete.gte('prix', min)
    if (max !== Infinity) requete = requete.lt('prix', max)

    if (recherche) {
      // Les caractères spéciaux de la syntaxe de filtre PostgREST (%,())
      // sont retirés pour éviter qu'une recherche ne modifie la requête.
      const q = recherche.replace(/[%,()]/g, ' ').trim()
      if (q) requete = requete.or(`quartier.ilike.%${q}%,ville.ilike.%${q}%,description.ilike.%${q}%,pieces.ilike.%${q}%`)
    }

    if (tri === 'price-asc') requete = requete.order('prix', { ascending: true })
    else if (tri === 'price-desc') requete = requete.order('prix', { ascending: false })
    else requete = requete.order('created_at', { ascending: false })

    return requete.range(page * TAILLE_PAGE, page * TAILLE_PAGE + TAILLE_PAGE - 1)
  }

  async function chargerPage(page: number) {
    if (!supabase) return
    if (page === 0) setChargement(true)
    else setChargementPlus(true)

    const { data } = await construireRequete(page)
    const lot = (data as Annonce[]) ?? []
    setAnnonces((prev) => (page === 0 ? lot : [...prev, ...lot]))
    setEncoreDesRes(lot.length === TAILLE_PAGE)
    setChargement(false)
    setChargementPlus(false)
  }

  useEffect(() => {
    chargerPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, pieces, tranche, tri, recherche])

  return (
    <div>
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading font-extrabold text-lg text-navy">{t('annonces.titre')}</h2>
        <p className="text-xs text-slate-500">{t('annonces.sousTitre')}</p>
      </div>

      <div className="px-5 pb-2 flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          <Chip actif={type === 'all'} onClick={() => setType('all')}>
            {t('annonces.filtre.tout')}
          </Chip>
          <Chip actif={type === 'location'} onClick={() => setType('location')}>
            {t('annonces.filtre.location')}
          </Chip>
          <Chip actif={type === 'vente'} onClick={() => setType('vente')}>
            {t('annonces.filtre.vente')}
          </Chip>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          <Chip actif={pieces === 'all'} onClick={() => setPieces('all')}>
            {t('annonces.filtre.toutesTailles')}
          </Chip>
          {TYPES_PIECES.map((p) => (
            <Chip key={p} actif={pieces === p} onClick={() => setPieces(p)}>
              {libellePiece(p, lang)}
            </Chip>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          {TRANCHES_PRIX.map((tr, i) => (
            <Chip key={tr.cle} actif={tranche === i} onClick={() => setTranche(i)}>
              {t(tr.cle)}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">{t('annonces.trier')}</span>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as typeof tri)}
            className="border-2 border-slate-100 rounded-full px-2.5 py-1 text-[11px] text-slate-600"
          >
            <option value="recent">{t('annonces.tri.recent')}</option>
            <option value="price-asc">{t('annonces.tri.prixCroissant')}</option>
            <option value="price-desc">{t('annonces.tri.prixDecroissant')}</option>
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
        {chargement ? t('annonces.chargement') : t('annonces.affichees', { n: annonces.length, s: annonces.length > 1 ? 's' : '' })}
      </p>

      <div className={`px-5 pb-4 ${vue === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5' : 'flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
        {!chargement && annonces.length === 0 && (
          <div className="col-span-full text-center py-11">
            <div className="text-5xl mb-3">🔍</div>
            <strong className="block font-heading text-navy mb-1.5">{t('annonces.aucunResultat')}</strong>
            <p className="text-sm text-slate-500">{t('annonces.essayezAutresFiltres')}</p>
          </div>
        )}
        {annonces.map((a) => (
          <AnnonceCard key={a.id} annonce={a} />
        ))}
      </div>

      {!chargement && encoreDesRes && (
        <div className="px-5 pb-6 flex justify-center">
          <button
            onClick={() => chargerPage(Math.ceil(annonces.length / TAILLE_PAGE))}
            disabled={chargementPlus}
            className="border-2 border-brand-blue text-brand-blue rounded-full px-5 py-2 text-xs font-bold font-heading disabled:opacity-60"
          >
            {chargementPlus ? t('annonces.chargement') : t('annonces.chargerPlus')}
          </button>
        </div>
      )}
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
