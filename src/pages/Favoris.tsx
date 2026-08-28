import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { AnnonceAvecProprietaire } from '../lib/types'
import { AnnonceCard } from '../components/AnnonceCard'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

export function Favoris() {
  const { profil } = useAuth()
  const { t } = useLang()
  const [annonces, setAnnonces] = useState<AnnonceAvecProprietaire[] | null>(null)

  useEffect(() => {
    if (!supabase || !profil) return
    supabase
      .from('favoris')
      .select('annonces(*, profils(est_verifie))')
      .eq('utilisateur_id', profil.id)
      .then(({ data }) => setAnnonces(((data ?? []) as unknown as { annonces: AnnonceAvecProprietaire }[]).map((f) => f.annonces)))
  }, [profil])

  return (
    <div>
      <PageHeader titre={t('favoris.titre')} sousTitre={t('favoris.sousTitre')} retourVers="/profil" />
      <div className="px-5 pb-6 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {annonces?.length === 0 && (
          <div className="col-span-full text-center py-11">
            <div className="text-5xl mb-3">❤️</div>
            <strong className="block font-heading text-navy mb-1.5">{t('favoris.aucun')}</strong>
            <p className="text-sm text-slate-500">{t('favoris.appuyezSur')}</p>
          </div>
        )}
        {annonces?.map((a) => (
          <AnnonceCard key={a.id} annonce={a} />
        ))}
      </div>
    </div>
  )
}
