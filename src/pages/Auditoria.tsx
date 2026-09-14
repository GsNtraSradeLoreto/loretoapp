import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface AuditRow {
  id: number
  usuario_id: string | null
  usuario_nombre: string | null
  usuario_rol: string | null
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  entidad: string
  entidad_id: string | null
  beneficiario_id: string | null
  descripcion: string
  datos_anteriores: any
  datos_nuevos: any
  created_at: string
}

const ENTIDADES = [
  { value: '', label: 'Todas las entidades' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'legajos', label: 'Legajos' },
  { value: 'campamentos', label: 'Campamentos' },
  { value: 'campamentos_asistidos', label: 'Asistencia a campamentos' },
  { value: 'beneficiarios', label: 'Beneficiarios' },
  { value: 'progresion_manada', label: 'Progresión Manada' },
  { value: 'progresion_unidad', label: 'Progresión Unidad' },
  { value: 'progresion_caminantes', label: 'Progresión Caminantes' },
  { value: 'progresion_rovers', label: 'Progresión Rovers' },
]

const ACCIONES = [
  { value: '', label: 'Todas las acciones' },
  { value: 'INSERT', label: 'Creaciones' },
  { value: 'UPDATE', label: 'Ediciones' },
  { value: 'DELETE', label: 'Eliminaciones' },
]

const PAGE_SIZE = 50

export default function Auditoria() {
  const { isSuperAdmin, isJefatura } = useAuth()

  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hayMas, setHayMas] = useState(false)

  // Filtros
  const [filtroEntidad, setFiltroEntidad] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Modal detalle
  const [detalle, setDetalle] = useState<AuditRow | null>(null)

  // Lista de usuarios únicos (para el filtro)
  const [usuariosUnicos, setUsuariosUnicos] = useState<string[]>([])

  // Selección para borrado masivo (solo Super Admin)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())

  // Confirmación de borrado
  const [confirmarBorrado, setConfirmarBorrado] = useState<
    { tipo: 'uno'; id: number } | { tipo: 'varios' } | null
  >(null)
  const [borrando, setBorrando] = useState(false)

  // Novedades (para el banner)
  const [novedades, setNovedades] = useState(0)
  const [mostrarBanner, setMostrarBanner] = useState(false)
  const yaMarcoVisto = useRef(false)

  const buildQuery = (desde: number, hasta: number) => {
    let q = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(desde, hasta)

    if (filtroEntidad) q = q.eq('entidad', filtroEntidad)
    if (filtroAccion) q = q.eq('accion', filtroAccion)
    if (filtroUsuario) q = q.eq('usuario_nombre', filtroUsuario)
    if (busqueda) q = q.ilike('descripcion', `%${busqueda}%`)
    if (fechaDesde) q = q.gte('created_at', fechaDesde + 'T00:00:00')
    if (fechaHasta) q = q.lte('created_at', fechaHasta + 'T23:59:59')

    return q
  }

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await buildQuery(0, PAGE_SIZE - 1)
      if (error) throw error
      setRows(data || [])
      setHayMas((data || []).length === PAGE_SIZE)
      setSeleccionados(new Set())
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }

  const cargarMas = async () => {
    try {
      const { data, error } = await buildQuery(rows.length, rows.length + PAGE_SIZE - 1)
      if (error) throw error
      setRows(prev => [...prev, ...(data || [])])
      setHayMas((data || []).length === PAGE_SIZE)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error al cargar más registros')
    }
  }

  // ============ CARGA INICIAL ============
  useEffect(() => {
    if (!isSuperAdmin && !isJefatura) return

    // 1) Consultamos las novedades ANTES de marcar como visto
    supabase
      .rpc('contar_novedades_auditoria')
      .then(({ data, error }) => {
        if (!error && typeof data === 'number' && data > 0) {
          setNovedades(data)
          setMostrarBanner(true)
        }

        // 2) Después de 2 segundos, marcamos como visto
        setTimeout(() => {
          if (!yaMarcoVisto.current) {
            yaMarcoVisto.current = true
            supabase.rpc('marcar_auditoria_vista').then(() => {
              setMostrarBanner(false)
            })
          }
        }, 2000)
      })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, isJefatura])

  // Cargar usuarios únicos la primera vez
  useEffect(() => {
    supabase
      .from('audit_log')
      .select('usuario_nombre')
      .not('usuario_nombre', 'is', null)
      .limit(1000)
      .then(({ data }) => {
        if (data) {
          const unicos = Array.from(new Set(data.map(d => d.usuario_nombre).filter(Boolean)))
          setUsuariosUnicos(unicos as string[])
        }
      })
  }, [])

  // Recargar cuando cambian los filtros
  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEntidad, filtroAccion, filtroUsuario, busqueda, fechaDesde, fechaHasta])

  const formatearFecha = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const colorAccion = (accion: string) => {
    if (accion === 'INSERT') return '#2E7D32'
    if (accion === 'UPDATE') return '#BF4E30'
    if (accion === 'DELETE') return '#B71C1C'
    return '#7A7364'
  }

  const labelAccion = (accion: string) => {
    if (accion === 'INSERT') return 'Creó'
    if (accion === 'UPDATE') return 'Editó'
    if (accion === 'DELETE') return 'Eliminó'
    return accion
  }

  const exportarCSV = () => {
    const header = ['Fecha', 'Usuario', 'Rol', 'Acción', 'Entidad', 'Descripción']
    const body = rows.map(r => [
      formatearFecha(r.created_at),
      r.usuario_nombre || '',
      r.usuario_rol || '',
      r.accion,
      r.entidad,
      r.descripcion
    ])
    const csv = [header, ...body]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const limpiarFiltros = () => {
    setFiltroEntidad('')
    setFiltroAccion('')
    setFiltroUsuario('')
    setBusqueda('')
    setFechaDesde('')
    setFechaHasta('')
  }

  // ============ SELECCIÓN ============
  const toggleSeleccion = (id: number) => {
    setSeleccionados(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) {
        nuevo.delete(id)
      } else {
        nuevo.add(id)
      }
      return nuevo
    })
  }

  const toggleTodos = () => {
    if (seleccionados.size === rows.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(rows.map(r => r.id)))
    }
  }

  const cancelarSeleccion = () => {
    setSeleccionados(new Set())
  }

  // ============ BORRADO ============
  const pedirBorrarUno = (id: number) => {
    setConfirmarBorrado({ tipo: 'uno', id })
  }

  const pedirBorrarVarios = () => {
    if (seleccionados.size === 0) return
    setConfirmarBorrado({ tipo: 'varios' })
  }

  const ejecutarBorrado = async () => {
    if (!confirmarBorrado) return
    setBorrando(true)

    try {
      if (confirmarBorrado.tipo === 'uno') {
        const { error } = await supabase
          .from('audit_log')
          .delete()
          .eq('id', confirmarBorrado.id)
        if (error) throw error
      } else {
        const ids = Array.from(seleccionados)
        const { error } = await supabase
          .from('audit_log')
          .delete()
          .in('id', ids)
        if (error) throw error
      }

      setConfirmarBorrado(null)
      await cargar()

      supabase
        .from('audit_log')
        .select('usuario_nombre')
        .not('usuario_nombre', 'is', null)
        .limit(1000)
        .then(({ data }) => {
          if (data) {
            const unicos = Array.from(new Set(data.map(d => d.usuario_nombre).filter(Boolean)))
            setUsuariosUnicos(unicos as string[])
          }
        })
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Error al borrar registros')
    } finally {
      setBorrando(false)
    }
  }

  // ============ MARCAR COMO VISTO MANUALMENTE ============
  const marcarComoVistoManual = async () => {
    await supabase.rpc('marcar_auditoria_vista')
    setMostrarBanner(false)
    setNovedades(0)
  }

  // ✅ Chequeo de permisos: SIEMPRE después de los hooks
  if (!isSuperAdmin && !isJefatura) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#BF4E30',
        fontFamily: 'Oswald, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        No tenés permiso para ver esta sección.
      </div>
    )
  }

  const haySeleccion = seleccionados.size > 0
  const todosSeleccionados = rows.length > 0 && seleccionados.size === rows.length

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      {/* Título */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          📋 Historial de cambios
        </h1>
        <p style={{
          fontSize: '13px',
          color: '#7A7364',
          margin: '4px 0 0 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Registro de todas las acciones de los usuarios
        </p>
      </div>

      {/* Banner de novedades */}
      {mostrarBanner && novedades > 0 && (
        <div style={{
          backgroundColor: '#FFF3CD',
          border: '2px solid #F5C842',
          borderLeft: '6px solid #F5C842',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#7A5C00',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            minWidth: '200px'
          }}>
            <span style={{ fontSize: '20px' }}>📬</span>
            <span>
              Tenés <strong>{novedades}</strong> {novedades === 1 ? 'cambio nuevo' : 'cambios nuevos'} desde tu última visita
            </span>
          </div>
          <button
            onClick={marcarComoVistoManual}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '2px solid #7A5C00',
              borderRadius: '6px',
              color: '#7A5C00',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontWeight: 600,
              flexShrink: 0
            }}
          >
            Marcar como visto
          </button>
        </div>
      )}

      {/* Filtros */}
      <div style={{
        backgroundColor: '#F3ECD8',
        border: '2px solid #D1C9B4',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <input
            type="text"
            placeholder="Buscar en descripción..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={inputStyle}
          />
          <select value={filtroEntidad} onChange={e => setFiltroEntidad(e.target.value)} style={inputStyle}>
            {ENTIDADES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} style={inputStyle}>
            {ACCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} style={inputStyle}>
            <option value="">Todos los usuarios</option>
            {usuariosUnicos.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            style={inputStyle}
            title="Desde"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            style={inputStyle}
            title="Hasta"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button onClick={limpiarFiltros} style={btnSecondary}>Limpiar filtros</button>
          <button onClick={exportarCSV} style={btnSecondary}>📥 Exportar CSV</button>
        </div>
      </div>

      {/* Barra de acciones masivas (solo Super Admin) */}
      {isSuperAdmin && haySeleccion && (
        <div style={{
          backgroundColor: '#24352A',
          color: '#F3ECD8',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ✅ {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={pedirBorrarVarios}
              style={{
                padding: '8px 14px',
                backgroundColor: '#B71C1C',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600
              }}
            >
              🗑️ Eliminar seleccionados
            </button>
            <button
              onClick={cancelarSeleccion}
              style={{
                padding: '8px 14px',
                backgroundColor: 'transparent',
                color: '#F3ECD8',
                border: '2px solid #F3ECD8',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Checkbox "seleccionar todos" (solo Super Admin) */}
      {isSuperAdmin && rows.length > 0 && !loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
          paddingLeft: '4px'
        }}>
          <input
            type="checkbox"
            checked={todosSeleccionados}
            onChange={toggleTodos}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span
            style={{
              fontSize: '12px',
              color: '#7A7364',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer'
            }}
            onClick={toggleTodos}
          >
            Seleccionar todos los visibles
          </span>
        </div>
      )}

      {/* Lista */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7A7364' }}>
          Cargando...
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#FCE4E4',
          border: '2px solid #B71C1C',
          color: '#B71C1C',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div style={{
          backgroundColor: '#F3ECD8',
          border: '2px solid #D1C9B4',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          color: '#7A7364',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Sin registros para los filtros aplicados
        </div>
      )}

      {rows.map(r => {
        const estaSeleccionado = seleccionados.has(r.id)
        return (
          <div
            key={r.id}
            style={{
              backgroundColor: estaSeleccionado ? '#F0E0C0' : '#F3ECD8',
              border: '2px solid #D1C9B4',
              borderLeft: `6px solid ${colorAccion(r.accion)}`,
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            {isSuperAdmin && (
              <div style={{ paddingTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={estaSeleccionado}
                  onChange={() => toggleSeleccion(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
            )}

            <div
              style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              onClick={() => setDetalle(r)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <strong style={{ color: colorAccion(r.accion) }}>{labelAccion(r.accion)}</strong>
                    {' · '}
                    <span>{r.usuario_nombre || 'Usuario desconocido'}</span>
                    {r.usuario_rol && <span style={{ color: '#A89E86' }}> ({r.usuario_rol})</span>}
                  </div>
                  <div style={{ fontSize: '14px', color: '#24352A', marginTop: '4px', lineHeight: 1.35 }}>
                    {r.descripcion}
                  </div>
                  <div style={{ fontSize: '11px', color: '#A89E86', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {r.entidad}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#7A7364', whiteSpace: 'nowrap' }}>
                  {formatearFecha(r.created_at)}
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  pedirBorrarUno(r.id)
                }}
                title="Eliminar este registro"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'transparent',
                  color: '#B71C1C',
                  border: '2px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  flexShrink: 0,
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#B71C1C'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#B71C1C'
                }}
              >
                🗑️
              </button>
            )}
          </div>
        )
      })}

      {hayMas && !loading && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button onClick={cargarMas} style={btnSecondary}>Cargar más</button>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div
          onClick={() => setDetalle(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(36, 53, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#F3ECD8',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '3px solid #24352A'
            }}
          >
            <h2 style={{
              fontSize: '18px',
              color: '#24352A',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 12px 0'
            }}>
              Detalle del registro
            </h2>
            <div style={{ fontSize: '13px', color: '#24352A', lineHeight: 1.6 }}>
              <p><strong>Descripción:</strong> {detalle.descripcion}</p>
              <p><strong>Usuario:</strong> {detalle.usuario_nombre} ({detalle.usuario_rol})</p>
              <p><strong>Acción:</strong> {detalle.accion}</p>
              <p><strong>Entidad:</strong> {detalle.entidad}</p>
              <p><strong>Fecha:</strong> {formatearFecha(detalle.created_at)}</p>
            </div>

            {detalle.datos_anteriores && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '13px', textTransform: 'uppercase', color: '#7A7364' }}>Antes</strong>
                <pre style={preStyle}>{JSON.stringify(detalle.datos_anteriores, null, 2)}</pre>
              </div>
            )}
            {detalle.datos_nuevos && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '13px', textTransform: 'uppercase', color: '#7A7364' }}>Después</strong>
                <pre style={preStyle}>{JSON.stringify(detalle.datos_nuevos, null, 2)}</pre>
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button onClick={() => setDetalle(null)} style={btnPrimary}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar borrado */}
      {confirmarBorrado && (
        <div
          onClick={() => !borrando && setConfirmarBorrado(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(36, 53, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#F3ECD8',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              border: '3px solid #B71C1C'
            }}
          >
            <h2 style={{
              fontSize: '20px',
              color: '#B71C1C',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 8px 0'
            }}>
              ⚠️ Confirmar eliminación
            </h2>

            <p style={{
              fontSize: '14px',
              color: '#24352A',
              lineHeight: 1.5,
              margin: '12px 0'
            }}>
              {confirmarBorrado.tipo === 'uno'
                ? '¿Estás seguro de que querés eliminar este registro?'
                : `¿Estás seguro de que querés eliminar ${seleccionados.size} registro${seleccionados.size !== 1 ? 's' : ''}?`}
              <br />
              <strong style={{ color: '#B71C1C' }}>Esta acción no se puede deshacer.</strong>
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '20px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setConfirmarBorrado(null)}
                disabled={borrando}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '2px solid #24352A',
                  borderRadius: '8px',
                  color: '#24352A',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: borrando ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: borrando ? 0.5 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarBorrado}
                disabled={borrando}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#B71C1C',
                  border: '2px solid #B71C1C',
                  borderRadius: '8px',
                  color: 'white',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: borrando ? 'wait' : 'pointer',
                  fontWeight: 600,
                  opacity: borrando ? 0.6 : 1
                }}
              >
                {borrando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== estilos reutilizables ====================
const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '2px solid #D1C9B4',
  borderRadius: '8px',
  backgroundColor: '#FFFFFF',
  fontFamily: 'Oswald, sans-serif',
  fontSize: '13px',
  color: '#24352A',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: 'transparent',
  border: '2px solid #24352A',
  borderRadius: '8px',
  color: '#24352A',
  fontFamily: 'Oswald, sans-serif',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  cursor: 'pointer',
  fontWeight: 600
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#24352A',
  border: '2px solid #24352A',
  borderRadius: '8px',
  color: '#F3ECD8',
  fontFamily: 'Oswald, sans-serif',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  cursor: 'pointer',
  fontWeight: 600
}

const preStyle: React.CSSProperties = {
  backgroundColor: '#E8DEC4',
  border: '1px solid #D1C9B4',
  borderRadius: '6px',
  padding: '10px',
  fontSize: '11px',
  overflowX: 'auto',
  margin: '4px 0 0 0',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'monospace'
}