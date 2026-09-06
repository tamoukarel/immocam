import { Home, ShieldCheck, MessageCircle, PhoneCall } from 'lucide-react'
import { NUMERO_SUPPORT, lienWhatsapp } from '../lib/whatsapp'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

export function APropos() {
  const { t } = useLang()

  const etapes = [
    { icone: PhoneCall, titreCle: 'apropos.etape1.titre', texteCle: 'apropos.etape1.texte' },
    { icone: Home, titreCle: 'apropos.etape2.titre', texteCle: 'apropos.etape2.texte' },
    { icone: MessageCircle, titreCle: 'apropos.etape3.titre', texteCle: 'apropos.etape3.texte' },
  ] as const

  return (
    <div>
      <PageHeader titre={t('apropos.titre')} sousTitre={t('apropos.sousTitre')} retourVers="/" />

      <div className="px-5 pb-6 flex flex-col gap-5">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm">
          <p className="text-sm text-slate-600 leading-relaxed">{t('apropos.mission')}</p>
          <div className="flex items-center gap-2 mt-3 text-teal font-bold text-xs font-heading">
            <ShieldCheck size={16} />
            {t('apropos.zeroCommission')}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-black">
          <video src="/video-promo.mp4" controls preload="none" poster="/logo-icon.png" className="w-full aspect-[9/16] max-h-[480px] mx-auto block" />
        </div>

        <div>
          <div className="font-heading font-extrabold text-sm text-navy mb-3">{t('apropos.commentCaMarche')}</div>
          <div className="flex flex-col gap-3">
            {etapes.map(({ icone: Icone, titreCle, texteCle }, i) => (
              <div key={titreCle} className="flex items-start gap-3 bg-white rounded-2xl border-2 border-slate-100 p-3.5 shadow-sm">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0 font-heading font-extrabold text-xs">
                  {i + 1}
                </span>
                <div>
                  <div className="font-heading font-bold text-sm text-navy flex items-center gap-1.5">
                    <Icone size={14} className="text-brand-blue" /> {t(titreCle)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{t(texteCle)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <a
          href={lienWhatsapp(NUMERO_SUPPORT, t('apropos.messageWhatsapp'))}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-teal text-white rounded-full py-3 text-sm font-bold font-heading"
        >
          <MessageCircle size={16} /> {t('apropos.uneQuestion')}
        </a>
      </div>
    </div>
  )
}
