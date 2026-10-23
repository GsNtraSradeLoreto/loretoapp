import { supabase } from './supabase'

/**
 * Lee el año activo (período scout actual) desde configuracion_grupo.
 * Si no hay valor o hay error, devuelve el año del sistema como fallback.
 */
export async function getAnioActivo(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('configuracion_grupo')
      .select('valores_planillas')
      .limit(1)
      .maybeSingle()

    if (error) throw error
    const anio = data?.valores_planillas?.anio_actual
    if (typeof anio === 'number' && anio > 2000 && anio < 2100) {
      return anio
    }
    // Fallback: año del sistema
    return new Date().getFullYear()
  } catch (err) {
    console.error('Error al leer anio_actual:', err)
    return new Date().getFullYear()
  }
}