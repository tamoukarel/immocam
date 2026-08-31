import type { BienGere, LocataireGere, PaiementLoyer } from './types'

const NAVY = '#0B3B91'
const TEAL = '#00C2A8'
const GOLD = '#F4B400'
const GRIS = '#6B7690'

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function texteMultiligne(ctx: CanvasRenderingContext2D, texte: string, x: number, y: number, largeurMax: number, interligne: number): number {
  const mots = texte.split(' ')
  let ligne = ''
  let ligneY = y
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (ctx.measureText(essai).width > largeurMax && ligne) {
      ctx.fillText(ligne, x, ligneY)
      ligne = mot
      ligneY += interligne
    } else {
      ligne = essai
    }
  }
  if (ligne) {
    ctx.fillText(ligne, x, ligneY)
    ligneY += interligne
  }
  return ligneY
}

function nomMois(moisIso: string): string {
  const [annee, mois] = moisIso.split('-').map(Number)
  const noms = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ]
  return `${noms[mois - 1]} ${annee}`
}

export async function genererRecuImage(
  bien: BienGere,
  locataire: LocataireGere,
  paiement: PaiementLoyer,
  nomProprietaire: string,
): Promise<Blob> {
  const W = 900
  const H = 1290
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // fond
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  // bandeau superieur
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, 130)
  ctx.fillStyle = TEAL
  ctx.fillRect(0, 130, W, 6)

  try {
    const logo = await chargerImage('/logo-icon.png')
    ctx.drawImage(logo, 40, 25, 80, 80)
  } catch {
    // pas bloquant si le logo ne charge pas
  }

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 40px Montserrat, sans-serif'
  ctx.fillText('immo', 140, 78)
  const largeurImmo = ctx.measureText('immo').width
  ctx.fillStyle = GOLD
  ctx.fillText('cam', 140 + largeurImmo, 78)

  // blocs Bailleur / Locataire
  const boiteY = 165
  const boiteH = 70
  const boiteW = 380
  ctx.strokeStyle = '#D8DEEC'
  ctx.lineWidth = 2

  ctx.strokeRect(40, boiteY, boiteW, boiteH)
  ctx.fillStyle = '#F3F5FA'
  ctx.fillRect(40, boiteY, boiteW, 26)
  ctx.strokeRect(40, boiteY, boiteW, 26)
  ctx.fillStyle = NAVY
  ctx.font = '700 15px Poppins, sans-serif'
  ctx.fillText('BAILLEUR', 52, boiteY + 18)
  ctx.font = '600 18px Poppins, sans-serif'
  ctx.fillStyle = '#1A1A1A'
  ctx.fillText(nomProprietaire || 'Propriétaire ImmoCam', 52, boiteY + 52)

  const boite2X = W - 40 - boiteW
  ctx.strokeStyle = '#D8DEEC'
  ctx.strokeRect(boite2X, boiteY, boiteW, boiteH)
  ctx.fillStyle = '#F3F5FA'
  ctx.fillRect(boite2X, boiteY, boiteW, 26)
  ctx.strokeRect(boite2X, boiteY, boiteW, 26)
  ctx.fillStyle = NAVY
  ctx.font = '700 15px Poppins, sans-serif'
  ctx.fillText('LOCATAIRE', boite2X + 12, boiteY + 18)
  ctx.font = '600 18px Poppins, sans-serif'
  ctx.fillStyle = '#1A1A1A'
  ctx.fillText(locataire.nom, boite2X + 12, boiteY + 52)

  // titre
  ctx.fillStyle = NAVY
  ctx.font = '900 44px Montserrat, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Quittance de loyer', W / 2, 350)
  ctx.font = '700 26px Poppins, sans-serif'
  ctx.fillStyle = GOLD
  ctx.fillText(nomMois(paiement.mois).toUpperCase(), W / 2, 390)
  ctx.textAlign = 'left'

  // encadre principal
  const cadreX = 40
  const cadreY = 430
  const cadreW = W - 80
  const cadreH = 680
  ctx.strokeStyle = TEAL
  ctx.lineWidth = 3
  ctx.strokeRect(cadreX, cadreY, cadreW, cadreH)

  const montantTotal = paiement.loyer_nu + paiement.charges
  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`

  let y = cadreY + 55
  const px = cadreX + 35
  const largeurTexte = cadreW - 70
  ctx.fillStyle = GRIS
  ctx.font = '600 18px Poppins, sans-serif'

  function ligneLabelValeur(label: string, valeur: string, tailleValeur = 22) {
    ctx.fillStyle = GRIS
    ctx.font = '600 17px Poppins, sans-serif'
    ctx.fillText(label, px, y)
    y += 26
    ctx.fillStyle = '#1A1A1A'
    ctx.font = `700 ${tailleValeur}px Poppins, sans-serif`
    y = texteMultiligne(ctx, valeur, px, y, largeurTexte, tailleValeur + 6)
    y += 24
  }

  ligneLabelValeur('Reçu de :', locataire.nom)
  ligneLabelValeur('La somme de :', fmt(montantTotal))
  ligneLabelValeur('Le :', new Date(paiement.date_paiement).toLocaleDateString('fr-FR'))
  ligneLabelValeur('Pour loyer et accessoires des locaux sis à :', bien.adresse || bien.nom)
  ligneLabelValeur('Période :', nomMois(paiement.mois))

  // ligne separatrice
  ctx.strokeStyle = '#E1E8F2'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(px, y)
  ctx.lineTo(cadreX + cadreW - 35, y)
  ctx.stroke()
  y += 34

  ctx.fillStyle = NAVY
  ctx.font = '700 17px Poppins, sans-serif'
  ctx.fillText('Détail', px, y)
  y += 30
  ctx.font = '500 17px Poppins, sans-serif'
  ctx.fillStyle = '#333333'
  ctx.fillText(`Loyer nu : ${fmt(paiement.loyer_nu)}`, px, y)
  y += 26
  if (paiement.charges > 0) {
    ctx.fillText(`Charges / provisions de charges : ${fmt(paiement.charges)}`, px, y)
    y += 26
  }
  y += 20

  ctx.fillStyle = NAVY
  ctx.font = '900 30px Montserrat, sans-serif'
  ctx.fillText(`Montant total : ${fmt(montantTotal)}`, px, y)

  // pied de page
  ctx.fillStyle = GRIS
  ctx.font = '500 16px Poppins, sans-serif'
  ctx.fillText(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 40, H - 60)

  ctx.textAlign = 'right'
  ctx.fillStyle = TEAL
  ctx.font = '700 16px Poppins, sans-serif'
  ctx.fillText('Généré via ImmoCam · immocam.net', W - 40, H - 60)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob a échoué'))), 'image/png')
  })
}
