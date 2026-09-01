import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, ChevronRight, AlertTriangle, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { lienWhatsapp, NUMERO_SUPPORT } from '../lib/whatsapp'
import { chargerTableauDeBord, compterLocatairesActifs, LIMITE_LOCATAIRES_GRATUIT, type LocataireAvecStatut } from '../lib/gestionLocative'
import type { BienGere } from '../lib/types'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../lib/LangContext'

export function GestionLocative() {
  const { profil } = useAuth()
  const afficherToast = useToast()
  const { t } = useLang()
  const [biens, setBiens] = useState<BienGere[]>([])
  const [tableau, setTableau] = useState<LocataireAvecStatut[]>([])
  const [chargement, setChargement] = useState(true)
  const [formOuvert, setFormOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [adresse, setAdresse] = useState('')
  const [loyer, setLoyer] = useState('')
  const [jourEcheance, setJourEcheance] = useState('5')
  const [locatairesActifs, setLocatairesActifs] = useState(0)
  // Lu en direct depuis la base à chaque ouverture de la page, plutôt que de
  // faire confiance à profil.estPremiumGestion (mis en cache une seule fois
  // par session dans AuthContext) : si Karel active l'accès pendant que
  // cette page était déjà ouverte, on veut le voir sans recharger l'app.
  const [premiumLive, setPremiumLive] = useState<boolean | null>(null)

  async function charger() {
    if (!supabase || !profil) return
    setChargement(true)
    const [{ data: listeBiens }, statuts, nbLocataires, { data: profilFrais }] = await Promise.all([
      supabase.from('biens_geres').select('*').eq('proprietaire_id', profil.id).order('created_at', { ascending: false }),
      chargerTableauDeBord(profil.id),
      compterLocatairesActifs(profil.id),
      supabase.from('profils').select('est_premium_gestion').eq('id', profil.id).single(),
    ])
    setBiens((listeBiens as BienGere[]) ?? [])
    setTableau(statuts)
    setLocatairesActifs(nbLocataires)
    setPremiumLive((profilFrais as { est_premium_gestion: boolean } | null)?.est_premium_gestion ?? profil.estPremiumGestion)
    setChargement(false)
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  const estPremium = premiumLive ?? profil?.estPremiumGestion ?? false
  const limiteAtteinte = !estPremium && locatairesActifs >= LIMITE_LOCATAIRES_GRATUIT
  const enRetardOuProche = tableau.filter((l) => !l.paiement && l.joursAvantEcheance <= 7)

  async function creerBien() {
    if (!supabase || !profil) return
    if (!nom.trim() || !loyer || Number(loyer) <= 0) {
      afficherToast(t('gestionLocative.erreurFormulaire'))
      return
    }
    const { error } = await supabase.from('biens_geres').insert({
      proprietaire_id: profil.id,
      nom: nom.trim(),
      adresse: adresse.trim(),
      loyer_mensuel: Number(loyer),
      jour_echeance: Number(jourEcheance),
    })
    if (error) {
      afficherToast(t('gestionLocative.erreurGenerique'))
      return
    }
    setNom('')
    setAdresse('')
    setLoyer('')
    setFormOuvert(false)
    afficherToast(t('gestionLocative.bienAjoute'))
    charger()
  }

  const texteWhatsapp = t('gestionLocative.messageWhatsapp')

  return (
    <div>
      <PageHeader titre={t('gestionLocative.titre')} sousTitre={t('gestionLocative.sousTitre')} retourVers="/profil" />
      <div className="px-5 pb-6">
        {enRetardOuProche.length > 0 && (
          <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-3.5 mb-3.5 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 font-semibold">
              {t('gestionLocative.echeancesProches', { n: enRetardOuProche.length, s: enRetardOuProche.length > 1 ? 's' : '' })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-1.5">
          <div className="font-heading font-extrabold text-sm text-navy">{t('gestionLocative.mesBiens')}</div>
          <button onClick={() => setFormOuvert((v) => !v)} className="text-brand-blue text-xs font-bold font-heading">
            {formOuvert ? t('gestionLocative.annuler') : `+ ${t('gestionLocative.ajouterBien')}`}
          </button>
        </div>
        <div className={`text-[11px] font-semibold mb-3 ${limiteAtteinte ? 'text-gold' : 'text-slate-400'}`}>
          {estPremium
            ? t('gestionLocative.locatairesIllimite')
            : t('gestionLocative.locatairesCompteur', { n: locatairesActifs, max: LIMITE_LOCATAIRES_GRATUIT })}
        </div>

        {formOuvert && (
          <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm mb-3.5 md:max-w-lg flex flex-col gap-3">
            <div>
              <label className="fl">{t('gestionLocative.champ.nom')}</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('gestionLocative.nomPlaceholder')} className="fi" />
            </div>
            <div>
              <label className="fl">{t('gestionLocative.champ.adresse')}</label>
              <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder={t('gestionLocative.adressePlaceholder')} className="fi" />
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1 min-w-0">
                <label className="fl">{t('gestionLocative.champ.loyer')}</label>
                <input value={loyer} onChange={(e) => setLoyer(e.target.value)} type="number" placeholder="60000" className="fi" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="fl">{t('gestionLocative.champ.jourEcheance')}</label>
                <input
                  value={jourEcheance}
                  onChange={(e) => setJourEcheance(e.target.value)}
                  type="number"
                  min={1}
                  max={28}
                  className="fi"
                />
              </div>
            </div>
            <button onClick={creerBien} className="btn-next">
              {t('gestionLocative.sauvegarder')}
            </button>
          </div>
        )}

        {limiteAtteinte && (
          <div className="bg-white rounded-2xl border-2 border-gold/30 p-4 shadow-sm mb-3.5 md:max-w-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} className="text-gold" />
              <div className="font-heading font-extrabold text-sm text-navy">{t('gestionLocative.premiumTitre')}</div>
            </div>
            <p className="text-xs text-slate-600 mb-3">{t('gestionLocative.premiumTexte')}</p>
            <a
              href={lienWhatsapp(NUMERO_SUPPORT, texteWhatsapp)}
              target="_blank"
              rel="noreferrer"
              className="block text-center bg-gold text-navy rounded-full py-2.5 text-xs font-bold font-heading"
            >
              {t('gestionLocative.premiumBouton')}
            </a>
          </div>
        )}

        {!chargement && biens.length === 0 && !formOuvert && (
          <p className="text-center text-sm text-slate-400 italic py-8">{t('gestionLocative.aucunBien')}</p>
        )}

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
          {biens.map((b) => {
            const locatairesDuBien = tableau.filter((l) => l.bien_id === b.id)
            const retards = locatairesDuBien.filter((l) => !l.paiement && l.joursAvantEcheance <= 7).length
            return (
              <Link
                key={b.id}
                to={`/profil/gestion-locative/${b.id}`}
                className="bg-white rounded-2xl border-2 border-slate-100 p-3.5 shadow-sm flex items-center gap-3"
              >
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-navy via-brand-blue to-teal flex items-center justify-center text-white flex-shrink-0">
                  <Home size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-sm text-navy truncate">{b.nom}</div>
                  <div className="text-[11px] text-slate-500">
                    {b.loyer_mensuel.toLocaleString('fr-FR')} FCFA/mois · {t('gestionLocative.echeanceLe', { j: b.jour_echeance })}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t('gestionLocative.nbLocataires', { n: locatairesDuBien.length, s: locatairesDuBien.length > 1 ? 's' : '' })}
                  </div>
                </div>
                {retards > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">{retards}</span>}
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
