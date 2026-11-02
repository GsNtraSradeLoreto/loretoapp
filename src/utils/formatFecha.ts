/**
 * Formatea solo la fecha (dd/mm/aaaa)
 */
export const formatFecha = (fecha: string | null | undefined): string => {
  if (!fecha) return '-'

  // Extraemos solo la parte de fecha (YYYY-MM-DD)
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, anio, mes, dia] = match
    return `${dia}/${mes}/${anio}`
  }

  // Fallback
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatea fecha + hora con formato 24h (dd/mm/aaaa, HH:mm)
 */
export const formatFechaHora = (fecha: string | null | undefined): string => {
  if (!fecha) return '-'

  // CASO 1: Si la fecha ya tiene "-03:00" (fechas nuevas), la mostramos tal cual
  if (fecha.includes('-03:00')) {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (match) {
      const [, anio, mes, dia, hora, minuto] = match
      return `${dia}/${mes}/${anio}, ${hora}:${minuto}`
    }
  }

  // CASO 2: Si la fecha viene sin zona horaria y termina en +00 (fechas viejas corregidas),
  // la mostramos con la hora que está guardada (sin restar 3 horas).
  if (fecha.includes('+00') || fecha.includes('Z')) {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
    if (match) {
      const [, anio, mes, dia, hora, minuto] = match
      return `${dia}/${mes}/${anio}, ${hora}:${minuto}`
    }
  }

  // CASO 3: Fecha sin zona horaria (formato YYYY-MM-DD HH:mm:ss), la mostramos tal cual
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (match) {
    const [, anio, mes, dia, hora, minuto] = match
    return `${dia}/${mes}/${anio}, ${hora}:${minuto}`
  }

  // Fallback para formatos raros
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}