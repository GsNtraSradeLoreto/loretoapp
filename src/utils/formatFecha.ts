/**
 * Formatea solo la fecha (dd/mm/aaaa)
 */
export const formatFecha = (fecha: string | null | undefined): string => {
  if (!fecha) return '-'

  const fechaUTC = fecha.includes('Z') || fecha.includes('+')
    ? fecha
    : fecha + 'Z'

  const d = new Date(fechaUTC)
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
 * SIEMPRE interpreta el input como UTC y lo convierte a hora de Argentina.
 */
export const formatFechaHora = (fecha: string | null | undefined): string => {
  if (!fecha) return '-'

  // Si no tiene zona horaria, la tratamos como UTC
  const fechaUTC = fecha.includes('Z') || fecha.includes('+')
    ? fecha
    : fecha + 'Z'

  const d = new Date(fechaUTC)
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