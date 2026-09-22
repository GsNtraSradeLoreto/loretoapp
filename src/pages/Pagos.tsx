import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'

interface Pago {
  id: string
  beneficiario_id: string
  rama: string
  recibo: string
  monto: number
  fecha_pago: string
  categoria: string
  medio_pago: string
  observaciones: string
  beneficiario_nombre?: string
  beneficiario_apellido?: string
  beneficiario_tiene_hermanos?: boolean
  reciboNumero?: number
}

interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  tiene_hermanos: boolean
}

const ORDEN_RAMAS: Record<string, number> = {
  'Manada': 1,
  'Unidad Scout': 2,
  'Caminantes': 3,
  'Rovers': 4
}

const PAGE_SIZE = 20

export default function Pagos() {
  const {
    profile,
    isSuperAdmin,
    isJefatura,
    isAdministrador,
    isTesorero,
    getRolData,
    canCreatePagos
  } = useAuth()
  const [pagos, setPagos] = useState<Pago[]>([])
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ Form de CREAR (arriba)
  const [showForm, setShowForm] = useState(false)

  const [message, setMessage] = useState({ text: '', type: '' })
  const [filterRama, setFilterRama] = useState('Todas')
  const [filterBeneficiario, setFilterBeneficiario] = useState('')

  // ✅ ID del pago expandido (ver detalle)
  const [pagoExpandido, setPagoExpandido] = useState<string | null>(null)

  // ✅ ID del pago en modo EDICIÓN INLINE
  const [editandoEnCard, setEditandoEnCard] = useState<string | null>(null)

  // ✅ Paginación
  const [pagina, setPagina] = useState(1)
  const [hayMas, setHayMas] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)

  // ✅ Edición inline de observaciones
  const [editandoInline, setEditandoInline] = useState<string | null>(null)
  const [valorInline, setValorInline] = useState('')
  const [guardandoInline, setGuardandoInline] = useState(false)

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'
  const esAyudante = rolData.tipo === 'ayudante'
  const esDirigente = esJefe || esAyudante
  const ramaAsignada = rolData.rama
  const verTodas = isSuperAdmin || isJefatura || isAdministrador || isTesorero
  const esSuperAdmin = isSuperAdmin

  // ✅ Form de CREAR (arriba)
  const [formData, setFormData] = useState({
    beneficiario_id: '',
    recibo: '',
    monto: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    categoria: '',
    categoria_otro: '',
    medio_pago: '',
    observaciones: ''
  })

  // ✅ Form de EDICIÓN INLINE
  const [editFormData, setEditFormData] = useState({
    beneficiario_id: '',
    recibo: '',
    monto: '',
    fecha_pago: '',
    categoria: '',
    categoria_otro: '',
    medio_pago: '',
    observaciones: ''
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState({ text: '', type: '' })

  const [reciboOriginal, setReciboOriginal] = useState('')

  const categorias = [
    { value: 'AFILIACION', label: 'Afiliación' },
    { value: 'CUOTAS', label: 'Cuotas' },
    { value: 'C. CORTO', label: 'Campamento Corto' },
    { value: 'C. ANUAL', label: 'Campamento Anual' },
    { value: 'OTRO', label: 'Otro' }
  ]

  const mediosPago = ['Efectivo', 'Mercadopago']

  const formatFecha = (fecha: string | null | undefined) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    if (partes.length !== 3) return '-'
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  const puedeEditarInline = (): boolean => isSuperAdmin || isTesorero

  const toggleExpandir = (pagoId: string) => {
    // Si está en modo edición, no expandimos
    if (editandoEnCard === pagoId) return
    setPagoExpandido(prev => prev === pagoId ? null : pagoId)
  }

  useEffect(() => {
    loadBeneficiarios()
  }, [])

  useEffect(() => {
    if (!loading) {
      cargarPagos(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRama, filterBeneficiario])

  const loadBeneficiarios = async () => {
    try {
      setLoading(true)

      let beneficiariosQuery = supabase
        .from('beneficiarios')
        .select('id, nombre, apellido, rama, tiene_hermanos, estado')

      if (!esSuperAdmin) {
        beneficiariosQuery = beneficiariosQuery.eq('estado', 'activo')
      }

      const { data: beneficiariosData, error: beneficiariosError } = await beneficiariosQuery

      if (beneficiariosError) throw beneficiariosError

      const beneficiariosOrdenados = (beneficiariosData || []).sort((a, b) => {
        const ordenA = ORDEN_RAMAS[a.rama] || 99
        const ordenB = ORDEN_RAMAS[b.rama] || 99
        if (ordenA !== ordenB) return ordenA - ordenB
        const cmpApellido = a.apellido.localeCompare(b.apellido)
        if (cmpApellido !== 0) return cmpApellido
        return a.nombre.localeCompare(b.nombre)
      })

      setBeneficiarios(beneficiariosOrdenados)

      await cargarPagos(true)

    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al cargar los datos', type: 'error' })
      setLoading(false)
    }
  }

  const cargarPagos = async (reset: boolean) => {
    try {
      if (reset) {
        setLoading(true)
        setPagina(1)
      } else {
        setCargandoMas(true)
      }

      const paginaActual = reset ? 1 : pagina + 1
      const desde = (paginaActual - 1) * PAGE_SIZE
      const hasta = desde + PAGE_SIZE - 1

      let query = supabase
        .from('pagos')
        .select(`
          *,
          beneficiarios (
            nombre,
            apellido,
            tiene_hermanos,
            estado
          )
        `)
        .order('fecha_pago', { ascending: false })
        .order('id', { ascending: false })
        .range(desde, hasta)

      if (filterRama !== 'Todas') {
        query = query.eq('rama', filterRama)
      }

      if (filterBeneficiario) {
        query = query.eq('beneficiario_id', filterBeneficiario)
      }

      if (esDirigente && ramaAsignada) {
        query = query.eq('rama', ramaAsignada)
      }

      const { data: pagosData, error: pagosError } = await query

      if (pagosError) throw pagosError

      let pagosFiltrados = pagosData || []
      if (!esSuperAdmin) {
        pagosFiltrados = pagosFiltrados.filter((pago: any) =>
          pago.beneficiarios?.estado === 'activo'
        )
      }

      const pagosConNombres = pagosFiltrados.map((pago: any) => ({
        ...pago,
        beneficiario_nombre: pago.beneficiarios?.nombre || '',
        beneficiario_apellido: pago.beneficiarios?.apellido || '',
        beneficiario_tiene_hermanos: pago.beneficiarios?.tiene_hermanos || false,
        beneficiario_estado: pago.beneficiarios?.estado || '',
        reciboNumero: pago.recibo ? parseInt(pago.recibo.replace(/^[A-Z]-/, '')) : 0
      }))

      if (reset) {
        setPagos(pagosConNombres)
        setPagina(1)
      } else {
        setPagos(prev => [...prev, ...pagosConNombres])
        setPagina(paginaActual)
      }

      setHayMas(pagosData && pagosData.length === PAGE_SIZE)

    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al cargar los pagos', type: 'error' })
    } finally {
      setLoading(false)
      setCargandoMas(false)
    }
  }

  const cargarMas = () => {
    cargarPagos(false)
  }

  const generarProximoRecibo = async (beneficiarioId: string): Promise<string> => {
    const beneficiario = beneficiarios.find(b => b.id === beneficiarioId)
    if (!beneficiario) throw new Error('Beneficiario no encontrado')

    const prefijo = beneficiario.rama === 'Manada' ? 'M' :
                    beneficiario.rama === 'Unidad Scout' ? 'U' :
                    beneficiario.rama === 'Caminantes' ? 'C' : 'R'

    const { data, error } = await supabase
      .from('pagos')
      .select('recibo')
      .ilike('recibo', `${prefijo}-%`)
      .order('recibo', { ascending: false })

    if (error) throw error

    let maxNumero = 0
    const regex = new RegExp(`^${prefijo}-(\\d+)$`)

    for (const pago of data || []) {
      if (!pago.recibo) continue
      const match = pago.recibo.match(regex)
      if (match) {
        const num = parseInt(match[1])
        if (num > maxNumero) maxNumero = num
      }
    }

    return `${prefijo}-${maxNumero + 1}`
  }

  const verificarYResolverDuplicado = async (recibo: string, excludeId?: string): Promise<string> => {
    let query = supabase
      .from('pagos')
      .select('recibo')
      .eq('recibo', recibo)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query
    if (error) throw error

    if (!data || data.length === 0) {
      return recibo
    }

    const baseRecibo = recibo
    let maxSufijo = 0
    const regex = new RegExp(`^${baseRecibo}(?:-(\\d+))?$`)

    const { data: todos, error: errorTodos } = await supabase
      .from('pagos')
      .select('recibo')
      .ilike('recibo', `${baseRecibo}%`)

    if (errorTodos) throw errorTodos

    for (const pago of todos || []) {
      if (!pago.recibo) continue
      const match = pago.recibo.match(regex)
      if (match) {
        const num = match[1] ? parseInt(match[1]) : 0
        if (num > maxSufijo) maxSufijo = num
      }
    }

    const nuevoSufijo = maxSufijo + 1
    return nuevoSufijo === 1 ? baseRecibo : `${baseRecibo}-${nuevoSufijo}`
  }

  // ============================================
  // ✅ FORM CREAR (arriba) — handlers
  // ============================================
  const handleBeneficiarioChange = async (beneficiarioId: string) => {
    setFormData({ ...formData, beneficiario_id: beneficiarioId })

    if (beneficiarioId) {
      try {
        const recibo = await generarProximoRecibo(beneficiarioId)
        setFormData(prev => ({ ...prev, recibo }))
        setReciboOriginal(recibo)
      } catch (error) {
        console.error('Error al generar recibo:', error)
      }
    }
  }

  const handleReciboChange = (nuevoRecibo: string) => {
    setFormData({ ...formData, recibo: nuevoRecibo })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })

    if (!formData.beneficiario_id) {
      setMessage({ text: '⚠️ Seleccioná un beneficiario', type: 'warning' })
      return
    }

    if (esDirigente && ramaAsignada) {
      const beneficiarioSeleccionado = beneficiarios.find(b => b.id === formData.beneficiario_id)
      if (beneficiarioSeleccionado && beneficiarioSeleccionado.rama !== ramaAsignada) {
        setMessage({ text: '⚠️ No tenés permisos para crear pagos en esta rama', type: 'warning' })
        return
      }
    }

    const monto = parseFloat(formData.monto)
    if (!monto || monto <= 0) {
      setMessage({ text: '⚠️ Ingresá un monto válido (mayor a 0)', type: 'warning' })
      return
    }

    if (!formData.recibo.trim()) {
      setMessage({ text: '⚠️ Ingresá un número de recibo', type: 'warning' })
      return
    }

    if (!formData.categoria) {
      setMessage({ text: '⚠️ Seleccioná una categoría', type: 'warning' })
      return
    }

    if (formData.categoria === 'OTRO' && !formData.categoria_otro.trim()) {
      setMessage({ text: '⚠️ Especificá la categoría "Otro"', type: 'warning' })
      return
    }

    if (!formData.medio_pago) {
      setMessage({ text: '⚠️ Seleccioná un medio de pago', type: 'warning' })
      return
    }

    let reciboFinal = formData.recibo.trim()
    try {
      reciboFinal = await verificarYResolverDuplicado(reciboFinal)

      if (reciboFinal !== formData.recibo.trim()) {
        setMessage({
          text: `⚠️ El recibo "${formData.recibo}" ya existe. Se usará "${reciboFinal}" en su lugar.`,
          type: 'warning'
        })
        setFormData(prev => ({ ...prev, recibo: reciboFinal }))
        return
      }
    } catch (error) {
      console.error('Error al verificar duplicado:', error)
      setMessage({ text: '❌ Error al verificar el recibo', type: 'error' })
      return
    }

    try {
      const beneficiario = beneficiarios.find(b => b.id === formData.beneficiario_id)

      let categoriaFinal = formData.categoria
      if (formData.categoria === 'OTRO') {
        categoriaFinal = formData.categoria_otro.trim().toUpperCase()
      }

      const payload = {
        beneficiario_id: formData.beneficiario_id,
        rama: beneficiario?.rama || '',
        recibo: reciboFinal,
        monto: monto,
        fecha_pago: formData.fecha_pago,
        categoria: categoriaFinal,
        medio_pago: formData.medio_pago,
        observaciones: formData.observaciones || null
      }

      const { error } = await supabase
        .from('pagos')
        .insert(payload)

      if (error) throw error
      setMessage({ text: `✅ Pago registrado correctamente (Recibo: ${reciboFinal})`, type: 'success' })

      resetForm()
      cargarPagos(true)

    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al guardar el pago', type: 'error' })
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setFormData({
      beneficiario_id: '',
      recibo: '',
      monto: '',
      fecha_pago: new Date().toISOString().split('T')[0],
      categoria: '',
      categoria_otro: '',
      medio_pago: '',
      observaciones: ''
    })
    setReciboOriginal('')
  }

  // ============================================
  // ✅ EDICIÓN INLINE — handlers
  // ============================================
  const abrirEdicionEnCard = (pago: Pago) => {
    const categoriasEstandar = ['AFILIACION', 'CUOTAS', 'C. CORTO', 'C. ANUAL']
    const esOtro = !categoriasEstandar.includes(pago.categoria)

    setEditFormData({
      beneficiario_id: pago.beneficiario_id,
      recibo: pago.recibo || '',
      monto: pago.monto?.toString() || '',
      fecha_pago: pago.fecha_pago || '',
      categoria: esOtro ? 'OTRO' : pago.categoria,
      categoria_otro: esOtro ? pago.categoria : '',
      medio_pago: pago.medio_pago || '',
      observaciones: pago.observaciones || ''
    })
    setEditandoEnCard(pago.id)
    setPagoExpandido(null) // cerramos el panel de detalle si estaba abierto
    setEditMessage({ text: '', type: '' })
  }

  const cancelarEdicionEnCard = () => {
    setEditandoEnCard(null)
    setEditFormData({
      beneficiario_id: '',
      recibo: '',
      monto: '',
      fecha_pago: '',
      categoria: '',
      categoria_otro: '',
      medio_pago: '',
      observaciones: ''
    })
    setEditMessage({ text: '', type: '' })
  }

  const handleSubmitEdicionEnCard = async (e: React.FormEvent, pagoId: string) => {
    e.preventDefault()
    setEditMessage({ text: '', type: '' })

    if (!editFormData.beneficiario_id) {
      setEditMessage({ text: '⚠️ Seleccioná un beneficiario', type: 'warning' })
      return
    }

    const monto = parseFloat(editFormData.monto)
    if (!monto || monto <= 0) {
      setEditMessage({ text: '⚠️ Ingresá un monto válido', type: 'warning' })
      return
    }

    if (!editFormData.recibo.trim()) {
      setEditMessage({ text: '⚠️ Ingresá un número de recibo', type: 'warning' })
      return
    }

    if (!editFormData.categoria) {
      setEditMessage({ text: '⚠️ Seleccioná una categoría', type: 'warning' })
      return
    }

    if (editFormData.categoria === 'OTRO' && !editFormData.categoria_otro.trim()) {
      setEditMessage({ text: '⚠️ Especificá la categoría "Otro"', type: 'warning' })
      return
    }

    if (!editFormData.medio_pago) {
      setEditMessage({ text: '⚠️ Seleccioná un medio de pago', type: 'warning' })
      return
    }

    let reciboFinal = editFormData.recibo.trim()
    try {
      reciboFinal = await verificarYResolverDuplicado(reciboFinal, pagoId)

      if (reciboFinal !== editFormData.recibo.trim()) {
        setEditMessage({
          text: `⚠️ El recibo "${editFormData.recibo}" ya existe. Se usará "${reciboFinal}".`,
          type: 'warning'
        })
        setEditFormData(prev => ({ ...prev, recibo: reciboFinal }))
        return
      }
    } catch (error) {
      console.error('Error al verificar duplicado:', error)
      setEditMessage({ text: '❌ Error al verificar el recibo', type: 'error' })
      return
    }

    setEditLoading(true)

    try {
      const beneficiario = beneficiarios.find(b => b.id === editFormData.beneficiario_id)

      let categoriaFinal = editFormData.categoria
      if (editFormData.categoria === 'OTRO') {
        categoriaFinal = editFormData.categoria_otro.trim().toUpperCase()
      }

      const payload = {
        beneficiario_id: editFormData.beneficiario_id,
        rama: beneficiario?.rama || '',
        recibo: reciboFinal,
        monto: monto,
        fecha_pago: editFormData.fecha_pago,
        categoria: categoriaFinal,
        medio_pago: editFormData.medio_pago,
        observaciones: editFormData.observaciones || null
      }

      const { error } = await supabase
        .from('pagos')
        .update(payload)
        .eq('id', pagoId)

      if (error) throw error

      setMessage({ text: '✅ Pago actualizado correctamente', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)

      cancelarEdicionEnCard()
      cargarPagos(true)

    } catch (error: any) {
      console.error('Error:', error)
      setEditMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setEditLoading(false)
    }
  }

  // ============================================
  // ✅ Guardar observación inline
  // ============================================
  const guardarObservacionInline = async (pagoId: string, nuevoValor: string) => {
    const valorLimpio = nuevoValor.trim() || null

    const pagoActual = pagos.find(p => p.id === pagoId)
    if (!pagoActual) {
      setEditandoInline(null)
      return
    }

    if ((pagoActual.observaciones || null) === valorLimpio) {
      setEditandoInline(null)
      return
    }

    const valorAnterior = pagoActual.observaciones

    setPagos(prev => prev.map(p =>
      p.id === pagoId ? { ...p, observaciones: valorLimpio || '' } : p
    ))
    setEditandoInline(null)
    setGuardandoInline(true)

    try {
      const { error } = await supabase
        .from('pagos')
        .update({ observaciones: valorLimpio })
        .eq('id', pagoId)

      if (error) throw error
    } catch (error) {
      console.error('Error al guardar observación:', error)
      setPagos(prev => prev.map(p =>
        p.id === pagoId ? { ...p, observaciones: valorAnterior || '' } : p
      ))
      setMessage({ text: '❌ Error al guardar la observación', type: 'error' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } finally {
      setGuardandoInline(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que querés eliminar este pago?')) return

    try {
      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMessage({ text: '✅ Pago eliminado correctamente', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
      cargarPagos(true)
      setPagoExpandido(null)
    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al eliminar el pago', type: 'error' })
    }
  }

  const canEdit = (pago: Pago): boolean => {
    if (isSuperAdmin) return true
    if (isTesorero) return true
    if (esJefe && pago.rama === ramaAsignada) return true
    return false
  }

  const canDelete = (pago: Pago): boolean => {
    if (isSuperAdmin) return true
    if (isTesorero) return true
    if (esJefe && pago.rama === ramaAsignada) return true
    return false
  }

  const puedeCrearPagos = (): boolean => {
    if (isSuperAdmin) return true
    if (isTesorero) return true
    if (esJefe && ramaAsignada) return true
    return false
  }

  const handleFilterByRama = (rama: string) => {
    setFilterRama(rama)
  }

  const handleLimpiarFiltros = () => {
    if (esDirigente && ramaAsignada) {
      setFilterRama(ramaAsignada)
    } else {
      setFilterRama('Todas')
    }
    setFilterBeneficiario('')
  }

  // ✅ ORDEN FIJO: fecha DESC → reciboNumero DESC
  const pagosOrdenados = [...pagos].sort((a, b) => {
    const fechaA = a.fecha_pago || ''
    const fechaB = b.fecha_pago || ''
    if (fechaA !== fechaB) {
      return fechaB.localeCompare(fechaA)
    }
    const reciboA = a.reciboNumero || 0
    const reciboB = b.reciboNumero || 0
    return reciboB - reciboA
  })

  const getRamasMostrar = () => {
    if (verTodas) {
      return ['Todas', 'Manada', 'Unidad Scout', 'Caminantes', 'Rovers']
    } else if (esDirigente && ramaAsignada) {
      return [ramaAsignada]
    }
    return ['Todas']
  }

  const ramasMostrar = getRamasMostrar()

  const beneficiariosUnicos = pagos.reduce((acc, pago) => {
    const key = pago.beneficiario_id
    if (!acc.find(b => b.id === key)) {
      acc.push({
        id: key,
        nombre: pago.beneficiario_nombre || '',
        apellido: pago.beneficiario_apellido || '',
        rama: pago.rama
      })
    }
    return acc
  }, [] as { id: string, nombre: string, apellido: string, rama: string }[])
    .sort((a, b) => {
      const ordenA = ORDEN_RAMAS[a.rama] || 99
      const ordenB = ORDEN_RAMAS[b.rama] || 99
      if (ordenA !== ordenB) return ordenA - ordenB
      return a.apellido.localeCompare(b.apellido)
    })

  const totalMonto = pagos.reduce((sum, p) => sum + (p.monto || 0), 0)

  if (loading && pagos.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>Cargando pagos...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '700',
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          💰 Gestión de Pagos
        </h1>
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '400',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          color: '#7A7364',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: 0
        }}>
          {pagos.length} pagos • Total visible: ${totalMonto.toLocaleString()}
        </p>
      </div>

      {message.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          border: '1px solid',
          fontFamily: 'Oswald, sans-serif',
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

      {/* FILTROS POR RAMA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        marginBottom: '16px',
        width: '100%'
      }}>
        {ramasMostrar.map((rama) => {
          const esTodas = rama === 'Todas'
          const isActive = esTodas ? filterRama === 'Todas' : filterRama === rama
          const getLabel = () => {
            if (esTodas) return 'TODOS'
            if (rama === 'Manada') return 'MANADA'
            if (rama === 'Unidad Scout') return 'UNIDAD'
            if (rama === 'Caminantes') return 'CAMINANTES'
            if (rama === 'Rovers') return 'ROVERS'
            return rama
          }

          return (
            <div
              key={rama}
              style={{
                backgroundColor: isActive ? '#24352A' : 'white',
                borderRadius: '8px',
                padding: '8px 4px',
                border: '2px solid #D1C9B4',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40px',
                gridColumn: esTodas ? '1 / -1' : 'auto'
              }}
              onClick={() => handleFilterByRama(rama)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#24352A'
                  e.currentTarget.style.backgroundColor = '#F3ECD8'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#D1C9B4'
                  e.currentTarget.style.backgroundColor = 'white'
                }
              }}
            >
              <p style={{
                fontFamily: 'Oswald, sans-serif',
                fontWeight: '700',
                fontSize: 'clamp(10px, 2vw, 15px)',
                color: isActive ? 'white' : '#24352A',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                lineHeight: 1.2
              }}>
                {getLabel()}
              </p>
            </div>
          )
        })}
      </div>

      {/* BOTÓN NUEVO PAGO (form arriba, solo para CREAR) */}
      {puedeCrearPagos() && (
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            backgroundColor: '#24352A',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '16px',
            width: '100%'
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Nuevo Pago'}
        </button>
      )}

      {/* FORM CREAR (arriba) */}
      {showForm && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          border: '2px solid #D1C9B4',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontFamily: 'Oswald, sans-serif',
            fontWeight: '600',
            fontSize: 'clamp(13px, 3vw, 16px)',
            color: '#24352A',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 16px 0'
          }}>
            📝 Nuevo Pago
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Beneficiario *
              </label>
              <select
                value={formData.beneficiario_id}
                onChange={(e) => handleBeneficiarioChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                required
              >
                <option value="">Seleccionar beneficiario</option>
                {beneficiarios
                  .filter(b => {
                    if (esDirigente && ramaAsignada) {
                      return b.rama === ramaAsignada
                    }
                    return true
                  })
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      {formatearNombreConH(b.nombre, b.apellido, b.tiene_hermanos)} ({b.rama})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Recibo *
              </label>
              <input
                type="text"
                value={formData.recibo}
                onChange={(e) => handleReciboChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: '#F3F4F6'
                }}
                placeholder="Se genera automáticamente"
              />
            </div>

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Monto *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Fecha *
              </label>
              <input
                type="date"
                value={formData.fecha_pago}
                onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Categoría *
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value, categoria_otro: e.target.value !== 'OTRO' ? '' : formData.categoria_otro })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                required
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {formData.categoria === 'OTRO' && (
              <div>
                <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  Especificar *
                </label>
                <input
                  type="text"
                  value={formData.categoria_otro}
                  onChange={(e) => setFormData({ ...formData, categoria_otro: e.target.value })}
                  placeholder="Ej: Pañuelo, Insignias"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    border: '2px solid #D1C9B4',
                    borderRadius: '6px',
                    outline: 'none',
                    fontFamily: 'Oswald, sans-serif',
                    backgroundColor: 'white'
                  }}
                  required={formData.categoria === 'OTRO'}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Medio *
              </label>
              <select
                value={formData.medio_pago}
                onChange={(e) => setFormData({ ...formData, medio_pago: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                required
              >
                <option value="">Seleccionar</option>
                {mediosPago.map(mp => (
                  <option key={mp} value={mp}>{mp}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Observaciones
              </label>
              <input
                type="text"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Observaciones..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#24352A',
                  color: 'white',
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  flex: 1
                }}
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  backgroundColor: '#E8DEC4',
                  color: '#24352A',
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  flex: 1
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTRO BENEFICIARIO */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={filterBeneficiario}
          onChange={(e) => setFilterBeneficiario(e.target.value)}
          style={{
            padding: '6px 12px',
            fontSize: 'clamp(10px, 2vw, 13px)',
            border: '2px solid #D1C9B4',
            borderRadius: '6px',
            outline: 'none',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white',
            cursor: 'pointer',
            flex: 1,
            minWidth: '140px'
          }}
        >
          <option value="">Todos los beneficiarios</option>
          {beneficiariosUnicos.map(b => (
            <option key={b.id} value={b.id}>
              {formatearNombreConH(b.nombre, b.apellido, false)} ({b.rama})
            </option>
          ))}
        </select>

        {filterRama !== 'Todas' && (
          <button
            onClick={handleLimpiarFiltros}
            style={{
              padding: '6px 12px',
              fontSize: 'clamp(10px, 2vw, 12px)',
              border: '2px solid #BF4E30',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: '#BF4E30',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* 📋 LISTA DE PAGOS (cards mobile-first) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pagosOrdenados.map((pago) => {
          const nombreCompleto = formatearNombreConH(
            pago.beneficiario_nombre || '',
            pago.beneficiario_apellido || '',
            pago.beneficiario_tiene_hermanos || false
          )
          const estaEditandoInline = editandoInline === pago.id
          const estaExpandido = pagoExpandido === pago.id
          const estaEditando = editandoEnCard === pago.id

          return (
            <div key={pago.id}>
              {/* ============================================ */}
              {/* MODO EDICIÓN INLINE (reemplaza el contenido de la card) */}
              {/* ============================================ */}
              {estaEditando ? (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '14px 12px',
                  border: '2px solid #24352A',
                  fontFamily: 'Oswald, sans-serif'
                }}>
                  <h3 style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: '700',
                    fontSize: 'clamp(12px, 2.8vw, 14px)',
                    color: '#24352A',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    margin: '0 0 12px 0',
                    borderBottom: '2px solid #E8DEC4',
                    paddingBottom: '8px'
                  }}>
                    ✏️ Editando {pago.recibo}
                  </h3>

                  {editMessage.text && (
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      fontSize: 'clamp(10px, 2.2vw, 12px)',
                      border: '1px solid',
                      fontFamily: 'Oswald, sans-serif',
                      ...(editMessage.type === 'error' ? {
                        backgroundColor: '#FEE2E2', color: '#BF4E30', borderColor: '#FECACA'
                      } : editMessage.type === 'warning' ? {
                        backgroundColor: '#FEF3C7', color: '#C48A2A', borderColor: '#FDE68A'
                      } : {
                        backgroundColor: '#D1FAE5', color: '#5C7A5E', borderColor: '#A7F3D0'
                      })
                    }}>
                      {editMessage.text}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => handleSubmitEdicionEnCard(e, pago.id)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}
                  >
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                        Beneficiario *
                      </label>
                      <select
                        value={editFormData.beneficiario_id}
                        onChange={(e) => setEditFormData({ ...editFormData, beneficiario_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '6px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: 'white'
                        }}
                        required
                        disabled={editLoading}
                      >
                        <option value="">Seleccionar beneficiario</option>
                        {beneficiarios
                          .filter(b => {
                            if (esDirigente && ramaAsignada) {
                              return b.rama === ramaAsignada
                            }
                            return true
                          })
                          .map(b => (
                            <option key={b.id} value={b.id}>
                              {formatearNombreConH(b.nombre, b.apellido, b.tiene_hermanos)} ({b.rama})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                        Recibo *
                      </label>
                      <input
                        type="text"
                        value={editFormData.recibo}
                        onChange={(e) => setEditFormData({ ...editFormData, recibo: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '6px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: '#F3F4F6'
                        }}
                        disabled={editLoading}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                        Monto *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.monto}
                        onChange={(e) => setEditFormData({ ...editFormData, monto: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '6px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: 'white'
                        }}
                        required
                        disabled={editLoading}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={editFormData.fecha_pago}
                        onChange={(e) => setEditFormData({ ...editFormData, fecha_pago: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '6px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: 'white'
                        }}
                        required
                        disabled={editLoading}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                        Categoría *
                      </label>
                      <select
                        value={editFormData.categoria}
                        onChange={(e) => setEditFormData({ ...editFormData, categoria: e.target.value, categoria_otro: e.target.value !== 'OTRO' ? '' : editFormData.categoria_otro })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '6px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: 'white'
                        }}
                        required
                        disabled={editLoading}
                      >
                        <option value="">Seleccionar</option>
                        {categorias.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    {editFormData.categoria === 'OTRO' && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                          Especificar *
                        </label>
                        <input
                          type="text"
                          value={editFormData.categoria_otro}
                          onChange={(e) => setEditFormData({ ...editFormData, categoria_otro: e.target.value })}
                          placeholder="Ej: Pañuelo, Insignias"
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            fontSize: 'clamp(11px, 2.5vw, 13px)',
                            border: '2px solid #D1C9B4',
                            borderRadius: '6px',
                            outline: 'none',
                            fontFamily: 'Oswald, sans-serif',
                            backgroundColor: 'white'
                          }}
                          required={editFormData.categoria === 'OTRO'}
                          disabled={editLoading}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                        Medio *
                      </label>
                      <select
                        value={editFormData.medio_pago}
                        onChange={(e) => setEditFormData({ ...editFormData, medio_pago: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '6px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: 'white'
                        }}
                        required
                        disabled={editLoading}
                      >
                        <option value="">Seleccionar</option>
                        {mediosPago.map(mp => (
                          <option key={mp} value={mp}>{mp}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                        Observaciones
                      </label>
                      <input
                        type="text"
                        value={editFormData.observaciones}
                        onChange={(e) => setEditFormData({ ...editFormData, observaciones: e.target.value })}
                        placeholder="Observaciones..."
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '6px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: 'white'
                        }}
                        disabled={editLoading}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={cancelarEdicionEnCard}
                        disabled={editLoading}
                        style={{
                          flex: 1,
                          backgroundColor: '#E8DEC4',
                          color: '#24352A',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: editLoading ? 'not-allowed' : 'pointer',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: 600,
                          opacity: editLoading ? 0.5 : 1
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={editLoading}
                        style={{
                          flex: 1,
                          backgroundColor: '#24352A',
                          color: 'white',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: editLoading ? 'wait' : 'pointer',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: 600,
                          opacity: editLoading ? 0.5 : 1
                        }}
                      >
                        {editLoading ? 'Guardando...' : '💾 Guardar'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* ============================================ */}
                  {/* CARD NORMAL (colapsada o expandida) */}
                  {/* ============================================ */}
                  <div
                    onClick={() => toggleExpandir(pago.id)}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: estaExpandido ? '12px 12px 0 0' : '12px',
                      padding: '10px 12px',
                      borderTop: '2px solid #24352A',
borderLeft: '2px solid #24352A',
borderRight: '2px solid #24352A',
borderBottom: estaExpandido ? 'none' : '2px solid #24352A',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                      fontFamily: 'Oswald, sans-serif'
                    }}
                  >
                    {/* Fila 1: Recibo + Monto */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '10px',
                      marginBottom: '6px'
                    }}>
                      <span style={{
                        fontFamily: 'Oswald, sans-serif',
                        fontSize: 'clamp(12px, 3vw, 15px)',
                        fontWeight: '700',
                        color: '#24352A',
                        letterSpacing: '0.5px'
                      }}>
                        {pago.recibo || '-'}
                      </span>
                      <span style={{
                        fontFamily: 'Oswald, sans-serif',
                        fontSize: 'clamp(13px, 3.2vw, 16px)',
                        fontWeight: '700',
                        color: '#24352A'
                      }}>
                        ${(pago.monto || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Fila 2: Beneficiario */}
                    <div style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: 'clamp(11px, 2.5vw, 13px)',
                      color: '#24352A',
                      fontWeight: '600',
                      marginBottom: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {nombreCompleto || 'Sin nombre'}
                    </div>

                    {/* Fila 3: Fecha + Categoría */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginBottom: '6px'
                    }}>
                      <span style={{
                        fontFamily: 'Oswald, sans-serif',
                        fontSize: 'clamp(9px, 2.2vw, 11px)',
                        color: '#7A7364'
                      }}>
                        📅 {formatFecha(pago.fecha_pago)}
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: 'clamp(8px, 2vw, 10px)',
                        fontFamily: 'Oswald, sans-serif',
                        fontWeight: '600',
                        backgroundColor: pago.categoria === 'C. ANUAL' ? '#FEF3C7' :
                                      pago.categoria === 'C. CORTO' ? '#D1FAE5' :
                                      pago.categoria === 'AFILIACION' ? '#E0E7FF' :
                                      pago.categoria === 'CUOTAS' ? '#F3E8FF' :
                                      '#F3F4F6',
                        color: '#24352A'
                      }}>
                        {pago.categoria}
                      </span>
                    </div>

                    {/* Fila 4: Observaciones + Iconos */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {/* Observaciones (editable inline) */}
                      <div
                        onClick={(e) => {
                          if (puedeEditarInline() && !estaEditandoInline) {
                            e.stopPropagation()
                            setEditandoInline(pago.id)
                            setValorInline(pago.observaciones || '')
                          }
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: 'Oswald, sans-serif',
                          fontSize: 'clamp(10px, 2.2vw, 12px)',
                          color: pago.observaciones ? '#24352A' : '#A89E86',
                          cursor: puedeEditarInline() ? 'text' : 'inherit',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          backgroundColor: '#F9F6EE',
                          minHeight: '24px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {estaEditandoInline ? (
                          <input
                            type="text"
                            value={valorInline}
                            onChange={(e) => setValorInline(e.target.value)}
                            onBlur={() => guardarObservacionInline(pago.id, valorInline)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              } else if (e.key === 'Escape') {
                                setEditandoInline(null)
                              }
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '3px 5px',
                              fontSize: 'clamp(10px, 2.2vw, 12px)',
                              border: '2px solid #24352A',
                              borderRadius: '4px',
                              outline: 'none',
                              fontFamily: 'Oswald, sans-serif',
                              backgroundColor: 'white',
                              boxSizing: 'border-box'
                            }}
                          />
                        ) : (
                          <span style={{
                            fontStyle: pago.observaciones ? 'normal' : 'italic',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {pago.observaciones || 'Sin observaciones'}
                          </span>
                        )}
                      </div>

                      {/* Iconos editar/eliminar */}
                      {canEdit(pago) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirEdicionEnCard(pago)
                          }}
                          title="Editar pago"
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            backgroundColor: '#F3ECD8',
                            color: '#24352A',
                            border: '1.5px solid #D1C9B4',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0,
                            fontFamily: 'Oswald, sans-serif'
                          }}
                        >
                          ✏️
                        </button>
                      )}
                      {canDelete(pago) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(pago.id)
                          }}
                          title="Eliminar pago"
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            backgroundColor: '#FEE2E2',
                            color: '#BF4E30',
                            border: '1.5px solid #FECACA',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0,
                            fontFamily: 'Oswald, sans-serif'
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ============================================ */}
                  {/* PANEL EXPANDIDO (detalle) */}
                  {/* ============================================ */}
                  {estaExpandido && (
                    <div style={{
                      backgroundColor: '#F9F6EE',
                      borderRadius: '0 0 12px 12px',
                      border: '2px solid #24352A',
                      borderTop: 'none',
                      padding: '12px',
                      fontFamily: 'Oswald, sans-serif'
                    }}>
                      {/* Header panel */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        borderBottom: '2px solid #E8DEC4',
                        paddingBottom: '8px'
                      }}>
                        <h3 style={{
                          fontFamily: 'Oswald, sans-serif',
                          fontWeight: '700',
                          fontSize: 'clamp(11px, 2.6vw, 13px)',
                          color: '#24352A',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          margin: 0
                        }}>
                          💰 Detalle del Pago
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPagoExpandido(null)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#7A7364',
                            padding: '2px 6px'
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Grid datos */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <p style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Rama</p>
                          <p style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#24352A', margin: '2px 0 0 0', fontWeight: '600' }}>
                            {pago.rama}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '9px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Medio de Pago</p>
                          <p style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#24352A', margin: '2px 0 0 0', fontWeight: '600' }}>
                            {pago.medio_pago}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {pagosOrdenados.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          fontFamily: 'Oswald, sans-serif',
          color: '#7A7364',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          No hay pagos registrados
        </div>
      )}

      {/* BOTÓN "VER MÁS" */}
      {hayMas && pagosOrdenados.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={cargarMas}
            disabled={cargandoMas}
            style={{
              padding: '10px 24px',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              backgroundColor: 'transparent',
              border: '2px solid #24352A',
              borderRadius: '8px',
              color: '#24352A',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: cargandoMas ? 'wait' : 'pointer',
              fontWeight: 600,
              opacity: cargandoMas ? 0.5 : 1
            }}
          >
            {cargandoMas ? 'Cargando...' : '⬇️ Ver más'}
          </button>
        </div>
      )}
    </div>
  )
}