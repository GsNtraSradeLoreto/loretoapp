import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'
import { useSwipe } from '../hooks/useSwipe'
import { ordenarListaBeneficiarios } from '../utils/ordenBeneficiarios'
import { calcularProgresionActual } from '../utils/calcularProgresion'

interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  estado: string
  fecha_nacimiento: string
  tiene_hermanos: boolean
  tiene_uniforme: boolean
  fecha_ingreso_grupo: string
  fecha_entrega_uniforme: string
  foto_url: string | null
}

interface ProgresionManada {
  id: string
  fecha_ingreso_manada: string
  fecha_periodo_introductorio: string
  fecha_pata_tierna: string
  fecha_saltador: string
  fecha_rastreador: string
  fecha_cazador: string
  nombre_caza: string
  tiene_promesa_manada: boolean
  fecha_promesa_manada: string
  progresion_actual: string
}

interface ProgresionUnidad {
  id: string
  fecha_ingreso_unidad: string
  fecha_periodo_introductorio: string
  fecha_pista: string
  fecha_senda: string
  fecha_rumbo: string
  fecha_travesia: string
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string
  padrino_promesa_scout: string
  progresion_actual: string
}

interface ProgresionCaminantes {
  id: string
  fecha_ingreso_caminantes: string
  fecha_periodo_introductorio: string
  fecha_ceremonia_bienvenida: string
  fecha_etapa1: string
  fecha_etapa2: string
  fecha_etapa3: string
  fecha_etapa4: string
  elemento_elegido: string[]
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string
  padrino_promesa_scout: string
  hizo_tada: boolean
  progresion_actual: string
}

interface ProgresionRovers {
  id: string
  fecha_ingreso_rovers: string
  fecha_periodo_introductorio: string
  fecha_encuentro: string
  fecha_compromiso: string
  fecha_proyeccion: string
  fecha_partida: string
  nombre_totem: string
  campamento_totem: string
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string
  padrino_promesa_scout: string
  progresion_actual: string
}

interface Campamento {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  tipo: string
  rama_principal: string
}

// Colores
const COL = {
  fondo: '#F5F1E8',
  verdeScout: '#24352A',
  terracota: '#BF4E30',
  verdeClaro: '#5C7A5E',
  dorado: '#C48A2A',
  textoPrincipal: '#24352A',
  textoSecundario: '#7A7364',
  bordeSuave: '#E8DEC4',
  bordeFotoRojo: '#BF4E30',
  bordeFotoNegro: '#111111'
}

// Elementos Caminantes
const ELEMENTOS_CAMINANTES = ['Tierra', 'Agua', 'Aire', 'Fuego']
const ELEMENTOS_EMOJIS: Record<string, string> = {
  'Tierra': '🌍',
  'Agua': '💧',
  'Aire': '🌬️',
  'Fuego': '🔥'
}

// Formatos
const formatFecha = (fecha: string | null | undefined) => {
  if (!fecha) return '-'
  const partes = fecha.split('-')
  if (partes.length !== 3) return '-'
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const getRamaLabel = (rama: string) => {
  const labels: Record<string, string> = {
    'Manada': '🐺 Manada',
    'Unidad Scout': '⚜️ Unidad Scout',
    'Caminantes': '🏔️ Caminantes',
    'Rovers': '🔥 Rovers'
  }
  return labels[rama] || rama
}
const formatTipoConDetalle = (tipo: string, detalle: string) => {
  const detalleLimpio = (detalle || '').trim()
  const esTodas = !detalleLimpio || detalleLimpio.toLowerCase() === 'todas'

  if (esTodas || tipo === 'Anual' || tipo === 'Corto') {
    return tipo
  }
  return `${tipo} (${detalleLimpio})`
}
const getFotoUrl = (fotoUrl: string | null, nombre: string, apellido: string) => {
  if (fotoUrl) return fotoUrl
  const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="12" fill="#24352A"/>
      <text x="48" y="58" font-family="Oswald, sans-serif" font-size="34" fill="white" text-anchor="middle">${iniciales || 'U'}</text>
    </svg>
  `)}`
}

// =============================================
// COMPONENTES AUXILIARES
// =============================================

const Seccion = ({
  icono,
  titulo,
  accion,
  color = COL.verdeScout,
  children,
  colapsable = false,
  abierto = true,
  onToggle
}: {
  icono?: string,
  titulo: string,
  accion?: React.ReactNode,
  color?: string,
  children: React.ReactNode,
  colapsable?: boolean,
  abierto?: boolean,
  onToggle?: () => void
}) => (
  <div style={{
    backgroundColor: '#FFFFFF',
    border: `2px solid ${COL.bordeSuave}`,
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
    fontFamily: 'Oswald, sans-serif'
  }}>
    <div
      onClick={colapsable && onToggle ? onToggle : undefined}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        paddingBottom: '10px',
        marginBottom: abierto ? '14px' : 0,
        borderBottom: abierto ? `2px dashed ${COL.bordeSuave}` : 'none',
        flexWrap: 'wrap',
        cursor: colapsable ? 'pointer' : 'default'
      }}
    >
      <div style={{
        fontSize: 'clamp(14px, 3.5vw, 17px)',
        fontWeight: '700',
        color: color,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {icono && <span>{icono}</span>}
        <span>{titulo}</span>
        {colapsable && (
          <span style={{ fontSize: '18px', marginLeft: '4px' }}>
            {abierto ? '▲' : '▼'}
          </span>
        )}
      </div>
      {abierto && accion && (
        <div onClick={(e) => e.stopPropagation()}>
          {accion}
        </div>
      )}
    </div>
    {abierto && children}
  </div>
)

const Subtitulo = ({ texto }: { texto: string }) => (
  <div style={{
    fontFamily: 'Oswald, sans-serif',
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: COL.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginTop: '12px',
    marginBottom: '8px',
    fontWeight: '600'
  }}>
    {texto}
  </div>
)

export default function VidaScout() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, isJefatura, isAdministrador, isTesorero, getRolData } = useAuth()

  const [beneficiario, setBeneficiario] = useState<Beneficiario | null>(null)
  const [progresionManada, setProgresionManada] = useState<ProgresionManada | null>(null)
  const [progresionUnidad, setProgresionUnidad] = useState<ProgresionUnidad | null>(null)
  const [progresionCaminantes, setProgresionCaminantes] = useState<ProgresionCaminantes | null>(null)
  const [progresionRovers, setProgresionRovers] = useState<ProgresionRovers | null>(null)
  const [campamentos, setCampamentos] = useState<Campamento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Navegación entre beneficiarios
  const [todosLosIds, setTodosLosIds] = useState<string[]>([])
  const [posicionActual, setPosicionActual] = useState<number>(-1)
  const [dragOffset, setDragOffset] = useState(0)

  // UI: colapsables
  const [campamentosAbierto, setCampamentosAbierto] = useState(false)
  const [manadaAbierto, setManadaAbierto] = useState(false)
  const [unidadAbierto, setUnidadAbierto] = useState(false)
  const [caminantesAbierto, setCaminantesAbierto] = useState(false)
  const [roversAbierto, setRoversAbierto] = useState(false)
  const [ingresoGrupoAbierto, setIngresoGrupoAbierto] = useState(false)

  // UI: modales de edición por rama
  const [editandoManada, setEditandoManada] = useState(false)
  const [editandoUnidad, setEditandoUnidad] = useState(false)
  const [editandoCaminantes, setEditandoCaminantes] = useState(false)
  const [editandoRovers, setEditandoRovers] = useState(false)

  // ✅ NUEVO: edición de ingreso al grupo
  const [editandoIngresoGrupo, setEditandoIngresoGrupo] = useState(false)
  const [valorIngresoGrupo, setValorIngresoGrupo] = useState('')
  const [savingIngresoGrupo, setSavingIngresoGrupo] = useState(false)

  // Formularios de edición
  const [formManada, setFormManada] = useState({
    fecha_ingreso_manada: '',
    fecha_pata_tierna: '',
    fecha_saltador: '',
    fecha_rastreador: '',
    fecha_cazador: '',
    nombre_caza: '',
    tiene_promesa_manada: false,
    fecha_promesa_manada: '',
    progresion_actual: ''
  })

  const [formUnidad, setFormUnidad] = useState({
    fecha_ingreso_unidad: '',
    fecha_pista: '',
    fecha_senda: '',
    fecha_rumbo: '',
    fecha_travesia: '',
    tiene_promesa_scout: false,
    fecha_promesa_scout: '',
    padrino_promesa_scout: '',
    progresion_actual: ''
  })

  const [formCaminantes, setFormCaminantes] = useState({
    fecha_ingreso_caminantes: '',
    fecha_ceremonia_bienvenida: '',
    fecha_etapa1: '',
    fecha_etapa2: '',
    fecha_etapa3: '',
    fecha_etapa4: '',
    elemento1: '',
    elemento2: '',
    elemento3: '',
    elemento4: '',
    tiene_promesa_scout: false,
    fecha_promesa_scout: '',
    padrino_promesa_scout: '',
    hizo_tada: false,
    progresion_actual: ''
  })

  const [formRovers, setFormRovers] = useState({
    fecha_ingreso_rovers: '',
    fecha_encuentro: '',
    fecha_compromiso: '',
    fecha_proyeccion: '',
    fecha_partida: '',
    nombre_totem: '',
    campamento_totem: '',
    tiene_promesa_scout: false,
    fecha_promesa_scout: '',
    padrino_promesa_scout: '',
    progresion_actual: ''
  })

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'
  const esAyudante = rolData.tipo === 'ayudante'
  const ramaAsignada = rolData.rama
  const esSuperAdmin = isSuperAdmin
  const esJefatura = isJefatura

  // ✅ Visibilidad: superadmin/jefatura/admin/tesorero ven TODO
  const puedeVerInactivos = isSuperAdmin || isJefatura || isAdministrador || isTesorero

  // ✅ Permiso para editar ingreso al grupo: solo superadmin y jefatura
  const puedeEditarIngresoGrupo = isSuperAdmin || isJefatura

  // ✅ ¿Hay alguna edición abierta? Bloquea el swipe
  const hayEdicionAbierta = editandoManada || editandoUnidad || editandoCaminantes || editandoRovers || editandoIngresoGrupo

  // ✅ Permisos: ¿puedo VER los bloques de esta rama?
  const puedeVerRama = (rama: string): boolean => {
    if (esSuperAdmin || esJefatura) return true
    if (esJefe && ramaAsignada === rama) return true
    if (esAyudante && ramaAsignada === rama) return true
    return false
  }

  // ✅ Permisos: ¿puedo EDITAR esta rama?
  const puedeEditarRama = (rama: string): boolean => {
    if (esSuperAdmin || esJefatura) return true
    if (esJefe && ramaAsignada === rama) return true
    return false
  }

  // ============================================
  // CARGAR LISTA DE IDs (misma lógica que BeneficiarioDetalle)
  // ============================================
  useEffect(() => {
    cargarListaIds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarListaIds = async () => {
    try {
      let query = supabase
        .from('beneficiarios')
        .select('id, nombre, apellido, rama, estado')

      if (!puedeVerInactivos) {
        query = query.eq('estado', 'activo')
      }

      if ((esJefe || esAyudante) && ramaAsignada) {
        query = query.eq('rama', ramaAsignada)
      }

      const { data, error } = await query
      if (error) throw error

      const ordenados = ordenarListaBeneficiarios(data || [])
      setTodosLosIds(ordenados.map(item => item.id))
    } catch (error) {
      console.error('Error al cargar lista de IDs:', error)
    }
  }

  // ============================================
  // ACTUALIZAR POSICIÓN + CARGAR DATOS
  // ============================================
  useEffect(() => {
    if (id && todosLosIds.length > 0) {
      const idx = todosLosIds.indexOf(id)
      setPosicionActual(idx)
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, todosLosIds])

  // Resetear colapsables al cambiar de beneficiario
  useEffect(() => {
    setManadaAbierto(false)
    setUnidadAbierto(false)
    setCaminantesAbierto(false)
    setRoversAbierto(false)
    setCampamentosAbierto(false)
    setIngresoGrupoAbierto(false)
    setEditandoManada(false)
    setEditandoUnidad(false)
    setEditandoCaminantes(false)
    setEditandoRovers(false)
    setEditandoIngresoGrupo(false)
    setMessage({ text: '', type: '' })

    // Si es jefe o ayudante, abrir su bloque por defecto
    if ((esJefe || esAyudante) && ramaAsignada) {
      if (ramaAsignada === 'Manada') setManadaAbierto(true)
      if (ramaAsignada === 'Unidad Scout') setUnidadAbierto(true)
      if (ramaAsignada === 'Caminantes') setCaminantesAbierto(true)
      if (ramaAsignada === 'Rovers') setRoversAbierto(true)
    }
  }, [id, esJefe, esAyudante, ramaAsignada])

  const loadData = async () => {
    try {
      setLoading(true)

      const [
        beneficiarioRes,
        manadaRes,
        unidadRes,
        caminantesRes,
        roversRes,
        campamentosRes
      ] = await Promise.all([
        supabase.from('beneficiarios').select('*').eq('id', id).single(),
        supabase.from('progresion_manada').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_unidad').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_caminantes').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_rovers').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('campamentos_asistidos')
          .select(`
            id,
            campamento_id,
            campamentos (
              nombre,
              fecha_inicio,
              fecha_fin,
              tipo,
              rama_principal
            )
          `)
          .eq('beneficiario_id', id)
      ])

      if (beneficiarioRes.error) throw beneficiarioRes.error
      setBeneficiario(beneficiarioRes.data)

      setProgresionManada(manadaRes.data || null)
      setProgresionUnidad(unidadRes.data || null)
      setProgresionCaminantes(caminantesRes.data || null)
      setProgresionRovers(roversRes.data || null)

      if (campamentosRes.data) {
        const mapeados = campamentosRes.data.map((c: any) => ({
          id: c.id,
          nombre: c.campamentos?.nombre || 'Sin nombre',
          fecha_inicio: c.campamentos?.fecha_inicio || '',
          fecha_fin: c.campamentos?.fecha_fin || '',
          tipo: c.campamentos?.tipo || '',
          rama_principal: c.campamentos?.rama_principal || ''
        }))
        mapeados.sort((a, b) =>
          new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
        )
        setCampamentos(mapeados)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PROMESA SCOUT UNIFICADA
  // ============================================
  const tienePromesaScout = (): boolean => {
    if (progresionUnidad?.tiene_promesa_scout) return true
    if (progresionCaminantes?.tiene_promesa_scout) return true
    if (progresionRovers?.tiene_promesa_scout) return true
    return false
  }

  // ============================================
  // CALCULAR PROGRESIÓN ACTUAL (usa util compartido)
  // ============================================
  const calcularProgresion = (rama: string): string => {
    return calcularProgresionActual(rama, {
      manada: progresionManada,
      unidad: progresionUnidad,
      caminantes: progresionCaminantes,
      rovers: progresionRovers
    })
  }

  // ============================================
  // ✅ NUEVO: GUARDAR INGRESO AL GRUPO
  // ============================================
  const abrirEditarIngresoGrupo = () => {
    setValorIngresoGrupo(beneficiario?.fecha_ingreso_grupo || '')
    setEditandoIngresoGrupo(true)
    setIngresoGrupoAbierto(true)
  }

  const cancelarEditarIngresoGrupo = () => {
    setEditandoIngresoGrupo(false)
    setValorIngresoGrupo('')
  }

  const guardarIngresoGrupo = async () => {
    if (!beneficiario) return
    setSavingIngresoGrupo(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('beneficiarios')
        .update({ fecha_ingreso_grupo: valorIngresoGrupo || null })
        .eq('id', beneficiario.id)

      if (error) throw error

      setMessage({ text: '✅ Fecha de ingreso al grupo actualizada', type: 'success' })
      setEditandoIngresoGrupo(false)
      await loadData()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSavingIngresoGrupo(false)
    }
  }

  // ============================================
  // GUARDAR CAMBIOS DE PROGRESIÓN
  // ============================================
  const guardarManada = async () => {
    if (!progresionManada) return
    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('progresion_manada')
        .update({
          fecha_ingreso_manada: formManada.fecha_ingreso_manada || null,
          fecha_pata_tierna: formManada.fecha_pata_tierna || null,
          fecha_saltador: formManada.fecha_saltador || null,
          fecha_rastreador: formManada.fecha_rastreador || null,
          fecha_cazador: formManada.fecha_cazador || null,
          nombre_caza: formManada.nombre_caza || null,
          tiene_promesa_manada: formManada.tiene_promesa_manada,
          fecha_promesa_manada: formManada.fecha_promesa_manada || null,
          progresion_actual: formManada.progresion_actual || null
        })
        .eq('id', progresionManada.id)

      if (error) throw error

      setMessage({ text: '✅ Progresión de Manada actualizada', type: 'success' })
      setEditandoManada(false)
      await loadData()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const guardarUnidad = async () => {
    if (!progresionUnidad) return
    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('progresion_unidad')
        .update({
          fecha_ingreso_unidad: formUnidad.fecha_ingreso_unidad || null,
          fecha_pista: formUnidad.fecha_pista || null,
          fecha_senda: formUnidad.fecha_senda || null,
          fecha_rumbo: formUnidad.fecha_rumbo || null,
          fecha_travesia: formUnidad.fecha_travesia || null,
          tiene_promesa_scout: formUnidad.tiene_promesa_scout,
          fecha_promesa_scout: formUnidad.fecha_promesa_scout || null,
          padrino_promesa_scout: formUnidad.padrino_promesa_scout || null,
          progresion_actual: formUnidad.progresion_actual || null
        })
        .eq('id', progresionUnidad.id)

      if (error) throw error

      setMessage({ text: '✅ Progresión de Unidad Scout actualizada', type: 'success' })
      setEditandoUnidad(false)
      await loadData()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const guardarCaminantes = async () => {
    if (!progresionCaminantes) return
    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const elementosArray: (string | null)[] = [
        formCaminantes.elemento1 || null,
        formCaminantes.elemento2 || null,
        formCaminantes.elemento3 || null,
        formCaminantes.elemento4 || null
      ]

      const { error } = await supabase
        .from('progresion_caminantes')
        .update({
          fecha_ingreso_caminantes: formCaminantes.fecha_ingreso_caminantes || null,
          fecha_ceremonia_bienvenida: formCaminantes.fecha_ceremonia_bienvenida || null,
          fecha_etapa1: formCaminantes.fecha_etapa1 || null,
          fecha_etapa2: formCaminantes.fecha_etapa2 || null,
          fecha_etapa3: formCaminantes.fecha_etapa3 || null,
          fecha_etapa4: formCaminantes.fecha_etapa4 || null,
          elemento_elegido: elementosArray,
          tiene_promesa_scout: formCaminantes.tiene_promesa_scout,
          fecha_promesa_scout: formCaminantes.fecha_promesa_scout || null,
          padrino_promesa_scout: formCaminantes.padrino_promesa_scout || null,
          hizo_tada: formCaminantes.hizo_tada,
          progresion_actual: formCaminantes.progresion_actual || null
        })
        .eq('id', progresionCaminantes.id)

      if (error) throw error

      setMessage({ text: '✅ Progresión de Caminantes actualizada', type: 'success' })
      setEditandoCaminantes(false)
      await loadData()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const guardarRovers = async () => {
    if (!progresionRovers) return
    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('progresion_rovers')
        .update({
          fecha_ingreso_rovers: formRovers.fecha_ingreso_rovers || null,
          fecha_encuentro: formRovers.fecha_encuentro || null,
          fecha_compromiso: formRovers.fecha_compromiso || null,
          fecha_proyeccion: formRovers.fecha_proyeccion || null,
          fecha_partida: formRovers.fecha_partida || null,
          nombre_totem: formRovers.nombre_totem || null,
          campamento_totem: formRovers.campamento_totem || null,
          tiene_promesa_scout: formRovers.tiene_promesa_scout,
          fecha_promesa_scout: formRovers.fecha_promesa_scout || null,
          padrino_promesa_scout: formRovers.padrino_promesa_scout || null,
          progresion_actual: formRovers.progresion_actual || null
        })
        .eq('id', progresionRovers.id)

      if (error) throw error

      setMessage({ text: '✅ Progresión de Rovers actualizada', type: 'success' })
      setEditandoRovers(false)
      await loadData()
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // ABRIR MODAL DE EDICIÓN
  // ============================================
  const abrirEditarManada = () => {
    if (!progresionManada) return
    setFormManada({
      fecha_ingreso_manada: progresionManada.fecha_ingreso_manada || '',
      fecha_pata_tierna: progresionManada.fecha_pata_tierna || '',
      fecha_saltador: progresionManada.fecha_saltador || '',
      fecha_rastreador: progresionManada.fecha_rastreador || '',
      fecha_cazador: progresionManada.fecha_cazador || '',
      nombre_caza: progresionManada.nombre_caza || '',
      tiene_promesa_manada: progresionManada.tiene_promesa_manada || false,
      fecha_promesa_manada: progresionManada.fecha_promesa_manada || '',
      progresion_actual: progresionManada.progresion_actual || ''
    })
    setEditandoManada(true)
    setManadaAbierto(true)
  }

  const abrirEditarUnidad = () => {
    if (!progresionUnidad) return
    setFormUnidad({
      fecha_ingreso_unidad: progresionUnidad.fecha_ingreso_unidad || '',
      fecha_pista: progresionUnidad.fecha_pista || '',
      fecha_senda: progresionUnidad.fecha_senda || '',
      fecha_rumbo: progresionUnidad.fecha_rumbo || '',
      fecha_travesia: progresionUnidad.fecha_travesia || '',
      tiene_promesa_scout: progresionUnidad.tiene_promesa_scout || false,
      fecha_promesa_scout: progresionUnidad.fecha_promesa_scout || '',
      padrino_promesa_scout: progresionUnidad.padrino_promesa_scout || '',
      progresion_actual: progresionUnidad.progresion_actual || ''
    })
    setEditandoUnidad(true)
    setUnidadAbierto(true)
  }

  const abrirEditarCaminantes = () => {
    if (!progresionCaminantes) return
    const elementos = Array.isArray(progresionCaminantes.elemento_elegido)
      ? progresionCaminantes.elemento_elegido
      : []
    setFormCaminantes({
      fecha_ingreso_caminantes: progresionCaminantes.fecha_ingreso_caminantes || '',
      fecha_ceremonia_bienvenida: progresionCaminantes.fecha_ceremonia_bienvenida || '',
      fecha_etapa1: progresionCaminantes.fecha_etapa1 || '',
      fecha_etapa2: progresionCaminantes.fecha_etapa2 || '',
      fecha_etapa3: progresionCaminantes.fecha_etapa3 || '',
      fecha_etapa4: progresionCaminantes.fecha_etapa4 || '',
      elemento1: elementos[0] || '',
      elemento2: elementos[1] || '',
      elemento3: elementos[2] || '',
      elemento4: elementos[3] || '',
      tiene_promesa_scout: progresionCaminantes.tiene_promesa_scout || false,
      fecha_promesa_scout: progresionCaminantes.fecha_promesa_scout || '',
      padrino_promesa_scout: progresionCaminantes.padrino_promesa_scout || '',
      hizo_tada: progresionCaminantes.hizo_tada || false,
      progresion_actual: progresionCaminantes.progresion_actual || ''
    })
    setEditandoCaminantes(true)
    setCaminantesAbierto(true)
  }

  const abrirEditarRovers = () => {
    if (!progresionRovers) return
    setFormRovers({
      fecha_ingreso_rovers: progresionRovers.fecha_ingreso_rovers || '',
      fecha_encuentro: progresionRovers.fecha_encuentro || '',
      fecha_compromiso: progresionRovers.fecha_compromiso || '',
      fecha_proyeccion: progresionRovers.fecha_proyeccion || '',
      fecha_partida: progresionRovers.fecha_partida || '',
      nombre_totem: progresionRovers.nombre_totem || '',
      campamento_totem: progresionRovers.campamento_totem || '',
      tiene_promesa_scout: progresionRovers.tiene_promesa_scout || false,
      fecha_promesa_scout: progresionRovers.fecha_promesa_scout || '',
      padrino_promesa_scout: progresionRovers.padrino_promesa_scout || '',
      progresion_actual: progresionRovers.progresion_actual || ''
    })
    setEditandoRovers(true)
    setRoversAbierto(true)
  }

  // ============================================
  // NAVEGACIÓN ENTRE BENEFICIARIOS
  // ============================================
  const irAlAnterior = () => {
    if (hayEdicionAbierta) return
    if (posicionActual > 0) {
      const nuevoId = todosLosIds[posicionActual - 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}/vida-scout`)
    }
  }

  const irAlSiguiente = () => {
    if (hayEdicionAbierta) return
    if (posicionActual < todosLosIds.length - 1) {
      const nuevoId = todosLosIds[posicionActual + 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}/vida-scout`)
    }
  }

  // ============================================
  // SWIPE (bloqueado si hay edición abierta)
  // ============================================
  const handleSwipeLeft = () => {
    if (hayEdicionAbierta) return
    if (posicionActual < todosLosIds.length - 1) {
      const nuevoId = todosLosIds[posicionActual + 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}/vida-scout`)
    }
  }

  const handleSwipeRight = () => {
    if (hayEdicionAbierta) return
    if (posicionActual > 0) {
      const nuevoId = todosLosIds[posicionActual - 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}/vida-scout`)
    }
  }

  const handleDrag = (deltaX: number) => {
    if (hayEdicionAbierta) return
    const limitado = Math.max(-50, Math.min(50, deltaX))
    setDragOffset(limitado)
  }

  const handleDragEnd = () => {
    setDragOffset(0)
  }

  useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 100,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
    enabled: !hayEdicionAbierta
  })

  // ============================================
  // HELPERS DE RENDER
  // ============================================
  const renderHito = (
    label: string,
    fecha: string | null | undefined,
    elemento?: string | null
  ) => {
    const tieneFecha = !!fecha
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          backgroundColor: tieneFecha ? '#F0F7F0' : '#FFFFFF',
          border: `2px solid ${tieneFecha ? '#B8D4B8' : COL.bordeSuave}`,
          borderRadius: '10px',
          marginBottom: '8px'
        }}
      >
        <span style={{ fontSize: '20px', flexShrink: 0 }}>
          {tieneFecha ? '✅' : '⬜'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: 'clamp(12px, 3vw, 14px)',
            fontWeight: '600',
            color: COL.textoPrincipal,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {label}
            {elemento && (
              <span style={{ marginLeft: '6px', fontSize: '13px' }}>
                {ELEMENTOS_EMOJIS[elemento] || ''} {elemento}
              </span>
            )}
          </div>
          <div style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            color: tieneFecha ? COL.verdeClaro : COL.textoSecundario,
            marginTop: '2px'
          }}>
            {tieneFecha ? formatFecha(fecha) : 'Sin cargar'}
          </div>
        </div>
      </div>
    )
  }

  const InfoGeneral = ({
    rama,
    ingreso,
    promesa,
    fechaPromesa,
    padrino,
    nombreCaza
  }: {
    rama: string
    ingreso: string | null | undefined
    promesa: boolean | null | undefined
    fechaPromesa: string | null | undefined
    padrino: string | null | undefined
    nombreCaza?: string | null
  }) => (
    <div style={{
      backgroundColor: '#F0F7F0',
      border: `2px solid #B8D4B8`,
      borderRadius: '12px',
      padding: '14px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: COL.textoSecundario,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          ⭐ Progresión actual
        </span>
        <span style={{
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          fontWeight: '700',
          color: COL.verdeScout,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {calcularProgresion(rama)}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COL.textoSecundario }}>
          🗓️ Ingreso a la rama
        </span>
        <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COL.textoPrincipal, fontWeight: '600' }}>
          {formatFecha(ingreso)}
        </span>
      </div>

      {promesa && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COL.textoSecundario }}>
            🤝 Promesa
          </span>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COL.textoPrincipal, fontWeight: '600' }}>
            {formatFecha(fechaPromesa)}
            {padrino && ` · ${padrino}`}
          </span>
        </div>
      )}

      {nombreCaza && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COL.textoSecundario }}>
            🐺 Nombre de caza
          </span>
          <span style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: COL.textoPrincipal, fontWeight: '600' }}>
            {nombreCaza}
          </span>
        </div>
      )}
    </div>
  )

  // ============================================
  // ✅ NUEVO: RENDER INGRESO AL GRUPO
  // ============================================
  const renderIngresoGrupo = () => {
    const abierto = ingresoGrupoAbierto || editandoIngresoGrupo

    return (
      <Seccion
        icono="📅"
        titulo="Ingreso al Grupo"
        color={COL.verdeScout}
        colapsable={!editandoIngresoGrupo}
        abierto={abierto}
        onToggle={() => !editandoIngresoGrupo && setIngresoGrupoAbierto(!ingresoGrupoAbierto)}
      >
        {editandoIngresoGrupo ? (
          <>
            <CampoFecha
              label="Fecha de ingreso al grupo"
              value={valorIngresoGrupo}
              onChange={v => setValorIngresoGrupo(v)}
            />
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '16px',
              borderTop: `2px dashed ${COL.bordeSuave}`,
              paddingTop: '14px',
              justifyContent: 'flex-end',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={cancelarEditarIngresoGrupo}
                disabled={savingIngresoGrupo}
                style={{
                  backgroundColor: '#E8DEC4',
                  color: COL.textoPrincipal,
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: savingIngresoGrupo ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: savingIngresoGrupo ? 0.5 : 1,
                  fontWeight: 600
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarIngresoGrupo}
                disabled={savingIngresoGrupo}
                style={{
                  backgroundColor: COL.verdeScout,
                  color: 'white',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: savingIngresoGrupo ? 'wait' : 'pointer',
                  fontSize: '12px',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: savingIngresoGrupo ? 0.6 : 1,
                  fontWeight: 600
                }}
              >
                {savingIngresoGrupo ? 'Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <span style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: 'clamp(13px, 3vw, 15px)',
              color: beneficiario?.fecha_ingreso_grupo ? COL.textoPrincipal : COL.textoSecundario,
              fontWeight: beneficiario?.fecha_ingreso_grupo ? '600' : '400'
            }}>
              {beneficiario?.fecha_ingreso_grupo
                ? formatFecha(beneficiario.fecha_ingreso_grupo)
                : 'Sin cargar'}
            </span>
            <button
              onClick={abrirEditarIngresoGrupo}
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                backgroundColor: '#24352A',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600
              }}
            >
              ✏️ Editar
            </button>
          </div>
        )}
      </Seccion>
    )
  }

  // ============================================
  // RENDER DE PROGRESIÓN POR RAMA
  // ============================================
  const renderProgresionManada = () => {
    if (!progresionManada) return null
    const editable = puedeEditarRama('Manada')
    const estaEditando = editandoManada
    const abierto = manadaAbierto || estaEditando

    return (
      <Seccion
        icono="🐺"
        titulo={estaEditando ? 'Manada (editando)' : 'Manada'}
        color={COL.verdeClaro}
        colapsable={!estaEditando}
        abierto={abierto}
        onToggle={() => !estaEditando && setManadaAbierto(!manadaAbierto)}
        accion={editable && !estaEditando && abierto && (
          <button
            onClick={abrirEditarManada}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              backgroundColor: '#24352A',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}
          >✏️ Editar</button>
        )}
      >
        {estaEditando ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CampoFecha label="Ingreso a Manada" value={formManada.fecha_ingreso_manada}
                onChange={v => setFormManada({ ...formManada, fecha_ingreso_manada: v })} />
              <CampoFecha label="Pata Tierna" value={formManada.fecha_pata_tierna}
                onChange={v => setFormManada({ ...formManada, fecha_pata_tierna: v })} />
              <CampoFecha label="Saltador" value={formManada.fecha_saltador}
                onChange={v => setFormManada({ ...formManada, fecha_saltador: v })} />
              <CampoFecha label="Rastreador" value={formManada.fecha_rastreador}
                onChange={v => setFormManada({ ...formManada, fecha_rastreador: v })} />
              <CampoFecha label="Cazador" value={formManada.fecha_cazador}
                onChange={v => setFormManada({ ...formManada, fecha_cazador: v })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <CampoTexto label="Nombre de Caza" value={formManada.nombre_caza}
                  onChange={v => setFormManada({ ...formManada, nombre_caza: v })} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: COL.textoPrincipal }}>
                  <input type="checkbox" checked={formManada.tiene_promesa_manada}
                    onChange={e => setFormManada({ ...formManada, tiene_promesa_manada: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: COL.verdeScout }} />
                  Tiene Promesa de Manada
                </label>
              </div>
              {formManada.tiene_promesa_manada && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <CampoFecha label="Fecha de Promesa de Manada" value={formManada.fecha_promesa_manada}
                    onChange={v => setFormManada({ ...formManada, fecha_promesa_manada: v })} />
                </div>
              )}
            </div>
            <BotonesInline
              onCancelar={() => setEditandoManada(false)}
              onGuardar={guardarManada}
              saving={saving}
            />
          </>
        ) : (
          <>
            <InfoGeneral
              rama="Manada"
              ingreso={progresionManada.fecha_ingreso_manada}
              promesa={progresionManada.tiene_promesa_manada}
              fechaPromesa={progresionManada.fecha_promesa_manada}
              padrino={null}
              nombreCaza={progresionManada.nombre_caza}
            />
            <div style={{ marginTop: '16px' }}>
              <Subtitulo texto="Hitos de la rama" />
              {renderHito('Pata tierna', progresionManada.fecha_pata_tierna)}
              {renderHito('Saltador', progresionManada.fecha_saltador)}
              {renderHito('Rastreador', progresionManada.fecha_rastreador)}
              {renderHito('Cazador', progresionManada.fecha_cazador)}
            </div>
          </>
        )}
      </Seccion>
    )
  }

  const renderProgresionUnidad = () => {
    if (!progresionUnidad) return null
    const editable = puedeEditarRama('Unidad Scout')
    const estaEditando = editandoUnidad
    const abierto = unidadAbierto || estaEditando

    return (
      <Seccion
        icono="⚜️"
        titulo={estaEditando ? 'Unidad Scout (editando)' : 'Unidad Scout'}
        color={COL.dorado}
        colapsable={!estaEditando}
        abierto={abierto}
        onToggle={() => !estaEditando && setUnidadAbierto(!unidadAbierto)}
        accion={editable && !estaEditando && abierto && (
          <button
            onClick={abrirEditarUnidad}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              backgroundColor: '#24352A',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}
          >✏️ Editar</button>
        )}
      >
        {estaEditando ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CampoFecha label="Ingreso a Unidad" value={formUnidad.fecha_ingreso_unidad}
                onChange={v => setFormUnidad({ ...formUnidad, fecha_ingreso_unidad: v })} />
              <CampoFecha label="Pista" value={formUnidad.fecha_pista}
                onChange={v => setFormUnidad({ ...formUnidad, fecha_pista: v })} />
              <CampoFecha label="Senda" value={formUnidad.fecha_senda}
                onChange={v => setFormUnidad({ ...formUnidad, fecha_senda: v })} />
              <CampoFecha label="Rumbo" value={formUnidad.fecha_rumbo}
                onChange={v => setFormUnidad({ ...formUnidad, fecha_rumbo: v })} />
              <CampoFecha label="Travesía" value={formUnidad.fecha_travesia}
                onChange={v => setFormUnidad({ ...formUnidad, fecha_travesia: v })} />
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: COL.textoPrincipal }}>
                  <input type="checkbox" checked={formUnidad.tiene_promesa_scout}
                    onChange={e => setFormUnidad({ ...formUnidad, tiene_promesa_scout: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: COL.verdeScout }} />
                  Tiene Promesa Scout
                </label>
              </div>
              {formUnidad.tiene_promesa_scout && (
                <>
                  <CampoFecha label="Fecha de Promesa" value={formUnidad.fecha_promesa_scout}
                    onChange={v => setFormUnidad({ ...formUnidad, fecha_promesa_scout: v })} />
                  <CampoTexto label="Padrino/Madrina" value={formUnidad.padrino_promesa_scout}
                    onChange={v => setFormUnidad({ ...formUnidad, padrino_promesa_scout: v })} />
                </>
              )}
            </div>
            <BotonesInline
              onCancelar={() => setEditandoUnidad(false)}
              onGuardar={guardarUnidad}
              saving={saving}
            />
          </>
        ) : (
          <>
            <InfoGeneral
              rama="Unidad Scout"
              ingreso={progresionUnidad.fecha_ingreso_unidad}
              promesa={progresionUnidad.tiene_promesa_scout}
              fechaPromesa={progresionUnidad.fecha_promesa_scout}
              padrino={progresionUnidad.padrino_promesa_scout}
            />
            <div style={{ marginTop: '16px' }}>
              <Subtitulo texto="Hitos de la rama" />
              {renderHito('Pista', progresionUnidad.fecha_pista)}
              {renderHito('Senda', progresionUnidad.fecha_senda)}
              {renderHito('Rumbo', progresionUnidad.fecha_rumbo)}
              {renderHito('Travesía', progresionUnidad.fecha_travesia)}
            </div>
          </>
        )}
      </Seccion>
    )
  }

  const renderProgresionCaminantes = () => {
    if (!progresionCaminantes) return null
    const editable = puedeEditarRama('Caminantes')
    const estaEditando = editandoCaminantes
    const abierto = caminantesAbierto || estaEditando
    const elementos = Array.isArray(progresionCaminantes.elemento_elegido)
      ? progresionCaminantes.elemento_elegido
      : []

    return (
      <Seccion
        icono="🏔️"
        titulo={estaEditando ? 'Caminantes (editando)' : 'Caminantes'}
        color={COL.terracota}
        colapsable={!estaEditando}
        abierto={abierto}
        onToggle={() => !estaEditando && setCaminantesAbierto(!caminantesAbierto)}
        accion={editable && !estaEditando && abierto && (
          <button
            onClick={abrirEditarCaminantes}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              backgroundColor: '#24352A',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}
          >✏️ Editar</button>
        )}
      >
        {estaEditando ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CampoFecha label="Ingreso a Caminantes" value={formCaminantes.fecha_ingreso_caminantes}
                onChange={v => setFormCaminantes({ ...formCaminantes, fecha_ingreso_caminantes: v })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <CampoFecha label="Ceremonia de Bienvenida" value={formCaminantes.fecha_ceremonia_bienvenida}
                  onChange={v => setFormCaminantes({ ...formCaminantes, fecha_ceremonia_bienvenida: v })} />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                <Subtitulo texto="Etapas y elementos" />
              </div>

              <CampoFecha label="Etapa 1 - Fecha" value={formCaminantes.fecha_etapa1}
                onChange={v => setFormCaminantes({ ...formCaminantes, fecha_etapa1: v })} />
              <CampoSelect label="Etapa 1 - Elemento" value={formCaminantes.elemento1}
                options={['', ...ELEMENTOS_CAMINANTES]}
                onChange={v => setFormCaminantes({ ...formCaminantes, elemento1: v })} />

              <CampoFecha label="Etapa 2 - Fecha" value={formCaminantes.fecha_etapa2}
                onChange={v => setFormCaminantes({ ...formCaminantes, fecha_etapa2: v })} />
              <CampoSelect label="Etapa 2 - Elemento" value={formCaminantes.elemento2}
                options={['', ...ELEMENTOS_CAMINANTES]}
                onChange={v => setFormCaminantes({ ...formCaminantes, elemento2: v })} />

              <CampoFecha label="Etapa 3 - Fecha" value={formCaminantes.fecha_etapa3}
                onChange={v => setFormCaminantes({ ...formCaminantes, fecha_etapa3: v })} />
              <CampoSelect label="Etapa 3 - Elemento" value={formCaminantes.elemento3}
                options={['', ...ELEMENTOS_CAMINANTES]}
                onChange={v => setFormCaminantes({ ...formCaminantes, elemento3: v })} />

              <CampoFecha label="Etapa 4 - Fecha" value={formCaminantes.fecha_etapa4}
                onChange={v => setFormCaminantes({ ...formCaminantes, fecha_etapa4: v })} />
              <CampoSelect label="Etapa 4 - Elemento" value={formCaminantes.elemento4}
                options={['', ...ELEMENTOS_CAMINANTES]}
                onChange={v => setFormCaminantes({ ...formCaminantes, elemento4: v })} />

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: COL.textoPrincipal }}>
                  <input type="checkbox" checked={formCaminantes.tiene_promesa_scout}
                    onChange={e => setFormCaminantes({ ...formCaminantes, tiene_promesa_scout: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: COL.verdeScout }} />
                  Tiene Promesa Scout
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: COL.textoPrincipal }}>
                  <input type="checkbox" checked={formCaminantes.hizo_tada}
                    onChange={e => setFormCaminantes({ ...formCaminantes, hizo_tada: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: COL.verdeScout }} />
                  Realizó el TADA
                </label>
              </div>

              {formCaminantes.tiene_promesa_scout && (
                <>
                  <CampoFecha label="Fecha de Promesa" value={formCaminantes.fecha_promesa_scout}
                    onChange={v => setFormCaminantes({ ...formCaminantes, fecha_promesa_scout: v })} />
                  <CampoTexto label="Padrino/Madrina" value={formCaminantes.padrino_promesa_scout}
                    onChange={v => setFormCaminantes({ ...formCaminantes, padrino_promesa_scout: v })} />
                </>
              )}
            </div>
            <BotonesInline
              onCancelar={() => setEditandoCaminantes(false)}
              onGuardar={guardarCaminantes}
              saving={saving}
            />
          </>
        ) : (
          <>
            <InfoGeneral
              rama="Caminantes"
              ingreso={progresionCaminantes.fecha_ingreso_caminantes}
              promesa={progresionCaminantes.tiene_promesa_scout}
              fechaPromesa={progresionCaminantes.fecha_promesa_scout}
              padrino={progresionCaminantes.padrino_promesa_scout}
            />

            <Subtitulo texto="Ceremonia de Bienvenida" />
            {renderHito('Ceremonia de Bienvenida', progresionCaminantes.fecha_ceremonia_bienvenida)}

            <Subtitulo texto="Hitos de la rama" />
            {renderHito('Etapa 1', progresionCaminantes.fecha_etapa1, elementos[0])}
            {renderHito('Etapa 2', progresionCaminantes.fecha_etapa2, elementos[1])}
            {renderHito('Etapa 3', progresionCaminantes.fecha_etapa3, elementos[2])}
            {renderHito('Etapa 4', progresionCaminantes.fecha_etapa4, elementos[3])}

            {progresionCaminantes.hizo_tada && (
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: '#FFF8E7',
                border: '2px solid #F5C842',
                borderRadius: '10px',
                fontFamily: 'Oswald, sans-serif',
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: COL.textoPrincipal
              }}>
                ✅ Realizó el TADA
              </div>
            )}
          </>
        )}
      </Seccion>
    )
  }

  const renderProgresionRovers = () => {
    if (!progresionRovers) return null
    const editable = puedeEditarRama('Rovers')
    const estaEditando = editandoRovers
    const abierto = roversAbierto || estaEditando

    return (
      <Seccion
        icono="🔥"
        titulo={estaEditando ? 'Rovers (editando)' : 'Rovers'}
        color={COL.terracota}
        colapsable={!estaEditando}
        abierto={abierto}
        onToggle={() => !estaEditando && setRoversAbierto(!roversAbierto)}
        accion={editable && !estaEditando && abierto && (
          <button
            onClick={abrirEditarRovers}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              backgroundColor: '#24352A',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600
            }}
          >✏️ Editar</button>
        )}
      >
        {estaEditando ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <CampoFecha label="Ingreso a Rovers" value={formRovers.fecha_ingreso_rovers}
                onChange={v => setFormRovers({ ...formRovers, fecha_ingreso_rovers: v })} />
              <CampoFecha label="Encuentro" value={formRovers.fecha_encuentro}
                onChange={v => setFormRovers({ ...formRovers, fecha_encuentro: v })} />
              <CampoFecha label="Compromiso" value={formRovers.fecha_compromiso}
                onChange={v => setFormRovers({ ...formRovers, fecha_compromiso: v })} />
              <CampoFecha label="Proyección" value={formRovers.fecha_proyeccion}
                onChange={v => setFormRovers({ ...formRovers, fecha_proyeccion: v })} />
              <CampoFecha label="Partida" value={formRovers.fecha_partida}
                onChange={v => setFormRovers({ ...formRovers, fecha_partida: v })} />
              <CampoTexto label="Nombre de Tótem" value={formRovers.nombre_totem}
                onChange={v => setFormRovers({ ...formRovers, nombre_totem: v })} />
              <CampoTexto label="Campamento de Tótem" value={formRovers.campamento_totem}
                onChange={v => setFormRovers({ ...formRovers, campamento_totem: v })} />
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: COL.textoPrincipal }}>
                  <input type="checkbox" checked={formRovers.tiene_promesa_scout}
                    onChange={e => setFormRovers({ ...formRovers, tiene_promesa_scout: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: COL.verdeScout }} />
                  Tiene Promesa Scout
                </label>
              </div>
              {formRovers.tiene_promesa_scout && (
                <>
                  <CampoFecha label="Fecha de Promesa" value={formRovers.fecha_promesa_scout}
                    onChange={v => setFormRovers({ ...formRovers, fecha_promesa_scout: v })} />
                  <CampoTexto label="Padrino/Madrina" value={formRovers.padrino_promesa_scout}
                    onChange={v => setFormRovers({ ...formRovers, padrino_promesa_scout: v })} />
                </>
              )}
            </div>
            <BotonesInline
              onCancelar={() => setEditandoRovers(false)}
              onGuardar={guardarRovers}
              saving={saving}
            />
          </>
        ) : (
          <>
            <InfoGeneral
              rama="Rovers"
              ingreso={progresionRovers.fecha_ingreso_rovers}
              promesa={progresionRovers.tiene_promesa_scout}
              fechaPromesa={progresionRovers.fecha_promesa_scout}
              padrino={progresionRovers.padrino_promesa_scout}
            />
            <div style={{ marginTop: '16px' }}>
              <Subtitulo texto="Hitos de la rama" />
              {renderHito('Encuentro', progresionRovers.fecha_encuentro)}
              {renderHito('Compromiso', progresionRovers.fecha_compromiso)}
              {renderHito('Proyección', progresionRovers.fecha_proyeccion)}
              {renderHito('Partida', progresionRovers.fecha_partida)}
            </div>

            {(progresionRovers.nombre_totem || progresionRovers.campamento_totem) && (
              <div style={{ marginTop: '16px' }}>
                <Subtitulo texto="Tótem" />
                <div style={{
                  backgroundColor: '#FFF8E7',
                  border: '2px solid #F5C842',
                  borderRadius: '10px',
                  padding: '12px'
                }}>
                  {progresionRovers.nombre_totem && (
                    <div style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: 'clamp(13px, 3vw, 15px)',
                      color: COL.textoPrincipal,
                      fontWeight: '600'
                    }}>
                      🦅 {progresionRovers.nombre_totem}
                    </div>
                  )}
                  {progresionRovers.campamento_totem && (
                    <div style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: 'clamp(11px, 2.5vw, 13px)',
                      color: COL.textoSecundario,
                      marginTop: '4px'
                    }}>
                      🏕️ {progresionRovers.campamento_totem}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Seccion>
    )
  }

  // ============================================
  // HISTORIAL
  // ============================================
  const renderHistorial = () => {
    if (!beneficiario) return null

    const eventos: { fecha: string, titulo: string, detalle: string, color: string }[] = []

    const fechasBeneficiario: { fecha: string, titulo: string, detalle: string, color: string }[] = []

    if (beneficiario.fecha_ingreso_grupo) {
      fechasBeneficiario.push({
        fecha: beneficiario.fecha_ingreso_grupo,
        titulo: '📋 Ingreso al Grupo',
        detalle: 'Se suma al grupo scout',
        color: COL.verdeScout
      })
    }
    if (beneficiario.fecha_entrega_uniforme) {
      fechasBeneficiario.push({
        fecha: beneficiario.fecha_entrega_uniforme,
        titulo: '👕 Entrega de Uniforme',
        detalle: 'Recibe su uniforme scout',
        color: COL.terracota
      })
    }
    fechasBeneficiario.forEach(e => eventos.push(e))

    if (progresionManada?.tiene_promesa_manada && progresionManada.fecha_promesa_manada) {
      eventos.push({
        fecha: progresionManada.fecha_promesa_manada,
        titulo: '🤝 Promesa de Manada',
        detalle: 'Realiza su promesa de Manada',
        color: COL.verdeClaro
      })
    }

    let promesaFecha = ''
    let promesaPadrino = ''
    let promesaRama = ''

    if (progresionUnidad?.tiene_promesa_scout && progresionUnidad.fecha_promesa_scout) {
      promesaFecha = progresionUnidad.fecha_promesa_scout
      promesaPadrino = progresionUnidad.padrino_promesa_scout || ''
      promesaRama = 'Unidad Scout'
    } else if (progresionCaminantes?.tiene_promesa_scout && progresionCaminantes.fecha_promesa_scout) {
      promesaFecha = progresionCaminantes.fecha_promesa_scout
      promesaPadrino = progresionCaminantes.padrino_promesa_scout || ''
      promesaRama = 'Caminantes'
    } else if (progresionRovers?.tiene_promesa_scout && progresionRovers.fecha_promesa_scout) {
      promesaFecha = progresionRovers.fecha_promesa_scout
      promesaPadrino = progresionRovers.padrino_promesa_scout || ''
      promesaRama = 'Rovers'
    }

    if (promesaFecha) {
      eventos.push({
        fecha: promesaFecha,
        titulo: '🤝 Promesa Scout',
        detalle: promesaPadrino
          ? `Padrino/Madrina: ${promesaPadrino} (${promesaRama})`
          : `Promesa Scout (${promesaRama})`,
        color: COL.dorado
      })
    }

    if (progresionManada?.fecha_ingreso_manada) {
      eventos.push({
        fecha: progresionManada.fecha_ingreso_manada,
        titulo: '🐺 Ingreso a Manada',
        detalle: 'Ingresa a la Manada',
        color: COL.verdeClaro
      })
    }
    if (progresionUnidad?.fecha_ingreso_unidad) {
      eventos.push({
        fecha: progresionUnidad.fecha_ingreso_unidad,
        titulo: '⚜️ Ingreso a Unidad Scout',
        detalle: 'Ingresa a la Unidad Scout',
        color: COL.dorado
      })
    }
    if (progresionCaminantes?.fecha_ingreso_caminantes) {
      eventos.push({
        fecha: progresionCaminantes.fecha_ingreso_caminantes,
        titulo: '🏔️ Ingreso a Caminantes',
        detalle: 'Ingresa a Caminantes',
        color: COL.terracota
      })
    }
    if (progresionRovers?.fecha_ingreso_rovers) {
      eventos.push({
        fecha: progresionRovers.fecha_ingreso_rovers,
        titulo: '🔥 Ingreso a Rovers',
        detalle: 'Ingresa a Rovers',
        color: COL.terracota
      })
    }

    eventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    if (eventos.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          fontFamily: 'Oswald, sans-serif',
          color: COL.textoSecundario
        }}>
          Todavía no hay eventos en el historial
        </div>
      )
    }

    return (
      <div style={{ position: 'relative', paddingLeft: '28px' }}>
        <div style={{
          position: 'absolute',
          left: '6px',
          top: '8px',
          bottom: '8px',
          width: '3px',
          backgroundColor: COL.bordeSuave,
          borderRadius: '2px'
        }} />

        {eventos.map((evento, idx) => (
          <div key={idx} style={{ position: 'relative', marginBottom: '16px' }}>
            <div style={{
              position: 'absolute',
              left: '-28px',
              top: '6px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: evento.color,
              border: `3px solid #FFFFFF`,
              boxShadow: `0 0 0 2px ${evento.color}`
            }} />

            <div style={{
              backgroundColor: '#FFFFFF',
              border: `2px solid ${COL.bordeSuave}`,
              borderRadius: '10px',
              padding: '10px 12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 'clamp(13px, 3vw, 15px)',
                    fontWeight: '600',
                    color: COL.textoPrincipal,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {evento.titulo}
                  </div>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 'clamp(11px, 2.5vw, 13px)',
                    color: COL.textoSecundario,
                    marginTop: '2px'
                  }}>
                    {evento.detalle}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  color: COL.textoSecundario,
                  backgroundColor: COL.fondo,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap'
                }}>
                  {formatFecha(evento.fecha)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ============================================
  // LOADING / NO ENCONTRADO
  // ============================================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COL.textoSecundario }}>
          Cargando...
        </span>
      </div>
    )
  }

  if (!beneficiario) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COL.terracota }}>
          Beneficiario no encontrado
        </span>
      </div>
    )
  }

  const nombreCompleto = formatearNombreConH(
    beneficiario.nombre,
    beneficiario.apellido,
    beneficiario.tiene_hermanos
  )

  const fotoUrl = getFotoUrl(beneficiario.foto_url, beneficiario.nombre, beneficiario.apellido)

  const total = todosLosIds.length
  const actual = posicionActual + 1

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <div
      style={{
        transform: `translateX(${dragOffset}px)`,
        transition: dragOffset === 0 ? 'transform 0.3s ease-out' : 'none',
        fontFamily: 'Oswald, sans-serif'
      }}
    >
      {/* ============================================ */}
      {/* BARRA DE NAVEGACIÓN (◀ ▶ y contador) */}
      {/* ============================================ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button
          onClick={() => navigate(`/beneficiario/${id}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: 'none',
            border: 'none', cursor: 'pointer', color: COL.textoSecundario, fontSize: 'clamp(12px, 3vw, 14px)',
            fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px',
            padding: '4px 0'
          }}
        >
          ← Volver al perfil
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: COL.textoSecundario }}>
            {actual} / {total}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={irAlAnterior}
              disabled={posicionActual <= 0 || hayEdicionAbierta}
              style={{
                backgroundColor: (posicionActual <= 0 || hayEdicionAbierta) ? '#E8DEC4' : '#24352A',
                color: (posicionActual <= 0 || hayEdicionAbierta) ? '#7A7364' : 'white',
                border: 'none', borderRadius: '6px', padding: '4px 12px',
                cursor: (posicionActual <= 0 || hayEdicionAbierta) ? 'default' : 'pointer',
                fontFamily: 'Oswald, sans-serif', fontSize: '18px', lineHeight: 1.4,
                opacity: (posicionActual <= 0 || hayEdicionAbierta) ? 0.5 : 1
              }}
            >◀</button>
            <button
              onClick={irAlSiguiente}
              disabled={posicionActual >= total - 1 || hayEdicionAbierta}
              style={{
                backgroundColor: (posicionActual >= total - 1 || hayEdicionAbierta) ? '#E8DEC4' : '#24352A',
                color: (posicionActual >= total - 1 || hayEdicionAbierta) ? '#7A7364' : 'white',
                border: 'none', borderRadius: '6px', padding: '4px 12px',
                cursor: (posicionActual >= total - 1 || hayEdicionAbierta) ? 'default' : 'pointer',
                fontFamily: 'Oswald, sans-serif', fontSize: '18px', lineHeight: 1.4,
                opacity: (posicionActual >= total - 1 || hayEdicionAbierta) ? 0.5 : 1
              }}
            >▶</button>
          </div>
        </div>
      </div>

      {/* Mensaje general */}
      {message.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          border: '2px solid',
          fontFamily: 'Oswald, sans-serif',
          ...(message.type === 'error' ? {
            backgroundColor: '#FEE2E2', color: '#BF4E30', borderColor: '#FECACA'
          } : {
            backgroundColor: '#D1FAE5', color: '#5C7A5E', borderColor: '#A7F3D0'
          })
        }}>
          {message.text}
        </div>
      )}

      {/* ENCABEZADO */}
<div style={{
  backgroundColor: COL.verdeScout,
  borderRadius: '16px',
  padding: '24px 16px',
  textAlign: 'center',
  marginBottom: '20px',
  border: '2px solid #BF4E30',
  boxShadow: '0 0 0 2px #111111'
}}>
        <div style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: COL.dorado,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '16px'
        }}>
          ⚜️ Vida Scout ⚜️
        </div>

        <div style={{ marginBottom: '16px' }}>
          <img
            src={fotoUrl}
            alt={nombreCompleto}
            style={{
              width: '180px',
              height: '180px',
              objectFit: 'cover',
              borderRadius: '16px',
              boxShadow: '0 0 0 2px #BF4E30, 0 0 0 4px #111111',
              display: 'block',
              margin: '0 auto'
            }}
          />
        </div>

        <h1 style={{
          fontSize: 'clamp(18px, 5vw, 24px)',
          color: '#F3ECD8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 8px 0',
          fontWeight: '700',
          wordBreak: 'break-word'
        }}>
          {nombreCompleto}
        </h1>

        <div style={{
          display: 'inline-block',
          padding: '4px 14px',
          backgroundColor: COL.terracota,
          color: '#FFFFFF',
          borderRadius: '20px',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '14px'
        }}>
          {getRamaLabel(beneficiario.rama)}
        </div>

        <div style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(11px, 2.5vw, 12px)',
          color: '#F3ECD8',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <span>
            Uniforme:{' '}
            <span style={{ color: beneficiario.tiene_uniforme ? '#A5D6A7' : '#F5B7B1' }}>
              {beneficiario.tiene_uniforme ? '✅ SÍ' : '❌ NO'}
            </span>
          </span>
          <span style={{ color: COL.dorado }}>·</span>
          {beneficiario.rama === 'Manada' ? (
            <span>
              Promesa Manada:{' '}
              <span style={{
                color: (progresionManada?.tiene_promesa_manada) ? '#A5D6A7' : '#F5B7B1'
              }}>
                {(progresionManada?.tiene_promesa_manada) ? '✅ SÍ' : '❌ NO'}
              </span>
            </span>
          ) : (
            <span>
              Promesa Scout:{' '}
              <span style={{
                color: tienePromesaScout() ? '#A5D6A7' : '#F5B7B1'
              }}>
                {tienePromesaScout() ? '✅ SÍ' : '❌ NO'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* ✅ NUEVO: Ingreso al Grupo (solo superadmin + jefatura) */}
      {puedeEditarIngresoGrupo && renderIngresoGrupo()}

      {/* Progresiones */}
      {progresionManada && puedeVerRama('Manada') && renderProgresionManada()}
      {progresionUnidad && puedeVerRama('Unidad Scout') && renderProgresionUnidad()}
      {progresionCaminantes && puedeVerRama('Caminantes') && renderProgresionCaminantes()}
      {progresionRovers && puedeVerRama('Rovers') && renderProgresionRovers()}

      {/* Campamentos (colapsable) */}
      <Seccion
        icono="🏕️"
        titulo="Campamentos asistidos"
        color={COL.terracota}
        colapsable={true}
        abierto={campamentosAbierto}
        onToggle={() => setCampamentosAbierto(!campamentosAbierto)}
      >
        {campamentos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            color: COL.textoSecundario,
            fontSize: 'clamp(12px, 3vw, 14px)'
          }}>
            Todavía no asistió a ningún campamento
          </div>
        ) : (
          <div>
            {campamentos.map((camp) => (
              <div
                key={camp.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `2px solid ${COL.bordeSuave}`,
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '8px'
                }}
              >
                <div style={{
                  fontSize: 'clamp(13px, 3vw, 15px)',
                  fontWeight: '600',
                  color: COL.textoPrincipal,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}>
                  🏕️ {camp.nombre}
                </div>
                <div style={{
                  fontSize: 'clamp(11px, 2.5vw, 13px)',
                  color: COL.textoSecundario
                }}>
                  📅 {formatFecha(camp.fecha_inicio)}
                  {camp.fecha_fin && camp.fecha_fin !== camp.fecha_inicio && ` - ${formatFecha(camp.fecha_fin)}`}
                </div>
                {camp.tipo && (
  <div style={{
    fontSize: 'clamp(10px, 2vw, 12px)',
    color: COL.terracota,
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }}>
    {formatTipoConDetalle(camp.tipo, camp.rama_principal)}
  </div>
)}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* Historial */}
      <Seccion
        icono="📜"
        titulo="Historial Scout"
        color={COL.dorado}
      >
        {renderHistorial()}
      </Seccion>
    </div>
  )
}

// ============================================
// COMPONENTES AUXILIARES DE FORMULARIO
// ============================================

const CampoFecha = ({
  label,
  value,
  onChange
}: {
  label: string,
  value: string,
  onChange: (v: string) => void
}) => (
  <div>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '4px',
      gap: '8px'
    }}>
      <label style={{
        fontSize: '10px',
        color: COL.textoSecundario,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontFamily: 'Oswald, sans-serif'
      }}>
        {label}
      </label>

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Borrar fecha"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#BF4E30',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600,
            padding: '2px 4px',
            flexShrink: 0
          }}
        >
          ✕ Borrar
        </button>
      )}
    </div>

    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 10px',
        fontSize: '13px',
        border: `2px solid ${COL.bordeSuave}`,
        borderRadius: '6px',
        outline: 'none',
        fontFamily: 'Oswald, sans-serif',
        backgroundColor: 'white',
        color: COL.textoPrincipal,
        boxSizing: 'border-box'
      }}
    />
  </div>
)

const CampoTexto = ({
  label,
  value,
  onChange
}: {
  label: string,
  value: string,
  onChange: (v: string) => void
}) => (
  <div>
    <label style={{
      fontSize: '10px',
      color: COL.textoSecundario,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      display: 'block',
      marginBottom: '4px',
      fontFamily: 'Oswald, sans-serif'
    }}>
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 10px',
        fontSize: '13px',
        border: `2px solid ${COL.bordeSuave}`,
        borderRadius: '6px',
        outline: 'none',
        fontFamily: 'Oswald, sans-serif',
        backgroundColor: 'white',
        color: COL.textoPrincipal,
        boxSizing: 'border-box'
      }}
    />
  </div>
)

const CampoSelect = ({
  label,
  value,
  options,
  onChange
}: {
  label: string,
  value: string,
  options: string[],
  onChange: (v: string) => void
}) => (
  <div>
    <label style={{
      fontSize: '10px',
      color: COL.textoSecundario,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      display: 'block',
      marginBottom: '4px',
      fontFamily: 'Oswald, sans-serif'
    }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 10px',
        fontSize: '13px',
        border: `2px solid ${COL.bordeSuave}`,
        borderRadius: '6px',
        outline: 'none',
        fontFamily: 'Oswald, sans-serif',
        backgroundColor: 'white',
        color: COL.textoPrincipal,
        boxSizing: 'border-box'
      }}
    >
      {options.map(op => (
        <option key={op} value={op}>{op || '—'}</option>
      ))}
    </select>
  </div>
)

const BotonesInline = ({
  onCancelar,
  onGuardar,
  saving
}: {
  onCancelar: () => void,
  onGuardar: () => void,
  saving: boolean
}) => (
  <div style={{
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
    borderTop: `2px dashed ${COL.bordeSuave}`,
    paddingTop: '14px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  }}>
    <button
      type="button"
      onClick={onCancelar}
      disabled={saving}
      style={{
        backgroundColor: '#E8DEC4',
        color: COL.textoPrincipal,
        padding: '8px 18px',
        borderRadius: '8px',
        border: 'none',
        cursor: saving ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        fontFamily: 'Oswald, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        opacity: saving ? 0.5 : 1,
        fontWeight: 600
      }}
    >
      Cancelar
    </button>
    <button
      type="button"
      onClick={onGuardar}
      disabled={saving}
      style={{
        backgroundColor: COL.verdeScout,
        color: 'white',
        padding: '8px 18px',
        borderRadius: '8px',
        border: 'none',
        cursor: saving ? 'wait' : 'pointer',
        fontSize: '12px',
        fontFamily: 'Oswald, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        opacity: saving ? 0.6 : 1,
        fontWeight: 600
      }}
    >
      {saving ? 'Guardando...' : '💾 Guardar'}
    </button>
  </div>
)