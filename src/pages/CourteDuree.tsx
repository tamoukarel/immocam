import { useEffect, useState } from 'react'
import { Rocket } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Annonce } from '../lib/types'
import { AnnonceCard } from '../components/AnnonceCard'

export function CourteDuree() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('annonces')
      .select('*')
      .eq('est_courte_duree', true)
      .eq('statut', 'dispo')
      .then(({ data }) => setAnnonces((data as Annonce[]) ?? []))
  }, [])

  return (
    <div>
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading font-extrabold text-lg text-navy">🌴 Location courte durée</h2>
        <p className="text-xs text-slate-500">Louer à la nuit · Idéal pour les voyageurs</p>
      </div>

      <div className="px-5 pb-2.5">
        <div className="font-heading font-extrabold text-sm text-navy flex items-center gap-1.5">
          <span className="block w-1 h-4 bg-gradient-to-b from-navy to-teal rounded-sm" />
          Locations disponibles
        </div>
      </div>
      <div className="px-5 pb-4 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {annonces.length === 0 && <p className="col-span-full text-center text-sm text-slate-400 py-6">Aucune location courte durée pour l'instant.</p>}
        {annonces.map((a) => (
          <AnnonceCard key={a.id} annonce={a} />
        ))}
      </div>

      <div className="mx-5 mb-6 bg-gradient-to-br from-teal to-[#00a896] rounded-2xl px-4 py-3.5 flex items-center gap-2.5 shadow">
        <Rocket size={20} className="text-white flex-shrink-0" />
        <div className="font-heading font-extrabold text-sm text-white">Publie ton bien en courte durée depuis "Publier"</div>
      </div>
    </div>
  )
}
