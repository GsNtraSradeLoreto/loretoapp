// =============================================
// CÁLCULO DE PROGRESIÓN ACTUAL
// =============================================
// Devuelve el último hito alcanzado según la rama.
// Se usa en Dashboard, VidaScout y donde se necesite.
// =============================================

export interface ProgresionManada {
  fecha_ingreso_manada?: string | null
  fecha_pata_tierna?: string | null
  fecha_saltador?: string | null
  fecha_rastreador?: string | null
  fecha_cazador?: string | null
}

export interface ProgresionUnidad {
  fecha_ingreso_unidad?: string | null
  fecha_pista?: string | null
  fecha_senda?: string | null
  fecha_rumbo?: string | null
  fecha_travesia?: string | null
}

export interface ProgresionCaminantes {
  fecha_ingreso_caminantes?: string | null
  fecha_etapa1?: string | null
  fecha_etapa2?: string | null
  fecha_etapa3?: string | null
  fecha_etapa4?: string | null
}

export interface ProgresionRovers {
  fecha_ingreso_rovers?: string | null
  fecha_encuentro?: string | null
  fecha_compromiso?: string | null
  fecha_proyeccion?: string | null
  fecha_partida?: string | null
}

/**
 * Calcula la progresión actual según la rama y los datos de progresión.
 *
 * Devuelve:
 *  - El último hito con fecha cargada (ej: "Senda", "Cazador")
 *  - "Período Introductorio" si solo tiene fecha_ingreso
 *  - "Sin asignar" si no hay datos
 */
export function calcularProgresionActual(
  rama: string,
  progresiones: {
    manada?: ProgresionManada | null
    unidad?: ProgresionUnidad | null
    caminantes?: ProgresionCaminantes | null
    rovers?: ProgresionRovers | null
  }
): string {
  const { manada, unidad, caminantes, rovers } = progresiones

  if (rama === 'Manada') {
    if (!manada) return 'Sin asignar'
    const hitos = [
      { nombre: 'Pata tierna', fecha: manada.fecha_pata_tierna },
      { nombre: 'Saltador', fecha: manada.fecha_saltador },
      { nombre: 'Rastreador', fecha: manada.fecha_rastreador },
      { nombre: 'Cazador', fecha: manada.fecha_cazador }
    ]
    const conFecha = hitos.filter(h => h.fecha && h.fecha.trim() !== '')
    if (conFecha.length > 0) return conFecha[conFecha.length - 1].nombre
    if (manada.fecha_ingreso_manada) return 'Período Introductorio'
    return 'Sin asignar'
  }

  if (rama === 'Unidad Scout') {
    if (!unidad) return 'Sin asignar'
    const hitos = [
      { nombre: 'Pista', fecha: unidad.fecha_pista },
      { nombre: 'Senda', fecha: unidad.fecha_senda },
      { nombre: 'Rumbo', fecha: unidad.fecha_rumbo },
      { nombre: 'Travesía', fecha: unidad.fecha_travesia }
    ]
    const conFecha = hitos.filter(h => h.fecha && h.fecha.trim() !== '')
    if (conFecha.length > 0) return conFecha[conFecha.length - 1].nombre
    if (unidad.fecha_ingreso_unidad) return 'Período Introductorio'
    return 'Sin asignar'
  }

  if (rama === 'Caminantes') {
    if (!caminantes) return 'Sin asignar'
    const hitos = [
      { nombre: 'Etapa 1', fecha: caminantes.fecha_etapa1 },
      { nombre: 'Etapa 2', fecha: caminantes.fecha_etapa2 },
      { nombre: 'Etapa 3', fecha: caminantes.fecha_etapa3 },
      { nombre: 'Etapa 4', fecha: caminantes.fecha_etapa4 }
    ]
    const conFecha = hitos.filter(h => h.fecha && h.fecha.trim() !== '')
    if (conFecha.length > 0) return conFecha[conFecha.length - 1].nombre
    if (caminantes.fecha_ingreso_caminantes) return 'Período Introductorio'
    return 'Sin asignar'
  }

  if (rama === 'Rovers') {
    if (!rovers) return 'Sin asignar'
    const hitos = [
      { nombre: 'Encuentro', fecha: rovers.fecha_encuentro },
      { nombre: 'Compromiso', fecha: rovers.fecha_compromiso },
      { nombre: 'Proyección', fecha: rovers.fecha_proyeccion },
      { nombre: 'Partida', fecha: rovers.fecha_partida }
    ]
    const conFecha = hitos.filter(h => h.fecha && h.fecha.trim() !== '')
    if (conFecha.length > 0) return conFecha[conFecha.length - 1].nombre
    if (rovers.fecha_ingreso_rovers) return 'Período Introductorio'
    return 'Sin asignar'
  }

  return 'Sin asignar'
}