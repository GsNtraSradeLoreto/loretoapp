import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ============================================
// REGISTRO DEL SERVICE WORKER (PWA)
// ============================================
// Esto hace que la app sea instalable como PWA.
// Solo se registra en producción (no en desarrollo).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope)
      })
      .catch((error) => {
        console.error('❌ Error al registrar Service Worker:', error)
      })
  })
}