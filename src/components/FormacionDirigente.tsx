import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// CONSTANTES (copiadas del Formacion.tsx original)
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

interface DirigenteFormacion {
  id: string
  nombre: string
  apellido: string
  rama_asignada: string | null
  rol_grupo: string | null
  tiene_insignia_madera: boolean | null
  rama_im: string | null
  im_sistema_anterior: boolean | null
  tiene_im_gestion: boolean | null
  activo: boolean
  cursos: CursoEstado[]
  validaciones?: Validaciones
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

const esRolSinRama = (rol: string | null): boolean => {
  if (!rol) return false
  return ['Jefatura', 'Administrador', 'SUPER_ADMIN', 'Tesorero'].includes(rol)
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

const getValidacion = (d: DirigenteFormacion, etapa: string): ValidacionEtapa => {
  if (!d.validaciones) return inicializarValidacion()
  const val = d.validaciones[etapa as keyof Validaciones]
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

const obtenerEtapasSinValidar = (d: DirigenteFormacion): string[] => {
  if (d.tiene_insignia_madera) return []
  if (esRolSinRama(d.rol_grupo)) return []
  if (!d.activo) return []

  const etapas = ['basica', 'intermedia', 'avanzada'] as const
  const etapasLabels: Record<string, string> = {
    basica: 'Nivel 1',
    intermedia: 'Nivel 2',
    avanzada: 'Nivel 3',
  }
  const pendientes: string[] = []

  for (const etapa of etapas) {
    const cursosEtapa = CURSOS.filter(c => c.etapa === etapa && c.obligatorio)
    const completa = cursosEtapa.every(c => {
      const curso = d.cursos.find(x => x.curso_id === c.id)
      return curso?.estado === 'completado'
    })
    if (!completa) continue
    const val = getValidacion(d, etapa)
    if (!val.validado_cg.ok) {
      pendientes.push(etapasLabels[etapa])
    }
  }
  return pendientes
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function FormacionDirigente({
  dirigenteId,
  puedeEditar
}: {
  dirigenteId: string
  puedeEditar: boolean
}) {
  const { profile } = useAuth()
  const [dirigente, setDirigente] = useState<DirigenteFormacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (dirigenteId) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirigenteId])

  const cargar = async () => {
    setCargando(true)
    setError('')
    const { data, error: err } = await supabase
      .from('dirigentes')
      .select('id, nombre, apellido, rama_asignada, rol_grupo, tiene_insignia_madera, rama_im, im_sistema_anterior, tiene_im_gestion, activo, cursos, validaciones')
      .eq('id', dirigenteId)
      .single()

    if (err || !data) {
      console.error('Error cargando formación:', err)
      setError('No se pudo cargar la formación del dirigente.')
      setCargando(false)
      return
    }

    setDirigente({
      ...data,
      cursos: Array.isArray(data.cursos) && data.cursos.length > 0
        ? data.cursos
        : inicializarCursos(),
      validaciones: data.validaciones || {}
    })
    setCargando(false)
  }

  const guardarCurso = async (cursoActualizado: CursoEstado) => {
    if (!dirigente || !puedeEditar) return
    const cursosNuevos = dirigente.cursos.map(c =>
      c.curso_id === cursoActualizado.curso_id ? cursoActualizado : c
    )
    const { error: err } = await supabase
      .from('dirigentes')
      .update({ cursos: cursosNuevos })
      .eq('id', dirigente.id)
    if (err) throw err
    await cargar()
  }

  const guardarValidacion = async (etapa: string, validacion: ValidacionEtapa) => {
    if (!dirigente || !puedeEditar) return
    const validacionesNuevas: Validaciones = {
      ...(dirigente.validaciones || {}),
      [etapa]: validacion
    }
    const { error: err } = await supabase
      .from('dirigentes')
      .update({ validaciones: validacionesNuevas })
      .eq('id', dirigente.id)
    if (err) throw err
    await cargar()
  }

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'Oswald, sans-serif', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>
        Cargando formación...
      </div>
    )
  }

  if (error || !dirigente) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'Oswald, sans-serif', color: '#BF4E30', fontSize: '13px' }}>
        {error || 'No se pudo cargar la formación.'}
      </div>
    )
  }

  const estado = calcularEstadoGeneral(dirigente.cursos)
  const etapas = ['basica', 'intermedia', 'avanzada', 'religiosa']
  const rolSinRama = esRolSinRama(dirigente.rol_grupo)
  const cursosCambioRama = calcularCursosCambioRama(
    !!dirigente.tiene_insignia_madera,
    dirigente.rama_im,
    dirigente.rama_asignada,
    dirigente.rol_grupo
  )
  const etapasPendientesValidacion = obtenerEtapasSinValidar(dirigente)

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      {/* Alerta de validación pendiente */}
      {etapasPendientesValidacion.length > 0 && (
        <div style={{
          backgroundColor: '#FEF3C7',
          border: '2px solid #F5C842',
          borderLeft: '6px solid #F5C842',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: '13px', color: '#7A5C00', fontWeight: '600', lineHeight: 1.3 }}>
            Falta validar por el Consejo de Grupo: <strong>{etapasPendientesValidacion.join(', ')}</strong>
          </span>
        </div>
      )}

      {/* Banner solo lectura */}
      {!puedeEditar && (
        <div style={{
          backgroundColor: '#F3F4F6',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          🔒 Solo lectura — No tenés permisos para editar la formación
        </div>
      )}

      {/* Resumen del progreso */}
      {!rolSinRama && (
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #D1C9B4',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase' }}>
              Progreso: {estado.completados}/{estado.total}
            </span>
            <span style={{ fontSize: '12px', color: estado.color, fontWeight: '600', textTransform: 'uppercase' }}>
              {estado.emoji} {estado.label}
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#F0EDE5', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(estado.completados / estado.total) * 100}%`,
              backgroundColor: estado.color,
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* Alerta de cambio de rama */}
      {cursosCambioRama.length > 0 && (
        <div style={{
          backgroundColor: '#FFF8E7',
          border: '2px solid #F5C842',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#7A5C00', marginBottom: '8px', textTransform: 'uppercase' }}>
            ⚠️ Cambio de Rama Requerido
          </div>
          <div style={{ fontSize: '12px', color: '#7A5C00', lineHeight: 1.5 }}>
            Tiene IM en <strong>{dirigente.rama_im}</strong> y trabaja en <strong>{dirigente.rama_asignada}</strong>. Debe realizar estos cursos:
          </div>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#7A5C00' }}>
            {cursosCambioRama.map(cursoId => {
              const curso = CURSOS.find(c => c.id === cursoId)
              const c = dirigente.cursos.find(x => x.curso_id === cursoId)
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

      {/* Etapas */}
      {etapas.map(etapa => {
        const cursosDeEtapa = CURSOS.filter(c => c.etapa === etapa)
        const obligatoriosEtapa = cursosDeEtapa.filter(c => c.obligatorio)
        const completadosEtapa = obligatoriosEtapa.filter(c => {
          const f = dirigente.cursos.find(x => x.curso_id === c.id)
          return f?.estado === 'completado' || f?.estado === 'transporte_anterior'
        }).length
        const validacion = getValidacion(dirigente, etapa)
        const todosCursosEtapaCompletos = completadosEtapa === obligatoriosEtapa.length

        return (
          <div key={etapa} style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #E8DEC4',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
              paddingBottom: '10px', marginBottom: '14px', borderBottom: '2px dashed #E8DEC4'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {ETAPAS_LABELS[etapa]}
              </div>
              {etapa !== 'religiosa' && (
                <span style={{ fontSize: '12px', color: '#7A7364', fontWeight: '600' }}>
                  {completadosEtapa}/{obligatoriosEtapa.length}
                </span>
              )}
            </div>

            <div>
              {cursosDeEtapa.map(cursoInfo => {
                const formacion = dirigente.cursos.find(x => x.curso_id === cursoInfo.id)
                if (!formacion) return null
                return (
                  <CursoItem
                    key={cursoInfo.id}
                    curso={formacion}
                    cursoInfo={cursoInfo}
                    esCambioRama={cursosCambioRama.includes(cursoInfo.id)}
                    puedeEditar={puedeEditar}
                    onGuardar={guardarCurso}
                    profile={profile}
                    dirigenteId={dirigente.id}
                  />
                )
              })}
            </div>

            {etapa !== 'religiosa' && (
              <>
                <div style={{ marginTop: '16px', marginBottom: '16px', borderTop: '2px dashed #D1C9B4' }} />
                <ValidacionEtapaItem
                  etapa={etapa}
                  validacion={validacion}
                  todosCursosCompletos={todosCursosEtapaCompletos}
                  puedeEditar={puedeEditar}
                  onGuardar={(nuevaValidacion) => guardarValidacion(etapa, nuevaValidacion)}
                  profile={profile}
                  dirigenteId={dirigente.id}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// SUB-COMPONENTE: Item de curso
// ============================================
function CursoItem({
  curso,
  cursoInfo,
  esCambioRama,
  puedeEditar,
  onGuardar,
  profile,
  dirigenteId
}: {
  curso: CursoEstado
  cursoInfo: typeof CURSOS[0]
  esCambioRama: boolean
  puedeEditar: boolean
  onGuardar: (cursoActualizado: CursoEstado) => Promise<void>
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

  const resetForm = () => {
    setEstado(curso.estado)
    setFecha(curso.fecha || '')
    setLugar(curso.lugar || '')
    setNotas(curso.notas || '')
    setCertificadoUrl(curso.certificado_url || '')
    setCertificadoNombre(curso.certificado_nombre || '')
    setError('')
  }

  const handleAbrirEdicion = () => {
    resetForm()
    setEditando(true)
  }

  const handleCancelar = () => {
    resetForm()
    setEditando(false)
  }

  const handleArchivoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
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

  // ============================
  // MODO EDICIÓN
  // ============================
  if (editando && puedeEditar) {
    return (
      <div style={{
        backgroundColor: '#FFFEF8',
        border: '2px solid #24352A',
        borderRadius: '10px',
        padding: '14px',
        marginBottom: '8px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#24352A', marginBottom: '12px' }}>
          ✏️ {cursoInfo.nombre}
          {!cursoInfo.obligatorio && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#7A7364', fontStyle: 'italic' }}> (Opcional)</span>}
          {esCambioRama && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#BF4E30', fontWeight: '700' }}> [CAMBIO RAMA]</span>}
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px', backgroundColor: '#FEE2E2', color: '#BF4E30', border: '1px solid #FECACA' }}>
            ❌ {error}
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <label style={labelSmall}>Estado</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { val: 'pendiente' as const, label: '⬜ Pendiente', color: '#A89E86' },
              { val: 'anotado' as const, label: '📅 Anotado', color: '#C48A2A' },
              { val: 'completado' as const, label: '✅ Completado', color: '#5C7A5E' },
              { val: 'transporte_anterior' as const, label: '📜 Transporte anterior', color: '#7A7364' }
            ].map(opt => (
              <button key={opt.val} type="button" onClick={() => setEstado(opt.val)} disabled={saving}
                style={{
                  flex: 1, minWidth: '100px', padding: '6px 4px',
                  fontSize: '11px',
                  backgroundColor: estado === opt.val ? opt.color : 'white',
                  color: estado === opt.val ? 'white' : opt.color,
                  border: `2px solid ${opt.color}`,
                  borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase', fontWeight: '600'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {estado !== 'pendiente' && estado !== 'transporte_anterior' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={labelSmall}>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputSmall} disabled={saving} />
            </div>
            <div>
              <label style={labelSmall}>Lugar</label>
              <input type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Ej: En zona 3" style={inputSmall} disabled={saving} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <label style={labelSmall}>Notas</label>
          <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" style={inputSmall} disabled={saving} />
        </div>

        {estado !== 'pendiente' && estado !== 'transporte_anterior' && (
          <div style={{ marginBottom: '10px' }}>
            <label style={labelSmall}>Certificado</label>
            {certificadoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: '#D1FAE5', border: '2px solid #A7F3D0', borderRadius: '6px', flexWrap: 'wrap' }}>
                <span>📄</span>
                <a href={certificadoUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, color: '#24352A', fontSize: '12px', textDecoration: 'underline', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={certificadoNombre}>
                  {certificadoNombre || 'Ver certificado'}
                </a>
                <button type="button" onClick={() => { setCertificadoUrl(''); setCertificadoNombre('') }} disabled={saving || subiendoArchivo}
                  style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: '#FEE2E2', color: '#BF4E30', border: '2px solid #FECACA', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600' }}>
                  ✕ Quitar
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', border: '2px dashed #D1C9B4', borderRadius: '6px', cursor: subiendoArchivo ? 'wait' : 'pointer', backgroundColor: '#FAF8F4', fontSize: '12px', color: '#7A7364', textTransform: 'uppercase' }}>
                {subiendoArchivo ? '⏳ Subiendo...' : '📎 Adjuntar certificado (PDF o imagen)'}
                <input type="file" accept=".pdf,image/*" onChange={handleArchivoSelect} style={{ display: 'none' }} disabled={saving || subiendoArchivo} />
              </label>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleCancelar} disabled={saving || subiendoArchivo}
            style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: '#E8DEC4', color: '#24352A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleGuardar} disabled={saving || subiendoArchivo}
            style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: '#24352A', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'wait' : 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    )
  }

  // ============================
  // MODO LECTURA
  // ============================
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', backgroundColor: bgEstado,
      border: `2px solid ${bordeEstado}`,
      borderLeft: esCambioRama ? '6px solid #BF4E30' : `2px solid ${bordeEstado}`,
      borderRadius: '10px', marginBottom: '8px'
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{emojiEstado}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#24352A', lineHeight: 1.3 }}>
          {cursoInfo.nombre}
          {!cursoInfo.obligatorio && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#7A7364', fontStyle: 'italic' }}> (Opcional)</span>}
          {esCambioRama && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#BF4E30', fontWeight: '700' }}> [CAMBIO RAMA]</span>}
        </div>
        {curso.estado !== 'pendiente' && (
          <div style={{ fontSize: '11px', color: colorEstado, marginTop: '3px', fontWeight: '500' }}>
            {curso.estado === 'transporte_anterior' && <span>📜 Transporte del esquema anterior</span>}
            {curso.estado !== 'transporte_anterior' && (
              <>
                {curso.fecha && `📅 ${formatFecha(curso.fecha)}`}
                {curso.lugar && ` · 📍 ${curso.lugar}`}
                {curso.notas && ` · 📝 ${curso.notas}`}
              </>
            )}
            {curso.certificado_url && (
              <>
                {' · '}
                <a href={curso.certificado_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  style={{ color: '#24352A', textDecoration: 'underline', fontWeight: '700', fontSize: '11px' }}>
                  📄 Certificado
                </a>
              </>
            )}
            {curso.cargado_por_nombre && curso.estado !== 'transporte_anterior' && (
              <div style={{ color: '#A89E86', fontSize: '10px', marginTop: '2px' }}>
                Cargado por: {curso.cargado_por_nombre}
              </div>
            )}
          </div>
        )}
      </div>
      {puedeEditar && (
        <button onClick={handleAbrirEdicion}
          style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#F3ECD8', color: '#24352A', border: '2px solid #D1C9B4', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600', flexShrink: 0 }}>
          ✏️
        </button>
      )}
    </div>
  )
}

// ============================================
// SUB-COMPONENTE: Validación de etapa
// ============================================
function ValidacionEtapaItem({
  etapa,
  validacion,
  todosCursosCompletos,
  puedeEditar,
  onGuardar,
  profile,
  dirigenteId
}: {
  etapa: string
  validacion: ValidacionEtapa
  todosCursosCompletos: boolean
  puedeEditar: boolean
  onGuardar: (v: ValidacionEtapa) => Promise<void>
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
    } catch (err: any) {
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

  // MODO EDICIÓN
  if (editando && puedeEditar) {
    return (
      <div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#24352A', marginBottom: '12px', textTransform: 'uppercase' }}>
          🎓 Validación de {labelEtapa}
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px', backgroundColor: '#FEE2E2', color: '#BF4E30', border: '1px solid #FECACA' }}>
            ❌ {error}
          </div>
        )}

        <div style={{ backgroundColor: '#FFFEF8', border: '2px solid #D1C9B4', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px', fontSize: '12px', color: '#24352A', fontWeight: '600', textTransform: 'uppercase' }}>
            <input type="checkbox" checked={validadoOk} onChange={(e) => setValidadoOk(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }} disabled={saving} />
            Validado por el Consejo de Grupo
          </label>

          {validadoOk && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelSmall}>Fecha</label>
                <input type="date" value={validadoFecha} onChange={(e) => setValidadoFecha(e.target.value)} style={inputSmall} disabled={saving} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelSmall}>Notas / Acta</label>
                <input type="text" value={validadoNotas} onChange={(e) => setValidadoNotas(e.target.value)} placeholder="Ej: Acta N° 15/2026" style={inputSmall} disabled={saving} />
              </div>
              <div>
                <label style={labelSmall}>Adjuntar Acta (opcional)</label>
                {actaUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: '#D1FAE5', border: '2px solid #A7F3D0', borderRadius: '6px', flexWrap: 'wrap' }}>
                    <span>📄</span>
                    <a href={actaUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, color: '#24352A', fontSize: '12px', textDecoration: 'underline', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {actaNombre || 'Ver acta'}
                    </a>
                    <button type="button" onClick={() => { setActaUrl(''); setActaNombre('') }} disabled={saving || subiendoActa}
                      style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: '#FEE2E2', color: '#BF4E30', border: '2px solid #FECACA', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', border: '2px dashed #D1C9B4', borderRadius: '6px', cursor: subiendoActa ? 'wait' : 'pointer', backgroundColor: '#FAF8F4', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase' }}>
                    {subiendoActa ? '⏳ Subiendo...' : '📎 Adjuntar acta (PDF o imagen)'}
                    <input type="file" accept=".pdf,image/*" onChange={handleActaSelect} style={{ display: 'none' }} disabled={saving || subiendoActa} />
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ backgroundColor: '#FFFEF8', border: '2px solid #D1C9B4', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px', fontSize: '12px', color: '#24352A', fontWeight: '600', textTransform: 'uppercase' }}>
            <input type="checkbox" checked={simboloOk} onChange={(e) => setSimboloOk(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }} disabled={saving} />
            Símbolo entregado
          </label>
          {simboloOk && (
            <>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelSmall}>Fecha</label>
                <input type="date" value={simboloFecha} onChange={(e) => setSimboloFecha(e.target.value)} style={inputSmall} disabled={saving} />
              </div>
              <div>
                <label style={labelSmall}>Notas</label>
                <input type="text" value={simboloNotas} onChange={(e) => setSimboloNotas(e.target.value)} placeholder="Opcional" style={inputSmall} disabled={saving} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => { setEditando(false); setError('') }} disabled={saving || subiendoActa}
            style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: '#E8DEC4', color: '#24352A', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleGuardar} disabled={saving || subiendoActa}
            style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: '#24352A', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'wait' : 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    )
  }

  // MODO LECTURA
  const completa = validadoOk && simboloOk

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: completa ? '#5C7A5E' : '#24352A', textTransform: 'uppercase' }}>
          🎓 Validación de {labelEtapa}
        </div>
        {puedeEditar && (
          <button onClick={() => setEditando(true)}
            style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#F3ECD8', color: '#24352A', border: '2px solid #D1C9B4', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', fontWeight: '600' }}>
            ✏️ Editar
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', backgroundColor: validadoOk ? '#F0F7F0' : '#FAF8F4', border: `2px solid ${validadoOk ? '#B8D4B8' : '#E8DEC4'}`, borderRadius: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>{validadoOk ? '✅' : '⬜'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#24352A', textTransform: 'uppercase' }}>
            Validado por el Consejo de Grupo
          </div>
          {validadoOk && (
            <div style={{ fontSize: '11px', color: '#5C7A5E', marginTop: '2px' }}>
              {validadoFecha && `📅 ${formatFecha(validadoFecha)}`}
              {validadoNotas && ` · 📝 ${validadoNotas}`}
              {actaUrl && (
                <>
                  {' · '}
                  <a href={actaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#24352A', textDecoration: 'underline', fontWeight: '700' }}>
                    📄 Acta
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', backgroundColor: simboloOk ? '#F0F7F0' : '#FAF8F4', border: `2px solid ${simboloOk ? '#B8D4B8' : '#E8DEC4'}`, borderRadius: '8px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>{simboloOk ? '✅' : '⬜'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#24352A', textTransform: 'uppercase' }}>
            Símbolo entregado
          </div>
          {simboloOk && (
            <div style={{ fontSize: '11px', color: '#5C7A5E', marginTop: '2px' }}>
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
// ESTILOS
// ============================================
const labelSmall: React.CSSProperties = {
  fontSize: '10px',
  color: '#7A7364',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'block',
  marginBottom: '4px',
  fontFamily: 'Oswald, sans-serif'
}

const inputSmall: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: '12px',
  border: '2px solid #D1C9B4',
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  boxSizing: 'border-box',
  backgroundColor: 'white'
}