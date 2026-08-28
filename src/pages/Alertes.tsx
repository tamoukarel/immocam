import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { VILLES, type AlertePrix, type TypeAnnonce } from '../lib/types'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

export function Alertes() {
  const { profil } = useAuth()
  const navigate = useNavigate()
  const afficherToast = useToast()
  const { t } = useLang()
  const [alertes, setAlertes] = useState<AlertePrix[]>([])
  const [correspondances, setCorrespondances] = useState<Record<string, number>>({})
  const [nouvelles, setNouvelles] = useState<Record<string, number>>({})
  const [ville, setVille] = useState<string>(VILLES[0])
  const [budget, setBudget] = useState('')
  const [type, setType] = useState<TypeAnnonce>('location')

  async function charger() {
    if (!supabase || !profil) return
    const { data } = await supabase.from('alertes_prix').select('*').eq('utilisateur_id', profil.id).order('created_at', { ascending: false })
    const liste = (data as AlertePrix[]) ?? []
    setAlertes(liste)
    const compteurs: Record<string, number> = {}
    const compteursNouvelles: Record<string, number> = {}
    await Promise.all(
      liste.map(async (a) => {
        // Deux requêtes construites indépendamment (pas de réutilisation
        // d'un même query builder) : les méthodes de filtre de supabase-js
        // mutent et renvoient `this`, réutiliser une base partagée donnerait
        // deux fois le même résultat filtré.
        const [{ count: total }, { count: recentes }] = await Promise.all([
          supabase!
            .from('annonces')
            .select('id', { count: 'exact', head: true })
            .eq('ville', a.ville)
            .eq('type', a.type)
            .lte('prix', a.budget_max)
            .eq('statut', 'dispo')
            .neq('proprietaire_id', profil.id),
          supabase!
            .from('annonces')
            .select('id', { count: 'exact', head: true })
            .eq('ville', a.ville)
            .eq('type', a.type)
            .lte('prix', a.budget_max)
            .eq('statut', 'dispo')
            .neq('proprietaire_id', profil.id)
            .gt('created_at', a.derniere_vue_at),
        ])
        compteurs[a.id] = total ?? 0
        compteursNouvelles[a.id] = recentes ?? 0
      }),
    )
    setCorrespondances(compteurs)
    setNouvelles(compteursNouvelles)
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  async function creer() {
    if (!supabase || !profil) return
    if (!budget || Number(budget) <= 0) {
      afficherToast(t('alertes.erreurBudget'))
      return
    }
    await supabase.from('alertes_prix').insert({ utilisateur_id: profil.id, ville, budget_max: Number(budget), type })
    setBudget('')
    afficherToast(t('alertes.creee'))
    charger()
  }

  async function supprimer(id: string) {
    await supabase?.from('alertes_prix').delete().eq('id', id)
    afficherToast(t('alertes.supprimee'))
    charger()
  }

  async function voir(a: AlertePrix) {
    await supabase?.from('alertes_prix').update({ derniere_vue_at: new Date().toISOString() }).eq('id', a.id)
    const p = new URLSearchParams({ ville: a.ville, type: a.type, prixMax: String(a.budget_max) })
    navigate(`/annonces?${p.toString()}`)
    charger()
  }

  return (
    <div>
      <PageHeader titre={t('alertes.titre')} sousTitre={t('alertes.sousTitre')} retourVers="/profil" />
      <div className="px-5 pb-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-3.5 md:max-w-lg">
          <div className="font-heading font-extrabold text-sm text-navy mb-3">{t('alertes.enregistrerRecherche')}</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="fl">{t('alertes.champ.ville')}</label>
              <select value={ville} onChange={(e) => setVille(e.target.value)} className="fs">
                {VILLES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1 min-w-0">
                <label className="fl">{t('alertes.champ.budgetMax')}</label>
                <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" placeholder={t('alertes.budgetPlaceholder')} className="fi" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="fl">{t('alertes.champ.type')}</label>
                <select value={type} onChange={(e) => setType(e.target.value as TypeAnnonce)} className="fs">
                  <option value="location">{t('alertes.type.location')}</option>
                  <option value="vente">{t('alertes.type.vente')}</option>
                </select>
              </div>
            </div>
            <button onClick={creer} className="btn-next">
              {t('alertes.sauvegarder')}
            </button>
          </div>
        </div>

        {alertes.length === 0 && <p className="text-center text-sm text-slate-400 italic py-4">{t('alertes.aucune')}</p>}
        <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {alertes.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border-2 border-slate-100 p-3 flex items-center justify-between shadow-sm">
              <div>
                <div className="font-heading font-bold text-sm text-navy">
                  📍 {a.type === 'vente' ? t('alertes.type.vente') : t('alertes.type.location')} · {a.ville}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {t('alertes.budgetMaxAffiche', { n: a.budget_max.toLocaleString('fr-FR'), unite: a.type === 'location' ? '/mois' : '' })}
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 ${correspondances[a.id] ? 'text-teal' : 'text-slate-400'}`}>
                  {correspondances[a.id]
                    ? t('alertes.correspondent', { n: correspondances[a.id], s: correspondances[a.id] > 1 ? 's' : '' })
                    : t('alertes.aucunBien')}
                </div>
                {nouvelles[a.id] > 0 && (
                  <div className="text-[10px] font-bold mt-0.5 text-teal">
                    {t('alertes.nouvelles', { n: nouvelles[a.id], s: nouvelles[a.id] > 1 ? 's' : '' })}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => voir(a)} className="bg-blue-light border-2 border-brand-blue text-brand-blue rounded-lg p-2 flex items-center justify-center">
                  <Eye size={14} />
                </button>
                <button onClick={() => supprimer(a.id)} className="bg-red-50 border-2 border-red-100 text-red-600 rounded-lg p-2 flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
