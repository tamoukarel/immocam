import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PageHeader({ titre, sousTitre, retourVers }: { titre: string; sousTitre?: string; retourVers?: string }) {
  const navigate = useNavigate()
  return (
    <div className="px-5 pt-5 pb-3">
      <button
        onClick={() => (retourVers ? navigate(retourVers) : navigate(-1))}
        className="text-navy mb-2"
        aria-label="Retour"
      >
        <ArrowLeft size={22} />
      </button>
      <h2 className="font-heading font-extrabold text-lg text-navy">{titre}</h2>
      {sousTitre && <p className="text-xs text-slate-500">{sousTitre}</p>}
    </div>
  )
}
