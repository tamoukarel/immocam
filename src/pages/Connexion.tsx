import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useLang } from '../lib/LangContext'

export function Connexion() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLang()
  const retourVers = (location.state as { retourVers?: string } | null)?.retourVers ?? '/profil'

  const [telephone, setTelephone] = useState('')
  const [code, setCode] = useState('')
  const [etape, setEtape] = useState<'telephone' | 'code'>('telephone')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  function versE164(t: string) {
    const chiffres = t.replace(/\D/g, '')
    return chiffres.startsWith('237') ? `+${chiffres}` : `+237${chiffres}`
  }

  async function envoyerCode(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setErreur(null)
    setEnvoi(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: versE164(telephone) })
    setEnvoi(false)
    if (error) {
      setErreur(t('connexion.erreurEnvoi'))
      return
    }
    setEtape('code')
  }

  async function verifierCode(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setErreur(null)
    setEnvoi(true)
    const { error } = await supabase.auth.verifyOtp({ phone: versE164(telephone), token: code, type: 'sms' })
    setEnvoi(false)
    if (error) {
      setErreur(t('connexion.erreurCode'))
      return
    }
    navigate(retourVers)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border-2 border-slate-100 p-8">
        <div className="flex items-center gap-2 mb-8">
          <img src="/logo-icon.png" alt="ImmoCam" className="w-9 h-9" />
          <div className="font-heading font-extrabold text-lg">
            <span className="bg-gradient-to-br from-navy to-brand-blue bg-clip-text text-transparent">immo</span>
            <span className="bg-gradient-to-br from-orange-600 to-amber-400 bg-clip-text text-transparent">cam</span>
          </div>
        </div>
        <h1 className="font-heading text-xl font-bold text-navy mb-1.5">{t('connexion.titre')}</h1>
        <p className="text-xs text-slate-500 mb-6">
          {etape === 'telephone' ? t('connexion.recevoirCode') : t('connexion.codeEnvoye', { numero: versE164(telephone) })}
        </p>

        {!isSupabaseConfigured && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            {t('connexion.backendNonConfigure')}
          </p>
        )}

        {etape === 'telephone' ? (
          <form onSubmit={envoyerCode} className="space-y-4">
            <div>
              <label className="fl">{t('connexion.champ.numero')}</label>
              <input
                type="tel"
                required
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                disabled={!isSupabaseConfigured}
                placeholder={t('connexion.numeroPlaceholder')}
                className="fi disabled:bg-slate-100"
              />
            </div>
            {erreur && <p className="text-sm text-red-600">{erreur}</p>}
            <button type="submit" disabled={!isSupabaseConfigured || envoi} className="btn-next w-full disabled:opacity-50">
              {envoi ? t('connexion.envoi') : t('connexion.recevoirUnCode')}
            </button>
          </form>
        ) : (
          <form onSubmit={verifierCode} className="space-y-4">
            <div>
              <label className="fl">{t('connexion.champ.code')}</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="fi"
              />
            </div>
            {erreur && <p className="text-sm text-red-600">{erreur}</p>}
            <button type="submit" disabled={envoi} className="btn-next w-full disabled:opacity-50">
              {envoi ? t('connexion.verification') : t('connexion.seConnecter')}
            </button>
            <button type="button" onClick={() => setEtape('telephone')} className="text-xs text-slate-500 w-full text-center">
              {t('connexion.changerNumero')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
