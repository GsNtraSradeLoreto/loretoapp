import { supabase } from './supabase'

interface EnviarEmailParams {
  tipo: 'nuevo_permiso' | 'devolucion' | 'cargado' | 'nueva_inscripcion'
  destinatarios: string[]
  datos: {
    permiso_id?: string
    jefe_nombre?: string
    jefatura_nombre?: string
    fecha_salida?: string
    fecha_llegada?: string
    ubicacion?: string
    comentario?: string
    // Datos de nueva inscripción
    solicitud_id?: string
    menor_nombre?: string
    menor_fecha_nacimiento?: string
    menor_edad?: number
    adulto_email?: string
    adulto_telefono?: string
  }
}

/**
 * Llama a la Edge Function "enviar-email" que envía mails vía Gmail SMTP.
 * NO bloquea si falla — devuelve true/false y loguea el error.
 */
export async function enviarEmail(params: EnviarEmailParams): Promise<boolean> {
  try {
    const destinatariosLimpios = params.destinatarios
      .filter((e): e is string => !!e && e.includes('@'))

    if (destinatariosLimpios.length === 0) {
      console.warn('⚠️ enviarEmail: no hay destinatarios válidos')
      return false
    }

    const { data, error } = await supabase.functions.invoke('enviar-email', {
      body: {
        ...params,
        destinatarios: destinatariosLimpios
      }
    })

    if (error) {
      console.error('❌ Error al enviar email:', error)
      return false
    }

    console.log('✅ Email enviado:', data)
    return true
  } catch (error) {
    console.error('❌ Error inesperado al enviar email:', error)
    return false
  }
}

/**
 * Formatea una fecha ISO a formato argentino corto (DD/MM/YYYY).
 */
export function formatFechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}