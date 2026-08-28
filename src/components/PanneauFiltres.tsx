import { useState } from 'react'
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { VILLES, DISTANCES_ROUTE, libelleDistance, libelleNiveau, type Niveau } from '../lib/types'
import { useLang } from '../lib/LangContext'

interface Props {
  ville: string
  setVille: (v: string) => void
  distance: string
  setDistance: (v: string) => void
  niveau: Niveau | 'all'
  setNiveau: (v: Niveau | 'all') => void
  courteDuree: boolean
  setCourteDuree: (v: boolean) => void
  meuble: boolean
  setMeuble: (v: boolean) => void
  prixMin: string
  setPrixMin: (v: string) => void
  prixMax: string
  setPrixMax: (v: string) => void
  pieces: string
  onReinitialiser: () => void
}

export function PanneauFiltres(props: Props) {
  const { ville, setVille, distance, setDistance, niveau, setNiveau, courteDuree, setCourteDuree, meuble, setMeuble, prixMin, setPrixMin, prixMax, setPrixMax, pieces, onReinitialiser } = props
  const [ouvert, setOuvert] = useState(false)
  const { lang, t } = useLang()

  const meubleDesactive = pieces !== 'all'
  const nombreActifs =
    (ville !== 'all' ? 1 : 0) +
    (courteDuree ? 1 : 0) +
    (distance !== 'all' ? 1 : 0) +
    (niveau !== 'all' ? 1 : 0) +
    (prixMin || prixMax ? 1 : 0) +
    (!meubleDesactive && meuble ? 1 : 0)

  return (
    <div>
      <button
        onClick={() => setOuvert((v) => !v)}
        className={`inline-flex items-center gap-1.5 border-2 rounded-full px-3 py-1.5 text-[11px] font-bold font-heading ${
          nombreActifs > 0 ? 'border-brand-blue text-brand-blue bg-blue-light' : 'border-slate-100 text-slate-600 bg-white'
        }`}
      >
        <SlidersHorizontal size={13} />
        {t('annonces.filtres.bouton')}
        {nombreActifs > 0 && ` (${nombreActifs})`}
        {ouvert ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {ouvert && (
        <div className="mt-2 p-3 bg-white border-2 border-slate-100 rounded-xl grid grid-cols-2 gap-3">
          <label className="col-span-2 sm:col-span-1 text-[11px] font-semibold text-slate-600">
            {t('annonces.filtres.ville')}
            <select
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="mt-1 w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="all">{t('annonces.filtres.toutesVilles')}</option>
              {VILLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 sm:col-span-1 text-[11px] font-semibold text-slate-600">
            {t('annonces.filtres.distance')}
            <select
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="mt-1 w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="all">{t('annonces.filtres.toutesDistances')}</option>
              {DISTANCES_ROUTE.map((d) => (
                <option key={d} value={d}>
                  {libelleDistance(d, lang)}
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-2 sm:col-span-1 text-[11px] font-semibold text-slate-600">
            {t('annonces.filtres.niveau')}
            <select
              value={niveau}
              onChange={(e) => setNiveau(e.target.value as Niveau | 'all')}
              className="mt-1 w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="all">{t('annonces.filtres.tousNiveaux')}</option>
              <option value="rdc">{libelleNiveau('rdc', lang)}</option>
              <option value="etage">{libelleNiveau('etage', lang)}</option>
            </select>
          </label>

          <div className="col-span-2 sm:col-span-1 flex flex-col gap-2 justify-end">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <input type="checkbox" checked={courteDuree} onChange={(e) => setCourteDuree(e.target.checked)} className="accent-brand-blue" />
              {t('annonces.filtres.courteDuree')}
            </label>
            <label
              className={`flex items-center gap-2 text-[11px] font-semibold ${meubleDesactive ? 'text-slate-300' : 'text-slate-600'}`}
              title={meubleDesactive ? t('annonces.filtres.meubleDesactive') : undefined}
            >
              <input
                type="checkbox"
                checked={meuble}
                disabled={meubleDesactive}
                onChange={(e) => setMeuble(e.target.checked)}
                className="accent-brand-blue disabled:opacity-40"
              />
              {t('annonces.filtres.meuble')}
            </label>
          </div>

          <label className="text-[11px] font-semibold text-slate-600">
            {t('annonces.filtres.prixMin')}
            <input
              type="number"
              min={0}
              value={prixMin}
              onChange={(e) => setPrixMin(e.target.value)}
              className="mt-1 w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-700"
            />
          </label>
          <label className="text-[11px] font-semibold text-slate-600">
            {t('annonces.filtres.prixMax')}
            <input
              type="number"
              min={0}
              value={prixMax}
              onChange={(e) => setPrixMax(e.target.value)}
              className="mt-1 w-full border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-700"
            />
          </label>

          <button
            onClick={onReinitialiser}
            className="col-span-2 border-2 border-slate-100 text-slate-500 rounded-full py-1.5 text-[11px] font-bold font-heading"
          >
            {t('annonces.filtres.reinitialiser')}
          </button>
        </div>
      )}
    </div>
  )
}
