import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSwipe } from '../hooks/useSwipe'

// ============================================
// CONSTANTES
// ============================================
const CURSOS = [
  { id: 'basica_1', etapa: 'basica', nombre: 'Promoción de derechos SAAC (virtual)', obligatorio: true },
  { id: 'basica_2', etapa: 'basica', nombre: 'Introductoria', obligatorio: true },
  { id: 'intermedia_1', etapa: 'intermedia', nombre: 'Aplicación del Sistema de Equipos', obligatorio: true },
  { id: 'intermedia_2', etapa: 'intermedia', nombre: 'Aplicación del Marco Simbólico', obligatorio: true },
  { id: 'intermedia_3', etapa: 'intermedia', nombre: 'Oportunidades de Aprendizaje', obligatorio: true },
  { id: 'intermedia_4', etapa: 'intermedia', nombre: 'El Ciclo de Programa', obligatorio: true },
  { id: 'intermedia_5', etapa: 'intermedia', nombre: 'Aplicación del Sistema de Progresiones', obligatorio: true },
  { id: 'intermedia_6', etapa: 'intermedia', nombre: 'Organización de actividades al aire libre', obligatorio: true },
  { id: 'intermedia_7', etapa: 'intermedia', nombre: 'Gestión de Proyectos', obligatorio: true },
  { id: 'avanzada_1', etapa: 'avanzada', nombre: 'Sistema de Equipos: Liderazgo y resolución de conflictos', obligatorio: true },
  { id: 'avanzada_2', etapa: 'avanzada', nombre: 'El Clima Educativo', obligatorio: true },
  { id: 'avanzada_3', etapa: 'avanzada', nombre: 'Análisis de contexto y adecuación del programa', obligatorio: true },
  { id: 'avanzada_4', etapa: 'avanzada', nombre: 'Emergencias: Respuesta ante eventos no deseados', obligatorio: true },
  { id: 'avanzada_5', etapa: 'avanzada', nombre: 'Primeros auxilios emocionales', obligatorio: true },
  { id: 'religiosa_1', etapa: 'religiosa', nombre: 'El Educador y su Fe I', obligatorio: false },
  { id: 'religiosa_2', etapa: 'religiosa', nombre: 'El Educador y su Fe II', obligatorio: false },
]

const TOTAL_CURSOS_OBLIGATORIOS = CURSOS.filter(c => c.obligatorio).length

const ETAPAS_LABELS: Record<string, string> = {
  basica: '⭐ Etapa Básica (Nivel 1)',
  intermedia: '⭐⭐ Etapa Intermedia (Nivel 2)',
  avanzada: '⭐⭐⭐ Etapa Avanzada (Nivel 3)',
  religiosa: '🙏 Formación Religiosa (Opcional)',
}

const ORDEN_RAMAS: Record<string, number> = {
  'Manada': 1,
  'Unidad Scout': 2,
  'Caminantes': 3,
  'Rovers': 4,
}

const CURSOS_CAMBIO_RAMA: Record<string, Record<string, string[]>> = {
  'Lobatos y Lobeznas': {
    'Scouts': ['intermedia_1', 'intermedia_4'],
    'Caminantes': ['intermedia_1', 'intermedia_5', 'intermedia_4', 'intermedia_7'],
    'Rovers': ['intermedia_5', 'intermedia_7'],
  },
  'Scouts': {
    'Lobatos y Lobeznas': ['intermedia_2', 'intermedia_1'],
    'Caminantes': ['intermedia_5', 'intermedia_7'],
    'Rovers': ['intermedia_5', 'intermedia_7'],
  },
  'Caminantes': {
    'Lobatos y Lobeznas': ['intermedia_2', 'intermedia_1'],
    'Scouts': ['intermedia_1', 'intermedia_5'],
    'Rovers': ['intermedia_5'],
  },
  'Rovers': {
    'Lobatos y Lobeznas': ['intermedia_2', 'intermedia_5'],
    'Scouts': ['intermedia_1', 'intermedia_5', 'intermedia_4'],
    'Caminantes': ['intermedia_1', 'intermedia_5', 'intermedia_4'],
  },
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: '👑 Super Admin' },
  { value: 'Jefatura', label: '🏅 Jefatura' },
  { value: 'Administrador', label: '📋 Administrador' },
  { value: 'Tesorero', label: '💰 Tesorero' },
  { value: 'viewer', label: '👀 Viewer' },
  { value: 'JefeManada', label: '🧭 Jefe de Manada' },
  { value: 'JefeUnidad', label: '🧭 Jefe de Unidad' },
  { value: 'JefeCaminantes', label: '🧭 Jefe de Caminantes' },
  { value: 'JefeRovers', label: '🧭 Jefe de Rovers' },
  { value: 'AyudanteManada', label: '🧭 Ayudante de Manada' },
  { value: 'AyudanteUnidad', label: '🧭 Ayudante de Unidad' },
  { value: 'AyudanteCaminantes', label: '🧭 Ayudante de Caminantes' },
  { value: 'AyudanteRovers', label: '🧭 Ayudante de Rovers' },
]

const RAMAS_IM = [
  { valor: 'Lobatos y Lobeznas', label: '🐺 Lobatos y Lobeznas' },
  { valor: 'Scouts', label: '⚜️ Scouts' },
  { valor: 'Caminantes', label: '🏔️ Caminantes' },
  { valor: 'Rovers', label: '🔥 Rovers' },
]

const RAMAS_ACTUALES = [
  { valor: 'Manada', label: '🐺 Manada' },
  { valor: 'Unidad Scout', label: '⚜️ Unidad Scout' },
  { valor: 'Caminantes', label: '🏔️ Caminantes' },
  { valor: 'Rovers', label: '🔥 Rovers' },
]

const OPCIONES_ORDEN = [
  { value: 'apellido_asc', label: '📝 Apellido (A-Z)' },
  { value: 'apellido_desc', label: '📝 Apellido (Z-A)' },
  { value: 'progreso_desc', label: '📊 Progreso (mayor a menor)' },
  { value: 'progreso_asc', label: '📊 Progreso (menor a mayor)' },
  { value: 'fecha_desc', label: '📅 Más reciente' },
  { value: 'rol', label: '🎓 Rol' },
  { value: 'rama', label: '🏕️ Rama' },
]

type OrdenTipo = 'apellido_asc' | 'apellido_desc' | 'progreso_desc' | 'progreso_asc' | 'fecha_desc' | 'rol' | 'rama'

// ============================================
// TIPOS
// ============================================
type EstadoCurso = 'pendiente' | 'anotado' | 'completado' | 'transporte_anterior'

interface CursoEstado {
  curso_id: string
  estado: EstadoCurso
  fecha?: string
  lugar?: string
  notas?: string
  certificado_url?: string
  certificado_nombre?: string
  cargado_por?: string
  cargado_por_nombre?: string
  actualizado_en?: string
}

interface ValidacionEtapa {
  validado_cg: {
    ok: boolean
    fecha?: string
    notas?: string
    acta_url?: string
    acta_nombre?: string
  }
  simbolo_entregado: {
    ok: boolean
    fecha?: string
    notas?: string
  }
}

interface Validaciones {
  basica?: ValidacionEtapa
  intermedia?: ValidacionEtapa
  avanzada?: ValidacionEtapa
  religiosa?: ValidacionEtapa
}

interface Dirigente {
  id: string
  nombre: string
  apellido: string
  email: string | null
  rama_asignada: string | null
  rol: string | null
  tiene_insignia_madera: boolean
  rama_im: string | null
  im_sistema_anterior: boolean
  tiene_im_gestion: boolean
  activo: boolean
  cursos: CursoEstado[]
  validaciones?: Validaciones
  creado_en: string
  actualizado_en: string
}

// ============================================
// HELPERS
// ============================================
const formatFecha = (fecha: string | null | undefined) => {
  if (!fecha) return '-'
  const partes = fecha.split('-')
  if (partes.length !== 3) return '-'
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const getRolLabel = (rol: string | null) => {
  if (!rol) return '-'
  const found = ROLES.find(r => r.value === rol)
  return found?.label || rol
}

const getRamaLabel = (rama: string | null) => {
  if (!rama) return '-'
  const labels: Record<string, string> = {
    'Manada': '🐺 Manada',
    'Unidad Scout': '⚜️ Unidad',
    'Caminantes': '🏔️ Caminantes',
    'Rovers': '🔥 Rovers',
    'Lobatos y Lobeznas': '🐺 Lobatos y Lobeznas',
    'Scouts': '⚜️ Scouts',
  }
  return labels[rama] || rama
}

const normalizarRama = (rama: string | null): string => {
  if (!rama) return ''
  const r = rama.trim()
  const mapa: Record<string, string> = {
    'Manada': 'Lobatos y Lobeznas',
    'Lobatos y Lobeznas': 'Lobatos y Lobeznas',
    'Unidad Scout': 'Scouts',
    'Unidad': 'Scouts',
    'Scouts': 'Scouts',
    'Caminantes': 'Caminantes',
    'Rovers': 'Rovers',
  }
  return mapa[r] || r
}

const calcularEstadoGeneral = (cursos: CursoEstado[]) => {
  const cursosObligatorios = cursos.filter(c => {
    const info = CURSOS.find(x => x.id === c.curso_id)
    return info?.obligatorio
  })

  const completados = cursosObligatorios.filter(c =>
    c.estado === 'completado' || c.estado === 'transporte_anterior'
  ).length
  const enCurso = cursosObligatorios.filter(c => c.estado === 'anotado').length
  const total = TOTAL_CURSOS_OBLIGATORIOS

  if (completados === total) return { label: 'Al día', color: '#5C7A5E', emoji: '🟢', completados, total }
  if (completados > 0 || enCurso > 0) return { label: 'En curso', color: '#C48A2A', emoji: '🟡', completados, total }
  return { label: 'Sin iniciar', color: '#BF4E30', emoji: '🔴', completados, total }
}

const inicializarCursos = (): CursoEstado[] =>
  CURSOS.map(c => ({ curso_id: c.id, estado: 'pendiente' as const }))

const inicializarValidacion = (): ValidacionEtapa => ({
  validado_cg: { ok: false },
  simbolo_entregado: { ok: false },
})

const esRolSinRama = (rol: string | null): boolean => {
  if (!rol) return false
  return ['Jefatura', 'Administrador', 'SUPER_ADMIN', 'Tesorero'].includes(rol)
}

const calcularCursosCambioRama = (
  tieneIM: boolean,
  ramaIM: string | null,
  ramaAsignada: string | null,
  rol: string | null
): string[] => {
  if (!tieneIM || !ramaIM || !ramaAsignada) return []
  if (esRolSinRama(rol)) return []

  const ramasIM = ramaIM.split(',').map(s => s.trim()).filter(Boolean)
  const ramaActualNormalizada = normalizarRama(ramaAsignada)
  const cursosSet = new Set<string>()

  ramasIM.forEach(rama => {
    const ramaNormalizada = normalizarRama(rama)
    if (CURSOS_CAMBIO_RAMA[ramaNormalizada]?.[ramaActualNormalizada]) {
      CURSOS_CAMBIO_RAMA[ramaNormalizada][ramaActualNormalizada].forEach(c => cursosSet.add(c))
    }
  })

  return Array.from(cursosSet)
}

const getValidacion = (dirigente: Dirigente, etapa: string): ValidacionEtapa => {
  if (!dirigente.validaciones) return inicializarValidacion()
  const val = dirigente.validaciones[etapa as keyof Validaciones]
  if (!val) return inicializarValidacion()
  return val
}

const estaValidacionCompleta = (val: ValidacionEtapa): boolean => {
  return val.validado_cg.ok && val.simbolo_entregado.ok
}

const emojiValidacion = (val: ValidacionEtapa): string => {
  if (estaValidacionCompleta(val)) return '✅'
  if (val.validado_cg.ok || val.simbolo_entregado.ok) return '🔄'
  return '⬜'
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function Formacion() {
  const { isSuperAdmin, isJefatura, profile } = useAuth()

  const [dirigentes, setDirigentes] = useState<Dirigente[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [busqueda, setBusqueda] = useState('')
  const [filtroRama, setFiltroRama] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [orden, setOrden] = useState<OrdenTipo>('apellido_asc')

  const [indiceDirigente, setIndiceDirigente] = useState<number>(-1)
  const [dragOffset, setDragOffset] = useState(0)
  const [hayEdicionAbierta, setHayEdicionAbierta] = useState(false)

  const [showNuevoDirigente, setShowNuevoDirigente] = useState(false)
  const [editandoDirigente, setEditandoDirigente] = useState<Dirigente | null>(null)

  const puedeVer = isSuperAdmin || isJefatura

  useEffect(() => {
    if (puedeVer) loadDirigentes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeVer])

  const loadDirigentes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('formacion_dirigentes')
        .select('*')
        .order('apellido', { ascending: true })

      if (error) throw error

      const normalizados = (data || []).map((d: any) => ({
        ...d,
        cursos: Array.isArray(d.cursos) && d.cursos.length > 0
          ? d.cursos
          : inicializarCursos(),
        validaciones: d.validaciones || {}
      }))

      setDirigentes(normalizados)
    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al cargar los dirigentes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (dirigente: Dirigente) => {
    if (!confirm(`¿Eliminar a ${dirigente.nombre} ${dirigente.apellido}? Esta acción no se puede deshacer.`)) return

    try {
      const { error } = await supabase
        .from('formacion_dirigentes')
        .delete()
        .eq('id', dirigente.id)

      if (error) throw error

      setMessage({ text: '✅ Dirigente eliminado', type: 'success' })
      await loadDirigentes()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al eliminar', type: 'error' })
    }
  }

  const guardarCurso = async (dirigenteId: string, cursoActualizado: CursoEstado) => {
    const dirigente = dirigentes.find(d => d.id === dirigenteId)
    if (!dirigente) return

    const cursosNuevos = dirigente.cursos.map(c =>
      c.curso_id === cursoActualizado.curso_id ? cursoActualizado : c
    )

    const { error } = await supabase
      .from('formacion_dirigentes')
      .update({ cursos: cursosNuevos })
      .eq('id', dirigenteId)

    if (error) throw error
    await loadDirigentes()
  }

  const guardarValidacion = async (dirigenteId: string, etapa: string, validacion: ValidacionEtapa) => {
    const dirigente = dirigentes.find(d => d.id === dirigenteId)
    if (!dirigente) return

    const validacionesNuevas: Validaciones = {
      ...(dirigente.validaciones || {}),
      [etapa]: validacion
    }

    const { error } = await supabase
      .from('formacion_dirigentes')
      .update({ validaciones: validacionesNuevas })
      .eq('id', dirigenteId)

    if (error) throw error
    await loadDirigentes()
  }

  const dirigentesFiltrados = React.useMemo(() => {
    let lista = dirigentes.filter(d => {
      if (!mostrarInactivos && !d.activo) return false
      if (filtroRama !== 'Todas' && d.rama_asignada !== filtroRama) return false

      if (filtroEstado !== 'Todos') {
        const estado = calcularEstadoGeneral(d.cursos)
        const normalizado = estado.label === 'Al día' ? 'AlDia'
                          : estado.label === 'En curso' ? 'EnCurso'
                          : 'SinIniciar'
        if (filtroEstado !== normalizado) return false
      }

      if (busqueda.trim()) {
        const term = busqueda.toLowerCase()
        const nombreCompleto = `${d.nombre} ${d.apellido}`.toLowerCase()
        const email = (d.email || '').toLowerCase()
        return nombreCompleto.includes(term) || email.includes(term)
      }

      return true
    })

    lista.sort((a, b) => {
      switch (orden) {
        case 'apellido_asc':
          return a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre)
        case 'apellido_desc':
          return b.apellido.localeCompare(a.apellido) || b.nombre.localeCompare(a.nombre)
        case 'progreso_desc': {
          const pA = calcularEstadoGeneral(a.cursos).completados
          const pB = calcularEstadoGeneral(b.cursos).completados
          return pB - pA
        }
        case 'progreso_asc': {
          const pA = calcularEstadoGeneral(a.cursos).completados
          const pB = calcularEstadoGeneral(b.cursos).completados
          return pA - pB
        }
        case 'fecha_desc':
          return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
        case 'rol':
          return (a.rol || '').localeCompare(b.rol || '')
        case 'rama': {
          const oA = ORDEN_RAMAS[a.rama_asignada || ''] || 99
          const oB = ORDEN_RAMAS[b.rama_asignada || ''] || 99
          if (oA !== oB) return oA - oB
          return a.apellido.localeCompare(b.apellido)
        }
        default:
          return 0
      }
    })

    return lista
  }, [dirigentes, busqueda, filtroRama, filtroEstado, mostrarInactivos, orden])

  const irAlAnterior = () => {
    if (hayEdicionAbierta) return
    if (indiceDirigente > 0) setIndiceDirigente(indiceDirigente - 1)
  }

  const irAlSiguiente = () => {
    if (hayEdicionAbierta) return
    if (indiceDirigente < dirigentesFiltrados.length - 1) setIndiceDirigente(indiceDirigente + 1)
  }

  const handleDrag = (deltaX: number) => {
    if (hayEdicionAbierta) return
    const limitado = Math.max(-50, Math.min(50, deltaX))
    setDragOffset(limitado)
  }

  const handleDragEnd = () => setDragOffset(0)

  useSwipe({
    onSwipeLeft: irAlSiguiente,
    onSwipeRight: irAlAnterior,
    threshold: 100,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
    enabled: indiceDirigente >= 0 && !hayEdicionAbierta
  })

  if (!puedeVer) {
    return (
      <div style={{
        padding: '48px 16px', textAlign: 'center',
        fontFamily: 'Oswald, sans-serif', color: '#BF4E30',
        fontSize: 'clamp(12px, 2.5vw, 16px)'
      }}>
        ⚠️ No tenés permisos para acceder a esta página
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>
          Cargando dirigentes...
        </span>
      </div>
    )
  }

  // ============================================
  // VISTA DETALLE
  // ============================================
  if (indiceDirigente >= 0 && indiceDirigente < dirigentesFiltrados.length) {
    const dirigenteAbierto = dirigentesFiltrados[indiceDirigente]
    const estado = calcularEstadoGeneral(dirigenteAbierto.cursos)
    const etapas = ['basica', 'intermedia', 'avanzada', 'religiosa']
    const rolSinRama = esRolSinRama(dirigenteAbierto.rol)
    const cursosCambioRama = calcularCursosCambioRama(
      dirigenteAbierto.tiene_insignia_madera,
      dirigenteAbierto.rama_im,
      dirigenteAbierto.rama_asignada,
      dirigenteAbierto.rol
    )

    const total = dirigentesFiltrados.length
    const actual = indiceDirigente + 1

    return (
      <div
        style={{
          fontFamily: 'Oswald, sans-serif',
          transform: `translateX(${dragOffset}px)`,
          transition: dragOffset === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Navegación superior */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '12px', gap: '8px'
        }}>
          <button
            onClick={() => {
              setIndiceDirigente(-1)
              setHayEdicionAbierta(false)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: 'none',
              cursor: 'pointer', color: '#7A7364',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              padding: '6px 0', flexShrink: 0
            }}
          >
            ← Volver
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: '13px', color: '#7A7364'
            }}>
              {actual} / {total}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={irAlAnterior}
                disabled={indiceDirigente <= 0 || hayEdicionAbierta}
                style={{
                  backgroundColor: (indiceDirigente <= 0 || hayEdicionAbierta) ? '#E8DEC4' : '#24352A',
                  color: (indiceDirigente <= 0 || hayEdicionAbierta) ? '#7A7364' : 'white',
                  border: 'none', borderRadius: '6px',
                  padding: '4px 12px',
                  cursor: (indiceDirigente <= 0 || hayEdicionAbierta) ? 'default' : 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '16px', lineHeight: 1.4,
                  opacity: (indiceDirigente <= 0 || hayEdicionAbierta) ? 0.5 : 1
                }}
              >◀</button>
              <button
                onClick={irAlSiguiente}
                disabled={indiceDirigente >= total - 1 || hayEdicionAbierta}
                style={{
                  backgroundColor: (indiceDirigente >= total - 1 || hayEdicionAbierta) ? '#E8DEC4' : '#24352A',
                  color: (indiceDirigente >= total - 1 || hayEdicionAbierta) ? '#7A7364' : 'white',
                  border: 'none', borderRadius: '6px',
                  padding: '4px 12px',
                  cursor: (indiceDirigente >= total - 1 || hayEdicionAbierta) ? 'default' : 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '16px', lineHeight: 1.4,
                  opacity: (indiceDirigente >= total - 1 || hayEdicionAbierta) ? 0.5 : 1
                }}
              >▶</button>
            </div>
          </div>
        </div>

        {/* Encabezado */}
        <div style={{
          backgroundColor: '#24352A', borderRadius: '16px',
          padding: '20px 16px', marginBottom: '16px',
          border: '2px solid #BF4E30',
          boxShadow: '0 0 0 2px #111111'
        }}>
          <h1 style={{
            fontSize: 'clamp(18px, 5vw, 24px)', color: '#F3ECD8',
            textTransform: 'uppercase', letterSpacing: '1px',
            margin: '0 0 6px 0', fontWeight: '700'
          }}>
            {dirigenteAbierto.nombre} {dirigenteAbierto.apellido}
          </h1>

          <p style={{
            fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#D1C9B4',
            margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            {getRolLabel(dirigenteAbierto.rol)}
          </p>

          {dirigenteAbierto.rama_asignada && (
            <p style={{
              fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#D1C9B4',
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              🏕️ {getRamaLabel(dirigenteAbierto.rama_asignada)}
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {dirigenteAbierto.tiene_insignia_madera && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 12px 4px 6px', backgroundColor: '#C48A2A',
                color: '#FFFFFF', borderRadius: '12px',
                fontSize: 'clamp(10px, 2vw, 12px)',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                <img
                  src="/insignia-madera.png"
                  alt="IM"
                  style={{
                    width: '20px', height: '20px', objectFit: 'contain',
                    borderRadius: '50%', backgroundColor: 'white',
                    padding: '2px', flexShrink: 0
                  }}
                />
                IM · {dirigenteAbierto.rama_im}
                {dirigenteAbierto.im_sistema_anterior && ' 📜'}
              </div>
            )}

            {dirigenteAbierto.tiene_im_gestion && (
              <div style={{
                display: 'inline-block',
                padding: '4px 12px', backgroundColor: '#5C7A5E',
                color: '#FFFFFF', borderRadius: '12px',
                fontSize: 'clamp(10px, 2vw, 12px)',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                📋 IM Gestión
              </div>
            )}
          </div>

          {rolSinRama ? (
            <div style={{
              marginTop: '14px', paddingTop: '14px',
              borderTop: '2px dashed rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                color: '#D1C9B4',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                ℹ️ No requiere actualización (no trabaja en rama)
              </span>
            </div>
          ) : (
            <div style={{
              marginTop: '14px', paddingTop: '14px',
              borderTop: '2px dashed rgba(255,255,255,0.2)'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '6px'
              }}>
                <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#D1C9B4', textTransform: 'uppercase' }}>
                  Progreso: {estado.completados}/{estado.total}
                </span>
                <span style={{
                  fontSize: 'clamp(11px, 2.5vw, 13px)',
                  color: estado.color, fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {estado.emoji} {estado.label}
                </span>
              </div>
              <div style={{
                height: '8px', backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '4px', overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(estado.completados / estado.total) * 100}%`,
                  backgroundColor: estado.color, transition: 'width 0.3s'
                }} />
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setEditandoDirigente(dirigenteAbierto)
              setHayEdicionAbierta(true)
            }}
            style={{
              marginTop: '14px', width: '100%',
              padding: '8px', backgroundColor: '#BF4E30',
              color: 'white', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
              fontSize: '12px', textTransform: 'uppercase',
              letterSpacing: '0.5px', fontWeight: '600'
            }}
          >
            ✏️ Editar Datos del Dirigente
          </button>
        </div>

        {/* Alerta cambio de rama */}
        {cursosCambioRama.length > 0 && (
          <div style={{
            backgroundColor: '#FFF8E7', border: '2px solid #F5C842',
            borderRadius: '12px', padding: '14px', marginBottom: '16px'
          }}>
            <div style={{
              fontSize: 'clamp(12px, 3vw, 14px)', fontWeight: '600',
              color: '#7A5C00', marginBottom: '8px',
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              ⚠️ Cambio de Rama Requerido
            </div>
            <div style={{
              fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#7A5C00', lineHeight: 1.5
            }}>
              Tiene IM en <strong>{dirigenteAbierto.rama_im}</strong> y trabaja en <strong>{dirigenteAbierto.rama_asignada}</strong>.
              Debe realizar estos cursos:
            </div>
            <ul style={{
              margin: '8px 0 0 0', paddingLeft: '20px',
              fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#7A5C00'
            }}>
              {cursosCambioRama.map(cursoId => {
                const curso = CURSOS.find(c => c.id === cursoId)
                const c = dirigenteAbierto.cursos.find(x => x.curso_id === cursoId)
                const completado = c?.estado === 'completado' || c?.estado === 'transporte_anterior'
                return (
                  <li key={cursoId} style={{ marginBottom: '4px' }}>
                    {completado ? '✅' : '⬜'} {curso?.nombre || cursoId}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Etapas (cursos + validación integrada) */}
        {etapas.map(etapa => {
          const cursosDeEtapa = CURSOS.filter(c => c.etapa === etapa)
          const obligatoriosEtapa = cursosDeEtapa.filter(c => c.obligatorio)
          const completadosEtapa = obligatoriosEtapa.filter(c => {
            const f = dirigenteAbierto.cursos.find(x => x.curso_id === c.id)
            return f?.estado === 'completado' || f?.estado === 'transporte_anterior'
          }).length

          const validacion = getValidacion(dirigenteAbierto, etapa)
          const todosCursosEtapaCompletos = completadosEtapa === obligatoriosEtapa.length

          return (
            <div
              key={etapa}
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #E8DEC4',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px'
              }}
            >
              {/* Encabezado de la etapa */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: '10px',
                paddingBottom: '10px', marginBottom: '14px',
                borderBottom: '2px dashed #E8DEC4'
              }}>
                <div style={{
                  fontSize: 'clamp(13px, 3vw, 15px)',
                  fontWeight: '700', color: '#24352A',
                  textTransform: 'uppercase', letterSpacing: '1px'
                }}>
                  {ETAPAS_LABELS[etapa]}
                </div>
                {etapa !== 'religiosa' && (
                  <span style={{
                    fontSize: 'clamp(11px, 2.5vw, 13px)',
                    color: '#7A7364', fontWeight: '600'
                  }}>
                    {completadosEtapa}/{obligatoriosEtapa.length}
                  </span>
                )}
              </div>

              {/* Cursos */}
              <div>
                {cursosDeEtapa.map(cursoInfo => {
                  const formacion = dirigenteAbierto.cursos.find(x => x.curso_id === cursoInfo.id)
                  if (!formacion) return null

                  return (
                    <CursoItem
                      key={cursoInfo.id}
                      curso={formacion}
                      cursoInfo={cursoInfo}
                      esCambioRama={cursosCambioRama.includes(cursoInfo.id)}
                      onGuardar={(cursoActualizado) => guardarCurso(dirigenteAbierto.id, cursoActualizado)}
                      onEdicionChange={setHayEdicionAbierta}
                      profile={profile}
                      dirigenteId={dirigenteAbierto.id}
                    />
                  )
                })}
              </div>

              {/* Validación integrada (solo básica, intermedia, avanzada) */}
              {etapa !== 'religiosa' && (
                <>
                  {/* Separador punteado */}
                  <div style={{
                    marginTop: '16px',
                    marginBottom: '16px',
                    borderTop: '2px dashed #D1C9B4'
                  }} />

                  <ValidacionEtapaItem
                    etapa={etapa}
                    validacion={validacion}
                    todosCursosCompletos={todosCursosEtapaCompletos}
                    onGuardar={(nuevaValidacion) => guardarValidacion(dirigenteAbierto.id, etapa, nuevaValidacion)}
                    onEdicionChange={setHayEdicionAbierta}
                    profile={profile}
                    dirigenteId={dirigenteAbierto.id}
                  />
                </>
              )}
            </div>
          )
        })}

        {/* Modal editar dirigente */}
        {editandoDirigente && (
          <ModalDirigente
            dirigente={editandoDirigente}
            onClose={() => {
              setEditandoDirigente(null)
              setHayEdicionAbierta(false)
            }}
            onSave={async () => {
              setEditandoDirigente(null)
              setHayEdicionAbierta(false)
              await loadDirigentes()
              setMessage({ text: '✅ Dirigente actualizado', type: 'success' })
              setTimeout(() => setMessage({ text: '', type: '' }), 3000)
            }}
          />
        )}
      </div>
    )
  }

  // ============================================
  // VISTA PRINCIPAL
  // ============================================
  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
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
            🎓 Formación
          </h1>
          <p style={{
            fontSize: 'clamp(11px, 2.5vw, 14px)',
            color: '#7A7364', textTransform: 'uppercase',
            letterSpacing: '0.5px', margin: '4px 0 0 0'
          }}>
            {dirigentesFiltrados.length} de {dirigentes.length} dirigentes
          </p>
        </div>

        <button
          onClick={() => {
            setShowNuevoDirigente(true)
            setHayEdicionAbierta(true)
          }}
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
          + Nuevo Dirigente
        </button>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            border: '2px solid #D1C9B4', borderRadius: '8px',
            outline: 'none', fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white', boxSizing: 'border-box'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={filtroRama}
            onChange={(e) => setFiltroRama(e.target.value)}
            style={{
              flex: 1, minWidth: '120px', padding: '8px 12px',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              border: '2px solid #D1C9B4', borderRadius: '8px',
              outline: 'none', fontFamily: 'Oswald, sans-serif',
              backgroundColor: 'white', cursor: 'pointer'
            }}
          >
            <option value="Todas">Todas las ramas</option>
            <option value="Manada">🐺 Manada</option>
            <option value="Unidad Scout">⚜️ Unidad Scout</option>
            <option value="Caminantes">🏔️ Caminantes</option>
            <option value="Rovers">🔥 Rovers</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              flex: 1, minWidth: '120px', padding: '8px 12px',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              border: '2px solid #D1C9B4', borderRadius: '8px',
              outline: 'none', fontFamily: 'Oswald, sans-serif',
              backgroundColor: 'white', cursor: 'pointer'
            }}
          >
            <option value="Todos">Todos los estados</option>
            <option value="AlDia">🟢 Al día</option>
            <option value="EnCurso">🟡 En curso</option>
            <option value="SinIniciar">🔴 Sin iniciar</option>
          </select>

          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as OrdenTipo)}
            style={{
              flex: 1, minWidth: '160px', padding: '8px 12px',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              border: '2px solid #D1C9B4', borderRadius: '8px',
              outline: 'none', fontFamily: 'Oswald, sans-serif',
              backgroundColor: 'white', cursor: 'pointer'
            }}
          >
            {OPCIONES_ORDEN.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: '#7A7364', cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Mostrar inactivos
        </label>
      </div>

      {dirigentesFiltrados.map((d, idx) => {
        const estado = calcularEstadoGeneral(d.cursos)
        const rolSinRama = esRolSinRama(d.rol)
        const valBasica = getValidacion(d, 'basica')
        const valIntermedia = getValidacion(d, 'intermedia')
        const valAvanzada = getValidacion(d, 'avanzada')

        return (
          <div
            key={d.id}
            style={{
              backgroundColor: d.activo ? 'white' : '#F5F1E8',
              border: `2px solid ${d.activo ? '#E8DEC4' : '#D1C9B4'}`,
              borderRadius: '12px', padding: '14px',
              marginBottom: '10px',
              opacity: d.activo ? 1 : 0.7
            }}
          >
            <div
              onClick={() => setIndiceDirigente(idx)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: '12px', marginBottom: '10px'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'clamp(13px, 3vw, 15px)',
                    fontWeight: '700', color: '#24352A',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    {d.apellido}, {d.nombre}
                    {!d.activo && (
                      <span style={{
                        marginLeft: '8px', fontSize: '10px',
                        color: '#BF4E30', fontWeight: '700'
                      }}>
                        [INACTIVO]
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    color: '#7A7364', marginTop: '2px'
                  }}>
                    {getRolLabel(d.rol)} {d.rama_asignada && `· ${getRamaLabel(d.rama_asignada)}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                  {d.tiene_insignia_madera && (
                    <img
                      src="/insignia-madera.png"
                      alt="IM"
                      title={`IM en ${d.rama_im}`}
                      style={{
                        width: '24px', height: '24px',
                        objectFit: 'contain', flexShrink: 0
                      }}
                    />
                  )}
                  {d.tiene_im_gestion && (
                    <span style={{ fontSize: '18px' }} title="IM en Gestión">
                      📋
                    </span>
                  )}
                </div>
              </div>

              {rolSinRama ? (
                <div style={{
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  color: '#7A7364', fontStyle: 'italic',
                  textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  ℹ️ No requiere actualización
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    flex: 1, height: '6px',
                    backgroundColor: '#F0EDE5',
                    borderRadius: '3px', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(estado.completados / estado.total) * 100}%`,
                      backgroundColor: estado.color,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <span style={{
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    color: estado.color, fontWeight: '600',
                    whiteSpace: 'nowrap', textTransform: 'uppercase'
                  }}>
                    {estado.emoji} {estado.completados}/{estado.total}
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex', gap: '8px', marginTop: '8px',
                fontSize: 'clamp(10px, 2vw, 12px)',
                color: '#7A7364', flexWrap: 'wrap'
              }}>
                <span title="Validación Nivel 1">
                  N1: {emojiValidacion(valBasica)}
                </span>
                <span title="Validación Nivel 2">
                  N2: {emojiValidacion(valIntermedia)}
                </span>
                <span title="Validación Nivel 3">
                  N3: {emojiValidacion(valAvanzada)}
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex', gap: '6px', marginTop: '10px',
              paddingTop: '10px', borderTop: '1px dashed #E8DEC4',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setEditandoDirigente(d)}
                style={{
                  padding: '4px 12px', fontSize: '11px',
                  backgroundColor: '#F3ECD8', color: '#24352A',
                  border: '2px solid #D1C9B4', borderRadius: '6px',
                  cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.3px'
                }}
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => handleEliminar(d)}
                style={{
                  padding: '4px 12px', fontSize: '11px',
                  backgroundColor: '#FEE2E2', color: '#BF4E30',
                  border: '2px solid #FECACA', borderRadius: '6px',
                  cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.3px'
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        )
      })}

      {dirigentesFiltrados.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: '#7A7364', fontSize: 'clamp(12px, 3vw, 14px)',
          textTransform: 'uppercase', letterSpacing: '1px'
        }}>
          {dirigentes.length === 0
            ? 'Todavía no hay dirigentes cargados. Empezá con el botón "+ Nuevo Dirigente".'
            : 'No se encontraron dirigentes con esos filtros'}
        </div>
      )}

      {showNuevoDirigente && (
        <ModalDirigente
          onClose={() => {
            setShowNuevoDirigente(false)
            setHayEdicionAbierta(false)
          }}
          onSave={async () => {
            setShowNuevoDirigente(false)
            setHayEdicionAbierta(false)
            await loadDirigentes()
            setMessage({ text: '✅ Dirigente agregado', type: 'success' })
            setTimeout(() => setMessage({ text: '', type: '' }), 3000)
          }}
        />
      )}

      {editandoDirigente && (
        <ModalDirigente
          dirigente={editandoDirigente}
          onClose={() => {
            setEditandoDirigente(null)
            setHayEdicionAbierta(false)
          }}
          onSave={async () => {
            setEditandoDirigente(null)
            setHayEdicionAbierta(false)
            await loadDirigentes()
            setMessage({ text: '✅ Dirigente actualizado', type: 'success' })
            setTimeout(() => setMessage({ text: '', type: '' }), 3000)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// VALIDACIÓN DE ETAPA (integrada, sin recuadro propio)
// ============================================
function ValidacionEtapaItem({
  etapa,
  validacion,
  todosCursosCompletos,
  onGuardar,
  onEdicionChange,
  profile,
  dirigenteId
}: {
  etapa: string
  validacion: ValidacionEtapa
  todosCursosCompletos: boolean
  onGuardar: (v: ValidacionEtapa) => Promise<void>
  onEdicionChange: (editando: boolean) => void
  profile: any
  dirigenteId: string
}) {
  const [editando, setEditando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subiendoActa, setSubiendoActa] = useState(false)
  const [error, setError] = useState('')

  const [validadoOk, setValidadoOk] = useState(validacion.validado_cg.ok)
  const [validadoFecha, setValidadoFecha] = useState(validacion.validado_cg.fecha || '')
  const [validadoNotas, setValidadoNotas] = useState(validacion.validado_cg.notas || '')
  const [actaUrl, setActaUrl] = useState(validacion.validado_cg.acta_url || '')
  const [actaNombre, setActaNombre] = useState(validacion.validado_cg.acta_nombre || '')

  const [simboloOk, setSimboloOk] = useState(validacion.simbolo_entregado.ok)
  const [simboloFecha, setSimboloFecha] = useState(validacion.simbolo_entregado.fecha || '')
  const [simboloNotas, setSimboloNotas] = useState(validacion.simbolo_entregado.notas || '')

  useEffect(() => {
    if (!editando) {
      setValidadoOk(validacion.validado_cg.ok)
      setValidadoFecha(validacion.validado_cg.fecha || '')
      setValidadoNotas(validacion.validado_cg.notas || '')
      setActaUrl(validacion.validado_cg.acta_url || '')
      setActaNombre(validacion.validado_cg.acta_nombre || '')
      setSimboloOk(validacion.simbolo_entregado.ok)
      setSimboloFecha(validacion.simbolo_entregado.fecha || '')
      setSimboloNotas(validacion.simbolo_entregado.notas || '')
    }
  }, [validacion, editando])

  const abrirEdicion = () => {
    setError('')
    setEditando(true)
    onEdicionChange(true)
  }

  const cancelar = () => {
    setEditando(false)
    onEdicionChange(false)
    setError('')
  }

  const handleGuardar = async () => {
    setSaving(true)
    setError('')

    try {
      const nuevaValidacion: ValidacionEtapa = {
        validado_cg: {
          ok: validadoOk,
          fecha: validadoFecha || undefined,
          notas: validadoNotas || undefined,
          acta_url: actaUrl || undefined,
          acta_nombre: actaNombre || undefined
        },
        simbolo_entregado: {
          ok: simboloOk,
          fecha: simboloFecha || undefined,
          notas: simboloNotas || undefined
        }
      }

      await onGuardar(nuevaValidacion)
      setEditando(false)
      onEdicionChange(false)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleActaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!tiposPermitidos.includes(file.type)) {
      setError('Solo se permiten PDF o imágenes')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5 MB')
      return
    }

    setSubiendoActa(true)
    setError('')

    try {
      const ext = file.name.split('.').pop()
      const fileName = `validacion-${etapa}-${Date.now()}.${ext}`
      const filePath = `${dirigenteId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('certificados-formacion')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('certificados-formacion')
        .getPublicUrl(filePath)

      setActaUrl(publicUrl)
      setActaNombre(file.name)
    } catch (err: any) {
      console.error('Error al subir:', err)
      setError(err.message || 'Error al subir el archivo')
    } finally {
      setSubiendoActa(false)
    }
  }

  const labelEtapa = etapa === 'basica' ? 'Nivel 1'
    : etapa === 'intermedia' ? 'Nivel 2'
    : etapa === 'avanzada' ? 'Nivel 3'
    : etapa

  // ============================================
  // MODO EDICIÓN (sin recuadro propio)
  // ============================================
  if (editando) {
    return (
      <div>
        <div style={{
          fontSize: 'clamp(12px, 3vw, 14px)',
          fontWeight: '700', color: '#24352A',
          marginBottom: '12px',
          textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          🎓 Validación de {labelEtapa}
        </div>

        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: '6px',
            marginBottom: '10px', fontSize: '12px',
            backgroundColor: '#FEE2E2', color: '#BF4E30',
            border: '1px solid #FECACA'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Validación del CG */}
        <div style={{
          backgroundColor: '#FFFEF8',
          border: '2px solid #D1C9B4',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '10px'
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', marginBottom: '10px',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '13px', color: '#24352A', fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.3px'
          }}>
            <input
              type="checkbox"
              checked={validadoOk}
              onChange={(e) => setValidadoOk(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
              disabled={saving}
            />
            Validado por el Consejo de Grupo
          </label>

          {validadoOk && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelSmallStyle}>Fecha</label>
                <input
                  type="date"
                  value={validadoFecha}
                  onChange={(e) => setValidadoFecha(e.target.value)}
                  style={inputSmallStyle}
                  disabled={saving}
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={labelSmallStyle}>Notas / Acta</label>
                <input
                  type="text"
                  value={validadoNotas}
                  onChange={(e) => setValidadoNotas(e.target.value)}
                  placeholder="Ej: Acta N° 15/2026"
                  style={inputSmallStyle}
                  disabled={saving}
                />
              </div>

              <div>
                <label style={labelSmallStyle}>Adjuntar Acta (opcional)</label>
                {actaUrl ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', backgroundColor: '#D1FAE5',
                    border: '2px solid #A7F3D0', borderRadius: '6px',
                    flexWrap: 'wrap'
                  }}>
                    <span>📄</span>
                    <a
                      href={actaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1, minWidth: 0,
                        color: '#24352A', fontSize: '12px',
                        textDecoration: 'underline', fontWeight: '600',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {actaNombre || 'Ver acta'}
                    </a>
                    <button
                      type="button"
                      onClick={() => { setActaUrl(''); setActaNombre('') }}
                      disabled={saving || subiendoActa}
                      style={{
                        padding: '2px 8px', fontSize: '10px',
                        backgroundColor: '#FEE2E2', color: '#BF4E30',
                        border: '2px solid #FECACA', borderRadius: '4px',
                        cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase', fontWeight: '600'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '8px',
                    border: '2px dashed #D1C9B4', borderRadius: '6px',
                    cursor: subiendoActa ? 'wait' : 'pointer',
                    backgroundColor: '#FAF8F4',
                    fontSize: '11px', color: '#7A7364',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase'
                  }}>
                    {subiendoActa ? '⏳ Subiendo...' : '📎 Adjuntar acta (PDF o imagen)'}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleActaSelect}
                      style={{ display: 'none' }}
                      disabled={saving || subiendoActa}
                    />
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        {/* Entrega del símbolo */}
        <div style={{
          backgroundColor: '#FFFEF8',
          border: '2px solid #D1C9B4',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '10px'
        }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', marginBottom: '10px',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '13px', color: '#24352A', fontWeight: '600',
            textTransform: 'uppercase', letterSpacing: '0.3px'
          }}>
            <input
              type="checkbox"
              checked={simboloOk}
              onChange={(e) => setSimboloOk(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
              disabled={saving}
            />
            Símbolo entregado
          </label>

          {simboloOk && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelSmallStyle}>Fecha</label>
                <input
                  type="date"
                  value={simboloFecha}
                  onChange={(e) => setSimboloFecha(e.target.value)}
                  style={inputSmallStyle}
                  disabled={saving}
                />
              </div>
              <div>
                <label style={labelSmallStyle}>Notas</label>
                <input
                  type="text"
                  value={simboloNotas}
                  onChange={(e) => setSimboloNotas(e.target.value)}
                  placeholder="Opcional"
                  style={inputSmallStyle}
                  disabled={saving}
                />
              </div>
            </>
          )}
        </div>

        <div style={{
          display: 'flex', gap: '6px',
          justifyContent: 'flex-end', flexWrap: 'wrap'
        }}>
          <button
            type="button" onClick={cancelar}
            disabled={saving || subiendoActa}
            style={{
              padding: '6px 12px', fontSize: '11px',
              backgroundColor: '#E8DEC4', color: '#24352A',
              border: 'none', borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.3px',
              fontWeight: '600'
            }}
          >
            Cancelar
          </button>
          <button
            type="button" onClick={handleGuardar}
            disabled={saving || subiendoActa}
            style={{
              padding: '6px 12px', fontSize: '11px',
              backgroundColor: '#24352A', color: 'white',
              border: 'none', borderRadius: '6px',
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.3px',
              fontWeight: '600', opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // MODO VISUALIZACIÓN (sin recuadro propio)
  // ============================================
  const completa = validadoOk && simboloOk

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '10px', gap: '8px'
      }}>
        <div style={{
          fontSize: 'clamp(12px, 3vw, 14px)',
          fontWeight: '700',
          color: completa ? '#5C7A5E' : '#24352A',
          textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          🎓 Validación de {labelEtapa}
        </div>
        <button
          onClick={abrirEdicion}
          style={{
            padding: '4px 10px', fontSize: '11px',
            backgroundColor: '#F3ECD8', color: '#24352A',
            border: '2px solid #D1C9B4', borderRadius: '6px',
            cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.3px',
            fontWeight: '600'
          }}
        >
          ✏️ Editar
        </button>
      </div>

      {/* Check 1: Validación CG */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px',
        backgroundColor: validadoOk ? '#F0F7F0' : '#FAF8F4',
        border: `2px solid ${validadoOk ? '#B8D4B8' : '#E8DEC4'}`,
        borderRadius: '8px',
        marginBottom: '6px'
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>
          {validadoOk ? '✅' : '⬜'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            fontWeight: '600', color: '#24352A',
            textTransform: 'uppercase', letterSpacing: '0.3px'
          }}>
            Validado por el Consejo de Grupo
          </div>
          {validadoOk && (
            <div style={{
              fontSize: '11px', color: '#5C7A5E',
              marginTop: '2px', fontFamily: 'Oswald, sans-serif'
            }}>
              {validadoFecha && `📅 ${formatFecha(validadoFecha)}`}
              {validadoNotas && ` · 📝 ${validadoNotas}`}
              {actaUrl && (
                <>
                  {' · '}
                  <a
                    href={actaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#24352A', textDecoration: 'underline',
                      fontWeight: '700'
                    }}
                  >
                    📄 Acta
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Check 2: Símbolo entregado */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px',
        backgroundColor: simboloOk ? '#F0F7F0' : '#FAF8F4',
        border: `2px solid ${simboloOk ? '#B8D4B8' : '#E8DEC4'}`,
        borderRadius: '8px'
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>
          {simboloOk ? '✅' : '⬜'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            fontWeight: '600', color: '#24352A',
            textTransform: 'uppercase', letterSpacing: '0.3px'
          }}>
            Símbolo entregado
          </div>
          {simboloOk && (
            <div style={{
              fontSize: '11px', color: '#5C7A5E',
              marginTop: '2px', fontFamily: 'Oswald, sans-serif'
            }}>
              {simboloFecha && `📅 ${formatFecha(simboloFecha)}`}
              {simboloNotas && ` · 📝 ${simboloNotas}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// ITEM DE CURSO
// ============================================
function CursoItem({
  curso,
  cursoInfo,
  esCambioRama,
  onGuardar,
  onEdicionChange,
  profile,
  dirigenteId
}: {
  curso: CursoEstado
  cursoInfo: typeof CURSOS[0]
  esCambioRama: boolean
  onGuardar: (cursoActualizado: CursoEstado) => Promise<void>
  onEdicionChange: (editando: boolean) => void
  profile: any
  dirigenteId: string
}) {
  const [editando, setEditando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [error, setError] = useState('')

  const [estado, setEstado] = useState<EstadoCurso>(curso.estado)
  const [fecha, setFecha] = useState(curso.fecha || '')
  const [lugar, setLugar] = useState(curso.lugar || '')
  const [notas, setNotas] = useState(curso.notas || '')
  const [certificadoUrl, setCertificadoUrl] = useState(curso.certificado_url || '')
  const [certificadoNombre, setCertificadoNombre] = useState(curso.certificado_nombre || '')

  useEffect(() => {
    if (!editando) {
      setEstado(curso.estado)
      setFecha(curso.fecha || '')
      setLugar(curso.lugar || '')
      setNotas(curso.notas || '')
      setCertificadoUrl(curso.certificado_url || '')
      setCertificadoNombre(curso.certificado_nombre || '')
    }
  }, [curso, editando])

  const handleAbrirEdicion = () => {
    setEstado(curso.estado)
    setFecha(curso.fecha || '')
    setLugar(curso.lugar || '')
    setNotas(curso.notas || '')
    setCertificadoUrl(curso.certificado_url || '')
    setCertificadoNombre(curso.certificado_nombre || '')
    setError('')
    setEditando(true)
    onEdicionChange(true)
  }

  const handleCancelar = () => {
    setEstado(curso.estado)
    setFecha(curso.fecha || '')
    setLugar(curso.lugar || '')
    setNotas(curso.notas || '')
    setCertificadoUrl(curso.certificado_url || '')
    setCertificadoNombre(curso.certificado_nombre || '')
    setError('')
    setEditando(false)
    onEdicionChange(false)
  }

  const handleArchivoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!tiposPermitidos.includes(file.type)) {
      setError('Solo se permiten PDF o imágenes (JPG, PNG, WEBP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5 MB')
      return
    }

    setSubiendoArchivo(true)
    setError('')

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${cursoInfo.id}-${Date.now()}.${ext}`
      const filePath = `${dirigenteId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('certificados-formacion')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('certificados-formacion')
        .getPublicUrl(filePath)

      setCertificadoUrl(publicUrl)
      setCertificadoNombre(file.name)
    } catch (err: any) {
      console.error('Error al subir:', err)
      setError(err.message || 'Error al subir el archivo')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  const handleQuitarCertificado = () => {
    if (!confirm('¿Quitar el certificado adjunto?')) return
    setCertificadoUrl('')
    setCertificadoNombre('')
  }

  const handleGuardar = async () => {
    setSaving(true)
    setError('')

    try {
      const cursoActualizado: CursoEstado = {
        curso_id: curso.curso_id,
        estado,
        fecha: fecha || undefined,
        lugar: lugar || undefined,
        notas: notas || undefined,
        certificado_url: certificadoUrl || undefined,
        certificado_nombre: certificadoNombre || undefined,
        cargado_por: profile?.id,
        cargado_por_nombre: profile
          ? `${profile.nombre} ${profile.apellido || ''}`.trim()
          : 'Usuario',
        actualizado_en: new Date().toISOString()
      }

      await onGuardar(cursoActualizado)
      setEditando(false)
      onEdicionChange(false)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('¿Resetear este curso a "pendiente"? Se va a borrar también el certificado.')) return
    setSaving(true)
    setError('')

    try {
      const cursoActualizado: CursoEstado = {
        curso_id: curso.curso_id,
        estado: 'pendiente'
      }
      await onGuardar(cursoActualizado)
      setEditando(false)
      onEdicionChange(false)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al resetear')
    } finally {
      setSaving(false)
    }
  }

  const colorEstado = curso.estado === 'completado' ? '#5C7A5E'
                    : curso.estado === 'transporte_anterior' ? '#5C7A5E'
                    : curso.estado === 'anotado' ? '#C48A2A'
                    : '#A89E86'

  const emojiEstado = curso.estado === 'completado' ? '✅'
                    : curso.estado === 'transporte_anterior' ? '📜'
                    : curso.estado === 'anotado' ? '📅'
                    : '⬜'

  const bgEstado = curso.estado === 'completado' ? '#F0F7F0'
                 : curso.estado === 'transporte_anterior' ? '#E8E8E8'
                 : curso.estado === 'anotado' ? '#FFF8E7'
                 : '#FFFFFF'

  const bordeEstado = curso.estado === 'completado' ? '#B8D4B8'
                    : curso.estado === 'transporte_anterior' ? '#C0C0C0'
                    : curso.estado === 'anotado' ? '#F5C842'
                    : '#E8DEC4'

  const esTransporteAnterior = curso.estado === 'transporte_anterior'

  if (editando) {
    return (
      <div style={{
        backgroundColor: '#FFFEF8',
        border: '2px solid #24352A',
        borderRadius: '10px',
        padding: '14px',
        marginBottom: '8px'
      }}>
        <div style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          fontWeight: '700', color: '#24352A',
          marginBottom: '12px'
        }}>
          ✏️ {cursoInfo.nombre}
          {!cursoInfo.obligatorio && (
            <span style={{
              marginLeft: '6px', fontSize: '10px',
              color: '#7A7364', fontWeight: '500', fontStyle: 'italic'
            }}>
              (Opcional)
            </span>
          )}
          {esCambioRama && (
            <span style={{
              marginLeft: '6px', fontSize: '10px',
              color: '#BF4E30', fontWeight: '700'
            }}>
              [CAMBIO RAMA]
            </span>
          )}
        </div>

        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: '6px',
            marginBottom: '10px', fontSize: '12px',
            backgroundColor: '#FEE2E2', color: '#BF4E30',
            border: '1px solid #FECACA'
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <label style={labelSmallStyle}>Estado</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { val: 'pendiente' as const, label: '⬜ Pendiente', color: '#A89E86' },
              { val: 'anotado' as const, label: '📅 Anotado', color: '#C48A2A' },
              { val: 'completado' as const, label: '✅ Completado', color: '#5C7A5E' },
              { val: 'transporte_anterior' as const, label: '📜 Transporte anterior', color: '#7A7364' }
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setEstado(opt.val)}
                style={{
                  flex: 1, minWidth: '100px', padding: '6px 4px',
                  fontSize: 'clamp(9px, 1.8vw, 11px)',
                  backgroundColor: estado === opt.val ? opt.color : 'white',
                  color: estado === opt.val ? 'white' : opt.color,
                  border: `2px solid ${opt.color}`,
                  borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.3px',
                  fontWeight: '600'
                }}
                disabled={saving}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {estado !== 'pendiente' && estado !== 'transporte_anterior' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={labelSmallStyle}>Fecha</label>
              <input
                type="date" value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={inputSmallStyle} disabled={saving}
              />
            </div>
            <div>
              <label style={labelSmallStyle}>Lugar</label>
              <input
                type="text" value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Ej: En zona 3"
                style={inputSmallStyle} disabled={saving}
              />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <label style={labelSmallStyle}>Notas</label>
          <input
            type="text" value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Opcional"
            style={inputSmallStyle} disabled={saving}
          />
        </div>

        {estado !== 'pendiente' && estado !== 'transporte_anterior' && (
          <div style={{ marginBottom: '10px' }}>
            <label style={labelSmallStyle}>Certificado</label>
            {certificadoUrl ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', backgroundColor: '#D1FAE5',
                border: '2px solid #A7F3D0', borderRadius: '6px',
                flexWrap: 'wrap'
              }}>
                <span>📄</span>
                <a
                  href={certificadoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1, minWidth: 0, color: '#24352A',
                    fontSize: '12px', textDecoration: 'underline',
                    fontWeight: '600', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                  title={certificadoNombre}
                >
                  {certificadoNombre || 'Ver certificado'}
                </a>
                <button
                  type="button" onClick={handleQuitarCertificado}
                  disabled={saving || subiendoArchivo}
                  style={{
                    padding: '2px 8px', fontSize: '10px',
                    backgroundColor: '#FEE2E2', color: '#BF4E30',
                    border: '2px solid #FECACA', borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase', fontWeight: '600'
                  }}
                >
                  ✕ Quitar
                </button>
              </div>
            ) : (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '10px',
                border: '2px dashed #D1C9B4', borderRadius: '6px',
                cursor: subiendoArchivo ? 'wait' : 'pointer',
                backgroundColor: '#FAF8F4',
                fontSize: '12px', color: '#7A7364',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.3px'
              }}>
                {subiendoArchivo ? '⏳ Subiendo...' : '📎 Adjuntar certificado (PDF o imagen)'}
                <input
                  type="file" accept=".pdf,image/*"
                  onChange={handleArchivoSelect}
                  style={{ display: 'none' }}
                  disabled={saving || subiendoArchivo}
                />
              </label>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {curso.estado !== 'pendiente' && (
            <button
              type="button" onClick={handleReset}
              disabled={saving || subiendoArchivo}
              style={{
                padding: '6px 12px', fontSize: '11px',
                backgroundColor: '#FEE2E2', color: '#BF4E30',
                border: '2px solid #FECACA', borderRadius: '6px',
                cursor: saving ? 'wait' : 'pointer',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase', fontWeight: '600'
              }}
            >
              🗑️ Reset
            </button>
          )}
          <button
            type="button" onClick={handleCancelar}
            disabled={saving || subiendoArchivo}
            style={{
              padding: '6px 12px', fontSize: '11px',
              backgroundColor: '#E8DEC4', color: '#24352A',
              border: 'none', borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', fontWeight: '600',
              opacity: saving ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            type="button" onClick={handleGuardar}
            disabled={saving || subiendoArchivo}
            style={{
              padding: '6px 12px', fontSize: '11px',
              backgroundColor: '#24352A', color: 'white',
              border: 'none', borderRadius: '6px',
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', fontWeight: '600',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', backgroundColor: bgEstado,
      border: `2px solid ${bordeEstado}`,
      borderLeft: esCambioRama ? '6px solid #BF4E30' : `2px solid ${bordeEstado}`,
      borderRadius: '10px', marginBottom: '8px'
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>
        {emojiEstado}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          fontWeight: '600', color: '#24352A', lineHeight: 1.3
        }}>
          {cursoInfo.nombre}
          {!cursoInfo.obligatorio && (
            <span style={{
              marginLeft: '6px', fontSize: '10px',
              color: '#7A7364', fontWeight: '500', fontStyle: 'italic'
            }}>
              (Opcional)
            </span>
          )}
          {esCambioRama && (
            <span style={{
              marginLeft: '6px', fontSize: '10px',
              color: '#BF4E30', fontWeight: '700'
            }}>
              [CAMBIO RAMA]
            </span>
          )}
        </div>
        {curso.estado !== 'pendiente' && (
          <div style={{
            fontSize: 'clamp(10px, 2vw, 12px)',
            color: colorEstado, marginTop: '3px', fontWeight: '500'
          }}>
            {esTransporteAnterior && <span>📜 Transporte del esquema anterior</span>}
            {!esTransporteAnterior && (
              <>
                {curso.fecha && `📅 ${formatFecha(curso.fecha)}`}
                {curso.lugar && ` · 📍 ${curso.lugar}`}
                {curso.notas && ` · 📝 ${curso.notas}`}
              </>
            )}
            {curso.certificado_url && (
              <>
                {' · '}
                <a
                  href={curso.certificado_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: '#24352A', textDecoration: 'underline',
                    fontWeight: '700', fontSize: 'clamp(10px, 2vw, 12px)'
                  }}
                >
                  📄 Certificado
                </a>
              </>
            )}
            {curso.cargado_por_nombre && !esTransporteAnterior && (
              <div style={{ color: '#A89E86', fontSize: '10px', marginTop: '2px' }}>
                Cargado por: {curso.cargado_por_nombre}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        onClick={handleAbrirEdicion}
        style={{
          padding: '4px 10px', fontSize: '11px',
          backgroundColor: '#F3ECD8', color: '#24352A',
          border: '2px solid #D1C9B4', borderRadius: '6px',
          cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
          textTransform: 'uppercase', fontWeight: '600',
          flexShrink: 0
        }}
      >
        ✏️
      </button>
    </div>
  )
}

// ============================================
// MODAL DIRIGENTE
// ============================================
function ModalDirigente({
  dirigente,
  onClose,
  onSave
}: {
  dirigente?: Dirigente
  onClose: () => void
  onSave: () => void | Promise<void>
}) {
  const esEdicion = !!dirigente

  const [nombre, setNombre] = useState(dirigente?.nombre || '')
  const [apellido, setApellido] = useState(dirigente?.apellido || '')
  const [email, setEmail] = useState(dirigente?.email || '')
  const [rol, setRol] = useState(dirigente?.rol || '')
  const [ramaAsignada, setRamaAsignada] = useState(dirigente?.rama_asignada || '')
  const [tieneIM, setTieneIM] = useState(dirigente?.tiene_insignia_madera || false)
  const [ramaIM, setRamaIM] = useState(dirigente?.rama_im || '')
  const [imSistemaAnterior, setImSistemaAnterior] = useState(dirigente?.im_sistema_anterior || false)
  const [tieneImgGestion, setTieneImgGestion] = useState(dirigente?.tiene_im_gestion || false)
  const [activo, setActivo] = useState(dirigente?.activo !== false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ramasIMArray = ramaIM
    ? ramaIM.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const toggleRamaIM = (rama: string) => {
    const actuales = [...ramasIMArray]
    const idx = actuales.indexOf(rama)
    if (idx >= 0) actuales.splice(idx, 1)
    else actuales.push(rama)
    setRamaIM(actuales.join(', '))
  }

  const handleGuardar = async () => {
    if (!nombre.trim() || !apellido.trim()) {
      setError('Nombre y apellido son obligatorios')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload: any = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim() || null,
        rol: rol || null,
        rama_asignada: ramaAsignada || null,
        tiene_insignia_madera: tieneIM,
        rama_im: tieneIM ? (ramaIM || null) : null,
        im_sistema_anterior: tieneIM ? imSistemaAnterior : false,
        tiene_im_gestion: tieneImgGestion,
        activo,
        actualizado_en: new Date().toISOString()
      }

      const estabaComoIMAnterior = esEdicion ? (dirigente?.im_sistema_anterior === true) : false
      const ahoraEsIMAnterior = tieneIM && imSistemaAnterior
      const debeAplicarLogica = ahoraEsIMAnterior && !estabaComoIMAnterior

      if (esEdicion) {
        if (debeAplicarLogica) {
          const cursosCambioRama = calcularCursosCambioRama(
            true, ramaIM || null, ramaAsignada || null, rol || null
          )

          const cursosBase = dirigente?.cursos || inicializarCursos()

          const cursosFinales = cursosBase.map(c => {
            const info = CURSOS.find(x => x.id === c.curso_id)
            const esEtapaObligatoria = ['basica', 'intermedia', 'avanzada'].includes(info?.etapa || '')
            const esCambioRama = cursosCambioRama.includes(c.curso_id)

            if (c.estado === 'pendiente' && esEtapaObligatoria && !esCambioRama) {
              return { ...c, estado: 'transporte_anterior' as const }
            }
            return c
          })

          payload.cursos = cursosFinales

          const validacionesActuales = dirigente?.validaciones || {}
          const validacionesNuevas: Validaciones = { ...validacionesActuales }
          ;['basica', 'intermedia', 'avanzada'].forEach(etapa => {
            const vActual = validacionesNuevas[etapa as keyof Validaciones]
            if (!vActual || (!vActual.validado_cg.ok && !vActual.simbolo_entregado.ok)) {
              validacionesNuevas[etapa as keyof Validaciones] = {
                validado_cg: { ok: true, notas: 'Sistema anterior' },
                simbolo_entregado: { ok: true, notas: 'Sistema anterior' }
              }
            }
          })
          payload.validaciones = validacionesNuevas
        }

        const { error: updateError } = await supabase
          .from('formacion_dirigentes')
          .update(payload)
          .eq('id', dirigente!.id)
        if (updateError) throw updateError
      } else {
        const cursosIniciales = inicializarCursos()
        const validacionesIniciales: Validaciones = {}

        if (ahoraEsIMAnterior) {
          const cursosCambioRama = calcularCursosCambioRama(
            true, ramaIM || null, ramaAsignada || null, rol || null
          )

          cursosIniciales.forEach(c => {
            const info = CURSOS.find(x => x.id === c.curso_id)
            const esEtapaObligatoria = ['basica', 'intermedia', 'avanzada'].includes(info?.etapa || '')
            const esCambioRama = cursosCambioRama.includes(c.curso_id)

            if (esEtapaObligatoria && !esCambioRama) {
              c.estado = 'transporte_anterior'
            }
          })

          ;['basica', 'intermedia', 'avanzada'].forEach(etapa => {
            validacionesIniciales[etapa as keyof Validaciones] = {
              validado_cg: { ok: true, notas: 'Sistema anterior' },
              simbolo_entregado: { ok: true, notas: 'Sistema anterior' }
            }
          })
        }

        payload.cursos = cursosIniciales
        payload.validaciones = validacionesIniciales

        const { error: insertError } = await supabase
          .from('formacion_dirigentes')
          .insert(payload)
        if (insertError) throw insertError
      }

      await onSave()
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={() => !saving && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px', boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: '16px',
          padding: '24px 16px', maxWidth: '520px', width: '100%',
          border: '2px solid #D1C9B4', maxHeight: '90vh',
          overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          boxSizing: 'border-box', fontFamily: 'Oswald, sans-serif'
        }}
      >
        <h2 style={{
          fontWeight: '700', fontSize: 'clamp(15px, 3.5vw, 18px)',
          color: '#24352A', textTransform: 'uppercase',
          letterSpacing: '1px', margin: '0 0 16px 0'
        }}>
          {esEdicion ? '✏️ Editar Dirigente' : '+ Nuevo Dirigente'}
        </h2>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            marginBottom: '16px', fontSize: '13px',
            backgroundColor: '#FEE2E2', color: '#BF4E30',
            border: '1px solid #FECACA'
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Nombre *</label>
          <input type="text" value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={inputStyle} disabled={saving} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Apellido *</label>
          <input type="text" value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            style={inputStyle} disabled={saving} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="opcional"
            style={inputStyle} disabled={saving} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Rol</label>
          <select value={rol}
            onChange={(e) => setRol(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
            disabled={saving}>
            <option value="">Sin asignar</option>
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Rama donde trabaja</label>
          <select value={ramaAsignada}
            onChange={(e) => setRamaAsignada(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
            disabled={saving}>
            <option value="">Sin asignar</option>
            {RAMAS_ACTUALES.map(r => (
              <option key={r.valor} value={r.valor}>{r.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            ...labelStyle,
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', textTransform: 'none', fontSize: '13px'
          }}>
            <input type="checkbox" checked={tieneIM}
              onChange={(e) => setTieneIM(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
              disabled={saving} />
            <img src="/insignia-madera.png" alt="IM"
              style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }} />
            Tiene Insignia de Madera (Programa de Jóvenes)
          </label>
        </div>

        {tieneIM && (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Rama(s) donde obtuvo la IM</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {RAMAS_IM.map(opcion => {
                  const seleccionado = ramasIMArray.includes(opcion.valor)
                  return (
                    <label key={opcion.valor} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px',
                      border: `2px solid ${seleccionado ? '#24352A' : '#D1C9B4'}`,
                      borderRadius: '6px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      backgroundColor: seleccionado ? '#F0F7F0' : 'white',
                      fontSize: '12px', fontFamily: 'Oswald, sans-serif',
                      userSelect: 'none'
                    }}>
                      <input type="checkbox" checked={seleccionado}
                        onChange={() => toggleRamaIM(opcion.valor)}
                        disabled={saving}
                        style={{ width: '16px', height: '16px', cursor: saving ? 'not-allowed' : 'pointer', accentColor: '#24352A' }} />
                      {opcion.label}
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{
                ...labelStyle,
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', textTransform: 'none', fontSize: '13px'
              }}>
                <input type="checkbox" checked={imSistemaAnterior}
                  onChange={(e) => setImSistemaAnterior(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
                  disabled={saving} />
                📜 IM del Sistema de Formación ANTERIOR (pre-2025)
              </label>
              <div style={{
                fontSize: '10px', color: '#7A7364', marginTop: '4px',
                marginLeft: '26px', lineHeight: 1.4
              }}>
                Al guardar, se van a marcar TODOS los cursos de las 3 etapas y las
                validaciones como cumplidas, excepto los cursos que deba hacer por
                cambio de rama.
              </div>
            </div>
          </>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            ...labelStyle,
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', textTransform: 'none', fontSize: '13px'
          }}>
            <input type="checkbox" checked={tieneImgGestion}
              onChange={(e) => setTieneImgGestion(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
              disabled={saving} />
            📋 Tiene IM en Gestión Institucional
          </label>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            ...labelStyle,
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', textTransform: 'none', fontSize: '13px'
          }}>
            <input type="checkbox" checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
              disabled={saving} />
            Activo en el grupo
          </label>
        </div>

        <div style={{
          display: 'flex', gap: '8px',
          marginTop: '16px', paddingTop: '16px',
          borderTop: '2px solid #E8DEC4'
        }}>
          <button type="button" onClick={onClose}
            disabled={saving}
            style={{
              flex: 1, padding: '10px', fontSize: '13px',
              backgroundColor: '#E8DEC4', color: '#24352A',
              border: 'none', borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              fontWeight: '600', opacity: saving ? 0.5 : 1
            }}>
            Cancelar
          </button>
          <button type="button" onClick={handleGuardar}
            disabled={saving}
            style={{
              flex: 1, padding: '10px', fontSize: '13px',
              backgroundColor: '#24352A', color: 'white',
              border: 'none', borderRadius: '8px',
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              fontWeight: '600', opacity: saving ? 0.6 : 1
            }}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ESTILOS
// ============================================
const labelStyle: React.CSSProperties = {
  fontSize: '11px', color: '#7A7364',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  display: 'block', marginBottom: '6px'
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  fontSize: '13px', border: '2px solid #D1C9B4',
  borderRadius: '8px', outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  boxSizing: 'border-box', backgroundColor: 'white'
}

const labelSmallStyle: React.CSSProperties = {
  fontSize: '10px', color: '#7A7364',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  display: 'block', marginBottom: '4px'
}

const inputSmallStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px',
  fontSize: '12px', border: '2px solid #D1C9B4',
  borderRadius: '6px', outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  boxSizing: 'border-box', backgroundColor: 'white'
}