import { useEffect, useRef } from 'react'

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Distancia mínima en px para considerar swipe (default 60) */
  threshold?: number
  /** Máximo movimiento vertical permitido en px (default 80) */
  maxVerticalMovement?: number
  /** Ignorar swipes que empiezan en los primeros/últimos N px (default 30) */
  edgeBuffer?: number
  /** Habilitar el gesto (default true) */
  enabled?: boolean
  /** Callback que se llama mientras se arrastra: (deltaX) => void */
  onDrag?: (deltaX: number) => void
  /** Callback al terminar el arrastre (para resetear la animación) */
  onDragEnd?: () => void
}

/**
 * Encuentra el contenedor con scroll horizontal más cercano (si existe)
 */
const encontrarScrollHorizontal = (el: HTMLElement | null): HTMLElement | null => {
  let actual: HTMLElement | null = el
  while (actual && actual !== document.body) {
    const estilo = window.getComputedStyle(actual)
    const overflowX = estilo.overflowX
    if (
      (overflowX === 'auto' || overflowX === 'scroll') &&
      actual.scrollWidth > actual.clientWidth
    ) {
      return actual
    }
    actual = actual.parentElement
  }
  return null
}

/**
 * Devuelve true si el contenedor todavía puede scrollear en la dirección dada.
 * direccion: -1 = deslizar hacia la izquierda (contenido se mueve a la izq)
 *             1 = deslizar hacia la derecha
 */
const puedeScrollearEnDireccion = (el: HTMLElement, direccion: number): boolean => {
  const maxScroll = el.scrollWidth - el.clientWidth
  if (maxScroll <= 1) return false // no tiene scroll
  if (direccion < 0) {
    // deslizar hacia la izquierda → el contenido se mueve hacia la izquierda → aumentamos scrollLeft
    return el.scrollLeft < maxScroll - 1
  } else {
    // deslizar hacia la derecha → volvemos al inicio → reducimos scrollLeft
    return el.scrollLeft > 1
  }
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  maxVerticalMovement = 80,
  edgeBuffer = 30,
  enabled = true,
  onDrag,
  onDragEnd
}: UseSwipeOptions) {
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const isTracking = useRef(false)
  const scrollContainer = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled) return

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouchDevice) return

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement

      // Ignorar si toca inputs, botones, links, selects
      if (
        target.closest('input, textarea, select, button, a') ||
        target.closest('[data-no-swipe]')
      ) {
        return
      }

      const touch = e.touches[0]
      const screenWidth = window.innerWidth
      const x = touch.clientX

      // Ignorar si toca muy cerca de los bordes
      if (x < edgeBuffer || x > screenWidth - edgeBuffer) {
        return
      }

      // ✅ Detectar si está dentro de un contenedor con scroll horizontal
      scrollContainer.current = encontrarScrollHorizontal(target)

      touchStartX.current = x
      touchStartY.current = touch.clientY
      touchStartTime.current = Date.now()
      isTracking.current = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current

      // Si el movimiento vertical es mayor → cancelar
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
        isTracking.current = false
        scrollContainer.current = null
        if (onDragEnd) onDragEnd()
        return
      }

      if (Math.abs(deltaY) > maxVerticalMovement) {
        isTracking.current = false
        scrollContainer.current = null
        if (onDragEnd) onDragEnd()
        return
      }

      // ✅ Si hay un contenedor con scroll y todavía puede scrollear en esa dirección,
      // NO aplicamos el drag visual (dejamos que el navegador scrollee la tabla)
      if (scrollContainer.current && Math.abs(deltaX) > 8) {
        const direccion = deltaX < 0 ? -1 : 1
        if (puedeScrollearEnDireccion(scrollContainer.current, direccion)) {
          return
        }
      }

      if (onDrag) {
        onDrag(deltaX)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking.current) {
        scrollContainer.current = null
        if (onDragEnd) onDragEnd()
        return
      }

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current
      const deltaTime = Date.now() - touchStartTime.current

      isTracking.current = false

      const cumpleHorizontal = Math.abs(deltaX) > threshold
      const cumpleVertical = Math.abs(deltaY) < maxVerticalMovement
      const cumpleTiempo = deltaTime < 1000

      // ✅ Si hay un contenedor con scroll y todavía puede scrollear → NO cambiar de página
      let debeBloquearSwipe = false
      if (scrollContainer.current && cumpleHorizontal) {
        const direccion = deltaX < 0 ? -1 : 1
        if (puedeScrollearEnDireccion(scrollContainer.current, direccion)) {
          debeBloquearSwipe = true
        }
      }

      if (cumpleHorizontal && cumpleVertical && cumpleTiempo && !debeBloquearSwipe) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        }
      }

      scrollContainer.current = null
      if (onDragEnd) onDragEnd()
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, threshold, maxVerticalMovement, edgeBuffer, onSwipeLeft, onSwipeRight, onDrag, onDragEnd])
}