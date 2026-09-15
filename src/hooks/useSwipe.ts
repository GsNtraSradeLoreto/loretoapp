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

  useEffect(() => {
    if (!enabled) return

    // Solo activar en dispositivos táctiles (celulares/tablets)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouchDevice) return

    const handleTouchStart = (e: TouchEvent) => {
      // Ignorar si el toque es en inputs, textareas, selects o botones
      const target = e.target as HTMLElement
      if (
        target.closest('input, textarea, select, button, a') ||
        target.closest('[data-no-swipe]')
      ) {
        return
      }

      const touch = e.touches[0]
      const screenWidth = window.innerWidth
      const x = touch.clientX

      // Ignorar si toca muy cerca de los bordes (para no chocar con gestos del navegador)
      if (x < edgeBuffer || x > screenWidth - edgeBuffer) {
        return
      }

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

      // Si el movimiento vertical es mayor, cancelamos (es un scroll)
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
        isTracking.current = false
        if (onDragEnd) onDragEnd()
        return
      }

      // Si el movimiento vertical es muy grande, cancelamos
      if (Math.abs(deltaY) > maxVerticalMovement) {
        isTracking.current = false
        if (onDragEnd) onDragEnd()
        return
      }

      // Llamamos al callback de drag para la animación
      if (onDrag) {
        onDrag(deltaX)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking.current) {
        if (onDragEnd) onDragEnd()
        return
      }

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current
      const deltaTime = Date.now() - touchStartTime.current

      isTracking.current = false

      // Verificaciones finales
      const cumpleHorizontal = Math.abs(deltaX) > threshold
      const cumpleVertical = Math.abs(deltaY) < maxVerticalMovement
      const cumpleTiempo = deltaTime < 600 // no más de 600ms

      if (cumpleHorizontal && cumpleVertical && cumpleTiempo) {
        if (deltaX < 0 && onSwipeLeft) {
          // Deslizó hacia la izquierda → siguiente
          onSwipeLeft()
        } else if (deltaX > 0 && onSwipeRight) {
          // Deslizó hacia la derecha → anterior
          onSwipeRight()
        }
      }

      // Resetear animación
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