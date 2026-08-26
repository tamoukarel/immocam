import { useState } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { NUMERO_SUPPORT, lienWhatsapp } from '../lib/whatsapp'
import { televerserPhoto, urlPhoto } from '../lib/photos'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'
import type { Lang } from '../lib/i18n'

export function Parametres() {
  const { profil, mettreAJourNom, mettreAJourPhoto } = useAuth()
  const afficherToast = useToast()
  const { lang, setLang, t } = useLang()
  const [nom, setNom] = useState(profil?.nom ?? '')
  const [enregistrement, setEnregistrement] = useState(false)
  const [envoiPhoto, setEnvoiPhoto] = useState(false)

  async function enregistrerNom() {
    if (!nom.trim()) {
      afficherToast(t('parametres.nomVide'))
      return
    }
    setEnregistrement(true)
    await mettreAJourNom(nom.trim())
    setEnregistrement(false)
    afficherToast(t('parametres.nomMisAJour'))
  }

  async function changerPhoto(fichiers: FileList | null) {
    const fichier = fichiers?.[0]
    if (!fichier || !profil) return
    setEnvoiPhoto(true)
    try {
      const chemin = await televerserPhoto(fichier, profil.id)
      await mettreAJourPhoto(chemin)
      afficherToast(t('parametres.photoMiseAJour'))
    } catch {
      afficherToast(t('parametres.echecEnvoi'))
    } finally {
      setEnvoiPhoto(false)
    }
  }

  return (
    <div className="md:max-w-lg md:mx-auto">
      <PageHeader titre={t('parametres.titre')} sousTitre={t('parametres.sousTitre')} retourVers="/profil" />
      <div className="px-5 pb-8">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-4 flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-blue-light border-2 border-slate-100 overflow-hidden flex items-center justify-center">
              {profil?.photo ? (
                <img src={urlPhoto(profil.photo)} className="w-full h-full object-cover" />
              ) : (
                <Camera size={22} className="text-brand-blue" />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 bg-brand-blue text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white cursor-pointer">
              <input type="file" accept="image/*" hidden onChange={(e) => changerPhoto(e.target.files)} disabled={envoiPhoto} />
              <Camera size={11} />
            </label>
          </div>
          <div className="text-xs text-slate-500">{envoiPhoto ? t('parametres.envoiPhoto') : t('parametres.photoTexte')}</div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-4">
          <div className="text-[10px] font-bold text-brand-blue uppercase tracking-wide font-heading mb-1">{t('parametres.numeroCompte')}</div>
          <div className="text-sm font-semibold text-navy">{profil?.telephone}</div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-4">
          <div className="text-[10px] font-bold text-brand-blue uppercase tracking-wide font-heading mb-1">{t('parametres.nomAffiche')}</div>
          <p className="text-[11px] text-slate-400 mb-2.5">{t('parametres.nomVisible')}</p>
          <div className="flex gap-2">
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('parametres.nomPlaceholder')} className="fi min-w-0" />
            <button onClick={enregistrerNom} disabled={enregistrement} className="bg-brand-blue text-white rounded-xl px-4 text-sm font-bold font-heading disabled:opacity-60 flex-shrink-0">
              {enregistrement ? '…' : t('parametres.enregistrer')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-4">
          <div className="text-[10px] font-bold text-brand-blue uppercase tracking-wide font-heading mb-1">{t('parametres.langue')}</div>
          <p className="text-[11px] text-slate-400 mb-2.5">{t('parametres.langueTexte')}</p>
          <div className="flex gap-2">
            {(['fr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold font-heading border-2 ${
                  lang === l ? 'border-brand-blue bg-blue-light text-navy' : 'border-slate-100 bg-white text-slate-500'
                }`}
              >
                {l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>

        <a
          href={lienWhatsapp(NUMERO_SUPPORT, t('parametres.suppressionMessage'))}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center bg-red-50 text-red-600 border-2 border-red-100 rounded-xl py-3.5 text-sm font-bold font-heading"
        >
          {t('parametres.demanderSuppression')}
        </a>
        <p className="text-[11px] text-slate-400 text-center mt-2">{t('parametres.suppressionTexte')}</p>
      </div>
    </div>
  )
}
