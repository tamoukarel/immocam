import { Link } from 'react-router-dom'
import { Heart, MapPin, MessageCircle, Home, Share2, Video, BadgeCheck } from 'lucide-react'
import { libellePris, libellePiece, type AnnonceAvecProprietaire } from '../lib/types'
import { urlPhoto } from '../lib/photos'
import { contacterProprietaire } from '../lib/whatsapp'
import { useAuth } from '../lib/AuthContext'
import { useFavoris } from '../lib/useFavoris'
import { useToast } from '../lib/ToastContext'
import { ilYA } from '../lib/dates'
import { useLang } from '../lib/LangContext'

export function AnnonceCard({ annonce }: { annonce: AnnonceAvecProprietaire }) {
  const { profil } = useAuth()
  const { favoris, basculer, connecte } = useFavoris()
  const afficherToast = useToast()
  const { lang, t } = useLang()
  const estFavori = favoris.has(annonce.id)

  async function onFavori(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!connecte) {
      afficherToast(t('carte.favoriConnexion'))
      return
    }
    const ok = await basculer(annonce.id)
    if (ok) afficherToast(estFavori ? t('carte.favoriRetire') : t('carte.favoriAjoute'))
  }

  function onContacter(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    contacterProprietaire(annonce, profil?.id ?? null, lang)
  }

  async function onPartager(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const texte = `${libellePiece(annonce.pieces, lang)} · ${annonce.quartier}, ${annonce.ville} — ${annonce.prix.toLocaleString('fr-FR')} FCFA${annonce.unite} sur ImmoCam`
    const url = `${window.location.origin}/annonces/${annonce.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ImmoCam', text: texte, url })
      } catch {
        // Partage annulé par l'utilisateur : rien à faire.
      }
      return
    }
    await navigator.clipboard.writeText(url)
    afficherToast(t('carte.lienCopie'))
  }

  return (
    <Link
      to={`/annonces/${annonce.id}`}
      className="block bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden hover:border-brand-blue hover:shadow-md active:scale-[0.98] transition-all duration-200"
    >
      <div className="relative h-[190px] bg-gradient-to-br from-blue-light to-[#B8DFF0] flex items-center justify-center">
        {annonce.photos[0] ? (
          <img src={urlPhoto(annonce.photos[0])} alt={annonce.pieces} loading="lazy" className="w-full h-full object-cover fade-in" />
        ) : (
          <Home size={48} className="text-brand-blue" />
        )}
        <div
          className={`absolute top-2 left-2 text-[10px] font-extrabold font-heading px-2.5 py-1 rounded-full text-white shadow ${
            annonce.type === 'vente' ? 'bg-gold text-slate-900' : 'bg-navy'
          }`}
        >
          {annonce.type === 'vente' ? t('carte.vente') : t('carte.location')}
        </div>
        <div
          className={`absolute bottom-2 left-2 text-[10px] font-extrabold font-heading px-2.5 py-1.5 rounded-full text-white shadow ${
            annonce.statut === 'loue' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {annonce.statut === 'loue' ? t('carte.dejaPris', { statut: libellePris(annonce.type, lang).toLowerCase() }) : t('carte.disponible')}
        </div>
        {annonce.video && (
          <div className="absolute bottom-2 right-2 bg-navy/80 text-white text-[10px] font-extrabold font-heading px-2.5 py-1.5 rounded-full shadow flex items-center gap-1">
            <Video size={11} /> {t('carte.video')}
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={onPartager}
            aria-label="Partager"
            className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow active:scale-90 transition-transform"
          >
            <Share2 size={15} className="text-brand-blue" />
          </button>
          <button
            onClick={onFavori}
            aria-label="Favori"
            className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow active:scale-90 transition-transform"
          >
            <Heart size={17} className={`transition-all duration-200 ${estFavori ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="font-heading font-extrabold text-base text-navy">
          {annonce.prix.toLocaleString('fr-FR')} FCFA<small className="text-slate-400 font-medium text-[10px]"> {annonce.unite}</small>
        </div>
        <div className="font-semibold text-sm mt-0.5 flex items-center gap-1">
          {libellePiece(annonce.pieces, lang)} · {annonce.quartier}
          {annonce.profils?.est_verifie && <BadgeCheck size={14} className="text-teal flex-shrink-0" aria-label={t('carte.profilVerifie')} />}
        </div>
        {annonce.avance_mois && (
          <div className="text-[10px] text-amber-700 font-medium mt-1">{t('carte.avance', { n: annonce.avance_mois })}</div>
        )}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <MapPin size={11} /> {annonce.ville} · {ilYA(annonce.created_at, lang)}
          </div>
          <button
            onClick={onContacter}
            className="bg-gradient-to-br from-navy via-brand-blue to-teal text-white rounded-full px-3 py-1.5 text-[10px] font-bold font-heading flex items-center gap-1 active:scale-90 transition-transform"
          >
            <MessageCircle size={12} /> {t('carte.contacter')}
          </button>
        </div>
      </div>
    </Link>
  )
}
