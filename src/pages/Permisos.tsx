import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Permiso {
  id: string
  creado_por: string | null
  creado_por_nombre: string | null
  email_jefe: string
  emails_ayudantes: string[] | null
  fecha_salida: string | null
  fecha_llegada: string | null
  provincia: string | null
  ciudad: string | null
  direccion: string | null
  pueblo_cercano: string | null
  jefe_campo: string | null
  estado: string
  creado_en: string
}

type EstadoFiltro = 'todos' | 'pendiente' | 'con_devoluciones' | 'aprobado' | 'cargado'

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bg: string; borde: string; emoji: string }> = {
  pendiente: {
    label: 'Pendiente',
    emoji: '🟡',
    color: '#7A5C00',
    bg: '#FEF3C7',
    borde: '#F5C842'
  },
  con_devoluciones: {
    label: 'Con devoluciones',
    emoji: '🟠',
    color: '#9A3412',
    bg: '#FFEDD5',
    borde: '#FB923C'
  },
  aprobado: {
    label: 'Aprobado',
    emoji: '🟢',
    color: '#166534',
    bg: '#D1FAE5',
    borde: '#86EFAC'
  },
  cargado: {
    label: 'Cargado en SAAC',
    emoji: '⚫',
    color: '#374151',
    bg: '#E5E7EB',
    borde: '#9CA3AF'
  }
}

const formatFecha = (fecha: string | null) => {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Permisos() {
  const navigate = useNavigate()
  const { isSuperAdmin, isJefatura, isAdministrador, getRolData, profile } = useAuth()

  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('todos')
  const [eliminando, setEliminando] = useState<string | null>(null)

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'
  const esAyudante = rolData.tipo === 'ayudante'
  const ramaAsignada = rolData.rama

  // ✅ Permisos de visibilidad
  const verTodos = isSuperAdmin || isJefatura || isAdministrador
  const puedeCrear = esJefe  // Solo jefes de rama pueden crear
  const puedeEliminar = isSuperAdmin || isJefatura  // Solo superadmin y jefatura

  useEffect(() => {
    loadPermisos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPermisos = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('permisos_salida')
        .select('id, creado_por, creado_por_nombre, email_jefe, emails_ayudantes, fecha_salida, fecha_llegada, provincia, ciudad, direccion, pueblo_cercano, jefe_campo, estado, creado_en')
        .order('creado_en', { ascending: false })

      // ✅ Si NO ve todos, solo sus propios permisos
      if (!verTodos && profile?.id) {
        query = query.eq('creado_por', profile.id)
      }

      const { data, error } = await query
      if (error) throw error

      setPermisos(data || [])
    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al cargar los permisos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // ELIMINAR PERMISO (solo superadmin y jefatura)
  // ============================================
  const handleEliminar = async (e: React.MouseEvent, permiso: Permiso) => {
    e.stopPropagation() // Evita que se abra el detalle al hacer click

    const confirmado = window.confirm(
      `⚠️ ¿Eliminar este permiso?\n\n` +
      `Esta acción NO se puede deshacer.\n` +
      `Se borrarán también todos los participantes, transportes y archivos asociados.\n\n` +
      `¿Confirmás?`
    )

    if (!confirmado) return

    setEliminando(permiso.id)
    setMessage({ text: '', type: '' })

    try {
      // 1) Borrar archivos del Storage (si hay)
      const { data: archivos } = await supabase
        .from('permisos_archivos')
        .select('storage_path')
        .eq('permiso_id', permiso.id)

      if (archivos && archivos.length > 0) {
        const paths = archivos
          .map(a => a.storage_path)
          .filter((p): p is string => !!p)

        if (paths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('permisos-programas')
            .remove(paths)

          // Si falla, logueamos pero seguimos con el borrado del permiso
          if (storageError) {
            console.warn('⚠️ No se pudieron borrar algunos archivos del Storage:', storageError)
          }
        }
      }

      // 2) Borrar el permiso (cascade limpia participantes, transportes, archivos)
      const { error: deleteError } = await supabase
        .from('permisos_salida')
        .delete()
        .eq('id', permiso.id)

      if (deleteError) throw deleteError

      // 3) Actualizar la lista local
      setPermisos(permisos.filter(p => p.id !== permiso.id))
      setMessage({ text: '✅ Permiso eliminado', type: 'success' })
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error al eliminar: ${error.message}`, type: 'error' })
    } finally {
      setEliminando(null)
    }
  }

  const permisosFiltrados = permisos.filter(p => {
    if (filtroEstado === 'todos') return true
    return p.estado === filtroEstado
  })

  const contarPorEstado = (estado: string) => permisos.filter(p => p.estado === estado).length

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>
          Cargando permisos...
        </span>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      {/* ENCABEZADO */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: '12px', marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{
            fontWeight: '700', fontSize: 'clamp(18px, 4vw, 24px)',
            color: '#24352A', textTransform: 'uppercase',
            letterSpacing: '1px', margin: 0
          }}>
            📋 Permisos
          </h1>
          <p style={{
            fontSize: 'clamp(11px, 2.5vw, 14px)',
            color: '#7A7364', textTransform: 'uppercase',
            letterSpacing: '0.5px', margin: '4px 0 0 0'
          }}>
            {permisosFiltrados.length} de {permisos.length} permisos
          </p>
        </div>

        {puedeCrear && (
          <button
            onClick={() => navigate('/permisos/nuevo')}
            style={{
              backgroundColor: '#24352A', color: 'white',
              padding: '8px 16px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              fontWeight: '600'
            }}
          >
            + Nuevo Permiso
          </button>
        )}
      </div>

      {message.text && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 13px)', border: '1px solid',
          ...(message.type === 'error' ? {
            backgroundColor: '#FEE2E2', color: '#BF4E30', borderColor: '#FECACA'
          } : {
            backgroundColor: '#D1FAE5', color: '#5C7A5E', borderColor: '#A7F3D0'
          })
        }}>
          {message.text}
        </div>
      )}

      {/* FILTROS POR ESTADO */}
      {permisos.length > 0 && (
        <div style={{
          display: 'flex', gap: '6px', marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Chip "Todos" */}
          <button
            onClick={() => setFiltroEstado('todos')}
            style={{
              padding: '6px 12px',
              fontSize: 'clamp(10px, 2vw, 12px)',
              border: filtroEstado === 'todos' ? '2px solid #24352A' : '2px solid #D1C9B4',
              borderRadius: '20px',
              backgroundColor: filtroEstado === 'todos' ? '#24352A' : 'white',
              color: filtroEstado === 'todos' ? 'white' : '#7A7364',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              fontWeight: '600'
            }}
          >
            Todos ({permisos.length})
          </button>

          {/* Chips por estado */}
          {Object.entries(ESTADOS_CONFIG).map(([key, config]) => {
            const count = contarPorEstado(key)
            if (count === 0) return null

            const isActive = filtroEstado === key

            return (
              <button
                key={key}
                onClick={() => setFiltroEstado(key as EstadoFiltro)}
                style={{
                  padding: '6px 12px',
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  border: `2px solid ${isActive ? config.borde : '#D1C9B4'}`,
                  borderRadius: '20px',
                  backgroundColor: isActive ? config.bg : 'white',
                  color: isActive ? config.color : '#7A7364',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  fontWeight: '600'
                }}
              >
                {config.emoji} {config.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* LISTA DE PERMISOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {permisosFiltrados.map((permiso) => {
          const config = ESTADOS_CONFIG[permiso.estado] || ESTADOS_CONFIG.pendiente
          const ubicacion = [permiso.ciudad, permiso.provincia].filter(Boolean).join(', ') || '-'

          return (
            <div
              key={permiso.id}
              onClick={() => navigate(`/permisos/${permiso.id}`)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '14px',
                border: `2px solid ${config.borde}`,
                borderLeft: `6px solid ${config.borde}`,
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Estado + Creador */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: '10px', marginBottom: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  padding: '3px 12px',
                  borderRadius: '12px',
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: config.bg,
                  color: config.color,
                  border: `1.5px solid ${config.borde}`
                }}>
                  {config.emoji} {config.label}
                </span>

                <span style={{
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  color: '#7A7364'
                }}>
                  {formatFecha(permiso.creado_en)}
                </span>
              </div>

              {/* Fechas */}
              <div style={{
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: '#24352A',
                fontWeight: '600',
                marginBottom: '4px'
              }}>
                📅 {formatFecha(permiso.fecha_salida)} → {formatFecha(permiso.fecha_llegada)}
              </div>

              {/* Ubicación */}
              <div style={{
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                color: '#7A7364',
                marginBottom: '4px'
              }}>
                📍 {ubicacion}
              </div>

              {/* Creador + botón eliminar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'clamp(10px, 2vw, 12px)',
                color: '#A89E86',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px dashed #E8DEC4'
              }}>
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  👤 {permiso.creado_por_nombre || permiso.email_jefe}
                </span>

                {puedeEliminar && (
                  <button
                    onClick={(e) => handleEliminar(e, permiso)}
                    disabled={eliminando === permiso.id}
                    title="Eliminar permiso"
                    style={{
                      background: 'none',
                      border: '1.5px solid #FECACA',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: eliminando === permiso.id ? 'wait' : 'pointer',
                      color: '#BF4E30',
                      fontSize: '13px',
                      fontFamily: 'Oswald, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: eliminando === permiso.id ? 0.5 : 1,
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (eliminando !== permiso.id) {
                        e.currentTarget.style.backgroundColor = '#FEE2E2'
                        e.currentTarget.style.borderColor = '#BF4E30'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = '#FECACA'
                    }}
                  >
                    {eliminando === permiso.id ? '⏳' : '🗑️'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ESTADO VACÍO */}
      {permisosFiltrados.length === 0 && permisos.length > 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          fontFamily: 'Oswald, sans-serif',
          color: '#7A7364',
          fontSize: 'clamp(12px, 2.5vw, 14px)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          No hay permisos con ese filtro
        </div>
      )}

      {permisos.length === 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '2px solid #E8DEC4',
          padding: '48px 20px',
          textAlign: 'center',
          fontFamily: 'Oswald, sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{
            fontSize: 'clamp(14px, 3vw, 16px)',
            color: '#24352A',
            fontWeight: '600',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {puedeCrear ? 'Todavía no creaste ningún permiso' : 'No hay permisos creados'}
          </div>
          {puedeCrear && (
            <>
              <div style={{
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                color: '#7A7364',
                marginBottom: '20px'
              }}>
                Los permisos de acampe/salida se crean desde acá
              </div>
              <button
                onClick={() => navigate('/permisos/nuevo')}
                style={{
                  backgroundColor: '#24352A',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600'
                }}
              >
                + Crear mi primer permiso
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}