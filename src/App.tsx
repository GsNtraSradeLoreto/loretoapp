import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Perfil from './pages/Perfil'
import Admin from './pages/Admin'
import BeneficiarioDetalle from './pages/BeneficiarioDetalle'
import Pagos from './pages/Pagos'
import Planillas from './pages/Planillas'
import Campamentos from './pages/Campamentos'
import Layout from './components/Layout'
import Auditoria from './pages/Auditoria'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#E8DEC4',
        fontFamily: 'Oswald, sans-serif',
        color: '#7A7364'
      }}>
        Cargando...
      </div>
    )
  }
  
  if (!user) return <Navigate to="/login" />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/perfil" element={
        <PrivateRoute>
          <Layout>
            <Perfil />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/admin" element={
        <PrivateRoute>
          <Layout>
            <Admin />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/beneficiario/:id" element={
        <PrivateRoute>
          <Layout>
            <BeneficiarioDetalle />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/pagos" element={
        <PrivateRoute>
          <Layout>
            <Pagos />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/planillas" element={
        <PrivateRoute>
          <Layout>
            <Planillas />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/campamentos" element={
        <PrivateRoute>
          <Layout>
            <Campamentos />
          </Layout>
        </PrivateRoute>
      } />
            <Route path="/auditoria" element={
        <PrivateRoute>
          <Layout>
            <Auditoria />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App