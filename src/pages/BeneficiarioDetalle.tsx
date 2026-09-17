import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'
import { useSwipe } from '../hooks/useSwipe'

interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  estado: string
  fecha_nacimiento: string
  fecha_ingreso_grupo: string
  fecha_ingreso_rama: string
  tiene_uniforme: boolean
  fecha_entrega_uniforme: string
  tiene_hermanos: boolean
  observaciones: string
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

interface Pago {
  id: string
  recibo: string
  monto: number
  fecha_pago: string
  categoria: string
  medio_pago: string
  observaciones: string
}

interface Campamento {
  id: string
  nombre: string
  fecha_inicio: string
  tipo: string
}

interface Legajo {
  id: string
  ficha_datos_personales: boolean
  ficha_datos_personales_obs: string
  ficha_seguimiento: boolean
  ficha_seguimiento_obs: string
  autorizacion_ingreso: boolean
  autorizacion_ingreso_obs: string
  salidas_cercanas: boolean
  salidas_cercanas_obs: string
  salidas_cercanas_fecha: string
  uso_imagen: boolean
  uso_imagen_obs: string
  uso_imagen_fecha: string
  declaracion_jurada_salud: boolean
  declaracion_jurada_salud_obs: string
  autorizacion_retirarse: boolean
  autorizacion_retirarse_obs: string
  fotocopia_dni_beneficiario: boolean
  fotocopia_dni_beneficiario_obs: string
  fotocopia_dni_padre: boolean
  fotocopia_dni_padre_obs: string
  fotocopia_dni_madre: boolean
  fotocopia_dni_madre_obs: string
  fotocopia_vacunas: boolean
  fotocopia_vacunas_obs: string
  otros: boolean
  otros_obs: string
  observaciones_generales: string
}

// =============================================
// COMPONENTE EDITABLE PARA FECHAS DE PROGRESIÓN
// =============================================

const EditableDate = ({
  label,
  value,
  onSave,
  disabled = false
}: {
  label: string,
  value: string | null,
  onSave: (newValue: string) => Promise<void>,
  disabled?: boolean
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [newValue, setNewValue] = useState(value || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(newValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Error al guardar:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-'
    const date = new Date(fecha)
    date.setDate(date.getDate() + 1)
    return date.toLocaleDateString('es-AR')
  }

  const tieneLabel = label && label.trim() !== ''

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 0',
      borderBottom: tieneLabel ? '1px solid #E8DEC4' : 'none',
      width: '100%'
    }}>
      {tieneLabel && (
        <span style={{
          fontSize: '13px',
          color: '#7A7364',
          minWidth: '120px',
          fontFamily: 'Oswald, sans-serif'
        }}>
          {label}:
        </span>
      )}

      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
          <input
            type="date"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            style={{
              padding: '4px 6px',
              fontSize: '12px',
              border: '2px solid #D1C9B4',
              borderRadius: '4px',
              outline: 'none',
              fontFamily: 'Oswald, sans-serif',
              backgroundColor: 'white',
              flex: 1,
              minWidth: 0
            }}
            disabled={loading || disabled}
          />
          <button
            onClick={handleSave}
            disabled={loading || disabled}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              backgroundColor: '#24352A',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: (loading || disabled) ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            OK
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setNewValue(value || '')
            }}
            disabled={loading}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              backgroundColor: '#E8DEC4',
              color: '#24352A',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: loading ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          justifyContent: 'space-between',
          minWidth: 0
        }}>
          <span style={{
            fontSize: '14px',
            color: value ? '#24352A' : '#A89E86',
            fontFamily: 'Oswald, sans-serif',
            fontWeight: value ? '500' : '400'
          }}>
            {value ? formatFecha(value) : 'Sin cargar'}
          </span>
          {!disabled && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                backgroundColor: '#F3ECD8',
                color: '#24352A',
                border: '1px solid #D1C9B4',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              ✏️ Editar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// SELECTOR DE ELEMENTO (Caminantes)
// =============================================

const ELEMENTOS_CAMINANTES = [
  { value: 'Tierra', label: '🌍 Tierra', color: '#8B6F47', bg: '#F5EDE0' },
  { value: 'Agua',   label: '💧 Agua',   color: '#3B82F6', bg: '#E0EFFE' },
  { value: 'Aire',   label: '🌬️ Aire',   color: '#A78BFA', bg: '#F0EAFE' },
  { value: 'Fuego',  label: '🔥 Fuego',  color: '#EF4444', bg: '#FEE5E5' },
] as const

type ElementoValor = 'Tierra' | 'Agua' | 'Aire' | 'Fuego'

const ElementoSelector = ({
  valor,
  elementosUsados,
  onCambio,
  disabled = false,
  requiereFecha = false,
  hayFecha = false
}: {
  valor: string | null
  elementosUsados: string[]
  onCambio: (nuevo: ElementoValor | null) => void
  disabled?: boolean
  requiereFecha?: boolean
  hayFecha?: boolean
}) => {
  const estaDisponible = (elem: string) => !elementosUsados.includes(elem)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevo = e.target.value as ElementoValor | ''
    onCambio(nuevo === '' ? null : nuevo)
  }

  const bloqueadoPorFaltaDeFecha = requiereFecha && !hayFecha && !valor

  return (
    <select
      value={valor || ''}
      onChange={handleChange}
      disabled={disabled || bloqueadoPorFaltaDeFecha}
      style={{
        padding: '4px 8px',
        fontSize: '13px',
        border: '2px solid ' + (bloqueadoPorFaltaDeFecha ? '#E8DEC4' : '#D1C9B4'),
        borderRadius: '4px',
        outline: 'none',
        fontFamily: 'Oswald, sans-serif',
        backgroundColor: (disabled || bloqueadoPorFaltaDeFecha) ? '#F3F4F6' : 'white',
        color: bloqueadoPorFaltaDeFecha
          ? '#A89E86'
          : valor
            ? ELEMENTOS_CAMINANTES.find(e => e.value === valor)?.color || '#24352A'
            : '#7A7364',
        fontWeight: valor ? '600' : '400',
        cursor: (disabled || bloqueadoPorFaltaDeFecha) ? 'not-allowed' : 'pointer',
        width: '100%',
        maxWidth: '180px',
        opacity: bloqueadoPorFaltaDeFecha ? 0.7 : 1
      }}
      title={bloqueadoPorFaltaDeFecha ? 'Primero cargá la fecha de esta etapa' : ''}
    >
      <option value="">
        {bloqueadoPorFaltaDeFecha ? '🔒 Primero la fecha' : '🔲 Elegir'}
      </option>
      {!bloqueadoPorFaltaDeFecha && ELEMENTOS_CAMINANTES.map(elem => {
        const usado = !estaDisponible(elem.value)
        const esElActual = elem.value === valor
        if (usado && !esElActual) return null
        return (
          <option key={elem.value} value={elem.value}>
            {elem.label}
          </option>
        )
      })}
    </select>
  )
}

const ElementoBadge = ({ elemento }: { elemento: string }) => {
  const info = ELEMENTOS_CAMINANTES.find(e => e.value === elemento)
  if (!info) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      fontFamily: 'Oswald, sans-serif',
      backgroundColor: info.bg,
      color: info.color,
      marginRight: '4px'
    }}>
      {info.label}
    </span>
  )
}

export default function BeneficiarioDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, isJefatura, getRolData } = useAuth()
  const [beneficiario, setBeneficiario] = useState<Beneficiario | null>(null)
  const [todosLosIds, setTodosLosIds] = useState<string[]>([])
  const [posicionActual, setPosicionActual] = useState<number>(-1)
  const [dragOffset, setDragOffset] = useState(0)
  const [progresionManada, setProgresionManada] = useState<ProgresionManada | null>(null)
  const [progresionUnidad, setProgresionUnidad] = useState<ProgresionUnidad | null>(null)
  const [progresionCaminantes, setProgresionCaminantes] = useState<ProgresionCaminantes | null>(null)
  const [progresionRovers, setProgresionRovers] = useState<ProgresionRovers | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [campamentos, setCampamentos] = useState<Campamento[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInfoEditModal, setShowInfoEditModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showHistorialEditModal, setShowHistorialEditModal] = useState(false)
  const [editHistorialLoading, setEditHistorialLoading] = useState(false)

  const [showCampamentoModal, setShowCampamentoModal] = useState(false)
  const [campamentosDisponibles, setCampamentosDisponibles] = useState<Campamento[]>([])
  const [campamentoSeleccionado, setCampamentoSeleccionado] = useState('')
  const [nuevoCampamentoNombre, setNuevoCampamentoNombre] = useState('')
  const [nuevoCampamentoFecha, setNuevoCampamentoFecha] = useState('')
  const [nuevoCampamentoTipo, setNuevoCampamentoTipo] = useState('Anual')
  const [nuevoCampamentoRama, setNuevoCampamentoRama] = useState('')
  const [nuevoCampamentoOtro, setNuevoCampamentoOtro] = useState('')
  const [modalMode, setModalMode] = useState<'agregar' | 'crear'>('agregar')

  const [legajo, setLegajo] = useState<Legajo | null>(null)
  const [editandoLegajo, setEditandoLegajo] = useState(false)
  const [legajoForm, setLegajoForm] = useState<Legajo | null>(null)
  const [cargandoLegajo, setCargandoLegajo] = useState(false)

  const cargandoLegajoRef = useRef(false)
  const campamentosCargadosRef = useRef(false)

  const [nuevoPago, setNuevoPago] = useState({
    recibo: '',
    monto: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    categoria: '',
    categoria_otro: '',
    medio_pago: '',
    observaciones: ''
  })

  const [editForm, setEditForm] = useState({
    nombre: '',
    apellido: '',
    rama: '',
    fecha_nacimiento: '',
    estado: 'activo',
    tiene_hermanos: false
  })

  const [infoEditForm, setInfoEditForm] = useState({
    tiene_uniforme: false,
    fecha_entrega_uniforme: '',
    tiene_promesa: false,
    fecha_promesa: '',
    padrino: '',
    observaciones: ''
  })

  const [historialEditForm, setHistorialEditForm] = useState({
    fecha_ingreso_grupo: '',
    fecha_ingreso_manada: '',
    fecha_ingreso_unidad: '',
    fecha_ingreso_caminantes: '',
    fecha_ingreso_rovers: '',
    fecha_entrega_uniforme: '',
    tiene_promesa: false,
    fecha_promesa: '',
    padrino_promesa: ''
  })

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'
  const ramaAsignada = rolData.rama
  const esSuperAdmin = isSuperAdmin
  const esJefatura = isJefatura

  const categorias = [
    { value: 'AFILIACION', label: 'Afiliación' },
    { value: 'CUOTAS', label: 'Cuotas' },
    { value: 'C. CORTO', label: 'Campamento Corto' },
    { value: 'C. ANUAL', label: 'Campamento Anual' },
    { value: 'OTRO', label: 'Otro' }
  ]

  const mediosPago = ['Efectivo', 'Mercadopago']

  const canEdit = (): boolean => {
    if (!beneficiario) return false
    if (esSuperAdmin || esJefatura) return true
    if (esJefe && ramaAsignada === beneficiario.rama) return true
    return false
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  useEffect(() => {
    if (id) {
      cargarListaIds()
    }
  }, [])

  useEffect(() => {
    if (id && todosLosIds.length > 0) {
      const idx = todosLosIds.indexOf(id)
      setPosicionActual(idx)
      loadData()
    }
  }, [id, todosLosIds])

  // Resetear refs cuando cambia el ID
  useEffect(() => {
    cargandoLegajoRef.current = false
    campamentosCargadosRef.current = false
    setLegajo(null)
    setLegajoForm(null)
    setCampamentos([])
  }, [id])

  const cargarListaIds = async () => {
    try {
      let query = supabase
        .from('beneficiarios')
        .select('id, rama, estado')
        .order('apellido', { ascending: true })

      if (!esSuperAdmin) {
        query = query.eq('estado', 'activo')
      }

      if ((esJefe || rolData.tipo === 'ayudante') && ramaAsignada) {
        query = query.eq('rama', ramaAsignada)
      }

      const { data, error } = await query
      if (error) throw error

      const ids = data?.map(item => item.id) || []
      setTodosLosIds(ids)
    } catch (error) {
      console.error('Error al cargar lista de IDs:', error)
    }
  }

  // =============================================
  // LOAD DATA OPTIMIZADO (paralelo)
  // =============================================
  const loadData = async () => {
    try {
      setLoading(true)

      const [
        beneficiarioRes,
        manadaRes,
        unidadRes,
        caminantesRes,
        roversRes,
        pagosRes
      ] = await Promise.all([
        supabase.from('beneficiarios').select('*').eq('id', id).single(),
        supabase.from('progresion_manada').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_unidad').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_caminantes').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('progresion_rovers').select('*').eq('beneficiario_id', id).maybeSingle(),
        supabase.from('pagos').select('*').eq('beneficiario_id', id).order('fecha_pago', { ascending: false }).limit(10)
      ])

      if (beneficiarioRes.error) throw beneficiarioRes.error
      setBeneficiario(beneficiarioRes.data)

      setProgresionManada(manadaRes.data || null)
      setProgresionUnidad(unidadRes.data || null)
      setProgresionCaminantes(caminantesRes.data || null)
      setProgresionRovers(roversRes.data || null)
      setPagos(pagosRes.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // =============================================
  // CARGAR CAMPAMENTOS (lazy)
  // =============================================
  const cargarCampamentos = async () => {
    if (!id || campamentosCargadosRef.current) return
    campamentosCargadosRef.current = true
    try {
      const { data, error } = await supabase
        .from('campamentos_asistidos')
        .select(`
          id,
          campamento_id,
          campamentos (
            nombre,
            fecha_inicio,
            tipo
          )
        `)
        .eq('beneficiario_id', id)

      if (error) throw error

      const mapeados = (data || []).map((c: any) => ({
        id: c.id,
        nombre: c.campamentos?.nombre || 'Sin nombre',
        fecha_inicio: c.campamentos?.fecha_inicio || '',
        tipo: c.campamentos?.tipo || ''
      }))
      mapeados.sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
      setCampamentos(mapeados)
    } catch (error) {
      console.error('Error al cargar campamentos:', error)
      campamentosCargadosRef.current = false
    }
  }

  // =============================================
  // LEGAJO (lazy)
  // =============================================
  const cargarLegajo = useCallback(async () => {
    if (!beneficiario) return
    if (cargandoLegajoRef.current) return

    cargandoLegajoRef.current = true
    setCargandoLegajo(true)

    try {
      const { data, error } = await supabase
        .from('legajos')
        .select('*')
        .eq('beneficiario_id', beneficiario.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setLegajo(data)
        setLegajoForm(data)
      } else {
        const { data: newLegajo, error: createError } = await supabase
          .from('legajos')
          .insert({
            beneficiario_id: beneficiario.id,
            ficha_datos_personales: false,
            ficha_seguimiento: false,
            autorizacion_ingreso: false,
            salidas_cercanas: false,
            uso_imagen: false,
            declaracion_jurada_salud: false,
            autorizacion_retirarse: false,
            fotocopia_dni_beneficiario: false,
            fotocopia_dni_padre: false,
            fotocopia_dni_madre: false,
            fotocopia_vacunas: false,
            otros: false
          })
          .select()
          .single()

        if (createError) throw createError
        setLegajo(newLegajo)
        setLegajoForm(newLegajo)
      }
    } catch (error) {
      console.error('Error en cargarLegajo:', error)
    } finally {
      setCargandoLegajo(false)
      cargandoLegajoRef.current = false
    }
  }, [beneficiario])

  useEffect(() => {
    if (activeTab === 'legajo' && beneficiario) {
      cargarLegajo()
    }
  }, [activeTab, beneficiario, cargarLegajo])

  useEffect(() => {
    if (activeTab === 'campamentos' && beneficiario) {
      cargarCampamentos()
    }
  }, [activeTab, beneficiario])

  // =============================================
  // SUSCRIPCIÓN REALTIME LEGAJO
  // =============================================
  useEffect(() => {
    if (!beneficiario) return

    const channel = supabase
      .channel(`legajo-${beneficiario.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'legajos',
          filter: `beneficiario_id=eq.${beneficiario.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const nuevoLegajo = payload.new as Legajo
            setLegajo(nuevoLegajo)
            if (!editandoLegajo) {
              setLegajoForm(nuevoLegajo)
            }
            setMessage({ text: '🔄 Legajo actualizado por otro usuario', type: 'success' })
            setTimeout(() => {
              setMessage({ text: '', type: '' })
            }, 3000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [beneficiario?.id, editandoLegajo])

  const handleGuardarLegajo = async () => {
    if (!legajoForm || !beneficiario) return

    setSaving(true)
    setMessage({ text: '🔄 Guardando cambios...', type: 'info' })

    try {
      const { error } = await supabase
        .from('legajos')
        .update({
          ficha_datos_personales: legajoForm.ficha_datos_personales,
          ficha_datos_personales_obs: legajoForm.ficha_datos_personales_obs || null,
          ficha_seguimiento: legajoForm.ficha_seguimiento,
          ficha_seguimiento_obs: legajoForm.ficha_seguimiento_obs || null,
          autorizacion_ingreso: legajoForm.autorizacion_ingreso,
          autorizacion_ingreso_obs: legajoForm.autorizacion_ingreso_obs || null,
          salidas_cercanas: legajoForm.salidas_cercanas,
          salidas_cercanas_obs: legajoForm.salidas_cercanas_obs || null,
          salidas_cercanas_fecha: legajoForm.salidas_cercanas_fecha || null,
          uso_imagen: legajoForm.uso_imagen,
          uso_imagen_obs: legajoForm.uso_imagen_obs || null,
          uso_imagen_fecha: legajoForm.uso_imagen_fecha || null,
          declaracion_jurada_salud: legajoForm.declaracion_jurada_salud,
          declaracion_jurada_salud_obs: legajoForm.declaracion_jurada_salud_obs || null,
          autorizacion_retirarse: legajoForm.autorizacion_retirarse,
          autorizacion_retirarse_obs: legajoForm.autorizacion_retirarse_obs || null,
          fotocopia_dni_beneficiario: legajoForm.fotocopia_dni_beneficiario,
          fotocopia_dni_beneficiario_obs: legajoForm.fotocopia_dni_beneficiario_obs || null,
          fotocopia_dni_padre: legajoForm.fotocopia_dni_padre,
          fotocopia_dni_padre_obs: legajoForm.fotocopia_dni_padre_obs || null,
          fotocopia_dni_madre: legajoForm.fotocopia_dni_madre,
          fotocopia_dni_madre_obs: legajoForm.fotocopia_dni_madre_obs || null,
          fotocopia_vacunas: legajoForm.fotocopia_vacunas,
          fotocopia_vacunas_obs: legajoForm.fotocopia_vacunas_obs || null,
          otros: legajoForm.otros,
          otros_obs: legajoForm.otros_obs || null,
          observaciones_generales: legajoForm.observaciones_generales || null,
          actualizado_en: new Date().toISOString()
        })
        .eq('beneficiario_id', beneficiario.id)

      if (error) throw error

      setMessage({ text: '✅ Legajo actualizado correctamente', type: 'success' })
      setEditandoLegajo(false)

      setTimeout(() => {
        setMessage({ text: '', type: '' })
      }, 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const renderLegajo = () => {
    const puedeVer = (): boolean => {
      if (!beneficiario) return false
      if (esSuperAdmin || esJefatura) return true
      if (esJefe && ramaAsignada === beneficiario.rama) return true
      return true
    }

    const puedeEditar = (): boolean => {
      if (!beneficiario) return false
      if (esSuperAdmin || esJefatura) return true
      if (esJefe && ramaAsignada === beneficiario.rama) return true
      return false
    }

    if (!puedeVer()) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#BF4E30', fontFamily: 'Oswald, sans-serif' }}>
          ⚠️ No tenés permisos para ver el legajo de este beneficiario
        </div>
      )
    }

    if (cargandoLegajo) {
      return (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A7364' }}>
          Cargando legajo...
        </div>
      )
    }

    if (!legajo && !legajoForm && !cargandoLegajo) {
      return (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A7364' }}>
          No hay datos de legajo
        </div>
      )
    }

    const data = editandoLegajo ? legajoForm : legajo
    if (!data) return null

    const puedeEditarLegajo = puedeEditar()

    const campos = [
      { key: 'ficha_datos_personales', label: '📋 Ficha de Datos Personales', obsKey: 'ficha_datos_personales_obs' },
      { key: 'ficha_seguimiento', label: '📈 Ficha de Seguimiento', obsKey: 'ficha_seguimiento_obs' },
      { key: 'autorizacion_ingreso', label: '📄 Autorización Ingreso', obsKey: 'autorizacion_ingreso_obs' },
      { key: 'salidas_cercanas', label: '🚶 Salidas Cercanas (anual)', obsKey: 'salidas_cercanas_obs', fechaKey: 'salidas_cercanas_fecha' },
      { key: 'uso_imagen', label: '📸 Uso de Imagen (anual)', obsKey: 'uso_imagen_obs', fechaKey: 'uso_imagen_fecha' },
      { key: 'declaracion_jurada_salud', label: '🏥 Declaración Jurada de Salud', obsKey: 'declaracion_jurada_salud_obs' },
      { key: 'autorizacion_retirarse', label: '🚪 Autorización retirarse solos', obsKey: 'autorizacion_retirarse_obs' },
      { key: 'fotocopia_dni_beneficiario', label: '🪪 Fotocopia DNI Beneficiario', obsKey: 'fotocopia_dni_beneficiario_obs' },
      { key: 'fotocopia_dni_padre', label: '👨 Fotocopia DNI Padre', obsKey: 'fotocopia_dni_padre_obs' },
      { key: 'fotocopia_dni_madre', label: '👩 Fotocopia DNI Madre', obsKey: 'fotocopia_dni_madre_obs' },
      { key: 'fotocopia_vacunas', label: '💉 Fotocopia Vacunas', obsKey: 'fotocopia_vacunas_obs' },
      { key: 'otros', label: '📎 Otros', obsKey: 'otros_obs' }
    ]

    const handleCheckChange = (key: string, checked: boolean) => {
      if (!editandoLegajo || !legajoForm || !puedeEditarLegajo) return
      setLegajoForm({ ...legajoForm, [key]: checked })
    }

    const handleObsChange = (key: string, value: string) => {
      if (!editandoLegajo || !legajoForm || !puedeEditarLegajo) return
      setLegajoForm({ ...legajoForm, [key]: value })
    }

    const handleFechaChange = (key: string, value: string) => {
      if (!editandoLegajo || !legajoForm || !puedeEditarLegajo) return
      setLegajoForm({ ...legajoForm, [key]: value })
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', color: '#24352A', margin: 0 }}>
            📁 Legajo Scout
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {editandoLegajo && (
              <button
                onClick={() => {
                  setEditandoLegajo(false)
                  setLegajoForm(legajo)
                  setMessage({ text: '', type: '' })
                }}
                disabled={saving}
                style={{
                  backgroundColor: '#E8DEC4', color: '#24352A', padding: '6px 14px',
                  borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                  letterSpacing: '0.5px', opacity: saving ? 0.5 : 1
                }}
              >
                Cancelar
              </button>
            )}
            {puedeEditarLegajo && (
              <button
                onClick={() => {
                  if (editandoLegajo) {
                    handleGuardarLegajo()
                  } else {
                    setEditandoLegajo(true)
                    setLegajoForm(legajo ? { ...legajo } : null)
                    setMessage({ text: '', type: '' })
                  }
                }}
                disabled={saving}
                style={{
                  backgroundColor: editandoLegajo ? '#5C7A5E' : '#BF4E30',
                  color: 'white', padding: '6px 14px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer', fontSize: '12px',
                  fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                  letterSpacing: '0.5px', opacity: saving ? 0.5 : 1
                }}
              >
                {editandoLegajo ? (saving ? 'Guardando...' : '💾 Guardar') : '✏️ Editar Legajo'}
              </button>
            )}
          </div>
        </div>

        {message.text && message.type !== 'error' && (
          <div style={{
            padding: '8px 12px', borderRadius: '6px', marginBottom: '12px',
            fontSize: '13px', fontFamily: 'Oswald, sans-serif',
            backgroundColor: '#D1FAE5', color: '#5C7A5E', border: '1px solid #A7F3D0'
          }}>
            {message.text}
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '2px solid #D1C9B4', overflow: 'hidden' }}>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Oswald, sans-serif', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#24352A' }}>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#F3ECD8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '35%' }}>Documento</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: '#F3ECD8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Estado</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#F3ECD8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>Observaciones</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: '#F3ECD8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '15%' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {campos.map((campo, index) => {
                  const valor = data[campo.key as keyof typeof data] as boolean || false
                  const obs = data[campo.obsKey as keyof typeof data] as string || ''
                  const fecha = campo.fechaKey ? (data[campo.fechaKey as keyof typeof data] as string || '') : ''
                  const esEditable = editandoLegajo && puedeEditarLegajo

                  return (
                    <tr key={campo.key} style={{
                      borderBottom: index === campos.length - 1 ? 'none' : '1px solid #E8DEC4',
                      backgroundColor: index % 2 === 0 ? 'white' : '#FAF8F4'
                    }}>
                      <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{campo.label}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {esEditable ? (
                          <input
                            type="checkbox"
                            checked={valor}
                            onChange={(e) => handleCheckChange(campo.key, e.target.checked)}
                            disabled={saving}
                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#24352A' }}
                          />
                        ) : (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: '500', textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            backgroundColor: valor ? '#D1FAE5' : '#FEE2E2',
                            color: valor ? '#5C7A5E' : '#BF4E30'
                          }}>
                            {valor ? '✅ OK' : '❌ Falta'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {esEditable ? (
                          <input
                            type="text"
                            value={obs}
                            onChange={(e) => handleObsChange(campo.obsKey, e.target.value)}
                            placeholder="Observaciones..."
                            style={{
                              width: '100%', padding: '4px 8px', fontSize: '13px',
                              border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                              fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <span style={{ fontSize: '13px', color: '#7A7364' }}>{obs || '-'}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {campo.fechaKey ? (
                          esEditable ? (
                            <input
                              type="date"
                              value={fecha}
                              onChange={(e) => handleFechaChange(campo.fechaKey!, e.target.value)}
                              style={{
                                width: '100%', padding: '4px 8px', fontSize: '13px',
                                border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                                fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                              }}
                              disabled={saving}
                            />
                          ) : (
                            <span style={{ fontSize: '13px', color: '#7A7364' }}>{fecha ? formatFecha(fecha) : '-'}</span>
                          )
                        ) : (
                          <span style={{ fontSize: '13px', color: '#D1C9B4' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          marginTop: '16px', backgroundColor: 'white', borderRadius: '12px',
          padding: '12px 16px', border: '2px solid #D1C9B4'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '14px', color: '#24352A', fontWeight: '600' }}>
              📝 Observaciones Generales
            </span>
          </div>
          {editandoLegajo && puedeEditarLegajo ? (
            <textarea
              value={data.observaciones_generales || ''}
              onChange={(e) => {
                if (!legajoForm) return
                setLegajoForm({ ...legajoForm, observaciones_generales: e.target.value })
              }}
              rows={3}
              placeholder="Observaciones generales del beneficiario..."
              style={{
                width: '100%', marginTop: '8px', padding: '8px 12px', fontSize: '14px',
                border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', resize: 'vertical'
              }}
              disabled={saving}
            />
          ) : (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#7A7364', fontFamily: 'Oswald, sans-serif', padding: '4px 0' }}>
              {data.observaciones_generales || '-'}
            </div>
          )}
        </div>
      </div>
    )
  }

  // =============================================
  // CAMPAMENTOS (handlers)
  // =============================================
  const cargarCampamentosDisponibles = async () => {
    try {
      const { data, error } = await supabase
        .from('campamentos')
        .select('id, nombre, fecha_inicio, tipo')
        .order('nombre', { ascending: true })

      if (error) throw error

      const campamentosAsistidos = campamentos.map(c => c.id)
      const disponibles = data?.filter(c => !campamentosAsistidos.includes(c.id)) || []
      setCampamentosDisponibles(disponibles)
    } catch (error) {
      console.error('Error al cargar campamentos disponibles:', error)
    }
  }

  const handleAgregarCampamentoExistente = async () => {
    if (!campamentoSeleccionado || !beneficiario) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { data: campamentoData, error: campamentoError } = await supabase
        .from('campamentos')
        .select('nombre, fecha_inicio, tipo')
        .eq('id', campamentoSeleccionado)
        .single()

      if (campamentoError) throw campamentoError

      const { error } = await supabase
        .from('campamentos_asistidos')
        .insert({
          beneficiario_id: beneficiario.id,
          campamento_id: campamentoSeleccionado,
          nombre_campamento: campamentoData.nombre,
          fecha_inicio: campamentoData.fecha_inicio,
          tipo_campamento: campamentoData.tipo || null
        })

      if (error) throw error

      setMessage({ text: '✅ Campamento agregado correctamente', type: 'success' })
      setShowCampamentoModal(false)
      setCampamentoSeleccionado('')
      campamentosCargadosRef.current = false
      await cargarCampamentos()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleCrearYAgregarCampamento = async () => {
    if (!beneficiario) {
      setMessage({ text: '⚠️ Beneficiario no encontrado', type: 'warning' })
      return
    }

    if (!nuevoCampamentoNombre.trim()) {
      setMessage({ text: '⚠️ El nombre del campamento es obligatorio', type: 'warning' })
      return
    }

    if (nuevoCampamentoTipo === 'De Rama' && !nuevoCampamentoRama) {
      setMessage({ text: '⚠️ Seleccioná una rama para el campamento', type: 'warning' })
      return
    }

    if (nuevoCampamentoTipo === 'Otro' && !nuevoCampamentoOtro.trim()) {
      setMessage({ text: '⚠️ Especificá el tipo de campamento', type: 'warning' })
      return
    }

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      let tipoFinal = nuevoCampamentoTipo
      if (nuevoCampamentoTipo === 'De Rama' && nuevoCampamentoRama) {
        tipoFinal = `De Rama (${nuevoCampamentoRama})`
      } else if (nuevoCampamentoTipo === 'Otro' && nuevoCampamentoOtro) {
        tipoFinal = nuevoCampamentoOtro
      }

      let campamentoId: string | null = null
      let campamentoNombre = nuevoCampamentoNombre.trim()
      let campamentoFecha = nuevoCampamentoFecha || null

      const { data: existingCampamento, error: searchError } = await supabase
        .from('campamentos')
        .select('id, nombre, fecha_inicio, tipo')
        .eq('nombre', campamentoNombre)
        .maybeSingle()

      if (searchError) throw searchError

      if (existingCampamento) {
        campamentoId = existingCampamento.id
        campamentoNombre = existingCampamento.nombre
        campamentoFecha = existingCampamento.fecha_inicio
        tipoFinal = existingCampamento.tipo
        setMessage({ text: `📌 El campamento "${campamentoNombre}" ya existe. Se asignará al beneficiario.`, type: 'warning' })
      } else {
        const { data: nuevoCampamento, error: createError } = await supabase
          .from('campamentos')
          .insert({
            nombre: campamentoNombre,
            fecha_inicio: campamentoFecha,
            tipo: tipoFinal,
            ubicacion: null,
            descripcion: null,
            estado: 'planificado'
          })
          .select()
          .single()

        if (createError) throw createError
        campamentoId = nuevoCampamento.id
        campamentoNombre = nuevoCampamento.nombre
        campamentoFecha = nuevoCampamento.fecha_inicio
        tipoFinal = nuevoCampamento.tipo
      }

      const { data: existingAssignment, error: checkError } = await supabase
        .from('campamentos_asistidos')
        .select('id')
        .eq('beneficiario_id', beneficiario.id)
        .eq('campamento_id', campamentoId)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingAssignment) {
        setMessage({ text: `⚠️ El beneficiario ya tiene asignado el campamento "${campamentoNombre}"`, type: 'warning' })
        setSaving(false)
        return
      }

      const { error: assignError } = await supabase
        .from('campamentos_asistidos')
        .insert({
          beneficiario_id: beneficiario.id,
          campamento_id: campamentoId,
          nombre_campamento: campamentoNombre,
          fecha_inicio: campamentoFecha,
          tipo_campamento: tipoFinal
        })

      if (assignError) throw assignError

      setMessage({ text: `✅ Campamento "${campamentoNombre}" asignado correctamente`, type: 'success' })
      setShowCampamentoModal(false)
      setNuevoCampamentoNombre('')
      setNuevoCampamentoFecha('')
      setNuevoCampamentoTipo('Anual')
      setNuevoCampamentoRama('')
      setNuevoCampamentoOtro('')
      campamentosCargadosRef.current = false
      await cargarCampamentos()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleQuitarCampamento = async (campamentoId: string, nombre: string) => {
    if (!confirm(`¿Querés quitar el campamento "${nombre}" de este beneficiario?`)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('campamentos_asistidos')
        .delete()
        .eq('beneficiario_id', beneficiario?.id)
        .eq('id', campamentoId)

      if (error) throw error

      setMessage({ text: `✅ Campamento "${nombre}" quitado`, type: 'success' })
      campamentosCargadosRef.current = false
      await cargarCampamentos()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const abrirModalCampamentos = async () => {
    await cargarCampamentosDisponibles()
    setModalMode('agregar')
    setCampamentoSeleccionado('')
    setNuevoCampamentoNombre('')
    setNuevoCampamentoFecha(new Date().toISOString().split('T')[0])
    setNuevoCampamentoTipo('Anual')
    setNuevoCampamentoRama('')
    setNuevoCampamentoOtro('')
    setShowCampamentoModal(true)
  }

  // =============================================
  // NAVEGACIÓN
  // =============================================
  const irAlAnterior = () => {
    if (posicionActual > 0) {
      const nuevoId = todosLosIds[posicionActual - 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}`)
    }
  }

  const irAlSiguiente = () => {
    if (posicionActual < todosLosIds.length - 1) {
      const nuevoId = todosLosIds[posicionActual + 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}`)
    }
  }

  const generarProximoRecibo = async (rama: string): Promise<string> => {
    const prefijo = rama === 'Manada' ? 'M' :
                    rama === 'Unidad Scout' ? 'U' :
                    rama === 'Caminantes' ? 'C' : 'R'

    const { data, error } = await supabase
      .from('pagos')
      .select('recibo')
      .ilike('recibo', `${prefijo}-%`)
      .order('recibo', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error al obtener recibos:', error)
      return `${prefijo}-1`
    }

    let numero = 1
    if (data && data.length > 0 && data[0].recibo) {
      const match = data[0].recibo.match(new RegExp(`^${prefijo}-(\\d+)$`))
      if (match) numero = parseInt(match[1]) + 1
    }

    return `${prefijo}-${numero}`
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ text: '⚠️ Solo se permiten imágenes', type: 'error' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: '⚠️ La imagen no debe superar los 5MB', type: 'error' })
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)
    setMessage({ text: '', type: '' })
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile || !beneficiario) return

    setUploading(true)
    setMessage({ text: '', type: '' })

    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${beneficiario.id}-${Date.now()}.${fileExt}`
      const filePath = `${beneficiario.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beneficiarios')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('beneficiarios')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('beneficiarios')
        .update({ foto_url: publicUrl })
        .eq('id', beneficiario.id)

      if (updateError) throw updateError

      setMessage({ text: '✅ Foto actualizada correctamente', type: 'success' })

      setTimeout(() => {
        setBeneficiario(prev => prev ? { ...prev, foto_url: publicUrl } : prev)
        setShowPhotoModal(false)
        setSelectedFile(null)
        setPreviewUrl(null)
        setUploading(false)
      }, 1000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error al subir la foto: ${error.message}`, type: 'error' })
      setUploading(false)
    }
  }

  const openEditModal = () => {
    if (!beneficiario) return
    setEditForm({
      nombre: beneficiario.nombre || '',
      apellido: beneficiario.apellido || '',
      rama: beneficiario.rama || '',
      fecha_nacimiento: beneficiario.fecha_nacimiento || '',
      estado: beneficiario.estado || 'activo',
      tiene_hermanos: beneficiario.tiene_hermanos || false
    })
    setShowEditModal(true)
    setMessage({ text: '', type: '' })
  }

  const openInfoEditModal = () => {
    if (!beneficiario) return

    let tienePromesa = false
    let fechaPromesa = ''
    let padrino = ''

    const rama = beneficiario.rama
    if (rama === 'Manada' && progresionManada) {
      tienePromesa = progresionManada.tiene_promesa_manada || false
      fechaPromesa = progresionManada.fecha_promesa_manada || ''
      padrino = ''
    } else if (rama === 'Unidad Scout' && progresionUnidad) {
      tienePromesa = progresionUnidad.tiene_promesa_scout || false
      fechaPromesa = progresionUnidad.fecha_promesa_scout || ''
      padrino = progresionUnidad.padrino_promesa_scout || ''
    } else if (rama === 'Caminantes' && progresionCaminantes) {
      tienePromesa = progresionCaminantes.tiene_promesa_scout || false
      fechaPromesa = progresionCaminantes.fecha_promesa_scout || ''
      padrino = progresionCaminantes.padrino_promesa_scout || ''
    } else if (rama === 'Rovers' && progresionRovers) {
      tienePromesa = progresionRovers.tiene_promesa_scout || false
      fechaPromesa = progresionRovers.fecha_promesa_scout || ''
      padrino = progresionRovers.padrino_promesa_scout || ''
    }

    setInfoEditForm({
      tiene_uniforme: beneficiario.tiene_uniforme || false,
      fecha_entrega_uniforme: beneficiario.fecha_entrega_uniforme || '',
      tiene_promesa: tienePromesa,
      fecha_promesa: fechaPromesa,
      padrino: padrino,
      observaciones: beneficiario.observaciones || ''
    })
    setShowInfoEditModal(true)
    setMessage({ text: '', type: '' })
  }

  const openHistorialEditModal = () => {
    if (!beneficiario) return

    const fechaIngresoManada = progresionManada?.fecha_ingreso_manada || ''
    const fechaIngresoUnidad = progresionUnidad?.fecha_ingreso_unidad || ''
    const fechaIngresoCaminantes = progresionCaminantes?.fecha_ingreso_caminantes || ''
    const fechaIngresoRovers = progresionRovers?.fecha_ingreso_rovers || ''

    let tienePromesa = false
    let fechaPromesa = ''
    let padrinoPromesa = ''

    if (progresionManada?.tiene_promesa_manada) {
      tienePromesa = true
      fechaPromesa = progresionManada.fecha_promesa_manada || ''
      padrinoPromesa = ''
    } else if (progresionUnidad?.tiene_promesa_scout) {
      tienePromesa = true
      fechaPromesa = progresionUnidad.fecha_promesa_scout || ''
      padrinoPromesa = progresionUnidad.padrino_promesa_scout || ''
    } else if (progresionCaminantes?.tiene_promesa_scout) {
      tienePromesa = true
      fechaPromesa = progresionCaminantes.fecha_promesa_scout || ''
      padrinoPromesa = progresionCaminantes.padrino_promesa_scout || ''
    } else if (progresionRovers?.tiene_promesa_scout) {
      tienePromesa = true
      fechaPromesa = progresionRovers.fecha_promesa_scout || ''
      padrinoPromesa = progresionRovers.padrino_promesa_scout || ''
    }

    setHistorialEditForm({
      fecha_ingreso_grupo: beneficiario.fecha_ingreso_grupo || '',
      fecha_ingreso_manada: fechaIngresoManada,
      fecha_ingreso_unidad: fechaIngresoUnidad,
      fecha_ingreso_caminantes: fechaIngresoCaminantes,
      fecha_ingreso_rovers: fechaIngresoRovers,
      fecha_entrega_uniforme: beneficiario.fecha_entrega_uniforme || '',
      tiene_promesa: tienePromesa,
      fecha_promesa: fechaPromesa,
      padrino_promesa: padrinoPromesa
    })

    setShowHistorialEditModal(true)
    setMessage({ text: '', type: '' })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('beneficiarios')
        .update({
          nombre: editForm.nombre.trim(),
          apellido: editForm.apellido.trim(),
          rama: editForm.rama,
          fecha_nacimiento: editForm.fecha_nacimiento || null,
          estado: editForm.estado,
          tiene_hermanos: editForm.tiene_hermanos
        })
        .eq('id', id)

      if (error) throw error

      setMessage({ text: '✅ Beneficiario actualizado correctamente', type: 'success' })

      setTimeout(() => {
        loadData()
        setShowEditModal(false)
        setEditLoading(false)
      }, 1000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
      setEditLoading(false)
    }
  }

  const handleSaveInfoEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const { error: updateError } = await supabase
        .from('beneficiarios')
        .update({
          tiene_uniforme: infoEditForm.tiene_uniforme,
          fecha_entrega_uniforme: infoEditForm.fecha_entrega_uniforme || null,
          observaciones: infoEditForm.observaciones.trim() || null
        })
        .eq('id', id)

      if (updateError) throw updateError

      const rama = beneficiario?.rama
      if (rama === 'Manada' && progresionManada) {
        await supabase.from('progresion_manada').update({
          tiene_promesa_manada: infoEditForm.tiene_promesa,
          fecha_promesa_manada: infoEditForm.fecha_promesa || null
        }).eq('id', progresionManada.id)
      } else if (rama === 'Unidad Scout' && progresionUnidad) {
        await supabase.from('progresion_unidad').update({
          tiene_promesa_scout: infoEditForm.tiene_promesa,
          fecha_promesa_scout: infoEditForm.fecha_promesa || null,
          padrino_promesa_scout: infoEditForm.padrino.trim() || null
        }).eq('id', progresionUnidad.id)
      } else if (rama === 'Caminantes' && progresionCaminantes) {
        await supabase.from('progresion_caminantes').update({
          tiene_promesa_scout: infoEditForm.tiene_promesa,
          fecha_promesa_scout: infoEditForm.fecha_promesa || null,
          padrino_promesa_scout: infoEditForm.padrino.trim() || null
        }).eq('id', progresionCaminantes.id)
      } else if (rama === 'Rovers' && progresionRovers) {
        await supabase.from('progresion_rovers').update({
          tiene_promesa_scout: infoEditForm.tiene_promesa,
          fecha_promesa_scout: infoEditForm.fecha_promesa || null,
          padrino_promesa_scout: infoEditForm.padrino.trim() || null
        }).eq('id', progresionRovers.id)
      }

      setMessage({ text: '✅ Información actualizada correctamente', type: 'success' })

      setTimeout(() => {
        loadData()
        setShowInfoEditModal(false)
        setEditLoading(false)
      }, 1000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
      setEditLoading(false)
    }
  }

  const handleSaveHistorialEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditHistorialLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const { error: updateError } = await supabase
        .from('beneficiarios')
        .update({
          fecha_ingreso_grupo: historialEditForm.fecha_ingreso_grupo || null,
          fecha_entrega_uniforme: historialEditForm.fecha_entrega_uniforme || null
        })
        .eq('id', id)

      if (updateError) throw updateError

      if (progresionManada) {
        await supabase.from('progresion_manada').update({
          fecha_ingreso_manada: historialEditForm.fecha_ingreso_manada || null,
          tiene_promesa_manada: historialEditForm.tiene_promesa && !historialEditForm.padrino_promesa,
          fecha_promesa_manada: historialEditForm.tiene_promesa && !historialEditForm.padrino_promesa ? historialEditForm.fecha_promesa || null : null
        }).eq('id', progresionManada.id)
      }

      if (progresionUnidad) {
        await supabase.from('progresion_unidad').update({
          fecha_ingreso_unidad: historialEditForm.fecha_ingreso_unidad || null,
          tiene_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa,
          fecha_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa ? historialEditForm.fecha_promesa || null : null,
          padrino_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa ? historialEditForm.padrino_promesa || null : null
        }).eq('id', progresionUnidad.id)
      }

      if (progresionCaminantes) {
        await supabase.from('progresion_caminantes').update({
          fecha_ingreso_caminantes: historialEditForm.fecha_ingreso_caminantes || null,
          tiene_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa,
          fecha_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa ? historialEditForm.fecha_promesa || null : null,
          padrino_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa ? historialEditForm.padrino_promesa || null : null
        }).eq('id', progresionCaminantes.id)
      }

      if (progresionRovers) {
        await supabase.from('progresion_rovers').update({
          fecha_ingreso_rovers: historialEditForm.fecha_ingreso_rovers || null,
          tiene_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa,
          fecha_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa ? historialEditForm.fecha_promesa || null : null,
          padrino_promesa_scout: historialEditForm.tiene_promesa && !!historialEditForm.padrino_promesa ? historialEditForm.padrino_promesa || null : null
        }).eq('id', progresionRovers.id)
      }

      setMessage({ text: '✅ Historial actualizado correctamente', type: 'success' })

      setTimeout(() => {
        loadData()
        setShowHistorialEditModal(false)
        setEditHistorialLoading(false)
      }, 1000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
      setEditHistorialLoading(false)
    }
  }

  const updateProgresionManada = async (campo: string, valor: string) => {
    if (!progresionManada) return
    try {
      const { error } = await supabase
        .from('progresion_manada')
        .update({ [campo]: valor || null })
        .eq('id', progresionManada.id)
      if (error) throw error
      setProgresionManada({ ...progresionManada, [campo]: valor || null })
    } catch (error) {
      console.error('Error al actualizar progresión:', error)
      alert('Error al guardar la fecha')
    }
  }

  const updateProgresionUnidad = async (campo: string, valor: string) => {
    if (!progresionUnidad) return
    try {
      const { error } = await supabase
        .from('progresion_unidad')
        .update({ [campo]: valor || null })
        .eq('id', progresionUnidad.id)
      if (error) throw error
      setProgresionUnidad({ ...progresionUnidad, [campo]: valor || null })
    } catch (error) {
      console.error('Error al actualizar progresión:', error)
      alert('Error al guardar la fecha')
    }
  }

  const updateProgresionCaminantes = async (campo: string, valor: string) => {
    if (!progresionCaminantes) return
    try {
      const { error } = await supabase
        .from('progresion_caminantes')
        .update({ [campo]: valor || null })
        .eq('id', progresionCaminantes.id)
      if (error) throw error
      setProgresionCaminantes({ ...progresionCaminantes, [campo]: valor || null })
    } catch (error) {
      console.error('Error al actualizar progresión:', error)
      alert('Error al guardar la fecha')
    }
  }

  const updateProgresionRovers = async (campo: string, valor: string) => {
    if (!progresionRovers) return
    try {
      const { error } = await supabase
        .from('progresion_rovers')
        .update({ [campo]: valor || null })
        .eq('id', progresionRovers.id)
      if (error) throw error
      setProgresionRovers({ ...progresionRovers, [campo]: valor || null })
    } catch (error) {
      console.error('Error al actualizar progresión:', error)
      alert('Error al guardar la fecha')
    }
  }

  const actualizarElementoDeEtapa = async (
    numeroEtapa: 1 | 2 | 3 | 4,
    nuevoElemento: ElementoValor | null
  ) => {
    if (!progresionCaminantes) return

    const actuales: (string | null)[] = Array.isArray(progresionCaminantes.elemento_elegido)
      ? [...progresionCaminantes.elemento_elegido]
      : [null, null, null, null]

    while (actuales.length < 4) actuales.push(null)

    const nuevos: (string | null)[] = [...actuales]
    nuevos[numeroEtapa - 1] = nuevoElemento

    try {
      const { error } = await supabase
        .from('progresion_caminantes')
        .update({ elemento_elegido: nuevos })
        .eq('id', progresionCaminantes.id)

      if (error) throw error
      setProgresionCaminantes({ ...progresionCaminantes, elemento_elegido: nuevos as string[] })
    } catch (error: any) {
      console.error('Error al actualizar elemento:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    }
  }

  const actualizarFechaDeEtapa = async (
    numeroEtapa: 1 | 2 | 3 | 4,
    nuevaFecha: string
  ) => {
    if (!progresionCaminantes) return

    const fechaKey = `fecha_etapa${numeroEtapa}` as
      | 'fecha_etapa1' | 'fecha_etapa2' | 'fecha_etapa3' | 'fecha_etapa4'

    if (!nuevaFecha) {
      const actuales: (string | null)[] = Array.isArray(progresionCaminantes.elemento_elegido)
        ? [...progresionCaminantes.elemento_elegido]
        : [null, null, null, null]
      while (actuales.length < 4) actuales.push(null)

      const nuevos: (string | null)[] = [...actuales]
      nuevos[numeroEtapa - 1] = null

      try {
        const { error } = await supabase
          .from('progresion_caminantes')
          .update({
            [fechaKey]: null,
            elemento_elegido: nuevos
          })
          .eq('id', progresionCaminantes.id)

        if (error) throw error
        setProgresionCaminantes({
          ...progresionCaminantes,
          [fechaKey]: '',
          elemento_elegido: nuevos as string[]
        })
      } catch (error: any) {
        console.error('Error al borrar fecha y elemento:', error)
        setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
      }
      return
    }

    try {
      const { error } = await supabase
        .from('progresion_caminantes')
        .update({ [fechaKey]: nuevaFecha })
        .eq('id', progresionCaminantes.id)

      if (error) throw error
      setProgresionCaminantes({ ...progresionCaminantes, [fechaKey]: nuevaFecha })
    } catch (error: any) {
      console.error('Error al actualizar fecha:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    }
  }

  const handleAbrirFormPago = async () => {
    if (!beneficiario) return

    if (showPagoForm) {
      setShowPagoForm(false)
      setMessage({ text: '', type: '' })
      return
    }

    const proximoRecibo = await generarProximoRecibo(beneficiario.rama)
    setNuevoPago({
      recibo: proximoRecibo,
      monto: '',
      fecha_pago: new Date().toISOString().split('T')[0],
      categoria: '',
      categoria_otro: '',
      medio_pago: '',
      observaciones: ''
    })
    setShowPagoForm(true)
    setMessage({ text: '', type: '' })
  }

  const handleNuevoPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!beneficiario) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const monto = parseFloat(nuevoPago.monto)
      if (!monto || monto <= 0) {
        setMessage({ text: '⚠️ Ingresá un monto válido', type: 'warning' })
        setSaving(false)
        return
      }

      if (!nuevoPago.categoria) {
        setMessage({ text: '⚠️ Seleccioná una categoría', type: 'warning' })
        setSaving(false)
        return
      }

      if (nuevoPago.categoria === 'OTRO' && !nuevoPago.categoria_otro.trim()) {
        setMessage({ text: '⚠️ Especificá la categoría "Otro"', type: 'warning' })
        setSaving(false)
        return
      }

      if (!nuevoPago.medio_pago) {
        setMessage({ text: '⚠️ Seleccioná un medio de pago', type: 'warning' })
        setSaving(false)
        return
      }

      let categoriaFinal = nuevoPago.categoria
      if (nuevoPago.categoria === 'OTRO') {
        categoriaFinal = nuevoPago.categoria_otro.trim().toUpperCase()
      }

      const { error } = await supabase
        .from('pagos')
        .insert({
          beneficiario_id: beneficiario.id,
          rama: beneficiario.rama,
          recibo: nuevoPago.recibo,
          monto: monto,
          fecha_pago: nuevoPago.fecha_pago,
          categoria: categoriaFinal,
          medio_pago: nuevoPago.medio_pago,
          observaciones: nuevoPago.observaciones || null
        })

      if (error) throw error

      setMessage({ text: `✅ Pago ${nuevoPago.recibo} registrado correctamente`, type: 'success' })
      setNuevoPago({
        recibo: '',
        monto: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        categoria: '',
        categoria_otro: '',
        medio_pago: '',
        observaciones: ''
      })
      setShowPagoForm(false)

      const { data: pagosData } = await supabase
        .from('pagos')
        .select('*')
        .eq('beneficiario_id', beneficiario.id)
        .order('fecha_pago', { ascending: false })
        .limit(10)
      setPagos(pagosData || [])
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
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

  const calcularEdad = (fechaNac: string) => {
    if (!fechaNac) return null
    const hoy = new Date()
    const nac = new Date(fechaNac)
    nac.setDate(nac.getDate() + 1)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  const edad = calcularEdad(beneficiario?.fecha_nacimiento || '')

  const getPromesaInfo = () => {
    if (!beneficiario) return { tiene: false, fecha: null as string | null, padrino: null as string | null }
    const rama = beneficiario.rama
    if (rama === 'Manada' && progresionManada) {
      return { tiene: progresionManada.tiene_promesa_manada, fecha: progresionManada.fecha_promesa_manada, padrino: null }
    }
    if (rama === 'Unidad Scout' && progresionUnidad) {
      return { tiene: progresionUnidad.tiene_promesa_scout, fecha: progresionUnidad.fecha_promesa_scout, padrino: progresionUnidad.padrino_promesa_scout }
    }
    if (rama === 'Caminantes' && progresionCaminantes) {
      return { tiene: progresionCaminantes.tiene_promesa_scout, fecha: progresionCaminantes.fecha_promesa_scout, padrino: progresionCaminantes.padrino_promesa_scout }
    }
    if (rama === 'Rovers' && progresionRovers) {
      return { tiene: progresionRovers.tiene_promesa_scout, fecha: progresionRovers.fecha_promesa_scout, padrino: progresionRovers.padrino_promesa_scout }
    }
    return { tiene: false, fecha: null, padrino: null }
  }

  const promesaInfo = getPromesaInfo()

  const renderProgresion = () => {
    if (!beneficiario) return null
    const rama = beneficiario.rama

    if (rama === 'Manada' && progresionManada) {
      return (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Progresión Actual:
            </span>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', color: '#24352A', fontWeight: '700', marginLeft: '8px' }}>
              {progresionManada.progresion_actual || 'Sin asignar'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <EditableDate label="Pata Tierna" value={progresionManada.fecha_pata_tierna} onSave={(val) => updateProgresionManada('fecha_pata_tierna', val)} disabled={!canEdit()} />
            <EditableDate label="Saltador" value={progresionManada.fecha_saltador} onSave={(val) => updateProgresionManada('fecha_saltador', val)} disabled={!canEdit()} />
            <EditableDate label="Rastreador" value={progresionManada.fecha_rastreador} onSave={(val) => updateProgresionManada('fecha_rastreador', val)} disabled={!canEdit()} />
            <EditableDate label="Cazador" value={progresionManada.fecha_cazador} onSave={(val) => updateProgresionManada('fecha_cazador', val)} disabled={!canEdit()} />
          </div>
        </div>
      )
    }

    if (rama === 'Unidad Scout' && progresionUnidad) {
      return (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Progresión Actual:
            </span>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', color: '#24352A', fontWeight: '700', marginLeft: '8px' }}>
              {progresionUnidad.progresion_actual || 'Sin asignar'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <EditableDate label="Pista" value={progresionUnidad.fecha_pista} onSave={(val) => updateProgresionUnidad('fecha_pista', val)} disabled={!canEdit()} />
            <EditableDate label="Senda" value={progresionUnidad.fecha_senda} onSave={(val) => updateProgresionUnidad('fecha_senda', val)} disabled={!canEdit()} />
            <EditableDate label="Rumbo" value={progresionUnidad.fecha_rumbo} onSave={(val) => updateProgresionUnidad('fecha_rumbo', val)} disabled={!canEdit()} />
            <EditableDate label="Travesía" value={progresionUnidad.fecha_travesia} onSave={(val) => updateProgresionUnidad('fecha_travesia', val)} disabled={!canEdit()} />
          </div>
        </div>
      )
    }

    if (rama === 'Caminantes' && progresionCaminantes) {
      const elementos = Array.isArray(progresionCaminantes.elemento_elegido)
        ? progresionCaminantes.elemento_elegido
        : []
      const elementosValidos = elementos.filter(Boolean) as string[]
      const cantidad = elementosValidos.length

      const getElementoDeEtapa = (num: 1 | 2 | 3 | 4): string | null => {
        return (elementos[num - 1] as string) || null
      }

      const getElementosUsadosExcluyendo = (num: 1 | 2 | 3 | 4): string[] => {
        return elementosValidos.filter((_, idx) => idx !== num - 1)
      }

      return (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Progresión Actual:
            </span>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', color: '#24352A', fontWeight: '700', marginLeft: '8px' }}>
              {progresionCaminantes.progresion_actual || 'Sin asignar'}
            </span>
          </div>

          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Elementos:
            </span>
            {elementosValidos.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#A89E86' }}>Ninguno todavía</span>
            ) : (
              <>
                {elementosValidos.map((elem, i) => <ElementoBadge key={i} elemento={elem} />)}
              </>
            )}
            <span style={{
              fontFamily: 'Oswald, sans-serif', fontSize: '13px', fontWeight: '600',
              color: cantidad === 4 ? '#5C7A5E' : '#7A7364', marginLeft: '4px'
            }}>
              ({cantidad}/4)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <EditableDate
              label="Ceremonia de Bienvenida"
              value={progresionCaminantes.fecha_ceremonia_bienvenida}
              onSave={(val) => updateProgresionCaminantes('fecha_ceremonia_bienvenida', val)}
              disabled={!canEdit()}
            />

            {[1, 2, 3, 4].map((num) => {
              const numEtapa = num as 1 | 2 | 3 | 4
              const fechaKey = `fecha_etapa${num}` as 'fecha_etapa1' | 'fecha_etapa2' | 'fecha_etapa3' | 'fecha_etapa4'
              const fechaRaw = progresionCaminantes?.[fechaKey]
              const fechaValor = (fechaRaw && String(fechaRaw).trim() !== '') ? String(fechaRaw) : null
              const elementoActual = getElementoDeEtapa(numEtapa)
              const usadosExcluyendo = getElementosUsadosExcluyendo(numEtapa)
              const hayFecha = !!fechaValor

              return (
                <div
                  key={num}
                  style={{
                    backgroundColor: '#FAF8F4',
                    border: '2px solid #E8DEC4',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#24352A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Etapa {num}
                  </div>

                  <div>
                    <div style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: '10px',
                      color: '#7A7364',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '2px'
                    }}>
                      Fecha
                    </div>
                    <EditableDate
                      label=""
                      value={fechaValor}
                      onSave={(val) => actualizarFechaDeEtapa(numEtapa, val)}
                      disabled={!canEdit()}
                    />
                  </div>

                  <div>
                    <div style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: '10px',
                      color: '#7A7364',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '2px'
                    }}>
                      Elemento
                    </div>
                    <ElementoSelector
                      valor={elementoActual}
                      elementosUsados={usadosExcluyendo}
                      onCambio={(nuevo) => {
                        if (!nuevo && fechaValor) {
                          setMessage({
                            text: `⚠️ No podés quitar el elemento de Etapa ${num} porque ya tiene fecha. Borrá la fecha primero.`,
                            type: 'warning'
                          })
                          return
                        }
                        actualizarElementoDeEtapa(numEtapa, nuevo)
                      }}
                      disabled={!canEdit()}
                      requiereFecha={true}
                      hayFecha={hayFecha}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (rama === 'Rovers' && progresionRovers) {
      return (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Progresión Actual:
            </span>
            <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', color: '#24352A', fontWeight: '700', marginLeft: '8px' }}>
              {progresionRovers.progresion_actual || 'Sin asignar'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <EditableDate label="Encuentro" value={progresionRovers.fecha_encuentro} onSave={(val) => updateProgresionRovers('fecha_encuentro', val)} disabled={!canEdit()} />
            <EditableDate label="Compromiso" value={progresionRovers.fecha_compromiso} onSave={(val) => updateProgresionRovers('fecha_compromiso', val)} disabled={!canEdit()} />
            <EditableDate label="Proyección" value={progresionRovers.fecha_proyeccion} onSave={(val) => updateProgresionRovers('fecha_proyeccion', val)} disabled={!canEdit()} />
            <EditableDate label="Partida" value={progresionRovers.fecha_partida} onSave={(val) => updateProgresionRovers('fecha_partida', val)} disabled={!canEdit()} />
          </div>
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A7364' }}>
        No hay información de progresión disponible
      </div>
    )
  }

  const renderHistorialScout = () => {
    if (!beneficiario) return null

    const eventos: { fecha: string, titulo: string, detalle: string, icono: string, color: string }[] = []

    if (beneficiario.fecha_ingreso_grupo) {
      eventos.push({ fecha: beneficiario.fecha_ingreso_grupo, titulo: '📋 Ingreso al Grupo', detalle: 'Ingreso al grupo scout', icono: '📋', color: '#24352A' })
    }

    if (beneficiario.fecha_entrega_uniforme) {
      eventos.push({ fecha: beneficiario.fecha_entrega_uniforme, titulo: '👕 Entrega de Uniforme', detalle: 'Recibió su uniforme scout', icono: '👕', color: '#BF4E30' })
    }

    if (progresionManada && progresionManada.tiene_promesa_manada && progresionManada.fecha_promesa_manada) {
      eventos.push({ fecha: progresionManada.fecha_promesa_manada, titulo: '🤝 Promesa de Manada', detalle: 'Promesa de Manada', icono: '🤝', color: '#5C7A5E' })
    }

    let promesaScoutFecha = ''
    let promesaScoutPadrino = ''
    let promesaScoutRama = ''

    if (progresionUnidad && progresionUnidad.tiene_promesa_scout && progresionUnidad.fecha_promesa_scout) {
      promesaScoutFecha = progresionUnidad.fecha_promesa_scout
      promesaScoutPadrino = progresionUnidad.padrino_promesa_scout || ''
      promesaScoutRama = 'Unidad'
    } else if (progresionCaminantes && progresionCaminantes.tiene_promesa_scout && progresionCaminantes.fecha_promesa_scout) {
      promesaScoutFecha = progresionCaminantes.fecha_promesa_scout
      promesaScoutPadrino = progresionCaminantes.padrino_promesa_scout || ''
      promesaScoutRama = 'Caminantes'
    } else if (progresionRovers && progresionRovers.tiene_promesa_scout && progresionRovers.fecha_promesa_scout) {
      promesaScoutFecha = progresionRovers.fecha_promesa_scout
      promesaScoutPadrino = progresionRovers.padrino_promesa_scout || ''
      promesaScoutRama = 'Rovers'
    }

    if (promesaScoutFecha) {
      eventos.push({
        fecha: promesaScoutFecha,
        titulo: `🤝 Promesa Scout`,
        detalle: promesaScoutPadrino ? `Padrino/Madrina: ${promesaScoutPadrino} (${promesaScoutRama})` : `Promesa Scout (${promesaScoutRama})`,
        icono: '🤝',
        color: '#C48A2A'
      })
    }

    if (progresionManada && progresionManada.fecha_ingreso_manada) {
      eventos.push({ fecha: progresionManada.fecha_ingreso_manada, titulo: '🐺 Ingreso a Manada', detalle: 'Ingreso a la Manada', icono: '🐺', color: '#5C7A5E' })
    }

    if (progresionUnidad && progresionUnidad.fecha_ingreso_unidad) {
      eventos.push({ fecha: progresionUnidad.fecha_ingreso_unidad, titulo: '⚜️ Ingreso a Unidad', detalle: 'Ingreso a la Unidad Scout', icono: '⚜️', color: '#C48A2A' })
    }

    if (progresionCaminantes && progresionCaminantes.fecha_ingreso_caminantes) {
      eventos.push({ fecha: progresionCaminantes.fecha_ingreso_caminantes, titulo: '🏔️ Ingreso a Caminantes', detalle: 'Ingreso a Caminantes', icono: '🏔️', color: '#D97A3E' })
    }

    if (progresionRovers && progresionRovers.fecha_ingreso_rovers) {
      eventos.push({ fecha: progresionRovers.fecha_ingreso_rovers, titulo: '🔥 Ingreso a Rovers', detalle: 'Ingreso a Rovers', icono: '🔥', color: '#8B4513' })
    }

    eventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    const puedeEditarHistorial = canEdit()

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', color: '#24352A', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              📜 Historial Scout
            </h3>
            <p style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', color: '#7A7364', margin: '4px 0 0 0' }}>
              Línea de tiempo del recorrido scout de {beneficiario.nombre}
            </p>
          </div>
          {puedeEditarHistorial && (
            <button
              onClick={openHistorialEditModal}
              style={{
                backgroundColor: '#BF4E30', color: 'white', padding: '6px 14px',
                borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
                fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}
            >
              ✏️ Editar Historial
            </button>
          )}
        </div>

        {eventos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#7A7364' }}>
            No hay eventos en el historial scout
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div style={{ position: 'absolute', left: '4px', top: '0', bottom: '0', width: '2px', backgroundColor: '#D1C9B4' }} />

            {eventos.map((evento, index) => (
              <div key={index} style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{
                  position: 'absolute', left: '-20px', top: '4px', width: '12px', height: '12px',
                  borderRadius: '50%', backgroundColor: evento.color,
                  border: '2px solid #F3ECD8', boxShadow: '0 0 0 2px ' + evento.color
                }} />

                <div style={{
                  backgroundColor: 'white', borderRadius: '8px', padding: '12px 16px',
                  border: '1px solid #E8DEC4', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', fontWeight: '600', color: '#24352A' }}>
                        {evento.titulo}
                      </div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#7A7364', marginTop: '2px' }}>
                        {evento.detalle}
                      </div>
                    </div>
                    {evento.fecha && (
                      <div style={{
                        fontFamily: 'Oswald, sans-serif', fontSize: '12px', color: '#7A7364',
                        backgroundColor: '#F3ECD8', padding: '2px 10px', borderRadius: '12px',
                        whiteSpace: 'nowrap', marginLeft: '12px'
                      }}>
                        {formatFecha(evento.fecha)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const handleSwipeLeft = () => {
    if (posicionActual < todosLosIds.length - 1) {
      const nuevoId = todosLosIds[posicionActual + 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}`)
    }
  }

  const handleSwipeRight = () => {
    if (posicionActual > 0) {
      const nuevoId = todosLosIds[posicionActual - 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}`)
    }
  }

  const handleDrag = (deltaX: number) => {
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
    onDragEnd: handleDragEnd
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>Cargando...</span>
      </div>
    )
  }

  if (!beneficiario) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#BF4E30' }}>Beneficiario no encontrado</span>
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

  return (
    <div
      style={{
        transform: `translateX(${dragOffset}px)`,
        transition: dragOffset === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: 'none',
            border: 'none', cursor: 'pointer', color: '#7A7364', fontSize: '14px',
            fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}
        >
          ← Volver
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#7A7364' }}>
            {actual} / {total}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={irAlAnterior}
              disabled={posicionActual <= 0}
              style={{
                backgroundColor: posicionActual <= 0 ? '#E8DEC4' : '#24352A',
                color: posicionActual <= 0 ? '#7A7364' : 'white',
                border: 'none', borderRadius: '6px', padding: '4px 12px',
                cursor: posicionActual <= 0 ? 'default' : 'pointer',
                fontFamily: 'Oswald, sans-serif', fontSize: '18px', lineHeight: 1.4,
                opacity: posicionActual <= 0 ? 0.5 : 1
              }}
            >◀</button>
            <button              onClick={irAlSiguiente}
              disabled={posicionActual >= total - 1}
              style={{
                backgroundColor: posicionActual >= total - 1 ? '#E8DEC4' : '#24352A',
                color: posicionActual >= total - 1 ? '#7A7364' : 'white',
                border: 'none', borderRadius: '6px', padding: '4px 12px',
                cursor: posicionActual >= total - 1 ? 'default' : 'pointer',
                fontFamily: 'Oswald, sans-serif', fontSize: '18px', lineHeight: 1.4,
                opacity: posicionActual >= total - 1 ? 0.5 : 1
              }}
            >▶</button>
          </div>
        </div>
      </div>

      {/* Encabezado */}
      <div style={{
        backgroundColor: '#24352A', borderRadius: '12px', padding: '16px',
        border: '2px solid #D1C9B4', marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          alignItems: 'center',
          gap: window.innerWidth < 768 ? '12px' : '24px',
          textAlign: window.innerWidth < 768 ? 'center' : 'left'
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '200px', height: '200px', borderRadius: '12px', overflow: 'hidden',
              backgroundColor: '#F3ECD8', border: '3px solid #D1C9B4', flexShrink: 0
            }}>
              <img
                src={fotoUrl}
                alt={nombreCompleto}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  const iniciales = `${beneficiario.nombre.charAt(0)}${beneficiario.apellido.charAt(0)}`.toUpperCase()
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    const fallback = document.createElement('div')
                    fallback.style.cssText = `
                      width: 100%; height: 100%;
                      display: flex; align-items: center; justify-content: center;
                      background-color: #24352A; color: white;
                      font-family: Oswald, sans-serif; font-size: 32px; font-weight: 700;
                    `
                    fallback.textContent = iniciales || 'U'
                    parent.appendChild(fallback)
                  }
                }}
              />
            </div>
            {canEdit() && (
              <button
                onClick={() => setShowPhotoModal(true)}
                style={{
                  position: 'absolute', bottom: '-6px', right: '-6px',
                  backgroundColor: '#BF4E30', color: 'white',
                  border: '2px solid #F3ECD8', borderRadius: '50%',
                  width: '28px', height: '28px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '14px', padding: 0
                }}
                title="Cambiar foto"
              >📷</button>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <h1 style={{
              fontFamily: 'Oswald, sans-serif', fontWeight: '700',
              fontSize: 'clamp(16px, 5vw, 26px)', color: '#F3ECD8',
              textTransform: 'uppercase', letterSpacing: '1px',
              margin: 0, lineHeight: 1.2, wordBreak: 'break-word'
            }}>
              {nombreCompleto}
            </h1>
            <div style={{
              display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap',
              justifyContent: window.innerWidth < 768 ? 'center' : 'flex-start'
            }}>
              <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(11px, 3vw, 14px)', color: '#D1C9B4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {getRamaLabel(beneficiario.rama)}
              </span>
              <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(11px, 3vw, 14px)', color: '#D1C9B4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {edad !== null ? `${edad} años` : 'Edad no disponible'}
              </span>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                fontSize: 'clamp(10px, 2.5vw, 12px)', fontWeight: '500',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                backgroundColor: beneficiario.estado === 'activo' ? '#D1FAE5' : '#FEE2E2',
                color: beneficiario.estado === 'activo' ? '#5C7A5E' : '#BF4E30'
              }}>
                {beneficiario.estado === 'inactivo' ? 'Ex miembro' : beneficiario.estado}
              </span>
            </div>
          </div>

          {canEdit() && (
            <button
              onClick={openEditModal}
              style={{
                backgroundColor: '#BF4E30', color: 'white', padding: '8px 16px',
                borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: 'clamp(11px, 2.5vw, 13px)', fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                width: window.innerWidth < 768 ? '100%' : 'auto', flexShrink: 0
              }}
            >✏️ Editar</button>
          )}
        </div>
      </div>

      {/* Tabs tipo pills */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
      }}>
        {['info', 'progresion', 'pagos', 'campamentos', 'legajo', 'historial'].map((tab) => {
          const labels: Record<string, string> = {
            'info': '📋 Info',
            'progresion': '📈 Progresión',
            'pagos': '💰 Pagos',
            'campamentos': '🏕️ Campamentos',
            'legajo': '📁 Legajo',
            'historial': '📜 Historial Scout'
          }
          const labelsMobile: Record<string, string> = {
            'info': '📋 Info',
            'progresion': '📈 Progresión',
            'pagos': '💰 Pagos',
            'campamentos': '🏕️ Campamentos',
            'legajo': '📁 Legajo',
            'historial': '📜 Historial'
          }
          const activo = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: window.innerWidth < 768 ? '6px 12px' : '8px 16px',
                backgroundColor: activo ? '#24352A' : 'white',
                color: activo ? '#F3ECD8' : '#7A7364',
                border: `2px solid ${activo ? '#24352A' : '#D1C9B4'}`,
                cursor: 'pointer',
                fontSize: window.innerWidth < 768 ? '11px' : '13px',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRadius: '20px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                fontWeight: activo ? '700' : '500',
                boxShadow: activo ? '0 2px 6px rgba(36, 53, 42, 0.25)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!activo) {
                  e.currentTarget.style.backgroundColor = '#F3ECD8'
                  e.currentTarget.style.borderColor = '#24352A'
                }
              }}
              onMouseLeave={(e) => {
                if (!activo) {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#D1C9B4'
                }
              }}
            >
              {window.innerWidth < 768 ? labelsMobile[tab] : labels[tab]}
            </button>
          )
        })}
      </div>

      {/* Contenido de tabs */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '2px solid #D1C9B4' }}>
        {activeTab === 'info' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              {canEdit() && (
                <button
                  onClick={openInfoEditModal}
                  style={{
                    backgroundColor: '#BF4E30', color: 'white', padding: '6px 16px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}
                >✏️ Editar Información</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Fecha de Nacimiento</p>
                <p style={{ fontSize: '16px', color: '#24352A', margin: '4px 0 0 0' }}>{formatFecha(beneficiario.fecha_nacimiento)}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Edad</p>
                <p style={{ fontSize: '16px', color: '#24352A', margin: '4px 0 0 0' }}>{edad !== null ? `${edad} años` : 'No disponible'}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Tiene Uniforme?</p>
                <p style={{ fontSize: '16px', color: '#24352A', margin: '4px 0 0 0' }}>
                  {beneficiario.tiene_uniforme ? '✅ Sí' : '❌ No'}
                  {beneficiario.fecha_entrega_uniforme && ` (${formatFecha(beneficiario.fecha_entrega_uniforme)})`}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Tiene Promesa Scout?</p>
                <p style={{ fontSize: '16px', color: '#24352A', margin: '4px 0 0 0' }}>
                  {promesaInfo.tiene ? '✅ Sí' : '❌ No'}
                  {promesaInfo.fecha && ` (${formatFecha(promesaInfo.fecha)})`}
                </p>
                {promesaInfo.padrino && (
                  <p style={{ fontSize: '14px', color: '#7A7364', margin: '2px 0 0 0' }}>Padrino: {promesaInfo.padrino}</p>
                )}
              </div>
              {beneficiario.rama === 'Rovers' && progresionRovers && (
                <div>
                  <p style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}> Tótem</p>
                  <p style={{ fontSize: '16px', color: '#24352A', margin: '4px 0 0 0' }}>
                    {progresionRovers.nombre_totem || '-'}
                    {progresionRovers.campamento_totem && ` (${progresionRovers.campamento_totem})`}
                  </p>
                </div>
              )}
              {(beneficiario.rama === 'Caminantes' || beneficiario.rama === 'Rovers') && (
                <div>
                  <p style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}> REALIZO EL TADA?</p>
                  <p style={{ fontSize: '16px', color: '#24352A', margin: '4px 0 0 0' }}>
                    {beneficiario.rama === 'Caminantes'
                      ? (progresionCaminantes?.hizo_tada ? '✅ Realizado' : '❌ No realizado')
                      : beneficiario.rama === 'Rovers'
                        ? (progresionRovers?.nombre_totem ? '✅ Realizado' : '❌ No realizado')
                        : 'No aplica'}
                  </p>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Observaciones</p>
                <p style={{ fontSize: '16px', color: '#24352A', margin: '4px 0 0 0' }}>{beneficiario.observaciones || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progresion' && <div>{renderProgresion()}</div>}

        {activeTab === 'pagos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', color: '#24352A', margin: 0 }}>Historial de Pagos</h3>
              {canEdit() && (
                <button
                  onClick={handleAbrirFormPago}
                  style={{
                    backgroundColor: '#24352A', color: 'white', padding: '6px 14px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}
                >
                  {showPagoForm ? '✕ Cancelar' : '+ Nuevo Pago'}
                </button>
              )}
            </div>

            {showPagoForm && (
              <div style={{
                backgroundColor: '#F3ECD8', borderRadius: '8px', padding: '16px',
                marginBottom: '16px', border: '2px solid #D1C9B4'
              }}>
                <h4 style={{
                  fontFamily: 'Oswald, sans-serif', fontSize: '14px', color: '#24352A',
                  margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  Nuevo Pago - {beneficiario.apellido}, {beneficiario.nombre}
                </h4>
                <form onSubmit={handleNuevoPago} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Recibo *</label>
                    <input
                      type="text" value={nuevoPago.recibo}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, recibo: e.target.value })}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '13px',
                        border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: '#F3F4F6'
                      }}
                      readOnly
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Monto *</label>
                    <input
                      type="number" step="0.01" value={nuevoPago.monto}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, monto: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '13px',
                        border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Fecha *</label>
                    <input
                      type="date" value={nuevoPago.fecha_pago}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, fecha_pago: e.target.value })}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '13px',
                        border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Categoría *</label>
                    <select
                      value={nuevoPago.categoria}
                      onChange={(e) => setNuevoPago({
                        ...nuevoPago, categoria: e.target.value,
                        categoria_otro: e.target.value !== 'OTRO' ? '' : nuevoPago.categoria_otro
                      })}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '13px',
                        border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      required
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                  </div>

                  {nuevoPago.categoria === 'OTRO' && (
                    <div>
                      <label style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Especificar Categoría *</label>
                      <input
                        type="text" value={nuevoPago.categoria_otro}
                        onChange={(e) => setNuevoPago({ ...nuevoPago, categoria_otro: e.target.value })}
                        placeholder="Ej: Pañuelo, Insignias, etc."
                        style={{
                          width: '100%', padding: '6px 10px', fontSize: '13px',
                          border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                          fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                        }}
                        required={nuevoPago.categoria === 'OTRO'}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Medio de Pago *</label>
                    <select
                      value={nuevoPago.medio_pago}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, medio_pago: e.target.value })}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '13px',
                        border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      required
                    >
                      <option value="">Seleccionar medio</option>
                      {mediosPago.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Observaciones</label>
                    <input
                      type="text" value={nuevoPago.observaciones}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, observaciones: e.target.value })}
                      placeholder="Observaciones..."
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '13px',
                        border: '2px solid #D1C9B4', borderRadius: '4px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setShowPagoForm(false); setMessage({ text: '', type: '' }) }}
                      style={{
                        padding: '6px 16px', fontSize: '12px', backgroundColor: '#E8DEC4',
                        color: '#24352A', border: 'none', borderRadius: '4px',
                        cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}
                    >Cancelar</button>
                    <button
                      type="submit" disabled={saving}
                      style={{
                        padding: '6px 16px', fontSize: '12px', backgroundColor: '#24352A',
                        color: 'white', border: 'none', borderRadius: '4px',
                        cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        opacity: saving ? 0.5 : 1
                      }}
                    >{saving ? 'Guardando...' : 'Guardar Pago'}</button>
                  </div>
                </form>
              </div>
            )}

            {message.text && (
              <div style={{
                padding: '8px 12px', borderRadius: '6px', marginBottom: '12px',
                fontSize: '13px', fontFamily: 'Oswald, sans-serif',
                ...(message.type === 'error' ? {
                  backgroundColor: '#FEE2E2', color: '#BF4E30', border: '1px solid #FECACA'
                } : message.type === 'warning' ? {
                  backgroundColor: '#FEF3C7', color: '#C48A2A', border: '1px solid #FDE68A'
                } : {
                  backgroundColor: '#D1FAE5', color: '#5C7A5E', border: '1px solid #A7F3D0'
                })
              }}>{message.text}</div>
            )}

            {pagos.length > 0 ? (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Oswald, sans-serif' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #D1C9B4' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recibo</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoría</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monto</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((pago) => (
                      <tr key={pago.id} style={{ borderBottom: '1px solid #E8DEC4' }}>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{pago.recibo || '-'}</td>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{formatFecha(pago.fecha_pago)}</td>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{pago.categoria}</td>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A', textAlign: 'right' }}>${pago.monto.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{pago.medio_pago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A7364' }}>No hay pagos registrados</div>
            )}
          </div>
        )}

        {activeTab === 'campamentos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', color: '#24352A', margin: 0 }}>Campamentos Asistidos</h3>
              {canEdit() && (
                <button
                  onClick={abrirModalCampamentos}
                  style={{
                    backgroundColor: '#24352A', color: 'white', padding: '6px 14px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}
                >+ Agregar Campamento</button>
              )}
            </div>

            {campamentos.length > 0 ? (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Oswald, sans-serif', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #D1C9B4' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campamento</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</th>
                      {canEdit() && <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {campamentos.map((campamento) => (
                      <tr key={campamento.id} style={{ borderBottom: '1px solid #E8DEC4' }}>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{campamento.nombre}</td>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{formatFecha(campamento.fecha_inicio)}</td>
                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#24352A' }}>{campamento.tipo || '-'}</td>
                        {canEdit() && (
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleQuitarCampamento(campamento.id, campamento.nombre)}
                              disabled={saving}
                              style={{
                                padding: '4px 10px', fontSize: '11px', backgroundColor: '#FEE2E2',
                                color: '#BF4E30', border: '2px solid #FECACA', borderRadius: '4px',
                                cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                opacity: saving ? 0.5 : 1
                              }}
                            >✕ Quitar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A7364' }}>
                No hay campamentos registrados para este beneficiario
              </div>
            )}
          </div>
        )}

        {activeTab === 'legajo' && <div>{renderLegajo()}</div>}
        {activeTab === 'historial' && <div>{renderHistorialScout()}</div>}
      </div>

      {/* MODALES */}
      {/* Modal foto */}
      {showPhotoModal && (
        <div
          onClick={() => { if (!uploading) { setShowPhotoModal(false); setSelectedFile(null); setPreviewUrl(null); setMessage({ text: '', type: '' }) } }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '16px', padding: '28px',
              maxWidth: '480px', width: '100%', border: '2px solid #D1C9B4',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: '20px', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0' }}>
              📷 Subir Foto
            </h2>

            {message.text && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                fontSize: '14px', border: '1px solid', fontFamily: 'Oswald, sans-serif',
                ...(message.type === 'error' ? { backgroundColor: '#FEE2E2', color: '#BF4E30', borderColor: '#FECACA' } :
                  { backgroundColor: '#D1FAE5', color: '#5C7A5E', borderColor: '#A7F3D0' })
              }}>{message.text}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '150px', height: '150px', borderRadius: '12px', overflow: 'hidden',
                backgroundColor: '#F3ECD8', border: '2px solid #D1C9B4',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : beneficiario?.foto_url ? (
                  <img src={beneficiario.foto_url} alt="Foto actual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', backgroundColor: '#24352A', color: 'white',
                    fontFamily: 'Oswald, sans-serif', fontSize: '48px', fontWeight: '700'
                  }}>
                    {`${beneficiario?.nombre?.charAt(0) || ''}${beneficiario?.apellido?.charAt(0) || ''}`.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>

            <label style={{
              display: 'block', width: '100%', padding: '12px',
              border: '2px dashed #D1C9B4', borderRadius: '8px', textAlign: 'center',
              cursor: 'pointer', fontFamily: 'Oswald, sans-serif', color: '#7A7364',
              fontSize: '14px', backgroundColor: '#FAF8F4', marginBottom: '16px'
            }}>
              {selectedFile ? selectedFile.name : '📁 Seleccionar imagen'}
              <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} disabled={uploading} />
            </label>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { if (!uploading) { setShowPhotoModal(false); setSelectedFile(null); setPreviewUrl(null); setMessage({ text: '', type: '' }) } }}
                disabled={uploading}
                style={{
                  backgroundColor: '#E8DEC4', color: '#24352A', padding: '8px 20px',
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                  letterSpacing: '0.5px', opacity: uploading ? 0.5 : 1
                }}
              >Cancelar</button>
              <button
                onClick={handleUploadPhoto}
                disabled={!selectedFile || uploading}
                style={{
                  backgroundColor: '#24352A', color: 'white', padding: '8px 20px',
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                  letterSpacing: '0.5px', opacity: (!selectedFile || uploading) ? 0.5 : 1
                }}
              >{uploading ? 'Subiendo...' : 'Subir Foto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar beneficiario */}
      {showEditModal && (
        <div
          onClick={() => { if (!editLoading) { setShowEditModal(false); setMessage({ text: '', type: '' }) } }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '16px', padding: '28px',
              maxWidth: '560px', width: '100%', border: '2px solid #D1C9B4',
              maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: '20px', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0' }}>
              ✏️ Editar Beneficiario
            </h2>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                  <input
                    type="text" value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    required disabled={editLoading}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Apellido *</label>
                  <input
                    type="text" value={editForm.apellido}
                    onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    required disabled={editLoading}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Rama *</label>
                  <select
                    value={editForm.rama}
                    onChange={(e) => setEditForm({ ...editForm, rama: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editLoading}
                  >
                    <option value="Manada">Manada</option>
                    <option value="Unidad Scout">Unidad Scout</option>
                    <option value="Caminantes">Caminantes</option>
                    <option value="Rovers">Rovers</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Estado</label>
                  <select
                    value={editForm.estado}
                    onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editLoading}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Ex miembro</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Fecha de Nacimiento</label>
                  <input
                    type="date" value={editForm.fecha_nacimiento}
                    onChange={(e) => setEditForm({ ...editForm, fecha_nacimiento: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editLoading}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={editForm.tiene_hermanos}
                      onChange={(e) => setEditForm({ ...editForm, tiene_hermanos: e.target.checked })}
                      disabled={editLoading}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
                    />
                    Tiene hermanos en el grupo
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '2px solid #E8DEC4', paddingTop: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { if (!editLoading) { setShowEditModal(false); setMessage({ text: '', type: '' }) } }}
                  style={{
                    backgroundColor: '#E8DEC4', color: '#24352A', padding: '8px 20px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.5px', opacity: editLoading ? 0.5 : 1
                  }}
                  disabled={editLoading}
                >Cancelar</button>
                <button
                  type="submit" disabled={editLoading}
                  style={{
                    backgroundColor: '#24352A', color: 'white', padding: '8px 20px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.5px', opacity: editLoading ? 0.5 : 1
                  }}
                >{editLoading ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal info */}
      {showInfoEditModal && (
        <div
          onClick={() => { if (!editLoading) { setShowInfoEditModal(false); setMessage({ text: '', type: '' }) } }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '16px', padding: '28px',
              maxWidth: '560px', width: '100%', border: '2px solid #D1C9B4',
              maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: '20px', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0' }}>
              ✏️ Editar Información
            </h2>

            <form onSubmit={handleSaveInfoEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={infoEditForm.tiene_uniforme}
                      onChange={(e) => setInfoEditForm({ ...infoEditForm, tiene_uniforme: e.target.checked })}
                      disabled={editLoading}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
                    />
                    Tiene uniforme
                  </label>
                </div>
                {infoEditForm.tiene_uniforme && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Fecha de entrega de uniforme</label>
                    <input
                      type="date" value={infoEditForm.fecha_entrega_uniforme}
                      onChange={(e) => setInfoEditForm({ ...infoEditForm, fecha_entrega_uniforme: e.target.value })}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: '14px',
                        border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      disabled={editLoading}
                    />
                  </div>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={infoEditForm.tiene_promesa}
                      onChange={(e) => setInfoEditForm({ ...infoEditForm, tiene_promesa: e.target.checked })}
                      disabled={editLoading}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
                    />
                    Tiene Promesa
                  </label>
                </div>
                {infoEditForm.tiene_promesa && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Fecha de Promesa</label>
                      <input
                        type="date" value={infoEditForm.fecha_promesa}
                        onChange={(e) => setInfoEditForm({ ...infoEditForm, fecha_promesa: e.target.value })}
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '14px',
                          border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                          fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                        }}
                        disabled={editLoading}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Padrino/Madrina</label>
                      <input
                        type="text" value={infoEditForm.padrino}
                        onChange={(e) => setInfoEditForm({ ...infoEditForm, padrino: e.target.value })}
                        placeholder="Nombre del padrino/madrina"
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '14px',
                          border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                          fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                        }}
                        disabled={editLoading}
                      />
                    </div>
                  </>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Observaciones</label>
                  <textarea
                    value={infoEditForm.observaciones}
                    onChange={(e) => setInfoEditForm({ ...infoEditForm, observaciones: e.target.value })}
                    rows={3}
                    placeholder="Observaciones sobre el beneficiario..."
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', resize: 'vertical'
                    }}
                    disabled={editLoading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '2px solid #E8DEC4', paddingTop: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { if (!editLoading) { setShowInfoEditModal(false); setMessage({ text: '', type: '' }) } }}
                  style={{
                    backgroundColor: '#E8DEC4', color: '#24352A', padding: '8px 20px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.5px', opacity: editLoading ? 0.5 : 1
                  }}
                  disabled={editLoading}
                >Cancelar</button>
                <button
                  type="submit" disabled={editLoading}
                  style={{
                    backgroundColor: '#24352A', color: 'white', padding: '8px 20px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.5px', opacity: editLoading ? 0.5 : 1
                  }}
                >{editLoading ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal historial */}
      {showHistorialEditModal && (
        <div
          onClick={() => { if (!editHistorialLoading) { setShowHistorialEditModal(false); setMessage({ text: '', type: '' }) } }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '16px', padding: '28px',
              maxWidth: '560px', width: '100%', border: '2px solid #D1C9B4',
              maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: '20px', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0' }}>
              ✏️ Editar Historial Scout
            </h2>

            <form onSubmit={handleSaveHistorialEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Ingreso al Grupo</label>
                  <input
                    type="date" value={historialEditForm.fecha_ingreso_grupo}
                    onChange={(e) => setHistorialEditForm({ ...historialEditForm, fecha_ingreso_grupo: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editHistorialLoading}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Entrega de Uniforme</label>
                  <input
                    type="date" value={historialEditForm.fecha_entrega_uniforme}
                    onChange={(e) => setHistorialEditForm({ ...historialEditForm, fecha_entrega_uniforme: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editHistorialLoading}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Ingreso a Manada</label>
                  <input
                    type="date" value={historialEditForm.fecha_ingreso_manada}
                    onChange={(e) => setHistorialEditForm({ ...historialEditForm, fecha_ingreso_manada: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editHistorialLoading}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Ingreso a Unidad</label>
                  <input
                    type="date" value={historialEditForm.fecha_ingreso_unidad}
                    onChange={(e) => setHistorialEditForm({ ...historialEditForm, fecha_ingreso_unidad: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editHistorialLoading}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Ingreso a Caminantes</label>
                  <input
                    type="date" value={historialEditForm.fecha_ingreso_caminantes}
                    onChange={(e) => setHistorialEditForm({ ...historialEditForm, fecha_ingreso_caminantes: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editHistorialLoading}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Ingreso a Rovers</label>
                  <input
                    type="date" value={historialEditForm.fecha_ingreso_rovers}
                    onChange={(e) => setHistorialEditForm({ ...historialEditForm, fecha_ingreso_rovers: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={editHistorialLoading}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={historialEditForm.tiene_promesa}
                      onChange={(e) => setHistorialEditForm({ ...historialEditForm, tiene_promesa: e.target.checked })}
                      disabled={editHistorialLoading}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
                    />
                    Tiene Promesa
                  </label>
                </div>
                {historialEditForm.tiene_promesa && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Fecha de Promesa</label>
                      <input
                        type="date" value={historialEditForm.fecha_promesa}
                        onChange={(e) => setHistorialEditForm({ ...historialEditForm, fecha_promesa: e.target.value })}
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '14px',
                          border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                          fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                        }}
                        disabled={editHistorialLoading}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Padrino/Madrina</label>
                      <input
                        type="text" value={historialEditForm.padrino_promesa}
                        onChange={(e) => setHistorialEditForm({ ...historialEditForm, padrino_promesa: e.target.value })}
                        placeholder="Nombre del padrino/madrina"
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '14px',
                          border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                          fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                        }}
                        disabled={editHistorialLoading}
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '2px solid #E8DEC4', paddingTop: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { if (!editHistorialLoading) { setShowHistorialEditModal(false); setMessage({ text: '', type: '' }) } }}
                  style={{
                    backgroundColor: '#E8DEC4', color: '#24352A', padding: '8px 20px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.5px', opacity: editHistorialLoading ? 0.5 : 1
                  }}
                  disabled={editHistorialLoading}
                >Cancelar</button>
                <button
                  type="submit" disabled={editHistorialLoading}
                  style={{
                    backgroundColor: '#24352A', color: 'white', padding: '8px 20px',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.5px', opacity: editHistorialLoading ? 0.5 : 1
                  }}
                >{editHistorialLoading ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal campamentos */}
      {showCampamentoModal && (
        <div
          onClick={() => { if (!saving) { setShowCampamentoModal(false); setMessage({ text: '', type: '' }) } }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '16px', padding: '28px',
              maxWidth: '520px', width: '100%', border: '2px solid #D1C9B4',
              maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h2 style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: '20px', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px 0' }}>
              🏕️ Agregar Campamento
            </h2>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setModalMode('agregar')}
                style={{
                  flex: 1, padding: '8px 16px',
                  backgroundColor: modalMode === 'agregar' ? '#24352A' : '#F3ECD8',
                  color: modalMode === 'agregar' ? 'white' : '#24352A',
                  border: '2px solid #D1C9B4', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                  fontSize: '12px', letterSpacing: '0.5px'
                }}
              >📋 Agregar existente</button>
              <button
                onClick={() => setModalMode('crear')}
                style={{
                  flex: 1, padding: '8px 16px',
                  backgroundColor: modalMode === 'crear' ? '#24352A' : '#F3ECD8',
                  color: modalMode === 'crear' ? 'white' : '#24352A',
                  border: '2px solid #D1C9B4', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                  fontSize: '12px', letterSpacing: '0.5px'
                }}
              >✨ Crear nuevo</button>
            </div>

            {modalMode === 'agregar' && (
              <div>
                {campamentosDisponibles.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Seleccionar Campamento *</label>
                      <select
                        value={campamentoSeleccionado}
                        onChange={(e) => setCampamentoSeleccionado(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: '14px',
                          border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                          fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                        }}
                        disabled={saving}
                      >
                        <option value="">Seleccionar...</option>
                        {campamentosDisponibles.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre} - {formatFecha(c.fecha_inicio)}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', borderTop: '2px solid #E8DEC4', paddingTop: '16px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => { setShowCampamentoModal(false); setMessage({ text: '', type: '' }) }}
                        style={{
                          padding: '8px 20px', fontSize: '14px', backgroundColor: '#E8DEC4',
                          color: '#24352A', border: 'none', borderRadius: '6px',
                          cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase', letterSpacing: '0.5px', opacity: saving ? 0.5 : 1
                        }}
                        disabled={saving}
                      >Cancelar</button>
                      <button
                        onClick={handleAgregarCampamentoExistente}
                        disabled={!campamentoSeleccionado || saving}
                        style={{
                          padding: '8px 20px', fontSize: '14px', backgroundColor: '#24352A',
                          color: 'white', border: 'none', borderRadius: '6px',
                          cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          opacity: (!campamentoSeleccionado || saving) ? 0.5 : 1
                        }}
                      >{saving ? 'Guardando...' : 'Agregar Campamento'}</button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A7364' }}>
                    <p>No hay campamentos disponibles para agregar.</p>
                    <p style={{ fontSize: '13px' }}>Hacé clic en "Crear nuevo" para crear uno.</p>
                  </div>
                )}
              </div>
            )}

            {modalMode === 'crear' && (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Nombre del Campamento *</label>
                  <input
                    type="text" value={nuevoCampamentoNombre}
                    onChange={(e) => setNuevoCampamentoNombre(e.target.value)}
                    placeholder="Ej: Campamento de Verano 2026"
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '14px',
                      border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                      fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                    }}
                    disabled={saving} required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Fecha Inicio</label>
                    <input
                      type="date" value={nuevoCampamentoFecha}
                      onChange={(e) => setNuevoCampamentoFecha(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: '14px',
                        border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Tipo</label>
                    <select
                      value={nuevoCampamentoTipo}
                      onChange={(e) => {
                        const value = e.target.value
                        setNuevoCampamentoTipo(value)
                        if (value !== 'De Rama') setNuevoCampamentoRama('')
                        if (value !== 'Otro') setNuevoCampamentoOtro('')
                      }}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: '14px',
                        border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      disabled={saving}
                    >
                      <option value="Anual">Anual</option>
                      <option value="Corto">Corto</option>
                      <option value="De Rama">De Rama</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                {nuevoCampamentoTipo === 'De Rama' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Rama *</label>
                    <select
                      value={nuevoCampamentoRama}
                      onChange={(e) => setNuevoCampamentoRama(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: '14px',
                        border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      disabled={saving}
                    >
                      <option value="">Seleccionar rama...</option>
                      <option value="Manada">🐺 Manada</option>
                      <option value="Unidad Scout">⚜️ Unidad Scout</option>
                      <option value="Caminantes">🏔️ Caminantes</option>
                      <option value="Rovers">🔥 Rovers</option>
                    </select>
                  </div>
                )}

                {nuevoCampamentoTipo === 'Otro' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Especificar Tipo *</label>
                    <input
                      type="text" value={nuevoCampamentoOtro}
                      onChange={(e) => setNuevoCampamentoOtro(e.target.value)}
                      placeholder="Ej: Jornada, Peregrinación, etc."
                      style={{
                        width: '100%', padding: '8px 12px', fontSize: '14px',
                        border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                        fontFamily: 'Oswald, sans-serif', backgroundColor: 'white'
                      }}
                      disabled={saving}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', borderTop: '2px solid #E8DEC4', paddingTop: '16px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setShowCampamentoModal(false); setMessage({ text: '', type: '' }) }}
                    style={{
                      padding: '8px 20px', fontSize: '14px', backgroundColor: '#E8DEC4',
                      color: '#24352A', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '0.5px', opacity: saving ? 0.5 : 1
                    }}
                    disabled={saving}
                  >Cancelar</button>
                  <button
                    onClick={handleCrearYAgregarCampamento}
                    disabled={!nuevoCampamentoNombre.trim() || saving}
                    style={{
                      padding: '8px 20px', fontSize: '14px', backgroundColor: '#24352A',
                      color: 'white', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      opacity: (!nuevoCampamentoNombre.trim() || saving) ? 0.5 : 1
                    }}
                  >{saving ? 'Guardando...' : 'Crear y Asignar'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}