import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Annonce } from '../lib/types'
import { AnnonceCard } from '../components/AnnonceCard'
import { useLang } from '../lib/LangContext'

const TRANCHES = [
  { label: '30 000 – 60 000 F/mois', min: 30000, max: 60000 },
  { label: '60 000 – 100 000 F/mois', min: 60000, max: 100000 },
  { label: '100 000 – 200 000 F/mois', min: 100000, max: 200000 },
  { label: '200 000 – 500 000 F/mois', min: 200000, max: 500001 },
]

export function Budget() {
  const { t } = useLang()
  const [budget, setBudget] = useState(150000)
  const [locations, setLocations] = useState<Annonce[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('annonces')
      .select('*')
      .eq('type', 'location')
      .eq('statut', 'dispo')
      .then(({ data }) => setLocations((data as Annonce[]) ?? []))
  }, [])

  const resultats = locations.filter((l) => l.prix <= budget)

  return (
    <div>
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading font-extrabold text-lg text-navy">{t('budget.titre')}</h2>
        <p className="text-xs text-slate-500">{t('budget.sousTitre')}</p>
      </div>

      <div className="mx-5 bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-3.5 md:max-w-lg">
        <div className="font-heading font-extrabold text-sm text-navy mb-2.5">{t('budget.maxTitre')}</div>
        <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-1.5">
          <span>30 000</span>
          <span className="text-brand-blue font-bold">{budget.toLocaleString('fr-FR')}</span>
          <span>500 000</span>
        </div>
        <input
          type="range"
          min={30000}
          max={500000}
          step={10000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-brand-blue"
        />
        <div className="flex flex-col gap-2 mt-3">
          {TRANCHES.map((t2) => {
            const c = locations.filter((l) => l.prix >= t2.min && l.prix < t2.max).length
            return (
              <button
                key={t2.label}
                onClick={() => setBudget(t2.max - 1)}
                className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-medium border-2 ${
                  budget >= t2.min ? 'border-brand-blue bg-blue-light text-navy' : 'border-transparent bg-bg text-slate-600'
                }`}
              >
                <span>◦ {t2.label}</span>
                <span className="bg-brand-blue text-white text-[10px] font-bold font-heading rounded-full px-2.5 py-0.5">
                  {c} {t('budget.bien', { s: c > 1 ? 's' : '' })}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-5 pb-2.5">
        <div className="font-heading font-extrabold text-sm text-navy flex items-center gap-1.5">
          <span className="block w-1 h-4 bg-gradient-to-b from-navy to-teal rounded-sm" />
          {t('budget.resultatsFiltres')}
        </div>
      </div>
      <div className="px-5 pb-6 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {resultats.length === 0 && <p className="col-span-full text-center text-sm text-slate-400 py-6">{t('budget.aucunBien')}</p>}
        {resultats.map((a) => (
          <AnnonceCard key={a.id} annonce={a} />
        ))}
      </div>
    </div>
  )
}
