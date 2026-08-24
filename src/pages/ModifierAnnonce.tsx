import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/ToastContext'
import { televerserPhoto, urlPhoto } from '../lib/photos'
import { useAuth } from '../lib/AuthContext'
import { VILLES, TYPES_PIECES, type Annonce, type StatutAnnonce } from '../lib/types'
import { PageHeader } from '../components/PageHeader'

const MAX_PHOTOS = 5

export function ModifierAnnonce() {
  const { id } = useParams()
  const { profil } = useAuth()
  const navigate = useNavigate()
  const afficherToast = useToast()

  const [annonce, setAnnonce] = useState<Annonce | null | undefined>(undefined)
  const [ville, setVille] = useState('')
  const [quartier, setQuartier] = useState('')
  const [pieces, setPieces] = useState('')
  const [prix, setPrix] = useState('')
  const [description, setDescription] = useState('')
  const [statut, setStatut] = useState<StatutAnnonce>('dispo')
  const [whatsapp, setWhatsapp] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [nouvellesPhotos, setNouvellesPhotos] = useState<File[]>([])
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
        setAnnonce(a)
        if (a) {
          setVille(a.ville)
          setQuartier(a.quartier)
          setPieces(a.pieces)
          setPrix(String(a.prix))
          setDescription(a.description)
          setStatut(a.statut)
          setWhatsapp(a.whatsapp)
          setPhotos(a.photos)
        }
      })
  }, [id])

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
      const { error } = await supabase
        .from('annonces')
        .update({
          ville,
          quartier: quartier.trim(),
          pieces,
          prix: parseInt(prix, 10),
          description: description.trim(),
          statut,
          whatsapp: whatsapp.replace(/\D/g, ''),
          photos: [...photos, ...cheminsAjoutes],
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
    <div>
      <PageHeader titre="✏️ Modifier l'annonce" sousTitre="Les modifications s'appliquent immédiatement" retourVers="/profil/mes-annonces" />
      <div className="px-5 pb-8 flex flex-col gap-3">
        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className="fl">Ville</label>
            <select value={ville} onChange={(e) => setVille(e.target.value)} className="fs">
              {VILLES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="fl">Quartier</label>
            <input value={quartier} onChange={(e) => setQuartier(e.target.value)} className="fi" />
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className="fl">Pièces</label>
            <select value={pieces} onChange={(e) => setPieces(e.target.value)} className="fs">
              {TYPES_PIECES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="fl">Prix (FCFA)</label>
            <input value={prix} onChange={(e) => setPrix(e.target.value)} type="number" className="fi" />
          </div>
        </div>
        <div>
          <label className="fl">Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value as StatutAnnonce)} className="fs">
            <option value="dispo">🟢 Disponible</option>
            <option value="loue">🔴 Déjà loué</option>
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
