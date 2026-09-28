import { supabase } from './supabase'

interface CrearNotificacionParams {
  permiso_id: string
  rama: string | null
  estado_anterior: string | null
  estado_nuevo: string
  creado_por_nombre: string | null
}

/**
 * Inserta una notificación cuando cambia el estado de un permiso.
 * NO bloquea si falla — devuelve true/false y loguea el error.
 */
export async function crearNotificacion(params: CrearNotificacionParams): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('permisos_notificaciones')
      .insert({
        permiso_id: params.permiso_id,
        rama: params.rama,
        estado_anterior: params.estado_anterior,
        estado_nuevo: params.estado_nuevo,
        creado_por_nombre: params.creado_por_nombre,
        visto: false
      })

    if (error) {
      console.error('❌ Error al crear notificación:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Error inesperado al crear notificación:', error)
    return false
  }
}