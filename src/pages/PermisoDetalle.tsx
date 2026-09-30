import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'
import { enviarEmail, formatFechaCorta } from '../lib/enviarEmail'
import { crearNotificacion } from '../lib/notificaciones'

// ============================================
// INTERFACES
// ============================================
interface Permiso {
  id: string
  creado_por: string | null
  creado_por_nombre: string | null
  rama: string | null
  email_jefe: string
  emails_ayudantes: string[] | null
  fecha_salida: string | null
  fecha_llegada: string | null
  es_en_sede: boolean
  provincia: string | null
  ciudad: string | null
  direccion: string | null
  pueblo_cercano: string | null
  propietario_nombre: string | null
  propietario_telefono: string | null
  unidad_sanitaria_nombre: string | null
  unidad_sanitaria_telefono: string | null
  unidad_sanitaria_direccion: string | null
  destacamento_nombre: string | null
  destacamento_telefono: string | null
  destacamento_direccion: string | null
  medio_comunicacion: string | null
  otros_detalles: string | null
  jefe_campo: string | null
  zona_scouts: string | null
  programa_original_url: string | null
  programa_original_nombre: string | null
  programa_original_link_externo: string | null
  programa_devolucion_url: string | null
  programa_devolucion_nombre: string | null
  programa_corregido_url: string | null
  programa_corregido_nombre: string | null
  estado: string
  comentario_jefatura: string | null
  revisado_por: string | null
  revisado_por_nombre: string | null
  revisado_en: string | null
  aprobado_por: string | null
  aprobado_por_nombre: string | null
  aprobado_en: string | null
  cargado_en_saac_en: string | null
  creado_en: string
  actualizado_en: string
}

interface Participante {
  id: string
  tipo: string
  nombre_libre: string | null
  beneficiario_id: string | null
  beneficiarios: {
    nombre: string
    apellido: string
    rama: string
    tiene_hermanos: boolean
  }[] | null
}

interface Transporte {
  id: string
  tipo: string
  razon_social: string | null
  direccion: string | null
  telefono: string | null
  nro_habilitacion: string | null
  vehiculo_tipo: string | null
  vehiculo_marca: string | null
  vehiculo_modelo: string | null
  vehiculo_patente: string | null
}

interface Archivo {
  id: string
  tipo: 'original' | 'devolucion' | 'corregido'
  storage_path: string | null
  nombre_archivo: string | null
  link_externo: string | null
  subido_por_nombre: string | null
  comentario: string | null
  creado_en: string
}
// ============================================
// DESTINATARIOS FIJOS (siempre reciben copia)
// ============================================
const EMAILS_COPIA_FIJA = [
  'grupo117@scouts.org.ar',
  'facundofruman@gmail.com'
]

// ============================================
// CONFIG DE ESTADOS
// ============================================
const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; borde: string; emoji: string }> = {
  pendiente: { label: 'Pendiente', emoji: '🟡', color: '#7A5C00', bg: '#FEF3C7', borde: '#F5C842' },
  con_devoluciones: { label: 'Con devoluciones', emoji: '🟠', color: '#9A3412', bg: '#FFEDD5', borde: '#FB923C' },
  aprobado: { label: 'Aprobado', emoji: '🟢', color: '#166534', bg: '#D1FAE5', borde: '#86EFAC' },
  cargado: { label: 'Cargado en SAAC', emoji: '⚫', color: '#374151', bg: '#E5E7EB', borde: '#9CA3AF' }
}

const TIPO_ARCHIVO_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; borde: string }> = {
  original: { label: 'Original', emoji: '⚪', color: '#374151', bg: '#F3F4F6', borde: '#9CA3AF' },
  devolucion: { label: 'Devolución', emoji: '🟠', color: '#9A3412', bg: '#FFEDD5', borde: '#FB923C' },
  corregido: { label: 'Corregido', emoji: '🟢', color: '#166534', bg: '#D1FAE5', borde: '#86EFAC' }
}

// ============================================
// HELPERS
// ============================================
const formatFecha = (fecha: string | null) => {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatFechaHora = (fecha: string | null) => {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ============================================
// COMPONENTE
// ============================================
export default function PermisoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile, isSuperAdmin, isJefatura, isAdministrador } = useAuth()

  const [permiso, setPermiso] = useState<Permiso | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [transportes, setTransportes] = useState<Transporte[]>([])
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [seccionActiva, setSeccionActiva] = useState<'ninguna' | 'devolucion'>('ninguna')

  const [archivoDevolucion, setArchivoDevolucion] = useState<File | null>(null)
  const [comentarioGeneral, setComentarioGeneral] = useState('')
  const [comentarioArchivo, setComentarioArchivo] = useState('')

  const esCreador = permiso?.creado_por === profile?.id
  const puedeRevisar = isSuperAdmin || isJefatura || isAdministrador
  const puedeEditar =
    (esCreador && (permiso?.estado === 'pendiente' || permiso?.estado === 'con_devoluciones')) ||
    puedeRevisar

  // ============================================
  // CARGA DE DATOS
  // ============================================
  useEffect(() => {
    if (id) loadPermiso()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadPermiso = async () => {
    try {
      setLoading(true)

      const [permisoRes, participantesRes, transportesRes, archivosRes] = await Promise.all([
        supabase.from('permisos_salida').select('*').eq('id', id).single(),
        supabase
          .from('permisos_participantes')
          .select('id, tipo, nombre_libre, beneficiario_id')
          .eq('permiso_id', id),
        supabase.from('permisos_transportes').select('*').eq('permiso_id', id),
        supabase
          .from('permisos_archivos')
          .select('*')
          .eq('permiso_id', id)
          .order('creado_en', { ascending: true })
      ])

      if (permisoRes.error) throw permisoRes.error
      if (participantesRes.error) throw participantesRes.error
      if (transportesRes.error) throw transportesRes.error
      if (archivosRes.error) throw archivosRes.error

      // Query separada para traer los beneficiarios
      const participantesData = participantesRes.data || []
      const idsBeneficiarios = participantesData
        .map(p => p.beneficiario_id)
        .filter((id): id is string => !!id)

      let beneficiariosMap: Record<string, any> = {}

      if (idsBeneficiarios.length > 0) {
        const { data: beneficiariosData, error: benefError } = await supabase
          .from('beneficiarios')
          .select('id, nombre, apellido, rama, tiene_hermanos')
          .in('id', idsBeneficiarios)

        if (benefError) {
          console.error('⚠️ Error al traer beneficiarios:', benefError)
        } else {
          beneficiariosMap = (beneficiariosData || []).reduce((acc, b) => {
            acc[b.id] = b
            return acc
          }, {} as Record<string, any>)
        }
      }

      const participantesConBenef = participantesData.map(p => ({
        ...p,
        beneficiarios: p.beneficiario_id && beneficiariosMap[p.beneficiario_id]
          ? [beneficiariosMap[p.beneficiario_id]]
          : null
      }))

      // ✅ Ordenar: beneficiarios primero (por apellido), después adultos (por nombre)
      const participantesOrdenados = [...participantesConBenef].sort((a, b) => {
        // Beneficiarios primero, adultos después
        if (a.tipo !== b.tipo) {
          if (a.tipo === 'beneficiario') return -1
          if (b.tipo === 'beneficiario') return 1
        }

        // Dentro de beneficiarios: ordenar por apellido → nombre
        if (a.tipo === 'beneficiario') {
          const bA = a.beneficiarios?.[0]
          const bB = b.beneficiarios?.[0]
          if (bA && bB) {
            const cmpApellido = bA.apellido.localeCompare(bB.apellido, 'es', { sensitivity: 'base' })
            if (cmpApellido !== 0) return cmpApellido
            return bA.nombre.localeCompare(bB.nombre, 'es', { sensitivity: 'base' })
          }
        }

        // Dentro de adultos: ordenar por nombre libre
        if (a.tipo === 'adulto') {
          const nombreA = a.nombre_libre || ''
          const nombreB = b.nombre_libre || ''
          return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' })
        }

        return 0
      })

      setPermiso(permisoRes.data)
      setParticipantes(participantesOrdenados)
      setTransportes(transportesRes.data || [])
      setArchivos(archivosRes.data || [])
      setComentarioGeneral(permisoRes.data.comentario_jefatura || '')
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error al cargar: ${error.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // HANDLERS
  // ============================================
  const handleDescargarArchivo = async (archivo: Archivo) => {
    // Si es un link externo, abrirlo directo (no se puede forzar el nombre)
    if (!archivo.storage_path && archivo.link_externo) {
      window.open(archivo.link_externo, '_blank')
      return
    }

    if (!archivo.storage_path) return

    try {
      // 1) Obtener la URL pública del archivo en el bucket
      const { data } = supabase.storage
        .from('permisos-programas')
        .getPublicUrl(archivo.storage_path)

      const url = data.publicUrl

      // 2) Descargar como blob (para poder forzar el nombre)
      const response = await fetch(url)
      if (!response.ok) throw new Error('No se pudo descargar el archivo')

      const blob = await response.blob()

      // 3) Armar el nombre final: preferimos el original
      const nombreOriginal = archivo.nombre_archivo || 'archivo'
      const extStorage = archivo.storage_path.split('.').pop() || ''
      const tieneExtension = /\.[a-z0-9]+$/i.test(nombreOriginal)
      const nombreFinal = tieneExtension
        ? nombreOriginal
        : extStorage
          ? `${nombreOriginal}.${extStorage}`
          : nombreOriginal

      // 4) Crear un link invisible y simular click
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = nombreFinal
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // 5) Limpiar el blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (error: any) {
      console.error('Error al descargar:', error)
      // Fallback: si falla el fetch, abrir en pestaña nueva
      const { data } = supabase.storage
        .from('permisos-programas')
        .getPublicUrl(archivo.storage_path)
      window.open(data.publicUrl, '_blank')
    }
  }

  const handleSubirDevolucion = async () => {
    if (!archivoDevolucion) {
      setMessage({ text: '⚠️ Tenés que subir un archivo', type: 'warning' })
      return
    }
    if (!permiso) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const ext = archivoDevolucion.name.split('.').pop()
      const fileName = `devolucion-${Date.now()}.${ext}`
      const filePath = `${permiso.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('permisos-programas')
        .upload(filePath, archivoDevolucion, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('permisos-programas')
        .getPublicUrl(filePath)

      const nombreCompleto = profile ? `${profile.nombre} ${profile.apellido || ''}`.trim() : null

      const { error: archivoError } = await supabase
        .from('permisos_archivos')
        .insert({
          permiso_id: permiso.id,
          tipo: 'devolucion',
          storage_path: filePath,
          nombre_archivo: archivoDevolucion.name,
          comentario: comentarioArchivo || null,
          subido_por: profile?.id,
          subido_por_nombre: nombreCompleto
        })

      if (archivoError) throw archivoError

      const { error: updateError } = await supabase
        .from('permisos_salida')
        .update({
          estado: 'con_devoluciones',
          comentario_jefatura: comentarioGeneral || null,
          revisado_por: profile?.id,
          revisado_por_nombre: nombreCompleto,
          revisado_en: new Date().toISOString(),
          programa_devolucion_url: publicUrl,
          programa_devolucion_nombre: archivoDevolucion.name
        })
        .eq('id', permiso.id)

      if (updateError) throw updateError

      // Enviar mail
      try {
        const destinatarios = [
          permiso.email_jefe,
          ...(permiso.emails_ayudantes || []),
          ...EMAILS_COPIA_FIJA
        ].filter((e): e is string => !!e)

        // ✅ Eliminar duplicados (por si alguno ya estaba)
        const destinatariosUnicos = Array.from(new Set(destinatarios))

        if (destinatariosUnicos.length > 0) {
          await enviarEmail({
            tipo: 'devolucion',
            destinatarios: destinatariosUnicos,
            datos: {
              permiso_id: permiso.id,
              jefatura_nombre: nombreCompleto || 'Jefatura',
              comentario: comentarioGeneral || undefined
            }
          })
        }
      } catch (mailError) {
        console.error('⚠️ Error al enviar mail de devolución:', mailError)
      }

      // Crear notificación
      await crearNotificacion({
        permiso_id: permiso.id,
        rama: permiso.rama,
        estado_anterior: 'pendiente',
        estado_nuevo: 'con_devoluciones',
        creado_por_nombre: nombreCompleto
      })

      setMessage({ text: '✅ Devolución enviada', type: 'success' })
      setSeccionActiva('ninguna')
      setArchivoDevolucion(null)
      setComentarioArchivo('')
      await loadPermiso()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAprobar = async () => {
    if (!permiso) return
    if (!window.confirm('¿Aprobar este permiso?')) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const nombreCompleto = profile ? `${profile.nombre} ${profile.apellido || ''}`.trim() : null

      const { error } = await supabase
        .from('permisos_salida')
        .update({
          estado: 'aprobado',
          aprobado_por: profile?.id,
          aprobado_por_nombre: nombreCompleto,
          aprobado_en: new Date().toISOString()
        })
        .eq('id', permiso.id)

      if (error) throw error

      await crearNotificacion({
        permiso_id: permiso.id,
        rama: permiso.rama,
        estado_anterior: permiso.estado,
        estado_nuevo: 'aprobado',
        creado_por_nombre: nombreCompleto
      })

      setMessage({ text: '✅ Permiso aprobado', type: 'success' })
      await loadPermiso()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleMarcarCargado = async () => {
    if (!permiso) return
    if (!window.confirm('¿Marcar como cargado en SAAC?')) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('permisos_salida')
        .update({
          estado: 'cargado',
          cargado_en_saac_en: new Date().toISOString()
        })
        .eq('id', permiso.id)

      if (error) throw error

      // Enviar mail
      try {
        const destinatarios = [
          permiso.email_jefe,
          ...(permiso.emails_ayudantes || []),
          ...EMAILS_COPIA_FIJA
        ].filter((e): e is string => !!e)

        // ✅ Eliminar duplicados
        const destinatariosUnicos = Array.from(new Set(destinatarios))

        if (destinatariosUnicos.length > 0) {
          await enviarEmail({
            tipo: 'cargado',
            destinatarios: destinatariosUnicos,
            datos: {
              permiso_id: permiso.id,
              fecha_salida: formatFechaCorta(permiso.fecha_salida)
            }
          })
        }
      } catch (mailError) {
        console.error('⚠️ Error al enviar mail de cargado:', mailError)
      }

      await crearNotificacion({
        permiso_id: permiso.id,
        rama: permiso.rama,
        estado_anterior: 'aprobado',
        estado_nuevo: 'cargado',
        creado_por_nombre: profile ? `${profile.nombre} ${profile.apellido || ''}`.trim() : null
      })

      setMessage({ text: '✅ Marcado como cargado', type: 'success' })
      await loadPermiso()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleReabrir = async () => {
    if (!permiso) return
    if (!window.confirm('¿Reabrir este permiso? Volverá a estado pendiente.')) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('permisos_salida')
        .update({ estado: 'pendiente' })
        .eq('id', permiso.id)

      if (error) throw error

      setMessage({ text: '↩️ Permiso reabierto', type: 'success' })
      await loadPermiso()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // LOADING / ERROR
  // ============================================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>
          Cargando permiso...
        </span>
      </div>
    )
  }

  if (!permiso) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Oswald, sans-serif', color: '#BF4E30' }}>
        ⚠️ No se encontró el permiso
      </div>
    )
  }

  const config = ESTADOS_CONFIG[permiso.estado] || ESTADOS_CONFIG.pendiente
  const ubicacion = [permiso.ciudad, permiso.provincia].filter(Boolean).join(', ') || '-'

  const beneficiarios = participantes.filter(p => p.tipo === 'beneficiario')
  const adultos = participantes.filter(p => p.tipo === 'adulto')

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '16px', flexWrap: 'wrap'
      }}>
        <button
          onClick={() => navigate('/permisos')}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', color: '#7A7364',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            padding: '4px 0'
          }}
        >
          ← Volver
        </button>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: '12px', marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(18px, 4vw, 24px)',
            color: '#24352A', textTransform: 'uppercase',
            letterSpacing: '1px', margin: 0, fontWeight: '700'
          }}>
            📋 PERMISO DE SALIDA/CAMPAMENTO
          </h1>
          <p style={{
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            color: '#7A7364', margin: '4px 0 0 0'
          }}>
            Creado por {permiso.creado_por_nombre || permiso.email_jefe} el {formatFecha(permiso.creado_en)}
          </p>
        </div>

        <span style={{
          padding: '6px 14px',
          borderRadius: '12px',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          backgroundColor: config.bg,
          color: config.color,
          border: `2px solid ${config.borde}`
        }}>
          {config.emoji} {config.label}
        </span>
      </div>

      {message.text && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 13px)', border: '1px solid',
          ...(message.type === 'error' ? {
            backgroundColor: '#FEE2E2', color: '#BF4E30', borderColor: '#FECACA'
          } : message.type === 'warning' ? {
            backgroundColor: '#FEF3C7', color: '#C48A2A', borderColor: '#FDE68A'
          } : {
            backgroundColor: '#D1FAE5', color: '#5C7A5E', borderColor: '#A7F3D0'
          })
        }}>
          {message.text}
        </div>
      )}

      {permiso.comentario_jefatura && (
        <div style={{
          backgroundColor: '#FFEDD5',
          border: '2px solid #FB923C',
          borderLeft: '6px solid #FB923C',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#9A3412',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            🟠 Comentario de jefatura
          </div>
          <div style={{
            fontSize: '13px',
            color: '#24352A',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5
          }}>
            {permiso.comentario_jefatura}
          </div>
          {permiso.revisado_por_nombre && permiso.revisado_en && (
            <div style={{
              fontSize: '10px',
              color: '#9A3412',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              Revisado por {permiso.revisado_por_nombre} el {formatFechaHora(permiso.revisado_en)}
            </div>
          )}
        </div>
      )}

      {/* PANEL DE ACCIONES (STICKY) */}
      <div style={{
        position: 'sticky',
        top: '76px',
        zIndex: 5,
        backgroundColor: 'white',
        border: '2px solid #E8DEC4',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '16px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>

        {puedeRevisar && permiso.estado === 'pendiente' && (
          <button
            onClick={() => setSeccionActiva(seccionActiva === 'devolucion' ? 'ninguna' : 'devolucion')}
            style={botonAccionStyle('#C48A2A')}
            disabled={saving}
          >
            📝 Dar devolución
          </button>
        )}

        {puedeRevisar && (permiso.estado === 'pendiente' || permiso.estado === 'con_devoluciones') && (
          <button
            onClick={handleAprobar}
            style={botonAccionStyle('#24352A')}
            disabled={saving}
          >
            ✅ Aprobar
          </button>
        )}

        {puedeRevisar && permiso.estado === 'aprobado' && (
          <button
            onClick={handleMarcarCargado}
            style={botonAccionStyle('#374151')}
            disabled={saving}
          >
            ⚫ Marcar cargado en SAAC
          </button>
        )}

        {puedeRevisar && permiso.estado !== 'pendiente' && (
          <button
            onClick={handleReabrir}
            style={botonAccionStyle('#7A7364')}
            disabled={saving}
          >
            ↩️ Reabrir
          </button>
        )}

        {!puedeEditar && !puedeRevisar && (
          <div style={{
            fontSize: '12px',
            color: '#7A7364',
            fontStyle: 'italic',
            padding: '8px'
          }}>
            No tenés acciones disponibles para este permiso
          </div>
        )}
      </div>

      {/* SECCIÓN INLINE: DAR DEVOLUCIÓN */}
      {seccionActiva === 'devolucion' && puedeRevisar && (
        <div style={{
          backgroundColor: '#FFFBF5',
          border: '2px solid #FB923C',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#9A3412',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '14px',
            paddingBottom: '10px',
            borderBottom: '2px dashed #FB923C'
          }}>
            📝 Dar devolución
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Word de devolución *</label>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '12px',
              border: '2px dashed #FB923C', borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: archivoDevolucion ? '#FFEDD5' : '#FAF8F4',
              fontSize: '12px', color: archivoDevolucion ? '#9A3412' : '#7A7364',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {archivoDevolucion ? `📄 ${archivoDevolucion.name}` : '📎 Seleccionar archivo'}
              <input
                type="file"
                accept=".doc,.docx,.pdf,.odt"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      setMessage({ text: '⚠️ El archivo no debe superar 10 MB', type: 'warning' })
                      return
                    }
                    setArchivoDevolucion(file)
                    setMessage({ text: '', type: '' })
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
            {archivoDevolucion && (
              <button
                type="button"
                onClick={() => setArchivoDevolucion(null)}
                style={{
                  marginTop: '6px', background: 'none', border: 'none',
                  cursor: 'pointer', color: '#BF4E30',
                  fontSize: '11px', fontFamily: 'Oswald, sans-serif',
                  textDecoration: 'underline'
                }}
              >
                ✕ Quitar archivo
              </button>
            )}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Comentario general (se muestra arriba del permiso)</label>
            <textarea
              value={comentarioGeneral}
              onChange={(e) => setComentarioGeneral(e.target.value)}
              placeholder="Ej: Corregir horarios del sábado, agregar actividad de cierre..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Comentario del archivo (opcional)</label>
            <input
              type="text"
              value={comentarioArchivo}
              onChange={(e) => setComentarioArchivo(e.target.value)}
              placeholder="Ej: Versión con correcciones marcadas en rojo"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setSeccionActiva('ninguna')
                setArchivoDevolucion(null)
                setComentarioArchivo('')
              }}
              disabled={saving}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: '#E8DEC4',
                color: '#24352A',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600',
                opacity: saving ? 0.5 : 1
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubirDevolucion}
              disabled={saving}
              style={{
                flex: 2,
                padding: '10px 16px',
                backgroundColor: '#C48A2A',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'wait' : 'pointer',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Enviando...' : '💾 Enviar devolución'}
            </button>
          </div>
        </div>
      )}

      {/* SECCIÓN 0: HISTORIAL DE ARCHIVOS */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>📎 Historial de Archivos ({archivos.length})</div>

        {archivos.length === 0 ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#7A7364',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            No hay archivos cargados
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {archivos.map((a) => {
              const tipoConfig = TIPO_ARCHIVO_CONFIG[a.tipo] || TIPO_ARCHIVO_CONFIG.original
              return (
                <div key={a.id} style={{
                  backgroundColor: tipoConfig.bg,
                  border: `2px solid ${tipoConfig.borde}`,
                  borderRadius: '10px',
                  padding: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: tipoConfig.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {tipoConfig.emoji} {tipoConfig.label}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      color: tipoConfig.color,
                      fontStyle: 'italic'
                    }}>
                      {formatFechaHora(a.creado_en)}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '13px',
                    color: '#24352A',
                    marginBottom: '6px',
                    wordBreak: 'break-word'
                  }}>
                    📄 {a.nombre_archivo || 'Archivo'}
                  </div>

                  {a.subido_por_nombre && (
                    <div style={{
                      fontSize: '11px',
                      color: tipoConfig.color,
                      marginBottom: '6px'
                    }}>
                      👤 Subido por {a.subido_por_nombre}
                    </div>
                  )}

                  {a.comentario && (
                    <div style={{
                      fontSize: '12px',
                      color: '#24352A',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.4
                    }}>
                      💬 {a.comentario}
                    </div>
                  )}

                  <button
                    onClick={() => handleDescargarArchivo(a)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: tipoConfig.color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600'
                    }}
                  >
                    📥 Descargar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 1: HORARIOS */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>📅 Horarios</div>
        <div style={gridStyle}>
          <div>
            <div style={labelStyle}>Salida</div>
            <div style={valorStyle}>{formatFechaHora(permiso.fecha_salida)}</div>
          </div>
          <div>
            <div style={labelStyle}>Llegada</div>
            <div style={valorStyle}>{formatFechaHora(permiso.fecha_llegada)}</div>
          </div>
        </div>
        {permiso.es_en_sede && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#F0F7F0',
            border: '1px solid #B8D4B8',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#5C7A5E',
            textAlign: 'center',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🏠 El campamento/salida es en la sede del grupo
          </div>
        )}
      </div>

      {/* SECCIÓN 2: UBICACIÓN */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>📍 Ubicación</div>
        <div style={gridStyle}>
          <div>
            <div style={labelStyle}>Provincia</div>
            <div style={valorStyle}>{permiso.provincia || '-'}</div>
          </div>
          <div>
            <div style={labelStyle}>Ciudad</div>
            <div style={valorStyle}>{permiso.ciudad || '-'}</div>
          </div>
          <div>
            <div style={labelStyle}>Dirección</div>
            <div style={valorStyle}>{permiso.direccion || '-'}</div>
          </div>
          <div>
            <div style={labelStyle}>Pueblo cercano</div>
            <div style={valorStyle}>{permiso.pueblo_cercano || '-'}</div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: PROPIETARIO */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>👤 Datos del Propietario</div>
        <div style={gridStyle}>
          <div>
            <div style={labelStyle}>Nombre y apellido</div>
            <div style={valorStyle}>{permiso.propietario_nombre || '-'}</div>
          </div>
          <div>
            <div style={labelStyle}>Teléfono</div>
            <div style={valorStyle}>{permiso.propietario_telefono || '-'}</div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: EMERGENCIAS */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>🚨 Emergencias</div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{
            fontSize: '11px', color: '#7A7364',
            marginBottom: '8px',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            Unidad Sanitaria
          </div>
          <div style={gridStyle}>
            <div>
              <div style={labelStyle}>Nombre</div>
              <div style={valorStyle}>{permiso.unidad_sanitaria_nombre || '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Teléfono</div>
              <div style={valorStyle}>{permiso.unidad_sanitaria_telefono || '-'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Dirección</div>
              <div style={valorStyle}>{permiso.unidad_sanitaria_direccion || '-'}</div>
            </div>
          </div>
        </div>

        <div>
          <div style={{
            fontSize: '11px', color: '#7A7364',
            marginBottom: '8px',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            Destacamento Policial
          </div>
          <div style={gridStyle}>
            <div>
              <div style={labelStyle}>Nombre</div>
              <div style={valorStyle}>{permiso.destacamento_nombre || '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Teléfono</div>
              <div style={valorStyle}>{permiso.destacamento_telefono || '-'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Dirección</div>
              <div style={valorStyle}>{permiso.destacamento_direccion || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 5: CONTACTOS */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>📞 Contactos</div>
        <div style={gridStyle}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={labelStyle}>Medio de comunicación</div>
            <div style={valorStyle}>{permiso.medio_comunicacion || '-'}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={labelStyle}>Jefe de Campo</div>
            <div style={valorStyle}>{permiso.jefe_campo || '-'}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={labelStyle}>Zona Scouts</div>
            <div style={valorStyle}>{permiso.zona_scouts || '-'}</div>
          </div>
          {permiso.otros_detalles && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={labelStyle}>Otros detalles</div>
              <div style={{ ...valorStyle, whiteSpace: 'pre-wrap' }}>{permiso.otros_detalles}</div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 6: EMAILS DEL JEFE */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>📧 Emails de Contacto</div>
        <div style={{ marginBottom: '12px' }}>
          <div style={labelStyle}>Jefe de rama</div>
          <div style={valorStyle}>{permiso.email_jefe || '-'}</div>
        </div>
        {permiso.emails_ayudantes && permiso.emails_ayudantes.length > 0 && (
          <div>
            <div style={labelStyle}>Ayudantes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {permiso.emails_ayudantes.map((email) => (
                <div key={email} style={valorStyle}>📧 {email}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 7: PARTICIPANTES */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>
          👥 Participantes ({beneficiarios.length + adultos.length})
        </div>

        {beneficiarios.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '11px', color: '#7A7364',
              marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Beneficiarios ({beneficiarios.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {beneficiarios.map((p) => {
                const b = p.beneficiarios?.[0] || null
                const nombre = b
                  ? formatearNombreConH(b.nombre, b.apellido, b.tiene_hermanos)
                  : '(beneficiario eliminado)'
                return (
                  <div key={p.id} style={{
                    padding: '8px 12px',
                    backgroundColor: '#FAF8F4',
                    border: '1px solid #E8DEC4',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#24352A',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span>👤 {nombre}</span>
                    {b?.rama && (
                      <span style={{
                        fontSize: '10px',
                        color: '#7A7364',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {b.rama}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {adultos.length > 0 && (
          <div>
            <div style={{
              fontSize: '11px', color: '#7A7364',
              marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Adultos ({adultos.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {adultos.map((p) => (
                <div key={p.id} style={{
                  padding: '8px 12px',
                  backgroundColor: '#FAF8F4',
                  border: '1px solid #E8DEC4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#24352A'
                }}>
                  👤 {p.nombre_libre || '-'}
                </div>
              ))}
            </div>
          </div>
        )}

        {beneficiarios.length === 0 && adultos.length === 0 && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#7A7364',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            No hay participantes cargados
          </div>
        )}
      </div>

      {/* SECCIÓN 8: TRANSPORTES */}
      <div style={seccionStyle}>
        <div style={seccionHeaderStyle}>🚗 Transportes ({transportes.length})</div>

        {transportes.length === 0 ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#7A7364',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            No hay transportes cargados
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transportes.map((t) => (
              <div key={t.id} style={{
                backgroundColor: '#FAF8F4',
                border: '2px solid #D1C9B4',
                borderRadius: '10px',
                padding: '12px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#24352A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px dashed #D1C9B4'
                }}>
                  {t.tipo === 'publico' ? '🚌 Transporte contratado' : '🚗 Vehículo propio'}
                </div>

                {t.tipo === 'publico' ? (
                  <div style={gridStyle}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={labelStyle}>Razón Social</div>
                      <div style={valorStyle}>{t.razon_social || '-'}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={labelStyle}>Dirección</div>
                      <div style={valorStyle}>{t.direccion || '-'}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Teléfono</div>
                      <div style={valorStyle}>{t.telefono || '-'}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>N° Habilitación</div>
                      <div style={valorStyle}>{t.nro_habilitacion || '-'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={gridStyle}>
                    <div>
                      <div style={labelStyle}>Tipo</div>
                      <div style={valorStyle}>{t.vehiculo_tipo || '-'}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Marca</div>
                      <div style={valorStyle}>{t.vehiculo_marca || '-'}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Modelo</div>
                      <div style={valorStyle}>{t.vehiculo_modelo || '-'}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Patente</div>
                      <div style={valorStyle}>{t.vehiculo_patente || '-'}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '40px' }} />
    </div>
  )
}

// ============================================
// ESTILOS
// ============================================
const seccionStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '16px',
  border: '2px solid #E8DEC4',
  padding: '16px',
  marginBottom: '16px'
}

const seccionHeaderStyle: React.CSSProperties = {
  fontSize: 'clamp(13px, 3vw, 15px)',
  fontWeight: '700',
  color: '#24352A',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  paddingBottom: '10px',
  marginBottom: '14px',
  borderBottom: '2px dashed #E8DEC4'
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#7A7364',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
  fontWeight: '600'
}

const valorStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#24352A',
  lineHeight: 1.4
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '2px solid #D1C9B4',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  boxSizing: 'border-box',
  backgroundColor: 'white'
}

function botonAccionStyle(color: string): React.CSSProperties {
  return {
    padding: '8px 14px',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'Oswald, sans-serif',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  }
}