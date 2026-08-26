import { useEffect, useState } from 'react'
import { MessageCircle, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { lienWhatsapp } from '../lib/whatsapp'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

interface DemandeAffichee {
  id: string
  created_at: string
  annonces: { ville: string; quartier: string; pieces: string } | null
  // Le téléphone vit dans profils_prive (voir schema.sql) ; RLS n'autorise
  // sa lecture ici que parce qu'on est le proprietaire_id de la demande.
  expediteur: { nom: string | null; profils_prive: { telephone: string } | null } | null
}

export function Messages() {
  const { profil } = useAuth()
  const { lang, t } = useLang()
  const [demandes, setDemandes] = useState<DemandeAffichee[] | null>(null)

  useEffect(() => {
    if (!supabase || !profil) return
    supabase
      .from('demandes_contact')
      .select('id, created_at, annonces(ville,quartier,pieces), expediteur:expediteur_id(nom, profils_prive(telephone))')
      .eq('proprietaire_id', profil.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDemandes((data ?? []) as unknown as DemandeAffichee[]))
  }, [profil])

  return (
    <div>
      <PageHeader titre={t('messages.titre')} sousTitre={t('messages.sousTitre')} retourVers="/profil" />
      <div className="px-5 pb-6 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {demandes?.length === 0 && (
          <div className="col-span-full text-center py-11">
            <div className="text-5xl mb-3">💬</div>
            <strong className="block font-heading text-navy mb-1.5">{t('messages.aucun')}</strong>
            <p className="text-sm text-slate-500">{t('messages.attente')}</p>
          </div>
        )}
        {demandes?.map((d) => (
          <div key={d.id} className="bg-white rounded-2xl border-2 border-slate-100 p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0">
                <User size={16} />
              </span>
              <div>
                <div className="font-heading font-bold text-sm text-navy">
                  {d.expediteur?.nom || d.expediteur?.profils_prive?.telephone || t('detail.utilisateurAnonyme')}
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(d.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')} · {d.annonces ? `${d.annonces.pieces} · ${d.annonces.quartier}` : t('messages.annonceSupprimee')}
                </div>
              </div>
            </div>
            {d.expediteur?.profils_prive?.telephone && (
              <a
                href={lienWhatsapp(
                  d.expediteur.profils_prive.telephone.replace(/\D/g, ''),
                  t('messages.bonjourAuSujet', { annonce: `${d.annonces?.pieces ?? ''} ${d.annonces?.quartier ?? ''}` }),
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-gradient-to-br from-navy via-brand-blue to-teal text-white rounded-full px-3.5 py-1.5 text-xs font-bold font-heading"
              >
                <MessageCircle size={13} /> {t('messages.repondreWhatsapp')}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
