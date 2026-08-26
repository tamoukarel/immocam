import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Trash2, ExternalLink, MessageCircle, ShieldOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { lienWhatsapp } from '../lib/whatsapp'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

interface SignalementAffiche {
  id: string
  motif: string
  created_at: string
  annonce_id: string
  annonces: { ville: string; quartier: string; pieces: string; whatsapp: string } | null
  expediteur: { nom: string | null } | null
}

export function Signalements() {
  const { profil } = useAuth()
  const afficherToast = useToast()
  const { lang, t } = useLang()
  const [signalements, setSignalements] = useState<SignalementAffiche[] | null>(null)

  async function charger() {
    if (!supabase || !profil?.estAdmin) return
    const { data } = await supabase
      .from('signalements')
      .select('id, motif, created_at, annonce_id, annonces(ville,quartier,pieces,whatsapp), expediteur:expediteur_id(nom)')
      .order('created_at', { ascending: false })
    setSignalements((data ?? []) as unknown as SignalementAffiche[])
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  async function traiter(id: string) {
    if (!supabase) return
    await supabase.from('signalements').delete().eq('id', id)
    setSignalements((prev) => prev?.filter((s) => s.id !== id) ?? null)
    afficherToast(t('signalements.traite'))
  }

  async function supprimerAnnonce(s: SignalementAffiche) {
    if (!supabase) return
    if (!confirm(t('signalements.confirmerSuppression', { nom: `${s.annonces?.pieces} · ${s.annonces?.quartier}` }))) return
    const { error } = await supabase.from('annonces').delete().eq('id', s.annonce_id)
    if (error) {
      afficherToast(t('signalements.echecSuppression'))
      return
    }
    // La suppression de l'annonce entraîne (on delete cascade) celle de tous
    // les signalements qui la concernent, pas seulement celui-ci.
    setSignalements((prev) => prev?.filter((x) => x.annonce_id !== s.annonce_id) ?? null)
    afficherToast(t('signalements.annonceSupprimeeToast'))
  }

  if (!profil?.estAdmin) {
    return (
      <div>
        <PageHeader titre={t('signalements.titre')} retourVers="/profil" />
        <p className="text-center text-sm text-slate-400 py-16 px-5">{t('signalements.reserveAdmin')}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titre={t('signalements.titre')} sousTitre={t('signalements.sousTitre')} retourVers="/profil" />
      <div className="px-5 pb-6 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {signalements?.length === 0 && (
          <div className="col-span-full text-center py-11">
            <div className="text-5xl mb-3">✅</div>
            <strong className="block font-heading text-navy mb-1.5">{t('signalements.aucun')}</strong>
            <p className="text-sm text-slate-500">{t('signalements.toutCalme')}</p>
          </div>
        )}
        {signalements?.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl border-2 border-red-100 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                <Flag size={14} />
              </span>
              <div className="text-[11px] text-slate-400">
                {new Date(s.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')} · {t('signalements.par', { nom: s.expediteur?.nom || t('signalements.anonyme') })}
              </div>
            </div>
            <div className="text-sm font-semibold text-navy mb-1">
              {s.annonces ? `${s.annonces.pieces} · ${s.annonces.quartier}, ${s.annonces.ville}` : t('signalements.annonceSupprimee')}
            </div>
            <p className="text-xs text-slate-600 bg-bg rounded-lg p-2 mb-2.5">{s.motif}</p>
            <div className="flex gap-2 mb-2">
              {s.annonces && (
                <Link
                  to={`/annonces/${s.annonce_id}`}
                  className="flex-1 text-center bg-blue-light text-brand-blue rounded-lg py-2 text-xs font-bold font-heading flex items-center justify-center gap-1"
                >
                  <ExternalLink size={12} /> {t('signalements.voir')}
                </Link>
              )}
              {s.annonces?.whatsapp && (
                <a
                  href={lienWhatsapp(s.annonces.whatsapp, t('signalements.messageContact', { annonce: `${s.annonces.pieces} ${s.annonces.quartier}` }))}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center bg-teal-light text-teal rounded-lg py-2 text-xs font-bold font-heading flex items-center justify-center gap-1"
                >
                  <MessageCircle size={12} /> {t('signalements.contacter')}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              {s.annonces && (
                <button
                  onClick={() => supprimerAnnonce(s)}
                  className="flex-1 bg-red-500 text-white rounded-lg py-2 text-xs font-bold font-heading flex items-center justify-center gap-1"
                >
                  <ShieldOff size={12} /> {t('signalements.supprimerAnnonce')}
                </button>
              )}
              <button
                onClick={() => traiter(s.id)}
                className="flex-1 bg-red-50 text-red-600 rounded-lg py-2 text-xs font-bold font-heading flex items-center justify-center gap-1"
              >
                <Trash2 size={12} /> {t('signalements.marquerTraite')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
