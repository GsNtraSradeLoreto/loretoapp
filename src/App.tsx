import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'

// ✅ Lazy loading de las páginas
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Admin = lazy(() => import('./pages/Admin'))
const BeneficiarioDetalle = lazy(() => import('./pages/BeneficiarioDetalle'))
const Pagos = lazy(() => import('./pages/Pagos'))
const Planillas = lazy(() => import('./pages/Planillas'))
const Campamentos = lazy(() => import('./pages/Campamentos'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const VidaScout = lazy(() => import('./pages/VidaScout'))
const Formacion = lazy(() => import('./pages/Formacion'))

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

// ✅ Loader que se muestra mientras carga cada página
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '48px 0',
      minHeight: '200px'
    }}>
      <div style={{
        fontFamily: 'Oswald, sans-serif',
        color: '#7A7364',
        fontSize: '14px',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        Cargando...
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/beneficiario/:id/vida-scout" element={
          <PrivateRoute>
            <Layout>
              <VidaScout />
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
        <Route path="/formacion" element={
          <PrivateRoute>
            <Layout>
              <Formacion />
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
    </Suspense>
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