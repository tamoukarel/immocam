import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { ToastProvider } from './lib/ToastContext'
import { LangProvider } from './lib/LangContext'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Accueil } from './pages/Accueil'
import { Annonces } from './pages/Annonces'
import { AnnonceDetail } from './pages/AnnonceDetail'
import { Coloc } from './pages/Coloc'
import { Budget } from './pages/Budget'
import { CourteDuree } from './pages/CourteDuree'
import { Publier } from './pages/Publier'
import { Connexion } from './pages/Connexion'
import { Profil } from './pages/Profil'
import { MesAnnonces } from './pages/MesAnnonces'
import { ModifierAnnonce } from './pages/ModifierAnnonce'
import { Favoris } from './pages/Favoris'
import { Messages } from './pages/Messages'
import { Alertes } from './pages/Alertes'
import { Parametres } from './pages/Parametres'
import { Signalements } from './pages/Signalements'

function App() {
  return (
    <BrowserRouter>
      <LangProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="connexion" element={<Connexion />} />

            <Route element={<AppShell />}>
              <Route index element={<Accueil />} />
              <Route path="annonces" element={<Annonces />} />
              <Route path="annonces/:id" element={<AnnonceDetail />} />
              <Route path="coloc" element={<Coloc />} />
              <Route path="budget" element={<Budget />} />
              <Route path="courte-duree" element={<CourteDuree />} />

              <Route path="publier" element={<ProtectedRoute />}>
                <Route index element={<Publier />} />
              </Route>

              <Route path="profil" element={<ProtectedRoute />}>
                <Route index element={<Profil />} />
                <Route path="mes-annonces" element={<MesAnnonces />} />
                <Route path="mes-annonces/:id" element={<ModifierAnnonce />} />
                <Route path="favoris" element={<Favoris />} />
                <Route path="messages" element={<Messages />} />
                <Route path="alertes" element={<Alertes />} />
                <Route path="parametres" element={<Parametres />} />
                <Route path="signalements" element={<Signalements />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  )
}

export default App
