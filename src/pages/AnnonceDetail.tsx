import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, MapPin, Home, Flag, Map, Clock, Wallet, Share2, Eye, Building2, User, X, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { libelleNiveau, libellePris, type Annonce } from '../lib/types'
import { urlPhoto } from '../lib/photos'
import { contacterProprietaire } from '../lib/whatsapp'
import { useAuth } from '../lib/AuthContext'
import { useFavoris } from '../lib/useFavoris'
import { useToast } from '../lib/ToastContext'
import { ilYA, membreDepuis } from '../lib/dates'
import { PageHeader } from '../components/PageHeader'

function lienCarte(quartier: string, ville: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${quartier}, ${ville}, Cameroun`)}`
}

type AnnonceAvecProprietaire = Annonce & { profils: { nom: string | null; photo: string | null; created_at: string } | null }

export function AnnonceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profil } = useAuth()
  const { favoris, basculer, connecte } = useFavoris()
  const afficherToast = useToast()
  const [annonce, setAnnonce] = useState<AnnonceAvecProprietaire | null | undefined>(undefined)
  const [indexAgrandi, setIndexAgrandi] = useState<number | null>(null)
  const [modaleSignalement, setModaleSignalement] = useState(false)
  const [motifSignalement, setMotifSignalement] = useState('')
  const [envoiSignalement, setEnvoiSignalement] = useState(false)
  const estFavori = annonce ? favoris.has(annonce.id) : false

  useEffect(() => {
    if (!supabase || !id) return
    supabase
      .from('annonces')
      .select('*, profils(nom, photo, created_at)')
      .eq('id', id)
      .single()
      .then(({ data }) => setAnnonce((data as AnnonceAvecProprietaire) ?? null))
    supabase.rpc('increment_vues', { p_annonce_id: id })
  }, [id])

  // Navigation clavier dans la visionneuse plein écran.
  useEffect(() => {
    if (indexAgrandi === null || !annonce) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIndexAgrandi(null)
      if (e.key === 'ArrowRight') setIndexAgrandi((i) => (i === null ? i : (i + 1) % annonce!.photos.length))
      if (e.key === 'ArrowLeft') setIndexAgrandi((i) => (i === null ? i : (i - 1 + annonce!.photos.length) % annonce!.photos.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [indexAgrandi, annonce])

  async function onFavori() {
    if (!annonce) return
    if (!connecte) {
      afficherToast('Connecte-toi pour sauvegarder des favoris')
      return
    }
    const ok = await basculer(annonce.id)
    if (ok) afficherToast(estFavori ? 'Retiré des favoris' : '❤️ Ajouté aux favoris !')
  }

  function fermer() {
    // Un lien partagé (WhatsApp, copié...) arrive ici sans historique dans
    // l'app : navigate(-1) sortirait alors de l'app plutôt que de revenir
    // à la liste. `location.key === 'default'` signale justement ce cas.
    if (location.key === 'default') navigate('/annonces')
    else navigate(-1)
  }

  async function partager() {
    if (!annonce) return
    const texte = `${annonce.pieces} · ${annonce.quartier}, ${annonce.ville} — ${annonce.prix.toLocaleString('fr-FR')} FCFA${annonce.unite} sur ImmoCam`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ImmoCam', text: texte, url: window.location.href })
      } catch {
        // L'utilisateur a annulé le partage : rien à faire.
      }
      return
    }
    await navigator.clipboard.writeText(window.location.href)
    afficherToast('🔗 Lien copié !')
  }

  async function envoyerSignalement() {
    if (!supabase || !annonce) return
    if (!motifSignalement.trim()) {
      afficherToast('⚠️ Précise un motif')
      return
    }
    setEnvoiSignalement(true)
    await supabase.from('signalements').insert({ annonce_id: annonce.id, expediteur_id: profil?.id ?? null, motif: motifSignalement.trim() })
    setEnvoiSignalement(false)
    setModaleSignalement(false)
    setMotifSignalement('')
    afficherToast('Merci, votre signalement a été transmis.')
  }

  if (annonce === undefined) {
    return (
      <div className="md:max-w-lg md:mx-auto px-5 pt-5 animate-pulse">
        <div className="h-[190px] rounded-xl bg-slate-200 mb-3.5" />
        <div className="h-4 w-24 rounded-full bg-slate-200 mb-3" />
        <div className="h-5 w-2/3 rounded bg-slate-200 mb-2" />
        <div className="h-3 w-1/3 rounded bg-slate-200 mb-4" />
        <div className="h-8 w-1/3 rounded bg-slate-200" />
      </div>
    )
  }
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
    <div className="md:max-w-lg md:mx-auto">
      <PageHeader titre="" retourVers={location.key === 'default' ? '/annonces' : undefined} />
      <div className="px-5">
        <div className="relative mb-3.5">
          {annonce.video && (
            <video
              src={urlPhoto(annonce.video)}
              controls
              className="w-full h-[190px] rounded-xl bg-black object-contain mb-1.5"
            />
          )}
          {annonce.photos.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar bg-gradient-to-br from-blue-light to-[#B8DFF0] rounded-xl p-2">
              {annonce.photos.map((p, i) => (
                <img
                  key={p}
                  src={urlPhoto(p)}
                  loading="lazy"
                  onClick={() => setIndexAgrandi(i)}
                  className="h-[150px] min-w-[210px] rounded-lg object-cover border-2 border-white flex-shrink-0 cursor-pointer fade-in active:scale-95 transition-transform"
                />
              ))}
            </div>
          ) : !annonce.video ? (
            <div className="h-[150px] rounded-xl bg-blue-light flex items-center justify-center">
              <Home size={48} className="text-brand-blue" />
            </div>
          ) : null}
          <div className="absolute top-2.5 right-2.5 flex gap-1.5">
            <button
              onClick={onFavori}
              aria-label="Favori"
              className="bg-white rounded-full w-9 h-9 flex items-center justify-center shadow active:scale-90 transition-transform"
            >
              <Heart size={16} className={`transition-all duration-200 ${estFavori ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
            </button>
            <button
              onClick={partager}
              aria-label="Partager"
              className="bg-white rounded-full w-9 h-9 flex items-center justify-center shadow active:scale-90 transition-transform"
            >
              <Share2 size={16} className="text-brand-blue" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-[10px] font-bold font-heading px-2.5 py-1 rounded-full ${
              annonce.statut === 'loue' ? 'bg-red-50 text-red-600' : 'bg-teal-light text-teal'
            }`}
          >
            {annonce.statut === 'loue' ? `🔴 Déjà ${libellePris(annonce.type).toLowerCase()}` : '🟢 Disponible'}
          </span>
        </div>
        <h1 className="font-heading font-extrabold text-lg text-navy mb-1">
          {annonce.pieces} · {annonce.quartier}
        </h1>
        <div className="flex items-center gap-2.5 text-xs text-slate-500 mb-2">
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {annonce.ville} · {annonce.type === 'vente' ? 'Vente' : 'Location'}
          </span>
          <a href={lienCarte(annonce.quartier, annonce.ville)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-blue font-semibold">
            <Map size={12} /> Voir sur la carte
          </a>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-3 mb-2">
          <span className="flex items-center gap-1">
            <Clock size={11} /> Publié {ilYA(annonce.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={11} /> {annonce.vues} vue{annonce.vues > 1 ? 's' : ''}
          </span>
        </div>
        {(annonce.niveau || annonce.distance_route) && (
          <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
            <Building2 size={12} />
            {[annonce.niveau ? libelleNiveau(annonce.niveau) : null, annonce.distance_route].filter(Boolean).join(' · ')}
          </div>
        )}
        <div className="font-heading font-black text-2xl text-brand-blue mb-3">
          {annonce.prix.toLocaleString('fr-FR')} FCFA
          <span className="text-sm text-slate-400 font-medium">{annonce.unite}</span>
        </div>
        {(annonce.avance_mois || annonce.caution_mois) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 mb-4 flex items-start gap-2">
            <Wallet size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              À la signature :{' '}
              {[
                annonce.avance_mois ? `${annonce.avance_mois} mois d'avance` : null,
                annonce.caution_mois ? `${annonce.caution_mois} mois de caution` : null,
              ]
                .filter(Boolean)
                .join(' + ')}
            </span>
          </div>
        )}
        {annonce.description && <p className="text-sm text-slate-600 leading-relaxed mb-4">{annonce.description}</p>}

        {annonce.profils && (
          <div className="flex items-center gap-2.5 bg-bg rounded-xl p-3 mb-4">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
              {annonce.profils.photo ? <img src={urlPhoto(annonce.profils.photo)} className="w-full h-full object-cover" /> : <User size={16} />}
            </span>
            <div className="text-xs">
              <div className="font-heading font-bold text-navy">{annonce.profils.nom || 'Utilisateur ImmoCam'}</div>
              <div className="text-slate-500">Membre depuis {membreDepuis(annonce.profils.created_at)}</div>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pb-6">
          <button
            onClick={() => contacterProprietaire(annonce, profil?.id ?? null)}
            className="flex-1 bg-gradient-to-br from-navy via-brand-blue to-teal text-white rounded-xl py-3.5 text-sm font-bold font-heading flex items-center justify-center gap-1.5 shadow"
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button onClick={fermer} className="bg-bg border-2 border-slate-100 text-navy rounded-xl px-5 text-sm font-bold font-heading active:scale-95 transition-transform">
            Fermer
          </button>
        </div>
        <button onClick={() => setModaleSignalement(true)} className="mx-auto mb-6 -mt-3 flex items-center gap-1 text-[11px] text-slate-400">
          <Flag size={11} /> Signaler cette annonce
        </button>
      </div>

      {indexAgrandi !== null && (
        <div onClick={() => setIndexAgrandi(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 fade-in">
          <button
            onClick={() => setIndexAgrandi(null)}
            aria-label="Fermer"
            className="absolute top-4 right-4 bg-white/15 text-white rounded-full w-9 h-9 flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
          {annonce.photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIndexAgrandi((i) => (i === null ? i : (i - 1 + annonce.photos.length) % annonce.photos.length))
                }}
                aria-label="Photo précédente"
                className="absolute left-3 bg-white/15 text-white rounded-full w-9 h-9 flex items-center justify-center active:scale-90 transition-transform"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIndexAgrandi((i) => (i === null ? i : (i + 1) % annonce.photos.length))
                }}
                aria-label="Photo suivante"
                className="absolute right-3 bg-white/15 text-white rounded-full w-9 h-9 flex items-center justify-center active:scale-90 transition-transform"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-5 text-white/70 text-xs font-semibold">
                {indexAgrandi + 1} / {annonce.photos.length}
              </div>
            </>
          )}
          <img
            key={indexAgrandi}
            src={urlPhoto(annonce.photos[indexAgrandi])}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain fade-in"
          />
        </div>
      )}

      {modaleSignalement && (
        <div
          onClick={() => setModaleSignalement(false)}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5 fade-in"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <div className="font-heading font-extrabold text-sm text-navy flex items-center gap-1.5">
                <Flag size={14} className="text-red-500" /> Signaler cette annonce
              </div>
              <button onClick={() => setModaleSignalement(false)} aria-label="Fermer" className="text-slate-400 active:scale-90 transition-transform">
                <X size={18} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Arnaque, fausse annonce, déjà louée… dis-nous pourquoi.</p>
            <textarea
              value={motifSignalement}
              onChange={(e) => setMotifSignalement(e.target.value)}
              placeholder="Motif du signalement"
              className="fi resize-none h-[70px] mb-3"
              autoFocus
            />
            <div className="flex gap-2.5">
              <button onClick={() => setModaleSignalement(false)} className="btn-prev">
                Annuler
              </button>
              <button onClick={envoyerSignalement} disabled={envoiSignalement} className="btn-next disabled:opacity-60">
                {envoiSignalement ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
