import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { User, Check, Share2, Trash2, CheckCircle2, History, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { premierJourMoisCourant } from '../lib/gestionLocative'
import { genererRecuImage } from '../lib/recu'
import type { BienGere, LocataireGere, PaiementLoyer } from '../lib/types'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

export function BienDetail() {
  const { id } = useParams<{ id: string }>()
  const { profil } = useAuth()
  const afficherToast = useToast()
  const { t } = useLang()

  const [bien, setBien] = useState<BienGere | null>(null)
  const [locataires, setLocataires] = useState<LocataireGere[]>([])
  const [paiements, setPaiements] = useState<Record<string, PaiementLoyer>>({})
  const [formOuvert, setFormOuvert] = useState(false)
  const [nomLocataire, setNomLocataire] = useState('')
  const [telLocataire, setTelLocataire] = useState('')
  const [locatairePaiement, setLocatairePaiement] = useState<LocataireGere | null>(null)
  const [charges, setCharges] = useState('0')
  const [historiqueOuvert, setHistoriqueOuvert] = useState<Record<string, boolean>>({})
  const [historique, setHistorique] = useState<Record<string, PaiementLoyer[]>>({})

  async function charger() {
    if (!supabase || !id) return
    const mois = premierJourMoisCourant()
    const [{ data: b }, { data: locs }] = await Promise.all([
      supabase.from('biens_geres').select('*').eq('id', id).single(),
      supabase.from('locataires_geres').select('*').eq('bien_id', id).eq('actif', true).order('created_at'),
    ])
    setBien((b as BienGere) ?? null)
    const listeLocs = (locs as LocataireGere[]) ?? []
    setLocataires(listeLocs)

    if (listeLocs.length > 0) {
      const { data: p } = await supabase
        .from('paiements_loyer')
        .select('*')
        .eq('mois', mois)
        .in(
          'locataire_id',
          listeLocs.map((l) => l.id),
        )
      const map: Record<string, PaiementLoyer> = {}
      for (const pmt of (p as PaiementLoyer[] | null) ?? []) map[pmt.locataire_id] = pmt
      setPaiements(map)
    }
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function ajouterLocataire() {
    if (!supabase || !id || !nomLocataire.trim()) return
    const { error } = await supabase.from('locataires_geres').insert({ bien_id: id, nom: nomLocataire.trim(), telephone: telLocataire.trim() })
    if (error) {
      // 42501 = violation RLS (with check) : c'est précisément la limite
      // freemium ici, la seule condition du "with check" hors appartenance
      // du bien. Toute autre erreur est affichée telle quelle, pas devinée.
      afficherToast(error.code === '42501' ? t('gestionLocative.erreurLimiteLocataire') : t('gestionLocative.erreurGenerique'))
      return
    }
    setNomLocataire('')
    setTelLocataire('')
    setFormOuvert(false)
    afficherToast(t('gestionLocative.locataireAjoute'))
    charger()
  }

  async function basculerHistorique(locataireId: string) {
    const ouvert = !historiqueOuvert[locataireId]
    setHistoriqueOuvert((prev) => ({ ...prev, [locataireId]: ouvert }))
    if (ouvert && !historique[locataireId] && supabase) {
      const { data } = await supabase.from('paiements_loyer').select('*').eq('locataire_id', locataireId).order('mois', { ascending: false })
      setHistorique((prev) => ({ ...prev, [locataireId]: (data as PaiementLoyer[]) ?? [] }))
    }
  }

  async function retirerLocataire(locataireId: string) {
    if (!supabase) return
    await supabase.from('locataires_geres').update({ actif: false }).eq('id', locataireId)
    afficherToast(t('gestionLocative.locataireRetire'))
    charger()
  }

  async function confirmerPaiement() {
    if (!supabase || !bien || !locatairePaiement) return
    const mois = premierJourMoisCourant()
    const { error } = await supabase.from('paiements_loyer').insert({
      locataire_id: locatairePaiement.id,
      mois,
      loyer_nu: bien.loyer_mensuel,
      charges: Number(charges) || 0,
    })
    if (error) {
      afficherToast(t('gestionLocative.erreurPaiementExiste'))
      return
    }
    setLocatairePaiement(null)
    setCharges('0')
    afficherToast(t('gestionLocative.paiementEnregistre'))
    charger()
  }

  async function partagerRecu(locataire: LocataireGere, paiement: PaiementLoyer | undefined) {
    if (!bien || !paiement) return
    try {
      const blob = await genererRecuImage(bien, locataire, paiement, profil?.nom ?? '')
      const fichier = new File([blob], `quittance-${locataire.nom}.png`, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: t('gestionLocative.quittanceTitre') })
      } else {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch {
      // partage annulé par l'utilisateur : rien à faire
    }
  }

  if (!bien) return null

  return (
    <div>
      <PageHeader titre={bien.nom} sousTitre={`${bien.loyer_mensuel.toLocaleString('fr-FR')} FCFA/mois`} retourVers="/profil/gestion-locative" />
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-heading font-extrabold text-sm text-navy">{t('gestionLocative.locataires')}</div>
          <button onClick={() => setFormOuvert((v) => !v)} className="text-brand-blue text-xs font-bold font-heading">
            {formOuvert ? t('gestionLocative.annuler') : `+ ${t('gestionLocative.ajouterLocataire')}`}
          </button>
        </div>

        {formOuvert && (
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-3.5 md:max-w-lg flex flex-col gap-3">
            <div>
              <label className="fl">{t('gestionLocative.champ.nomLocataire')}</label>
              <input value={nomLocataire} onChange={(e) => setNomLocataire(e.target.value)} className="fi" />
            </div>
            <div>
              <label className="fl">{t('gestionLocative.champ.telephoneLocataire')}</label>
              <input value={telLocataire} onChange={(e) => setTelLocataire(e.target.value)} placeholder="2376XXXXXXXX" className="fi" />
            </div>
            <button onClick={ajouterLocataire} className="btn-next">
              {t('gestionLocative.sauvegarder')}
            </button>
          </div>
        )}

        {locataires.length === 0 && !formOuvert && <p className="text-center text-sm text-slate-400 italic py-8">{t('gestionLocative.aucunLocataire')}</p>}

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
          {locataires.map((l) => {
            const paiement = paiements[l.id]
            return (
              <div key={l.id} className="bg-white rounded-2xl border-2 border-slate-100 p-3.5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0">
                    <User size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-sm text-navy truncate">{l.nom}</div>
                    <div className="text-[11px] text-slate-500">{l.telephone}</div>
                  </div>
                  <button onClick={() => retirerLocataire(l.id)} className="text-slate-300 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>

                {paiement ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal">
                      <CheckCircle2 size={14} />
                      {t('gestionLocative.paye', { montant: (paiement.loyer_nu + paiement.charges).toLocaleString('fr-FR') })}
                    </div>
                    <button onClick={() => partagerRecu(l, paiement)} className="bg-blue-light text-brand-blue rounded-lg px-2.5 py-1.5 flex items-center gap-1 text-[11px] font-bold font-heading">
                      <Share2 size={12} /> {t('gestionLocative.recu')}
                    </button>
                  </div>
                ) : locatairePaiement?.id === l.id ? (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="fl">{t('gestionLocative.champ.charges')}</label>
                      <input value={charges} onChange={(e) => setCharges(e.target.value)} type="number" className="fi" />
                    </div>
                    <button onClick={confirmerPaiement} className="bg-teal text-white rounded-lg px-3 py-2 text-[11px] font-bold font-heading flex-shrink-0">
                      {t('gestionLocative.confirmer')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLocatairePaiement(l)}
                    className="w-full bg-teal-light text-teal border-2 border-teal/20 rounded-lg py-2 text-[11px] font-bold font-heading flex items-center justify-center gap-1"
                  >
                    <Check size={13} /> {t('gestionLocative.marquerPaye')}
                  </button>
                )}

                <button
                  onClick={() => basculerHistorique(l.id)}
                  className="w-full flex items-center justify-center gap-1 text-[10.5px] text-slate-400 font-semibold mt-2.5 pt-2 border-t border-slate-100"
                >
                  <History size={12} />
                  {t('gestionLocative.historique')}
                  {historiqueOuvert[l.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {historiqueOuvert[l.id] && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {historique[l.id] === undefined && <p className="text-[10px] text-slate-400 text-center py-2">{t('gestionLocative.chargement')}</p>}
                    {historique[l.id]?.length === 0 && <p className="text-[10px] text-slate-400 text-center py-2">{t('gestionLocative.historiqueVide')}</p>}
                    {historique[l.id]
                      ?.filter((p) => p.mois !== premierJourMoisCourant())
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-bg rounded-lg px-2.5 py-1.5">
                          <span className="text-[10.5px] text-slate-600 font-medium">
                            {new Date(p.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} · {(p.loyer_nu + p.charges).toLocaleString('fr-FR')} FCFA
                          </span>
                          <button onClick={() => partagerRecu(l, p)} className="text-brand-blue flex-shrink-0">
                            <Share2 size={12} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
