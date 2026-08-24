import { useEffect, useState } from 'react'
import { MessageCircle, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { lienWhatsapp } from '../lib/whatsapp'
import { PageHeader } from '../components/PageHeader'

interface DemandeAffichee {
  id: string
  created_at: string
  annonces: { ville: string; quartier: string; pieces: string } | null
  expediteur: { telephone: string; nom: string | null } | null
}

export function Messages() {
  const { profil } = useAuth()
  const [demandes, setDemandes] = useState<DemandeAffichee[] | null>(null)

  useEffect(() => {
    if (!supabase || !profil) return
    supabase
      .from('demandes_contact')
      .select('id, created_at, annonces(ville,quartier,pieces), expediteur:expediteur_id(telephone,nom)')
      .eq('proprietaire_id', profil.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDemandes((data ?? []) as unknown as DemandeAffichee[]))
  }, [profil])

  return (
    <div>
      <PageHeader titre="💬 Messages reçus" sousTitre="Demandes de contact sur vos annonces" retourVers="/profil" />
      <div className="px-5 pb-6 flex flex-col gap-2.5">
        {demandes?.length === 0 && (
          <div className="text-center py-11">
            <div className="text-5xl mb-3">💬</div>
            <strong className="block font-heading text-navy mb-1.5">Aucun message reçu</strong>
            <p className="text-sm text-slate-500">Les demandes apparaîtront ici dès qu'un locataire vous contactera</p>
          </div>
        )}
        {demandes?.map((d) => (
          <div key={d.id} className="bg-white rounded-2xl border-2 border-slate-100 p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0">
                <User size={16} />
              </span>
              <div>
                <div className="font-heading font-bold text-sm text-navy">{d.expediteur?.nom || d.expediteur?.telephone || 'Utilisateur ImmoCam'}</div>
                <div className="text-[10px] text-slate-400">
                  {new Date(d.created_at).toLocaleDateString('fr-FR')} · {d.annonces ? `${d.annonces.pieces} · ${d.annonces.quartier}` : 'Annonce supprimée'}
                </div>
              </div>
            </div>
            {d.expediteur?.telephone && (
              <a
                href={lienWhatsapp(d.expediteur.telephone.replace(/\D/g, ''), `Bonjour, au sujet de votre demande pour "${d.annonces?.pieces ?? ''} ${d.annonces?.quartier ?? ''}"`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-gradient-to-br from-navy via-brand-blue to-teal text-white rounded-full px-3.5 py-1.5 text-xs font-bold font-heading"
              >
                <MessageCircle size={13} /> Répondre sur WhatsApp
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
