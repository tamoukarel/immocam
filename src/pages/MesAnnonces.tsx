import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { urlPhoto } from '../lib/photos'
import type { Annonce } from '../lib/types'
import { PageHeader } from '../components/PageHeader'

export function MesAnnonces() {
  const { profil } = useAuth()
  const afficherToast = useToast()
  const [annonces, setAnnonces] = useState<Annonce[] | null>(null)

  async function charger() {
    if (!supabase || !profil) return
    const { data } = await supabase
      .from('annonces')
      .select('*')
      .eq('proprietaire_id', profil.id)
      .order('created_at', { ascending: false })
    setAnnonces((data as Annonce[]) ?? [])
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  async function supprimer(a: Annonce) {
    if (!supabase) return
    if (!confirm(`Supprimer cette annonce ?\n"${a.pieces} · ${a.quartier}, ${a.ville}"\n\nAction irréversible.`)) return
    await supabase.from('annonces').delete().eq('id', a.id)
    afficherToast('🗑️ Annonce supprimée')
    charger()
  }

  return (
    <div>
      <PageHeader titre="🏠 Mes annonces" sousTitre="Modifiez ou supprimez vos publications" retourVers="/profil" />
      <div className="px-5 pb-6 flex flex-col gap-2.5">
        {annonces?.length === 0 && (
          <div className="text-center py-11">
            <div className="text-5xl mb-3">🏠</div>
            <strong className="block font-heading text-navy mb-1.5">Aucune annonce publiée</strong>
            <p className="text-sm text-slate-500 mb-4">Publiez votre premier bien gratuitement</p>
            <Link to="/publier" className="inline-block bg-gradient-to-br from-navy via-brand-blue to-teal text-white rounded-xl px-5 py-2.5 text-sm font-bold font-heading">
              ➕ Publier
            </Link>
          </div>
        )}
        {annonces?.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border-2 border-slate-100 p-3.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-[62px] h-[62px] rounded-xl bg-blue-light border-2 border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {a.photos[0] ? <img src={urlPhoto(a.photos[0])} className="w-full h-full object-cover" /> : <Home size={26} className="text-brand-blue" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-sm text-navy truncate">
                {a.pieces} · {a.quartier}
              </div>
              <div className="text-[11px] text-slate-500">
                📍 {a.ville} · {a.statut === 'loue' ? <span className="text-red-600 font-semibold">Loué</span> : <span className="text-teal font-semibold">Disponible</span>}
              </div>
              <div className="font-heading font-extrabold text-sm text-brand-blue">
                {a.prix.toLocaleString('fr-FR')} FCFA{a.unite}
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Link to={`/profil/mes-annonces/${a.id}`} className="bg-blue-light border-2 border-brand-blue text-brand-blue rounded-lg p-2">
                <Pencil size={14} />
              </Link>
              <button onClick={() => supprimer(a)} className="bg-red-50 border-2 border-red-100 text-red-600 rounded-lg p-2">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
