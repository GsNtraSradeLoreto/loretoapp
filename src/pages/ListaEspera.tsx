import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// TIPOS
// ============================================
type Tab = 'lista_espera' | 'convocados' | 'altas'
type Rama = 'Manada' | 'Unidad' | 'Caminantes' | 'Rover' | ''
type EstadoConvocado = 'Pendiente' | 'Convocado' | 'Vino a entrevista' | 'No vino' | 'Se dio de baja' | 'Otro'

interface Sabado {
  fecha: string
  nota: string
}

interface Registro {
  id: string
  fecha_contacto: string | null
  beneficiario: string
  tutor: string | null
  telefono: string | null
  fecha_nacimiento: string | null
  rama: Rama
  estado_convocado: EstadoConvocado
  nota_convocado: string | null
  observaciones: string | null
  pasado: boolean
  created_at: string
  updated_at: string
  // solo convocados y altas
  forms_completo?: boolean
  alta_cds?: boolean
  libro_beneficiarios?: boolean
  contacto_jr_enviado?: boolean
  sabados?: Sabado[]
  // solo altas
  fecha_alta?: string | null
  fecha_alta_cds?: string | null
}

// ============================================
// HELPERS
// ============================================
const ESTADOS: EstadoConvocado[] = [
  'Pendiente',
  'Convocado',
  'Vino a entrevista',
  'No vino',
  'Se dio de baja',
  'Otro'
]

const RAMAS: Rama[] = ['Manada', 'Unidad', 'Caminantes', 'Rover']

const COLOR_ESTADO: Record<EstadoConvocado, { bg: string; text: string }> = {
  'Pendiente': { bg: '#FEF3C7', text: '#92400E' },
  'Convocado': { bg: '#DBEAFE', text: '#1E40AF' },
  'Vino a entrevista': { bg: '#D1FAE5', text: '#065F46' },
  'No vino': { bg: '#FEE2E2', text: '#991B1B' },
  'Se dio de baja': { bg: '#F3F4F6', text: '#374151' },
  'Otro': { bg: '#E9D5FF', text: '#6B21A8' }
}

const calcularEdad = (fechaNac: string | null): number | null => {
  if (!fechaNac) return null
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

const formatearFecha = (fecha: string | null): string => {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

const hoyISO = (): string => new Date().toISOString().split('T')[0]

// ============================================
// ESTILOS BASE (copiados del estilo de la app)
// ============================================
const C = {
  verde: '#24352A',
  dorado: '#C48A2A',
  terracota: '#BF4E30',
  crema: '#E8DEC4',
  arena: '#F3ECD8',
  texto: '#24352A',
  textoSec: '#7A7364',
  borde: '#D1C9B4'
}

const inputSt: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: `2px solid ${C.borde}`,
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  boxSizing: 'border-box',
  color: C.texto
}

const labelSt: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: '600',
  color: C.textoSec,
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'Oswald, sans-serif'
}

const btnPrimario: React.CSSProperties = {
  backgroundColor: C.verde,
  color: 'white',
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontSize: '12px',
  fontWeight: '600'
}

const btnDorado: React.CSSProperties = {
  ...btnPrimario,
  backgroundColor: C.dorado
}

const btnSecundario: React.CSSProperties = {
  ...btnPrimario,
  backgroundColor: 'transparent',
  color: C.verde,
  border: `2px solid ${C.verde}`
}

const btnPeligro: React.CSSProperties = {
  ...btnPrimario,
  backgroundColor: C.terracota
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ListaEspera() {
  const { isSuperAdmin, isJefatura, isAdministrador } = useAuth()
  const puedeVer = isSuperAdmin || isJefatura || isAdministrador

  const [tab, setTab] = useState<Tab>('lista_espera')
  const [registros, setRegistros] = useState<Record<Tab, Registro[]>>({
    lista_espera: [],
    convocados: [],
    altas: []
  })
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroRama, setFiltroRama] = useState<Rama | 'Todas'>('Todas')

  // Carga inicial
  const cargarTabla = async (t: Tab) => {
    const { data, error } = await supabase
      .from(t)
      .select('*')
      .eq('pasado', false)
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      setMensaje({ texto: '❌ Error al cargar: ' + error.message, tipo: 'error' })
      return []
    }
    return (data || []) as Registro[]
  }

  const cargarTodo = async () => {
    setLoading(true)
    const [le, co, al] = await Promise.all([
      cargarTabla('lista_espera'),
      cargarTabla('convocados'),
      cargarTabla('altas')
    ])
    setRegistros({ lista_espera: le, convocados: co, altas: al })
    setLoading(false)
  }

  useEffect(() => {
    if (puedeVer) cargarTodo()
    else setLoading(false)
  }, [puedeVer])

  // Mensaje auto-cierre
  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(() => setMensaje(null), 3500)
    return () => clearTimeout(t)
  }, [mensaje])

  // Filtrado
  const registrosFiltrados = useMemo(() => {
    let lista = registros[tab]
    if (filtroRama !== 'Todas') lista = lista.filter(r => r.rama === filtroRama)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(r =>
        r.beneficiario.toLowerCase().includes(q) ||
        (r.tutor || '').toLowerCase().includes(q) ||
        (r.telefono || '').toLowerCase().includes(q)
      )
    }
    return lista
  }, [registros, tab, filtroRama, busqueda])

  // Contadores por rama
  const contadores = useMemo(() => {
    const lista = registros[tab]
    const obj: Record<string, number> = { Manada: 0, Unidad: 0, Caminantes: 0, Rover: 0 }
    lista.forEach(r => { if (r.rama) obj[r.rama] = (obj[r.rama] || 0) + 1 })
    return obj
  }, [registros, tab])

  // ============================================
  // CRUD
  // ============================================
  const crear = async (datos: Partial<Registro>) => {
    const tabla = tab
    // Para convocados/altas arrancamos con sabados y campos extra por default
    const payload: any = { ...datos }
    if (tabla === 'convocados') {
      payload.sabados = [
        { fecha: '', nota: '' },
        { fecha: '', nota: '' },
        { fecha: '', nota: '' }
      ]
    }
    if (tabla === 'altas') {
      payload.sabados = []
      payload.fecha_alta = hoyISO()
    }
    const { error } = await supabase.from(tabla).insert(payload)
    if (error) {
      setMensaje({ texto: '❌ Error al guardar: ' + error.message, tipo: 'error' })
      return false
    }
    setMensaje({ texto: '✅ Guardado', tipo: 'ok' })
    await cargarTodo()
    return true
  }

  const actualizar = async (id: string, cambios: Partial<Registro>) => {
    const { error } = await supabase.from(tab).update(cambios).eq('id', id)
    if (error) {
      setMensaje({ texto: '❌ Error al actualizar: ' + error.message, tipo: 'error' })
      return false
    }
    setMensaje({ texto: '✅ Actualizado', tipo: 'ok' })
    await cargarTodo()
    return true
  }

  const borrar = async (id: string) => {
    if (!confirm('¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from(tab).delete().eq('id', id)
    if (error) {
      setMensaje({ texto: '❌ Error al borrar: ' + error.message, tipo: 'error' })
      return
    }
    setMensaje({ texto: '🗑️ Eliminado', tipo: 'ok' })
    await cargarTodo()
  }

  // ============================================
  // PASAR DE ETAPA
  // ============================================
  const pasarEtapa = async (r: Registro, destino: 'convocados' | 'altas') => {
    const label = destino === 'convocados' ? 'Convocados' : 'Altas'
    if (!confirm(`¿Pasar a "${label}"?`)) return

    // 1) Armar payload para la nueva tabla
    const payload: any = {
      fecha_contacto: r.fecha_contacto,
      beneficiario: r.beneficiario,
      tutor: r.tutor,
      telefono: r.telefono,
      fecha_nacimiento: r.fecha_nacimiento,
      rama: r.rama,
      estado_convocado: r.estado_convocado,
      nota_convocado: r.nota_convocado,
      observaciones: r.observaciones
    }

    if (destino === 'convocados') {
      payload.sabados = [
        { fecha: '', nota: '' },
        { fecha: '', nota: '' },
        { fecha: '', nota: '' }
      ]
      payload.forms_completo = false
      payload.alta_cds = false
      payload.libro_beneficiarios = false
      payload.contacto_jr_enviado = false
    } else {
      // destino = altas
      payload.forms_completo = r.forms_completo || false
      payload.alta_cds = r.alta_cds || false
      payload.libro_beneficiarios = r.libro_beneficiarios || false
      payload.contacto_jr_enviado = r.contacto_jr_enviado || false
      payload.sabados = r.sabados || []
      payload.fecha_alta = hoyISO()
    }

    // 2) Insertar en la nueva
    const { error: errIns } = await supabase.from(destino).insert(payload)
    if (errIns) {
      setMensaje({ texto: '❌ Error al pasar: ' + errIns.message, tipo: 'error' })
      return
    }

    // 3) Marcar como pasado
    const { error: errUp } = await supabase.from(tab).update({ pasado: true }).eq('id', r.id)
    if (errUp) {
      setMensaje({ texto: '⚠️ Se creó en destino, pero no se pudo marcar el origen: ' + errUp.message, tipo: 'error' })
      await cargarTodo()
      return
    }

    setMensaje({ texto: '✅ Pasado a ' + label, tipo: 'ok' })
    await cargarTodo()
  }

  // ============================================
  // RENDER
  // ============================================
  if (!puedeVer) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px', fontFamily: 'Oswald, sans-serif' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
        <p style={{ color: C.textoSec, textTransform: 'uppercase', letterSpacing: '1px' }}>
          No tenés permisos para ver esta sección.
        </p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{
          fontSize: 'clamp(18px, 4vw, 24px)',
          fontWeight: '700',
          color: C.verde,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          📥 Lista de Espera
        </h1>
        <p style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: C.textoSec,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: '4px 0 0 0'
        }}>
          Inscripciones: lista de espera → convocados → altas
        </p>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '13px',
          backgroundColor: mensaje.tipo === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: mensaje.tipo === 'error' ? C.terracota : '#065F46',
          border: `2px solid ${mensaje.tipo === 'error' ? '#FECACA' : '#A7F3D0'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: `2px solid ${C.borde}`,
        overflow: 'hidden',
        marginBottom: '16px'
      }}>
        {([
          { id: 'lista_espera', label: '📥 Lista de Espera', count: registros.lista_espera.length },
          { id: 'convocados', label: '📗 Convocados', count: registros.convocados.length },
          { id: 'altas', label: '✅ Altas', count: registros.altas.length }
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '10px 6px',
              backgroundColor: tab === t.id ? C.verde : 'transparent',
              color: tab === t.id ? '#F3ECD8' : C.textoSec,
              border: 'none',
              borderBottom: tab === t.id ? `3px solid ${C.dorado}` : '3px solid transparent',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              fontWeight: tab === t.id ? '700' : '500',
              lineHeight: 1.2
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                display: 'inline-block',
                marginLeft: '6px',
                backgroundColor: tab === t.id ? C.dorado : C.verde,
                color: 'white',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '10px'
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: C.textoSec }}>
          Cargando...
        </div>
      ) : (
        <>
          {/* Formulario de alta (solo en lista_espera) */}
          {tab === 'lista_espera' && (
            <FormAlta onCrear={crear} />
          )}

          {/* Contadores por rama */}
          <div style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            marginBottom: '12px'
          }}>
            {RAMAS.map(r => (
              <button
                key={r}
                onClick={() => setFiltroRama(filtroRama === r ? 'Todas' : r)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  border: `2px solid ${filtroRama === r ? C.verde : C.borde}`,
                  borderRadius: '14px',
                  backgroundColor: filtroRama === r ? C.verde : 'white',
                  color: filtroRama === r ? 'white' : C.textoSec,
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}
              >
                {r}: {contadores[r] || 0}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, tutor o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ ...inputSt, marginBottom: '16px' }}
          />

          {/* Listado de tarjetas */}
          {registrosFiltrados.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: C.textoSec,
              fontStyle: 'italic',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: `2px dashed ${C.borde}`
            }}>
              No hay registros en esta etapa todavía.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {registrosFiltrados.map(r => (
                <Tarjeta
                  key={r.id}
                  registro={r}
                  tab={tab}
                  onActualizar={actualizar}
                  onBorrar={borrar}
                  onPasar={pasarEtapa}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// SUB-COMPONENTE: FORMULARIO DE ALTA
// ============================================
function FormAlta({ onCrear }: { onCrear: (d: Partial<Registro>) => Promise<boolean> }) {
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    fecha_contacto: hoyISO(),
    beneficiario: '',
    tutor: '',
    telefono: '',
    fecha_nacimiento: '',
    rama: '' as Rama,
    estado_convocado: 'Pendiente' as EstadoConvocado,
    nota_convocado: '',
    observaciones: ''
  })

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.beneficiario.trim()) {
      alert('El nombre del beneficiario es obligatorio')
      return
    }
    setGuardando(true)
    const ok = await onCrear({
      fecha_contacto: form.fecha_contacto || null,
      beneficiario: form.beneficiario.trim(),
      tutor: form.tutor.trim() || null,
      telefono: form.telefono.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      rama: form.rama || null,
      estado_convocado: form.estado_convocado,
      nota_convocado: form.estado_convocado === 'Otro' ? form.nota_convocado.trim() || null : null,
      observaciones: form.observaciones.trim() || null
    })
    setGuardando(false)
    if (ok) {
      setForm({
        fecha_contacto: hoyISO(),
        beneficiario: '',
        tutor: '',
        telefono: '',
        fecha_nacimiento: '',
        rama: '',
        estado_convocado: 'Pendiente',
        nota_convocado: '',
        observaciones: ''
      })
      setAbierto(false)
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        style={{ ...btnDorado, width: '100%', marginBottom: '16px', padding: '12px' }}
      >
        ➕ Agregar a Lista de Espera
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: `2px solid ${C.dorado}`,
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          color: C.verde,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          ➕ Nuevo en Lista de Espera
        </h3>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            color: C.textoSec,
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <div>
          <label style={labelSt}>Beneficiario *</label>
          <input
            style={inputSt}
            value={form.beneficiario}
            onChange={(e) => set('beneficiario', e.target.value)}
            required
          />
        </div>
        <div>
          <label style={labelSt}>Tutor</label>
          <input
            style={inputSt}
            value={form.tutor}
            onChange={(e) => set('tutor', e.target.value)}
          />
        </div>
        <div>
          <label style={labelSt}>Teléfono</label>
          <input
            style={inputSt}
            value={form.telefono}
            onChange={(e) => set('telefono', e.target.value)}
          />
        </div>
        <div>
          <label style={labelSt}>Fecha nac.</label>
          <input
            type="date"
            style={inputSt}
            value={form.fecha_nacimiento}
            onChange={(e) => set('fecha_nacimiento', e.target.value)}
          />
        </div>
        <div>
          <label style={labelSt}>Rama</label>
          <select
            style={inputSt}
            value={form.rama}
            onChange={(e) => set('rama', e.target.value)}
          >
            <option value="">— Sin asignar —</option>
            {RAMAS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={labelSt}>Fecha contacto</label>
          <input
            type="date"
            style={inputSt}
            value={form.fecha_contacto}
            onChange={(e) => set('fecha_contacto', e.target.value)}
          />
        </div>
        <div>
          <label style={labelSt}>Estado convocado</label>
          <select
            style={inputSt}
            value={form.estado_convocado}
            onChange={(e) => set('estado_convocado', e.target.value)}
          >
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        {form.estado_convocado === 'Otro' && (
          <div>
            <label style={labelSt}>Nota convocado</label>
            <input
              style={inputSt}
              value={form.nota_convocado}
              onChange={(e) => set('nota_convocado', e.target.value)}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: '10px' }}>
        <label style={labelSt}>Observaciones</label>
        <textarea
          style={{ ...inputSt, resize: 'vertical', minHeight: '60px' }}
          value={form.observaciones}
          onChange={(e) => set('observaciones', e.target.value)}
        />
      </div>

      <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="submit" disabled={guardando} style={btnPrimario}>
          {guardando ? 'Guardando...' : '💾 Guardar'}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          style={btnSecundario}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ============================================
// SUB-COMPONENTE: TARJETA
// ============================================
function Tarjeta({
  registro,
  tab,
  onActualizar,
  onBorrar,
  onPasar
}: {
  registro: Registro
  tab: Tab
  onActualizar: (id: string, c: Partial<Registro>) => Promise<boolean>
  onBorrar: (id: string) => void
  onPasar: (r: Registro, destino: 'convocados' | 'altas') => void
}) {
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState<Registro>(registro)

  useEffect(() => {
    setForm(registro)
  }, [registro])

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const edad = calcularEdad(registro.fecha_nacimiento)
  const colorEstado = COLOR_ESTADO[registro.estado_convocado] || COLOR_ESTADO['Pendiente']

  const guardar = async () => {
    setGuardando(true)
    const cambios: Partial<Registro> = {
      fecha_contacto: form.fecha_contacto,
      beneficiario: form.beneficiario.trim(),
      tutor: form.tutor?.trim() || null,
      telefono: form.telefono?.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento,
      rama: form.rama,
      estado_convocado: form.estado_convocado,
      nota_convocado: form.nota_convocado || null,
      observaciones: form.observaciones || null
    }
    if (tab === 'convocados' || tab === 'altas') {
      cambios.forms_completo = form.forms_completo
      cambios.alta_cds = form.alta_cds
      cambios.libro_beneficiarios = form.libro_beneficiarios
      cambios.contacto_jr_enviado = form.contacto_jr_enviado
      cambios.sabados = form.sabados
    }
    if (tab === 'altas') {
      cambios.fecha_alta = form.fecha_alta
      cambios.fecha_alta_cds = form.fecha_alta_cds
    }
    const ok = await onActualizar(registro.id, cambios)
    setGuardando(false)
    if (ok) setEditando(false)
  }

  // ============================================
  // MODO EDICIÓN
  // ============================================
  if (editando) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: `2px solid ${C.dorado}`,
        padding: '14px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div>
            <label style={labelSt}>Beneficiario *</label>
            <input style={inputSt} value={form.beneficiario} onChange={e => set('beneficiario', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Tutor</label>
            <input style={inputSt} value={form.tutor || ''} onChange={e => set('tutor', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Teléfono</label>
            <input style={inputSt} value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Fecha nac.</label>
            <input type="date" style={inputSt} value={form.fecha_nacimiento || ''} onChange={e => set('fecha_nacimiento', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Rama</label>
            <select style={inputSt} value={form.rama} onChange={e => set('rama', e.target.value)}>
              <option value="">— Sin asignar —</option>
              {RAMAS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Fecha contacto</label>
            <input type="date" style={inputSt} value={form.fecha_contacto || ''} onChange={e => set('fecha_contacto', e.target.value)} />
          </div>
          <div>
            <label style={labelSt}>Estado convocado</label>
            <select style={inputSt} value={form.estado_convocado} onChange={e => set('estado_convocado', e.target.value)}>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {form.estado_convocado === 'Otro' && (
            <div>
              <label style={labelSt}>Nota convocado</label>
              <input style={inputSt} value={form.nota_convocado || ''} onChange={e => set('nota_convocado', e.target.value)} />
            </div>
          )}
        </div>

        {/* Checkboxes solo en convocados y altas */}
        {(tab === 'convocados' || tab === 'altas') && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: '#F9F6EE',
            borderRadius: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={!!form.forms_completo} onChange={e => set('forms_completo', e.target.checked)} />
              Forms completo
            </label>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={!!form.alta_cds} onChange={e => set('alta_cds', e.target.checked)} />
              Alta en CDS
            </label>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={!!form.libro_beneficiarios} onChange={e => set('libro_beneficiarios', e.target.checked)} />
              Libro beneficiarios
            </label>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={!!form.contacto_jr_enviado} onChange={e => set('contacto_jr_enviado', e.target.checked)} />
              Contacto JR enviado
            </label>
          </div>
        )}

        {/* Sábados solo en convocados y altas */}
        {(tab === 'convocados' || tab === 'altas') && (
          <EditorSabados
            sabados={form.sabados || []}
            onChange={(s) => set('sabados', s)}
          />
        )}

        {/* Fechas altas */}
        {tab === 'altas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '10px' }}>
            <div>
              <label style={labelSt}>Fecha de alta</label>
              <input type="date" style={inputSt} value={form.fecha_alta || ''} onChange={e => set('fecha_alta', e.target.value)} />
            </div>
            <div>
              <label style={labelSt}>Fecha alta CDS</label>
              <input type="date" style={inputSt} value={form.fecha_alta_cds || ''} onChange={e => set('fecha_alta_cds', e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ marginTop: '10px' }}>
          <label style={labelSt}>Observaciones</label>
          <textarea
            style={{ ...inputSt, minHeight: '60px', resize: 'vertical' }}
            value={form.observaciones || ''}
            onChange={e => set('observaciones', e.target.value)}
          />
        </div>

        <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={guardar} disabled={guardando} style={btnPrimario}>
            {guardando ? 'Guardando...' : '💾 Guardar'}
          </button>
          <button onClick={() => { setEditando(false); setForm(registro) }} style={btnSecundario}>
            Cancelar
          </button>
          <button onClick={() => onBorrar(registro.id)} style={btnPeligro}>
            🗑️ Eliminar
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // MODO LECTURA (tarjeta)
  // ============================================
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: `2px solid ${C.borde}`,
      padding: '12px',
      borderLeft: `5px solid ${C.verde}`
    }}>
      {/* Fila 1: nombre + estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'clamp(14px, 3vw, 16px)',
            fontWeight: '700',
            color: C.verde,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {registro.beneficiario}
          </div>
          <div style={{ fontSize: '11px', color: C.textoSec, marginTop: '2px' }}>
            {registro.rama && <span>🎖️ {registro.rama}</span>}
            {registro.rama && edad !== null && <span> · </span>}
            {edad !== null && <span>🎂 {edad} años</span>}
          </div>
        </div>
        <span style={{
          backgroundColor: colorEstado.bg,
          color: colorEstado.text,
          borderRadius: '12px',
          padding: '3px 10px',
          fontSize: '10px',
          fontWeight: '700',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap'
        }}>
          {registro.estado_convocado}
        </span>
      </div>

      {/* Datos */}
      <div style={{ fontSize: '12px', color: C.texto, lineHeight: 1.6, marginBottom: '8px' }}>
        {registro.fecha_contacto && <div>📅 Escribió: {formatearFecha(registro.fecha_contacto)}</div>}
        {registro.tutor && <div>👤 Tutor: {registro.tutor}</div>}
        {registro.telefono && <div>📱 Tel: {registro.telefono}</div>}
        {registro.nota_convocado && <div>📝 Convocado: {registro.nota_convocado}</div>}
        {registro.observaciones && <div style={{ marginTop: '4px' }}>💬 {registro.observaciones}</div>}
      </div>

      {/* Checkboxes en modo lectura */}
      {(tab === 'convocados' || tab === 'altas') && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '8px',
          fontSize: '11px'
        }}>
          <CheckChip label="Forms" ok={!!registro.forms_completo} />
          <CheckChip label="CDS" ok={!!registro.alta_cds} />
          <CheckChip label="Libro" ok={!!registro.libro_beneficiarios} />
          <CheckChip label="JR" ok={!!registro.contacto_jr_enviado} />
        </div>
      )}

      {/* Sábados en modo lectura */}
      {(tab === 'convocados' || tab === 'altas') && (registro.sabados || []).length > 0 && (
        <div style={{ marginBottom: '8px', fontSize: '11px' }}>
          <div style={{ color: C.textoSec, fontWeight: '600', marginBottom: '2px' }}>📆 Sábados:</div>
          {(registro.sabados || []).map((s, i) => (
            <div key={i} style={{ color: C.texto }}>
              {s.fecha ? formatearFecha(s.fecha) : '—'} {s.nota && `· ${s.nota}`}
            </div>
          ))}
        </div>
      )}

      {/* Fechas altas en modo lectura */}
      {tab === 'altas' && (
        <div style={{ fontSize: '11px', color: C.texto, marginBottom: '8px' }}>
          {registro.fecha_alta && <div>✅ Alta: {formatearFecha(registro.fecha_alta)}</div>}
          {registro.fecha_alta_cds && <div>🏕️ Alta CDS: {formatearFecha(registro.fecha_alta_cds)}</div>}
        </div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
        <button onClick={() => setEditando(true)} style={{ ...btnSecundario, padding: '6px 12px', fontSize: '11px' }}>
          ✏️ Editar
        </button>
        {tab === 'lista_espera' && (
          <button onClick={() => onPasar(registro, 'convocados')} style={{ ...btnDorado, padding: '6px 12px', fontSize: '11px' }}>
            ➡️ Pasar a Convocados
          </button>
        )}
        {tab === 'convocados' && (
          <button onClick={() => onPasar(registro, 'altas')} style={{ ...btnDorado, padding: '6px 12px', fontSize: '11px' }}>
            ➡️ Pasar a Altas
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================
// SUB-COMPONENTE: CHIP DE CHECK
// ============================================
function CheckChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '10px',
      fontWeight: '600',
      backgroundColor: ok ? '#D1FAE5' : '#F3F4F6',
      color: ok ? '#065F46' : '#6B7280',
      border: `1px solid ${ok ? '#A7F3D0' : '#E5E7EB'}`
    }}>
      {ok ? '✅' : '⬜'} {label}
    </span>
  )
}

// ============================================
// SUB-COMPONENTE: EDITOR DE SÁBADOS
// ============================================
function EditorSabados({
  sabados,
  onChange
}: {
  sabados: Sabado[]
  onChange: (s: Sabado[]) => void
}) {
  const actualizar = (idx: number, campo: keyof Sabado, valor: string) => {
    const nuevos = [...sabados]
    nuevos[idx] = { ...nuevos[idx], [campo]: valor }
    onChange(nuevos)
  }
  const agregar = () => onChange([...sabados, { fecha: '', nota: '' }])
  const borrar = (idx: number) => onChange(sabados.filter((_, i) => i !== idx))

  return (
    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#F9F6EE', borderRadius: '8px' }}>
      <div style={{ ...labelSt, marginBottom: '8px' }}>📆 Sábados de prueba</div>
      {sabados.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
          <input
            type="date"
            style={{ ...inputSt, flex: '0 0 140px', padding: '6px 8px', fontSize: '12px' }}
            value={s.fecha}
            onChange={e => actualizar(i, 'fecha', e.target.value)}
          />
          <input
            type="text"
            placeholder="Observación del sábado..."
            style={{ ...inputSt, flex: 1, padding: '6px 8px', fontSize: '12px' }}
            value={s.nota}
            onChange={e => actualizar(i, 'nota', e.target.value)}
          />
          <button
            type="button"
            onClick={() => borrar(i)}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.terracota,
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px'
            }}
            title="Eliminar este sábado"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={agregar}
        style={{ ...btnSecundario, padding: '4px 10px', fontSize: '11px', marginTop: '4px' }}
      >
        ➕ Agregar sábado
      </button>
    </div>
  )
}