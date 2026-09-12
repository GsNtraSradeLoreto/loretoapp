/**
 * Formatea el nombre de un beneficiario con (H) si tiene hermanos
 * @param nombre - Nombre del beneficiario
 * @param apellido - Apellido del beneficiario
 * @param tieneHermanos - Booleano que indica si tiene hermanos
 * @param formato - 'completo' (apellido, nombre) o 'simple' (nombre apellido)
 * @returns String formateado
 */
export const formatearNombreConH = (
  nombre: string,
  apellido: string,
  tieneHermanos: boolean,
  formato: 'completo' | 'simple' = 'completo'
): string => {
  let nombreCompleto = ''
  
  if (formato === 'completo') {
    nombreCompleto = `${apellido}, ${nombre}`
  } else {
    nombreCompleto = `${nombre} ${apellido}`
  }
  
  if (tieneHermanos) {
    nombreCompleto += ' (H)'
  }
  
  return nombreCompleto
}

/**
 * Obtiene las iniciales de un nombre para el avatar
 */
export const getIniciales = (nombre: string, apellido: string): string => {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
}