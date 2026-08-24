import { useAuth } from '../lib/AuthContext'
import { NUMERO_SUPPORT, lienWhatsapp } from '../lib/whatsapp'
import { PageHeader } from '../components/PageHeader'

export function Parametres() {
  const { profil } = useAuth()

  return (
    <div>
      <PageHeader titre="⚙️ Paramètres" sousTitre="Ton compte ImmoCam" retourVers="/profil" />
      <div className="px-5 pb-8">
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-4">
          <div className="text-[10px] font-bold text-brand-blue uppercase tracking-wide font-heading mb-1">Numéro de compte</div>
          <div className="text-sm font-semibold text-navy">{profil?.telephone}</div>
        </div>

        <a
          href={lienWhatsapp(NUMERO_SUPPORT, 'Bonjour, je souhaite supprimer mon compte ImmoCam.')}
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center bg-red-50 text-red-600 border-2 border-red-100 rounded-xl py-3.5 text-sm font-bold font-heading"
        >
          Demander la suppression de mon compte
        </a>
        <p className="text-[11px] text-slate-400 text-center mt-2">
          Traité manuellement sous 48h par l'équipe ImmoCam, pour l'instant.
        </p>
      </div>
    </div>
  )
}
