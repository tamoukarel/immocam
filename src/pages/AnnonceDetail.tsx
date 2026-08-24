import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MessageCircle, MapPin, Home } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Annonce } from '../lib/types'
import { urlPhoto } from '../lib/photos'
import { contacterProprietaire } from '../lib/whatsapp'
import { useAuth } from '../lib/AuthContext'
import { PageHeader } from '../components/PageHeader'

export function AnnonceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profil } = useAuth()
  const [annonce, setAnnonce] = useState<Annonce | null | undefined>(undefined)

  useEffect(() => {
    if (!supabase || !id) return
    supabase
      .from('annonces')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setAnnonce((data as Annonce) ?? null))
  }, [id])

  if (annonce === undefined) return <p className="text-center text-slate-400 py-16">Chargement…</p>
  if (annonce === null) {
    return (
      <div className="text-center py-16 px-5">
        <p className="text-slate-500 mb-3">Cette annonce n'existe plus.</p>
        <button onClick={() => navigate('/annonces')} className="text-brand-blue font-bold text-sm">
          Retour aux annonces
        </button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titre="" />
      <div className="px-5">
        {annonce.photos.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar bg-gradient-to-br from-blue-light to-[#B8DFF0] rounded-xl p-2 mb-3.5">
            {annonce.photos.map((p) => (
              <img key={p} src={urlPhoto(p)} loading="lazy" className="h-[150px] min-w-[210px] rounded-lg object-cover border-2 border-white flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="h-[150px] rounded-xl bg-blue-light flex items-center justify-center mb-3.5">
            <Home size={48} className="text-brand-blue" />
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-[10px] font-bold font-heading px-2.5 py-1 rounded-full ${
              annonce.statut === 'loue' ? 'bg-red-50 text-red-600' : 'bg-teal-light text-teal'
            }`}
          >
            {annonce.statut === 'loue' ? '🔴 Déjà loué' : '🟢 Disponible'}
          </span>
        </div>
        <h1 className="font-heading font-extrabold text-lg text-navy mb-1">
          {annonce.pieces} · {annonce.quartier}
        </h1>
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
          <MapPin size={12} /> {annonce.ville} · {annonce.type === 'vente' ? 'Vente' : 'Location'}
        </p>
        <div className="font-heading font-black text-2xl text-brand-blue mb-3">
          {annonce.prix.toLocaleString('fr-FR')} FCFA
          <span className="text-sm text-slate-400 font-medium">{annonce.unite}</span>
        </div>
        {annonce.description && <p className="text-sm text-slate-600 leading-relaxed mb-4">{annonce.description}</p>}

        <div className="flex gap-2.5 pb-6">
          <button
            onClick={() => contacterProprietaire(annonce, profil?.id ?? null)}
            className="flex-1 bg-gradient-to-br from-navy via-brand-blue to-teal text-white rounded-xl py-3.5 text-sm font-bold font-heading flex items-center justify-center gap-1.5 shadow"
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button onClick={() => navigate(-1)} className="bg-bg border-2 border-slate-100 text-navy rounded-xl px-5 text-sm font-bold font-heading">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
