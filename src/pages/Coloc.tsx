import { useEffect, useState } from 'react'
import { GraduationCap, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { contacterProprietaire } from '../lib/whatsapp'
import type { Annonce, ProfilColoc } from '../lib/types'

export function Coloc() {
  const { profil } = useAuth()
  const afficherToast = useToast()
  const [profils, setProfils] = useState<ProfilColoc[]>([])
  const [monProfil, setMonProfil] = useState<ProfilColoc | null>(null)
  const [logements, setLogements] = useState<Annonce[]>([])
  const [universite, setUniversite] = useState('')
  const [filiere, setFiliere] = useState('')
  const [budget, setBudget] = useState('')

  async function charger() {
    if (!supabase) return
    const { data } = await supabase
      .from('profils_coloc')
      .select('*, profils(nom)')
      .order('created_at', { ascending: false })
    const liste = (data as unknown as ProfilColoc[]) ?? []
    setProfils(liste)
    if (profil) setMonProfil(liste.find((p) => p.utilisateur_id === profil.id) ?? null)

    const { data: logs } = await supabase.from('annonces').select('*').eq('type', 'location').eq('statut', 'dispo').lt('prix', 100000)
    setLogements((logs as Annonce[]) ?? [])
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  async function publierProfil() {
    if (!supabase || !profil) return
    if (!universite.trim() || !filiere.trim() || !budget || Number(budget) <= 0) {
      afficherToast('⚠️ Complète tous les champs')
      return
    }
    await supabase
      .from('profils_coloc')
      .insert({ utilisateur_id: profil.id, universite: universite.trim(), filiere: filiere.trim(), budget: Number(budget) })
    afficherToast('✅ Profil coloc publié !')
    setUniversite('')
    setFiliere('')
    setBudget('')
    charger()
  }

  async function retirerProfil() {
    if (!supabase || !profil) return
    await supabase.from('profils_coloc').delete().eq('utilisateur_id', profil.id)
    afficherToast('Profil retiré')
    charger()
  }

  return (
    <div>
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading font-extrabold text-lg text-navy">🎓 Colocation étudiants</h2>
        <p className="text-xs text-slate-500">Divise ton loyer par 2 ou 3 · Trouve un·e colocataire</p>
      </div>

      <div className="px-5 mb-4 md:max-w-lg">
        {profil ? (
          monProfil ? (
            <div className="bg-teal-light border-2 border-teal/30 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <div className="font-heading font-bold text-sm text-navy">Ton profil est publié ✓</div>
                <div className="text-xs text-slate-500">
                  {monProfil.universite} · {monProfil.filiere} · {monProfil.budget.toLocaleString('fr-FR')} F/mois
                </div>
              </div>
              <button onClick={retirerProfil} className="bg-white border-2 border-red-100 text-red-600 rounded-lg p-2">
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm">
              <div className="font-heading font-extrabold text-sm text-navy mb-3">➕ Publier mon profil coloc</div>
              <div className="flex flex-col gap-2.5">
                <input value={universite} onChange={(e) => setUniversite(e.target.value)} placeholder="Université (ex: UY2)" className="fi" />
                <input value={filiere} onChange={(e) => setFiliere(e.target.value)} placeholder="Filière (ex: Droit)" className="fi" />
                <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" placeholder="Budget FCFA/mois" className="fi" />
                <button onClick={publierProfil} className="btn-next">
                  Publier mon profil
                </button>
              </div>
            </div>
          )
        ) : (
          <p className="text-xs text-slate-500 bg-blue-light rounded-xl p-3">Connecte-toi pour publier ton profil et être trouvé par d'autres étudiants.</p>
        )}
      </div>

      <div className="px-5 pb-2.5">
        <SectionTitle titre="Profils colocataires" />
      </div>
      <div className="px-5 pb-4 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-2">
        {profils.length === 0 && <p className="col-span-full text-sm text-slate-400 text-center py-4">Aucun profil pour l'instant.</p>}
        {profils.map((p) => (
          <div key={p.utilisateur_id} className="flex items-center gap-3 bg-gradient-to-br from-teal-light to-[#fff8f0] rounded-2xl p-2.5 border-2 border-teal/20">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-[#fe4701] flex items-center justify-center text-white flex-shrink-0">
              <GraduationCap size={17} />
            </span>
            <div className="flex-1">
              <div className="font-heading font-bold text-sm text-navy">{p.profils?.nom || 'Étudiant·e ImmoCam'}</div>
              <div className="text-[11px] text-slate-500">
                {p.universite} · {p.filiere}
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal to-[#fe4701] text-white text-[10px] font-bold font-heading rounded-full px-2.5 py-1 whitespace-nowrap">
              {p.budget.toLocaleString('fr-FR')} F
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 pb-2.5">
        <SectionTitle titre="Logements en coloc" />
      </div>
      <div className="px-5 pb-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm mx-5 p-3.5">
        {logements.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Aucun logement abordable pour l'instant.</p>}
        {logements.map((l) => (
          <div key={l.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
            <div>
              <div className="font-heading font-bold text-sm text-navy">
                {l.pieces} · {l.quartier}
              </div>
              <div className="text-[10px] text-slate-500">📍 {l.ville}</div>
            </div>
            <button onClick={() => contacterProprietaire(l, profil?.id ?? null)} className="text-right">
              <div className="font-heading font-extrabold text-sm text-teal">{Math.round(l.prix / 2).toLocaleString('fr-FR')} F</div>
              <div className="text-[10px] text-slate-400">par pers./mois</div>
            </button>
          </div>
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
