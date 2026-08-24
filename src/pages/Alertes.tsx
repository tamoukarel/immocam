import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { VILLES, type AlertePrix, type TypeAnnonce } from '../lib/types'
import { PageHeader } from '../components/PageHeader'

export function Alertes() {
  const { profil } = useAuth()
  const afficherToast = useToast()
  const [alertes, setAlertes] = useState<AlertePrix[]>([])
  const [correspondances, setCorrespondances] = useState<Record<string, number>>({})
  const [ville, setVille] = useState<string>(VILLES[0])
  const [budget, setBudget] = useState('')
  const [type, setType] = useState<TypeAnnonce>('location')

  async function charger() {
    if (!supabase || !profil) return
    const { data } = await supabase.from('alertes_prix').select('*').eq('utilisateur_id', profil.id).order('created_at', { ascending: false })
    const liste = (data as AlertePrix[]) ?? []
    setAlertes(liste)
    const compteurs: Record<string, number> = {}
    await Promise.all(
      liste.map(async (a) => {
        const { count } = await supabase!
          .from('annonces')
          .select('id', { count: 'exact', head: true })
          .eq('ville', a.ville)
          .eq('type', a.type)
          .lte('prix', a.budget_max)
        compteurs[a.id] = count ?? 0
      }),
    )
    setCorrespondances(compteurs)
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  async function creer() {
    if (!supabase || !profil) return
    if (!budget || Number(budget) <= 0) {
      afficherToast('⚠️ Entrez un budget valide')
      return
    }
    await supabase.from('alertes_prix').insert({ utilisateur_id: profil.id, ville, budget_max: Number(budget), type })
    setBudget('')
    afficherToast('🔔 Alerte créée !')
    charger()
  }

  async function supprimer(id: string) {
    await supabase?.from('alertes_prix').delete().eq('id', id)
    afficherToast('Alerte supprimée')
    charger()
  }

  return (
    <div>
      <PageHeader titre="🔔 Alertes de prix" sousTitre="Soyez notifié dès qu'un bien correspond" retourVers="/profil" />
      <div className="px-5 pb-6">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-3.5">
          <div className="font-heading font-extrabold text-sm text-navy mb-3">➕ Créer une alerte</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="fl">Ville</label>
              <select value={ville} onChange={(e) => setVille(e.target.value)} className="fs">
                {VILLES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1">
                <label className="fl">Budget max</label>
                <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" placeholder="Ex: 100000" className="fi" />
              </div>
              <div className="flex-1">
                <label className="fl">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as TypeAnnonce)} className="fs">
                  <option value="location">Location</option>
                  <option value="vente">Vente</option>
                </select>
              </div>
            </div>
            <button onClick={creer} className="btn-next">
              🔔 Créer l'alerte
            </button>
          </div>
        </div>

        {alertes.length === 0 && <p className="text-center text-sm text-slate-400 italic py-4">Aucune alerte créée</p>}
        <div className="flex flex-col gap-2">
          {alertes.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border-2 border-slate-100 p-3 flex items-center justify-between shadow-sm">
              <div>
                <div className="font-heading font-bold text-sm text-navy">
                  📍 {a.type === 'vente' ? 'Vente' : 'Location'} · {a.ville}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Budget max : {a.budget_max.toLocaleString('fr-FR')} F{a.type === 'location' ? '/mois' : ''}</div>
                <div className={`text-[10px] font-semibold mt-0.5 ${correspondances[a.id] ? 'text-teal' : 'text-slate-400'}`}>
                  {correspondances[a.id] ? `✓ ${correspondances[a.id]} bien${correspondances[a.id] > 1 ? 's' : ''} correspondent déjà` : 'Aucun bien pour l\'instant'}
                </div>
              </div>
              <button onClick={() => supprimer(a.id)} className="bg-red-50 border-2 border-red-100 text-red-600 rounded-lg p-2 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
