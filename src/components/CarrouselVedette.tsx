import { useEffect, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { AnnonceAvecProprietaire } from '../lib/types'
import { AnnonceCard } from './AnnonceCard'
import { useLang } from '../lib/LangContext'

// Mise en avant éditoriale (annonces de propriétaires vérifiés), pas encore
// un emplacement payant — voir la décision avec Karel du 2026-09-06.
// Ne s'affiche jamais avec moins de 2 annonces : un carrousel vide ou à une
// seule case donnerait l'impression inverse de "vedette".
export function CarrouselVedette() {
  const { t } = useLang()
  const [annonces, setAnnonces] = useState<AnnonceAvecProprietaire[] | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('annonces')
      .select('*, profils!inner(est_verifie)')
      .eq('statut', 'dispo')
      .eq('profils.est_verifie', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setAnnonces((data as AnnonceAvecProprietaire[]) ?? []))
  }, [])

  if (!annonces || annonces.length < 2) return null

  return (
    <div className="pb-3.5">
      <div className="px-5 pb-2.5 flex items-center gap-1.5">
        <BadgeCheck size={15} className="text-teal" />
        <div className="font-heading font-extrabold text-sm text-navy">{t('accueil.vedette')}</div>
      </div>
      <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar">
        {annonces.map((a) => (
          <div key={a.id} className="w-[220px] flex-shrink-0">
            <AnnonceCard annonce={a} />
          </div>
        ))}
      </div>
    </div>
  )
}
