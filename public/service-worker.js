// ============================================
// Service Worker para LoretApp
// ============================================
// Este archivo hace que la app sea instalable como PWA.
// Chrome lo usa para saber que la app puede funcionar como "app nativa".

const CACHE_NAME = 'loretapp-v1'

// Archivos que se cachean al instalar (para carga rápida)
const ARCHIVOS_INICIALES = [
  '/',
  '/manifest.json',
  '/logo-pwa.png',
  '/logo-grupo.png',
]

// ============================================
// INSTALACIÓN: se ejecuta una vez, cuando el SW se registra por primera vez
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando archivos iniciales')
      return cache.addAll(ARCHIVOS_INICIALES).catch((error) => {
        // Si algún archivo falla, no rompemos todo
        console.warn('[SW] Error cacheando algún archivo:', error)
      })
    })
  )
  
  // Activar inmediatamente sin esperar a que se cierre la pestaña
  self.skipWaiting()
})

// ============================================
// ACTIVACIÓN: limpia cachés viejas
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Borrando caché antigua:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Tomar control inmediato de todas las pestañas abiertas
  self.clients.claim()
})

// ============================================
// FETCH: cómo responder a las peticiones
// ============================================
// Estrategia: "network first" (primero internet, después caché)
// Ideal para apps con Supabase que necesitan datos frescos
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Solo manejar peticiones GET (no POST, PUT, DELETE)
  if (request.method !== 'GET') return
  
  // Ignorar peticiones a Supabase (necesitan internet sí o sí)
  if (request.url.includes('supabase.co')) return
  
  // Ignorar peticiones a otros dominios externos
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si todo va bien, actualizamos el caché
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Si falla el internet, buscamos en caché
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // Si no hay caché, devolvemos un error básico
          return new Response('Sin conexión', {
            status: 503,
            statusText: 'Sin conexión a internet',
            headers: new Headers({
              'Content-Type': 'text/plain; charset=utf-8'
            })
          })
        })
      })
  )
})

console.log('[SW] Service Worker cargado')