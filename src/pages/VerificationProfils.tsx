import { useEffect, useState } from 'react'
import { BadgeCheck, Search, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { urlPhoto } from '../lib/photos'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

interface Proprietaire {
  id: string
  nom: string | null
  photo: string | null
  est_verifie: boolean
  profils_prive: { telephone: string } | { telephone: string }[] | null
  annonces: { id: string }[]
}

export function VerificationProfils() {
  const { profil } = useAuth()
  const afficherToast = useToast()
  const { t } = useLang()
  const [proprietaires, setProprietaires] = useState<Proprietaire[] | null>(null)
  const [recherche, setRecherche] = useState('')

  async function charger() {
    if (!supabase || !profil?.estAdmin) return
    const { data } = await supabase
      .from('profils')
      .select('id, nom, photo, est_verifie, profils_prive(telephone), annonces!inner(id)')
      .order('nom')
    setProprietaires((data as unknown as Proprietaire[]) ?? [])
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  async function basculer(p: Proprietaire) {
    if (!supabase) return
    const { error } = await supabase.rpc('verifier_profil', { p_profil_id: p.id, p_verifie: !p.est_verifie })
    if (error) {
      afficherToast(t('verification.echec'))
      return
    }
    setProprietaires((prev) => prev?.map((x) => (x.id === p.id ? { ...x, est_verifie: !p.est_verifie } : x)) ?? null)
    afficherToast(!p.est_verifie ? t('verification.marqueVerifie') : t('verification.marqueNonVerifie'))
  }

  if (!profil?.estAdmin) {
    return (
      <div>
        <PageHeader titre={t('verification.titre')} retourVers="/profil" />
        <p className="text-center text-sm text-slate-400 py-16 px-5">{t('verification.reserveAdmin')}</p>
      </div>
    )
  }

  function telephone(p: Proprietaire): string {
    const prive = Array.isArray(p.profils_prive) ? p.profils_prive[0] : p.profils_prive
    return prive?.telephone ?? ''
  }

  const filtres = (proprietaires ?? []).filter((p) => {
    const q = recherche.toLowerCase().trim()
    if (!q) return true
    return (p.nom ?? '').toLowerCase().includes(q) || telephone(p).includes(q)
  })

  return (
    <div>
      <PageHeader titre={t('verification.titre')} sousTitre={t('verification.sousTitre')} retourVers="/profil" />
      <div className="px-5 pb-6">
        <div className="relative mb-3.5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t('verification.rechercherPlaceholder')}
            className="fi pl-9"
          />
        </div>

        {filtres.length === 0 && <p className="text-center text-sm text-slate-400 italic py-8">{t('verification.aucun')}</p>}

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
          {filtres.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border-2 border-slate-100 p-3.5 shadow-sm flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
                {p.photo ? <img src={urlPhoto(p.photo)} className="w-full h-full object-cover" /> : <User size={18} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-heading font-bold text-sm text-navy flex items-center gap-1 truncate">
                  {p.nom || t('detail.utilisateurAnonyme')}
                  {p.est_verifie && <BadgeCheck size={14} className="text-teal flex-shrink-0" />}
                </div>
                <div className="text-[11px] text-slate-500">{telephone(p) || t('verification.telephoneInconnu')}</div>
                <div className="text-[10px] text-slate-400">{t('detail.nbAnnonces', { n: p.annonces.length, s: p.annonces.length > 1 ? 's' : '' })}</div>
              </div>
              <button
                onClick={() => basculer(p)}
                className={`flex-shrink-0 rounded-full px-3 py-2 text-[11px] font-bold font-heading ${
                  p.est_verifie ? 'bg-red-50 text-red-600 border-2 border-red-100' : 'bg-teal-light text-teal border-2 border-teal/20'
                }`}
              >
                {p.est_verifie ? t('verification.retirer') : t('verification.verifier')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
