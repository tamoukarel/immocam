import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X, Plus, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { televerserPhoto, televerserVideo, MAX_VIDEO_OCTETS } from '../lib/photos'
import { formaterTelephone } from '../lib/whatsapp'
import { VILLES, TYPES_PIECES, DISTANCES_ROUTE, libellePiece, libelleDistance, type TypeAnnonce, type Niveau } from '../lib/types'
import { useLang } from '../lib/LangContext'

const MAX_PHOTOS = 5
const ETAPES = ['publier.etape.bien', 'publier.etape.details', 'publier.etape.photos', 'publier.etape.contact']

export function Publier() {
  const navigate = useNavigate()
  const { profil } = useAuth()
  const afficherToast = useToast()
  const { lang, t } = useLang()

  const [etape, setEtape] = useState(0)
  const [type, setType] = useState<TypeAnnonce | 'short'>('location')
  const [ville, setVille] = useState<string>(VILLES[0])
  const [quartier, setQuartier] = useState('')
  const [pieces, setPieces] = useState<string>(TYPES_PIECES[0])
  const [prix, setPrix] = useState('')
  const [avance, setAvance] = useState('')
  const [caution, setCaution] = useState('')
  const [niveau, setNiveau] = useState<Niveau | ''>('')
  const [distanceRoute, setDistanceRoute] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [whatsapp, setWhatsapp] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [etapeEnvoi, setEtapeEnvoi] = useState('')

  // Pré-rempli avec le numéro du compte (celui vérifié par OTP) pour éviter
  // de le retaper à chaque annonce — l'utilisateur reste libre de le changer
  // si son WhatsApp diffère de son numéro de connexion.
  useEffect(() => {
    if (profil?.telephone && !whatsapp) setWhatsapp(formaterTelephone(profil.telephone))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers) return
    const restant = MAX_PHOTOS - photos.length
    if (restant <= 0) {
      afficherToast(t('publier.erreurMaxPhotos', { n: MAX_PHOTOS }))
      return
    }
    setPhotos((prev) => [...prev, ...Array.from(fichiers).slice(0, restant)])
  }

  function choisirVideo(fichiers: FileList | null) {
    const fichier = fichiers?.[0]
    if (!fichier) return
    if (fichier.size > MAX_VIDEO_OCTETS) {
      afficherToast(t('publier.erreurVideoLourde'))
      return
    }
    setVideo(fichier)
  }

  function allerA(n: number) {
    if (n === 1 && (!quartier.trim() || !prix || Number(prix) <= 0)) {
      afficherToast(t('publier.erreurQuartierPrix'))
      return
    }
    setEtape(n)
  }

  async function publier() {
    if (!supabase || !profil) return
    const chiffresWa = whatsapp.replace(/\D/g, '')
    if (chiffresWa.length < 9) {
      afficherToast(t('publier.erreurWhatsapp'))
      return
    }
    setEnvoi(true)
    try {
      if (photos.length > 0) setEtapeEnvoi(t('publier.envoiPhotos', { n: 0, total: photos.length }))
      const cheminsPhotos: string[] = []
      for (const f of photos) {
        cheminsPhotos.push(await televerserPhoto(f, profil.id))
        setEtapeEnvoi(t('publier.envoiPhotos', { n: cheminsPhotos.length, total: photos.length }))
      }
      if (video) setEtapeEnvoi(t('publier.envoiVideo'))
      const cheminVideo = video ? await televerserVideo(video, profil.id) : null
      setEtapeEnvoi(t('publier.creationAnnonce'))
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
        video: cheminVideo,
        est_courte_duree: estCourteDuree,
        avance_mois: type !== 'vente' && avance ? parseInt(avance, 10) : null,
        caution_mois: type !== 'vente' && caution ? parseInt(caution, 10) : null,
        niveau: niveau || null,
        distance_route: distanceRoute || null,
      })
      if (error) throw error
      afficherToast(t('publier.succes'))
      navigate('/profil/mes-annonces')
    } catch {
      afficherToast(t('publier.echec'))
    } finally {
      setEnvoi(false)
      setEtapeEnvoi('')
    }
  }

  return (
    <div className="md:max-w-lg md:mx-auto">
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading font-extrabold text-lg text-navy">{t('publier.titre')}</h2>
        <p className="text-xs text-slate-500">{t('publier.sousTitre')}</p>
      </div>

      <div className="mx-5 bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-heading font-extrabold text-[13px] text-navy">
            {t('publier.etape', { n: etape + 1, total: ETAPES.length, nom: t(ETAPES[etape]) })}
          </span>
          <div className="flex gap-1">
            {ETAPES.map((_, i) => (
              <span key={i} className={`w-6 h-[5px] rounded-sm transition-colors duration-300 ${i <= etape ? 'bg-brand-blue' : 'bg-slate-100'}`} />
            ))}
          </div>
        </div>

        <div key={etape} className="fade-in">
        {etape === 0 && (
          <div className="flex flex-col gap-3">
            <Champ label={t('publier.champ.type')}>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="fs">
                <option value="location">{t('publier.type.location')}</option>
                <option value="vente">{t('publier.type.vente')}</option>
                <option value="short">{t('publier.type.courte')}</option>
              </select>
            </Champ>
            <div className="flex gap-2.5">
              <Champ label={t('publier.champ.ville')}>
                <select value={ville} onChange={(e) => setVille(e.target.value)} className="fs">
                  {VILLES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Champ>
              <Champ label={t('publier.champ.quartier')}>
                <input value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder={t('publier.quartierPlaceholder')} className="fi" />
              </Champ>
            </div>
            <div className="flex gap-2.5">
              <Champ label={t('publier.champ.pieces')}>
                <select value={pieces} onChange={(e) => setPieces(e.target.value)} className="fs">
                  {TYPES_PIECES.map((p) => (
                    <option key={p} value={p}>
                      {libellePiece(p, lang)}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label={t('publier.champ.prix')}>
                <input value={prix} onChange={(e) => setPrix(e.target.value)} type="number" placeholder={t('publier.prixPlaceholder')} className="fi" />
              </Champ>
            </div>
            <button onClick={() => allerA(1)} className="btn-next">
              {t('publier.suivantDetails')}
            </button>
          </div>
        )}

        {etape === 1 && (
          <div className="flex flex-col gap-3">
            {type !== 'vente' && (
              <div className="flex gap-2.5">
                <Champ label={t('publier.champ.avance')}>
                  <input value={avance} onChange={(e) => setAvance(e.target.value)} type="number" min="0" placeholder="Ex: 6" className="fi" />
                </Champ>
                <Champ label={t('publier.champ.caution')}>
                  <input value={caution} onChange={(e) => setCaution(e.target.value)} type="number" min="0" placeholder="Ex: 1" className="fi" />
                </Champ>
              </div>
            )}
            <div className="flex gap-2.5">
              <Champ label={t('publier.champ.niveau')}>
                <select value={niveau} onChange={(e) => setNiveau(e.target.value as typeof niveau)} className="fs">
                  <option value="">{t('publier.niveau.peuImporte')}</option>
                  <option value="rdc">{t('publier.niveau.rdc')}</option>
                  <option value="etage">{t('publier.niveau.etage')}</option>
                </select>
              </Champ>
              <Champ label={t('publier.champ.distanceRoute')}>
                <select value={distanceRoute} onChange={(e) => setDistanceRoute(e.target.value)} className="fs">
                  <option value="">{t('publier.distance.nonPrecise')}</option>
                  {DISTANCES_ROUTE.map((d) => (
                    <option key={d} value={d}>
                      {libelleDistance(d, lang)}
                    </option>
                  ))}
                </select>
              </Champ>
            </div>
            <Champ label={t('publier.champ.description')}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('publier.descriptionPlaceholder')}
                className="fi resize-none h-[70px]"
              />
            </Champ>
            <div className="flex gap-2.5">
              <button onClick={() => allerA(0)} className="btn-prev">
                {t('publier.retour')}
              </button>
              <button onClick={() => allerA(2)} className="btn-next">
                {t('publier.suivantPhotos')}
              </button>
            </div>
          </div>
        )}

        {etape === 2 && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="fl">
                {t('publier.champ.photos')} <span className="text-teal">{t('publier.max', { n: MAX_PHOTOS })}</span>
              </label>
              <label className="border-2 border-dashed border-brand-blue rounded-2xl bg-blue-light p-6 text-center block cursor-pointer">
                <input type="file" accept="image/*" multiple hidden onChange={(e) => ajouterPhotos(e.target.files)} />
                <Camera size={34} className="mx-auto text-brand-blue mb-2" />
                <div className="font-heading font-bold text-sm text-navy">{t('publier.ajouterPhotos')}</div>
                <div className="text-[11px] text-slate-500">{t('publier.cliquePourSelectionner')}</div>
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
                {t('publier.comptePhotos', { n: photos.length, total: MAX_PHOTOS })}
              </div>
              <div className="bg-teal-light border border-teal/25 rounded-xl px-3 py-2.5 text-[11px] text-teal mt-2 flex gap-1.5 font-medium">
                ✅ {t('publier.astucePhotos')}
              </div>
            </div>
            <div>
              <label className="fl">
                {t('publier.champ.video')} <span className="text-teal">{t('publier.videoOptionnel')}</span>
              </label>
              {video ? (
                <div className="relative">
                  <video src={URL.createObjectURL(video)} controls className="w-full h-[140px] rounded-xl bg-black object-contain" />
                  <button
                    onClick={() => setVideo(null)}
                    className="absolute -top-1.5 -right-1.5 bg-navy/80 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-brand-blue rounded-2xl bg-blue-light p-5 text-center block cursor-pointer">
                  <input type="file" accept="video/*" hidden onChange={(e) => choisirVideo(e.target.files)} />
                  <Video size={28} className="mx-auto text-brand-blue mb-1.5" />
                  <div className="font-heading font-bold text-sm text-navy">{t('publier.ajouterVideo')}</div>
                  <div className="text-[11px] text-slate-500">{t('publier.astuceVideo')}</div>
                </label>
              )}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => allerA(1)} className="btn-prev">
                {t('publier.retour')}
              </button>
              <button onClick={() => allerA(3)} className="btn-next">
                {t('publier.suivantContact')}
              </button>
            </div>
          </div>
        )}

        {etape === 3 && (
          <div className="flex flex-col gap-3">
            <Champ label={t('publier.champ.whatsapp')}>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} type="tel" placeholder="+237 6XX XXX XXX" className="fi" />
            </Champ>
            <div className="bg-blue-light rounded-xl p-3.5 border border-brand-blue/20 text-xs text-slate-600 leading-loose">
              <div className="font-heading font-bold text-navy text-[11px] mb-1">{t('publier.recap.titre')}</div>
              🏛️ <b>{ville}</b> · {quartier || '…'}
              <br />🏠 <b>{libellePiece(pieces, lang)}</b> ·{' '}
              {type === 'vente' ? t('publier.type.vente') : type === 'short' ? t('publier.type.courte') : t('publier.type.location')}
              <br />💰 <b>{prix ? Number(prix).toLocaleString('fr-FR') : '0'} FCFA</b>
              {type !== 'vente' && (avance || caution) && (
                <>
                  <br />📋 <b>
                    {[avance && t('detail.moisAvance', { n: avance }), caution && t('detail.moisCaution', { n: caution })].filter(Boolean).join(' + ')}
                  </b>
                </>
              )}
              <br />📸 <b>
                {photos.length} {t('publier.photo', { s: photos.length > 1 ? 's' : '' })}
                {video ? ` ${t('publier.plusVideo')}` : ''}
              </b>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => allerA(2)} className="btn-prev">
                {t('publier.retour')}
              </button>
              <button onClick={publier} disabled={envoi} className="btn-next disabled:opacity-60 active:scale-95 transition-transform">
                {envoi ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {etapeEnvoi || t('publier.publication')}
                  </span>
                ) : (
                  t('publier.publier')
                )}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="fl">{label}</label>
      {children}
    </div>
  )
}
