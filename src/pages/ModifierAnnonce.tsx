import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/ToastContext'
import { televerserPhoto, televerserVideo, urlPhoto, MAX_VIDEO_OCTETS } from '../lib/photos'
import { useAuth } from '../lib/AuthContext'
import { VILLES, TYPES_PIECES, DISTANCES_ROUTE, libellePris, type Annonce, type StatutAnnonce, type TypeAnnonce, type Niveau } from '../lib/types'
import { PageHeader } from '../components/PageHeader'

const MAX_PHOTOS = 5

export function ModifierAnnonce() {
  const { id } = useParams()
  const { profil } = useAuth()
  const navigate = useNavigate()
  const afficherToast = useToast()

  const [annonce, setAnnonce] = useState<Annonce | null | undefined>(undefined)
  const [type, setType] = useState<TypeAnnonce | 'short'>('location')
  const [ville, setVille] = useState('')
  const [quartier, setQuartier] = useState('')
  const [pieces, setPieces] = useState('')
  const [prix, setPrix] = useState('')
  const [avance, setAvance] = useState('')
  const [caution, setCaution] = useState('')
  const [niveau, setNiveau] = useState<Niveau | ''>('')
  const [distanceRoute, setDistanceRoute] = useState('')
  const [description, setDescription] = useState('')
  const [statut, setStatut] = useState<StatutAnnonce>('dispo')
  const [whatsapp, setWhatsapp] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [nouvellesPhotos, setNouvellesPhotos] = useState<File[]>([])
  const [videoActuelle, setVideoActuelle] = useState<string | null>(null)
  const [nouvelleVideo, setNouvelleVideo] = useState<File | null>(null)
  const [videoSupprimee, setVideoSupprimee] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    if (!supabase || !id) return
    supabase
      .from('annonces')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const a = data as Annonce | null
        // RLS bloquerait de toute façon l'update d'une annonce qui n'appartient
        // pas au compte connecté, mais sans ce garde-fou le formulaire s'affiche
        // quand même prérempli avant l'échec silencieux de l'enregistrement.
        if (a && profil && a.proprietaire_id !== profil.id) {
          setAnnonce(null)
          return
        }
        setAnnonce(a)
        if (a) {
          setType(a.est_courte_duree ? 'short' : a.type)
          setVille(a.ville)
          setQuartier(a.quartier)
          setPieces(a.pieces)
          setPrix(String(a.prix))
          setAvance(a.avance_mois ? String(a.avance_mois) : '')
          setCaution(a.caution_mois ? String(a.caution_mois) : '')
          setNiveau(a.niveau ?? '')
          setDistanceRoute(a.distance_route ?? '')
          setDescription(a.description)
          setStatut(a.statut)
          setWhatsapp(a.whatsapp)
          setPhotos(a.photos)
          setVideoActuelle(a.video)
        }
      })
  }, [id, profil])

  function choisirVideo(fichiers: FileList | null) {
    const fichier = fichiers?.[0]
    if (!fichier) return
    if (fichier.size > MAX_VIDEO_OCTETS) {
      afficherToast('⚠️ Vidéo trop lourde (max 10 Mo)')
      return
    }
    setNouvelleVideo(fichier)
    setVideoSupprimee(false)
  }

  function retirerPhotoExistante(chemin: string) {
    setPhotos((prev) => prev.filter((p) => p !== chemin))
  }

  function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers) return
    const restant = MAX_PHOTOS - photos.length - nouvellesPhotos.length
    if (restant <= 0) {
      afficherToast(`Maximum ${MAX_PHOTOS} photos`)
      return
    }
    setNouvellesPhotos((prev) => [...prev, ...Array.from(fichiers).slice(0, restant)])
  }

  async function enregistrer() {
    if (!supabase || !annonce || !profil) return
    if (!quartier.trim()) {
      afficherToast('⚠️ Quartier obligatoire')
      return
    }
    if (!prix || Number(prix) <= 0) {
      afficherToast('⚠️ Prix invalide')
      return
    }
    setEnregistrement(true)
    try {
      const cheminsAjoutes = await Promise.all(nouvellesPhotos.map((f) => televerserPhoto(f, profil.id)))
      const cheminVideo = nouvelleVideo ? await televerserVideo(nouvelleVideo, profil.id) : videoSupprimee ? null : videoActuelle
      const estCourteDuree = type === 'short'
      const { error } = await supabase
        .from('annonces')
        .update({
          type: type === 'vente' ? 'vente' : 'location',
          est_courte_duree: estCourteDuree,
          unite: type === 'vente' ? '' : estCourteDuree ? '/nuit' : '/mois',
          ville,
          quartier: quartier.trim(),
          pieces,
          prix: parseInt(prix, 10),
          avance_mois: type !== 'vente' && avance ? parseInt(avance, 10) : null,
          caution_mois: type !== 'vente' && caution ? parseInt(caution, 10) : null,
          niveau: niveau || null,
          distance_route: distanceRoute || null,
          description: description.trim(),
          statut,
          whatsapp: whatsapp.replace(/\D/g, ''),
          photos: [...photos, ...cheminsAjoutes],
          video: cheminVideo,
        })
        .eq('id', annonce.id)
      if (error) throw error
      afficherToast('✅ Annonce modifiée !')
      navigate('/profil/mes-annonces')
    } catch {
      afficherToast('⚠️ Échec de la modification, réessaie')
    } finally {
      setEnregistrement(false)
    }
  }

  if (annonce === undefined) return <p className="text-center text-slate-400 py-16">Chargement…</p>
  if (annonce === null) return <p className="text-center text-slate-500 py-16">Annonce introuvable.</p>

  return (
    <div className="md:max-w-lg md:mx-auto">
      <PageHeader titre="✏️ Modifier l'annonce" sousTitre="Les modifications s'appliquent immédiatement" retourVers="/profil/mes-annonces" />
      <div className="px-5 pb-8 flex flex-col gap-3">
        <div>
          <label className="fl">Type d'annonce</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="fs">
            <option value="location">🔑 Location longue durée</option>
            <option value="vente">💰 Vente</option>
            <option value="short">🌴 Location courte durée</option>
          </select>
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1 min-w-0">
            <label className="fl">Ville</label>
            <select value={ville} onChange={(e) => setVille(e.target.value)} className="fs">
              {VILLES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="fl">Quartier</label>
            <input value={quartier} onChange={(e) => setQuartier(e.target.value)} className="fi" />
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1 min-w-0">
            <label className="fl">Pièces</label>
            <select value={pieces} onChange={(e) => setPieces(e.target.value)} className="fs">
              {TYPES_PIECES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="fl">Prix (FCFA)</label>
            <input value={prix} onChange={(e) => setPrix(e.target.value)} type="number" className="fi" />
          </div>
        </div>
        {type !== 'vente' && (
          <div className="flex gap-2.5">
            <div className="flex-1 min-w-0">
              <label className="fl">Avance demandée (mois)</label>
              <input value={avance} onChange={(e) => setAvance(e.target.value)} type="number" min="0" placeholder="Ex: 6" className="fi" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="fl">Caution (mois)</label>
              <input value={caution} onChange={(e) => setCaution(e.target.value)} type="number" min="0" placeholder="Ex: 1" className="fi" />
            </div>
          </div>
        )}
        <div className="flex gap-2.5">
          <div className="flex-1 min-w-0">
            <label className="fl">Niveau</label>
            <select value={niveau} onChange={(e) => setNiveau(e.target.value as typeof niveau)} className="fs">
              <option value="">Peu importe</option>
              <option value="rdc">Rez-de-chaussée</option>
              <option value="etage">Étage</option>
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="fl">Distance du goudron</label>
            <select value={distanceRoute} onChange={(e) => setDistanceRoute(e.target.value)} className="fs">
              <option value="">Non précisé</option>
              {DISTANCES_ROUTE.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="fl">Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value as StatutAnnonce)} className="fs">
            <option value="dispo">🟢 Disponible</option>
            <option value="loue">🔴 Déjà {libellePris(type === 'vente' ? 'vente' : 'location').toLowerCase()}</option>
          </select>
        </div>
        <div>
          <label className="fl">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="fi resize-none h-[65px]" />
        </div>
        <div>
          <label className="fl">
            Photos <span className="text-teal">(max. {MAX_PHOTOS})</span>
          </label>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 min-h-[34px] items-center">
            {photos.length === 0 && nouvellesPhotos.length === 0 && <span className="text-xs text-slate-400">Aucune photo</span>}
            {photos.map((p) => (
              <div key={p} className="relative flex-shrink-0">
                <img src={urlPhoto(p)} className="w-[88px] h-[88px] rounded-xl object-cover border-2 border-slate-100" />
                <button onClick={() => retirerPhotoExistante(p)} className="absolute -top-1.5 -right-1.5 bg-navy/75 text-white rounded-full w-[21px] h-[21px] flex items-center justify-center">
                  <X size={11} />
                </button>
              </div>
            ))}
            {nouvellesPhotos.map((f, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={URL.createObjectURL(f)} className="w-[88px] h-[88px] rounded-xl object-cover border-2 border-teal" />
                <button
                  onClick={() => setNouvellesPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-navy/75 text-white rounded-full w-[21px] h-[21px] flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <label className="mt-2 w-full border-2 border-dashed border-brand-blue rounded-xl p-2.5 bg-blue-light text-brand-blue text-xs font-bold font-heading text-center block cursor-pointer">
            <input type="file" accept="image/*" multiple hidden onChange={(e) => ajouterPhotos(e.target.files)} />
            📷 Ajouter des photos
          </label>
        </div>
        <div>
          <label className="fl">
            Vidéo <span className="text-teal">(optionnel, max. 10 Mo)</span>
          </label>
          {nouvelleVideo ? (
            <div className="relative">
              <video src={URL.createObjectURL(nouvelleVideo)} controls className="w-full h-[140px] rounded-xl bg-black object-contain" />
              <button
                onClick={() => setNouvelleVideo(null)}
                className="absolute -top-1.5 -right-1.5 bg-navy/75 text-white rounded-full w-[21px] h-[21px] flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </div>
          ) : videoActuelle && !videoSupprimee ? (
            <div className="relative">
              <video src={urlPhoto(videoActuelle)} controls className="w-full h-[140px] rounded-xl bg-black object-contain" />
              <button
                onClick={() => setVideoSupprimee(true)}
                className="absolute -top-1.5 -right-1.5 bg-navy/75 text-white rounded-full w-[21px] h-[21px] flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-brand-blue rounded-xl p-4 bg-blue-light text-center block cursor-pointer">
              <input type="file" accept="video/*" hidden onChange={(e) => choisirVideo(e.target.files)} />
              <Video size={24} className="mx-auto text-brand-blue mb-1" />
              <div className="text-xs font-bold text-brand-blue">Ajouter une vidéo</div>
            </label>
          )}
        </div>
        <div>
          <label className="fl">WhatsApp</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} type="tel" placeholder="+237 6XX XXX XXX" className="fi" />
        </div>
        <div className="flex gap-2.5 mt-1">
          <button onClick={enregistrer} disabled={enregistrement} className="btn-next disabled:opacity-60">
            {enregistrement ? 'Enregistrement…' : '💾 Enregistrer'}
          </button>
          <button onClick={() => navigate('/profil/mes-annonces')} className="btn-prev">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
