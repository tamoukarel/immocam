import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { televerserPhoto } from '../lib/photos'
import { VILLES, TYPES_PIECES, type TypeAnnonce } from '../lib/types'

const MAX_PHOTOS = 5
const ETAPES = ['Le bien', 'Les photos', 'Contact']

export function Publier() {
  const navigate = useNavigate()
  const { profil } = useAuth()
  const afficherToast = useToast()

  const [etape, setEtape] = useState(0)
  const [type, setType] = useState<TypeAnnonce | 'short'>('location')
  const [ville, setVille] = useState<string>(VILLES[0])
  const [quartier, setQuartier] = useState('')
  const [pieces, setPieces] = useState<string>(TYPES_PIECES[0])
  const [prix, setPrix] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [whatsapp, setWhatsapp] = useState('')
  const [envoi, setEnvoi] = useState(false)

  function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers) return
    const restant = MAX_PHOTOS - photos.length
    if (restant <= 0) {
      afficherToast(`Maximum ${MAX_PHOTOS} photos`)
      return
    }
    setPhotos((prev) => [...prev, ...Array.from(fichiers).slice(0, restant)])
  }

  function allerA(n: number) {
    if (n === 1 && (!quartier.trim() || !prix || Number(prix) <= 0)) {
      afficherToast('⚠️ Renseigne le quartier et un prix valide')
      return
    }
    setEtape(n)
  }

  async function publier() {
    if (!supabase || !profil) return
    const chiffresWa = whatsapp.replace(/\D/g, '')
    if (chiffresWa.length < 9) {
      afficherToast('⚠️ Numéro WhatsApp invalide')
      return
    }
    setEnvoi(true)
    try {
      const cheminsPhotos = await Promise.all(photos.map((f) => televerserPhoto(f, profil.id)))
      const estCourteDuree = type === 'short'
      const { error } = await supabase.from('annonces').insert({
        proprietaire_id: profil.id,
        type: type === 'vente' ? 'vente' : 'location',
        ville,
        quartier: quartier.trim(),
        pieces,
        prix: parseInt(prix, 10),
        unite: type === 'vente' ? '' : estCourteDuree ? '/nuit' : '/mois',
        description: description.trim(),
        whatsapp: chiffresWa,
        photos: cheminsPhotos,
        est_courte_duree: estCourteDuree,
      })
      if (error) throw error
      afficherToast('🚀 Annonce publiée !')
      navigate('/profil/mes-annonces')
    } catch {
      afficherToast("⚠️ Échec de la publication, réessaie")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div>
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading font-extrabold text-lg text-navy">➕ Publier une annonce</h2>
        <p className="text-xs text-slate-500">Gratuit · Sans intermédiaire · 3 étapes</p>
      </div>

      <div className="mx-5 bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-heading font-extrabold text-[13px] text-navy">
            Étape {etape + 1} / 3 — {ETAPES[etape]}
          </span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`w-6 h-[5px] rounded-sm ${i <= etape ? 'bg-brand-blue' : 'bg-slate-100'}`} />
            ))}
          </div>
        </div>

        {etape === 0 && (
          <div className="flex flex-col gap-3">
            <Champ label="Type d'annonce">
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="fs">
                <option value="location">🔑 Location longue durée</option>
                <option value="vente">💰 Vente</option>
                <option value="short">🌴 Location courte durée</option>
              </select>
            </Champ>
            <div className="flex gap-2.5">
              <Champ label="Ville">
                <select value={ville} onChange={(e) => setVille(e.target.value)} className="fs">
                  {VILLES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Champ>
              <Champ label="Quartier">
                <input value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Ex: Bastos" className="fi" />
              </Champ>
            </div>
            <div className="flex gap-2.5">
              <Champ label="Nb pièces">
                <select value={pieces} onChange={(e) => setPieces(e.target.value)} className="fs">
                  {TYPES_PIECES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Champ>
              <Champ label="Prix (FCFA)">
                <input value={prix} onChange={(e) => setPrix(e.target.value)} type="number" placeholder="Ex: 80000" className="fi" />
              </Champ>
            </div>
            <Champ label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Équipements, état, avantages…"
                className="fi resize-none h-[70px]"
              />
            </Champ>
            <button onClick={() => allerA(1)} className="btn-next">
              Suivant → Photos
            </button>
          </div>
        )}

        {etape === 1 && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="fl">
                Photos du bien <span className="text-teal">(max. {MAX_PHOTOS})</span>
              </label>
              <label className="border-2 border-dashed border-brand-blue rounded-2xl bg-blue-light p-6 text-center block cursor-pointer">
                <input type="file" accept="image/*" multiple hidden onChange={(e) => ajouterPhotos(e.target.files)} />
                <Camera size={34} className="mx-auto text-brand-blue mb-2" />
                <div className="font-heading font-bold text-sm text-navy">Ajouter des photos</div>
                <div className="text-[11px] text-slate-500">Clique pour sélectionner</div>
              </label>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {photos.map((f, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={URL.createObjectURL(f)} className="w-full h-full object-cover rounded-lg border-2 border-slate-100" />
                      <button
                        onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-navy/80 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <label className="w-16 h-16 border-2 border-dashed border-brand-blue rounded-lg flex items-center justify-center text-brand-blue cursor-pointer">
                      <input type="file" accept="image/*" multiple hidden onChange={(e) => ajouterPhotos(e.target.files)} />
                      <Plus size={18} />
                    </label>
                  )}
                </div>
              )}
              <div className="text-center mt-2 text-[11px] font-semibold text-slate-500">
                📸 {photos.length} / {MAX_PHOTOS} photos
              </div>
              <div className="bg-teal-light border border-teal/25 rounded-xl px-3 py-2.5 text-[11px] text-teal mt-2 flex gap-1.5 font-medium">
                ✅ Les annonces avec photos reçoivent 3× plus de contacts !
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => allerA(0)} className="btn-prev">
                ← Retour
              </button>
              <button onClick={() => allerA(2)} className="btn-next">
                Suivant → Contact
              </button>
            </div>
          </div>
        )}

        {etape === 2 && (
          <div className="flex flex-col gap-3">
            <Champ label="Votre WhatsApp">
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} type="tel" placeholder="+237 6XX XXX XXX" className="fi" />
            </Champ>
            <div className="bg-blue-light rounded-xl p-3.5 border border-brand-blue/20 text-xs text-slate-600 leading-loose">
              <div className="font-heading font-bold text-navy text-[11px] mb-1">📋 Récapitulatif</div>
              🏛️ <b>{ville}</b> · {quartier || '…'}
              <br />🏠 <b>{pieces}</b> · {type === 'vente' ? 'Vente' : type === 'short' ? 'Location courte durée' : 'Location'}
              <br />💰 <b>{prix ? Number(prix).toLocaleString('fr-FR') : '0'} FCFA</b>
              <br />📸 <b>
                {photos.length} photo{photos.length > 1 ? 's' : ''}
              </b>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => allerA(1)} className="btn-prev">
                ← Retour
              </button>
              <button onClick={publier} disabled={envoi} className="btn-next disabled:opacity-60">
                {envoi ? 'Publication…' : '🚀 Publier'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <label className="fl">{label}</label>
      {children}
    </div>
  )
}
