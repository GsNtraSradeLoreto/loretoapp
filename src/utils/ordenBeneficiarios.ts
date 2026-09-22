// =============================================
// ORDENAMIENTO COMPARTIDO DE BENEFICIARIOS
// =============================================
// Criterio único para Dashboard, BeneficiarioDetalle y VidaScout:
//   1. Activos primero (inactivos al final)
//   2. Rama (Manada → Unidad Scout → Caminantes → Rovers)
//   3. Apellido (A-Z)
//   4. Nombre (A-Z)
// =============================================

export const ORDEN_RAMAS: Record<string, number> = {
  'Manada': 1,
  'Unidad Scout': 2,
  'Caminantes': 3,
  'Rovers': 4
}

export interface BeneficiarioOrdenable {
  nombre: string
  apellido: string
  rama: string
  estado: string
}

/**
 * Ordena beneficiarios con el criterio unificado de LoretApp.
 * Sirve tanto para ordenar arrays completos como para pasar a .sort().
 */
export const ordenarBeneficiarios = <T extends BeneficiarioOrdenable>(
  a: T,
  b: T
): number => {
  // 1) Activos primero
  const aActivo = a.estado === 'activo' ? 0 : 1
  const bActivo = b.estado === 'activo' ? 0 : 1
  if (aActivo !== bActivo) return aActivo - bActivo

  // 2) Rama
  const ordenA = ORDEN_RAMAS[a.rama] || 99
  const ordenB = ORDEN_RAMAS[b.rama] || 99
  if (ordenA !== ordenB) return ordenA - ordenB

  // 3) Apellido
  const cmpApellido = (a.apellido || '').localeCompare(b.apellido || '')
  if (cmpApellido !== 0) return cmpApellido

  // 4) Nombre
  return (a.nombre || '').localeCompare(b.nombre || '')
}

/**
 * Helper: devuelve una copia ordenada del array (no muta el original).
 */
export const ordenarListaBeneficiarios = <T extends BeneficiarioOrdenable>(
  lista: T[]
): T[] => {
  return [...lista].sort(ordenarBeneficiarios)
}