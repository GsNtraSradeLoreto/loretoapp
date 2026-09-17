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

type SortColumn = 'recibo' | 'beneficiario' | 'monto' | 'fecha' | 'categoria' | 'observaciones'
type SortDirection = 'asc' | 'desc'

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
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [filterRama, setFilterRama] = useState('Todas')
  const [filterBeneficiario, setFilterBeneficiario] = useState('')
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null)

  const [sortColumn, setSortColumn] = useState<SortColumn>('recibo')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // ✅ Paginación
  const [pagina, setPagina] = useState(1)
  const [hayMas, setHayMas] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'
  const esAyudante = rolData.tipo === 'ayudante'
  const esDirigente = esJefe || esAyudante
  const ramaAsignada = rolData.rama
  const verTodas = isSuperAdmin || isJefatura || isAdministrador || isTesorero
  const esSuperAdmin = isSuperAdmin

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

  const [reciboOriginal, setReciboOriginal] = useState('')

  const categorias = [
    { value: 'AFILIACION', label: 'Afiliación' },
    { value: 'CUOTAS', label: 'Cuotas' },
    { value: 'C. CORTO', label: 'Campamento Corto' },
    { value: 'C. ANUAL', label: 'Campamento Anual' },
    { value: 'OTRO', label: 'Otro' }
  ]

  const mediosPago = ['Efectivo', 'Mercadopago']

  useEffect(() => {
    loadBeneficiarios()
  }, [])

  // ✅ Se recarga cuando cambian los filtros (rama/beneficiario)
  useEffect(() => {
    if (!loading) {
      cargarPagos(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRama, filterBeneficiario])

  // ✅ Carga inicial: beneficiarios + primeros 20 pagos
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

      // Después de cargar beneficiarios, cargamos la primera página de pagos
      await cargarPagos(true)

    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al cargar los datos', type: 'error' })
      setLoading(false)
    }
  }

  // ✅ Carga pagos con filtros aplicados server-side
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

      // ✅ Filtro por rama (server-side)
      if (filterRama !== 'Todas') {
        query = query.eq('rama', filterRama)
      }

      // ✅ Filtro por beneficiario (server-side)
      if (filterBeneficiario) {
        query = query.eq('beneficiario_id', filterBeneficiario)
      }

      // Si es Jefe de Rama, mostrar solo su rama
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
      reciboFinal = await verificarYResolverDuplicado(reciboFinal, editingId || undefined)

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

      if (editingId) {
        const { error } = await supabase
          .from('pagos')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        setMessage({ text: '✅ Pago actualizado correctamente', type: 'success' })
      } else {
        const { error } = await supabase
          .from('pagos')
          .insert(payload)

        if (error) throw error
        setMessage({ text: `✅ Pago registrado correctamente (Recibo: ${reciboFinal})`, type: 'success' })
      }

      resetForm()
      cargarPagos(true)

    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al guardar el pago', type: 'error' })
    }
  }

  const handleEdit = (pago: Pago) => {
    setEditingId(pago.id)

    const categoriasEstandar = ['AFILIACION', 'CUOTAS', 'C. CORTO', 'C. ANUAL']
    const esOtro = !categoriasEstandar.includes(pago.categoria)

    setFormData({
      beneficiario_id: pago.beneficiario_id,
      recibo: pago.recibo || '',
      monto: pago.monto.toString(),
      fecha_pago: pago.fecha_pago,
      categoria: esOtro ? 'OTRO' : pago.categoria,
      categoria_otro: esOtro ? pago.categoria : '',
      medio_pago: pago.medio_pago,
      observaciones: pago.observaciones || ''
    })
    setReciboOriginal(pago.recibo || '')
    setShowForm(true)
    setSelectedPago(null)
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
      cargarPagos(true)
      setSelectedPago(null)
    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al eliminar el pago', type: 'error' })
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return ' ⇅'
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  // ✅ Ya no filtramos en el frontend: los filtros se aplican en la query
  const pagosOrdenados = [...pagos].sort((a, b) => {
    let valorA: any
    let valorB: any

    switch (sortColumn) {
      case 'recibo':
        valorA = a.reciboNumero || 0
        valorB = b.reciboNumero || 0
        break
      case 'beneficiario':
        valorA = `${a.beneficiario_apellido} ${a.beneficiario_nombre}`.toLowerCase()
        valorB = `${b.beneficiario_apellido} ${b.beneficiario_nombre}`.toLowerCase()
        break
      case 'monto':
        valorA = a.monto
        valorB = b.monto
        break
      case 'fecha':
        valorA = new Date(a.fecha_pago).getTime()
        valorB = new Date(b.fecha_pago).getTime()
        break
      case 'categoria':
        valorA = (a.categoria || '').toLowerCase()
        valorB = (b.categoria || '').toLowerCase()
        break
      case 'observaciones':
        valorA = (a.observaciones || '').toLowerCase()
        valorB = (b.observaciones || '').toLowerCase()
        break
      default:
        valorA = a.reciboNumero || 0
        valorB = b.reciboNumero || 0
    }

    if (valorA < valorB) return sortDirection === 'asc' ? -1 : 1
    if (valorA > valorB) return sortDirection === 'asc' ? 1 : -1
    return 0
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

  const totalMonto = pagos.reduce((sum, p) => sum + p.monto, 0)

  if (loading && pagos.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>Cargando pagos...</span>
      </div>
    )
  }

  return (
    <div>
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

      {/* FILTROS POR RAMA - GRILLA 2x2 + TODOS arriba */}
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

      {/* BOTÓN NUEVO PAGO */}
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

      {/* FORMULARIO */}
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
            {editingId ? '✏️ Editar Pago' : '📝 Nuevo Pago'}
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
                {editingId ? 'Actualizar' : 'Guardar'}
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

      {/* TABLA DE PAGOS */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #D1C9B4',
        overflow: 'auto'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(10px, 2vw, 13px)',
          minWidth: '700px'
        }}>
          <thead style={{ backgroundColor: '#24352A' }}>
            <tr>
              <th style={{ padding: '8px 8px', textAlign: 'center', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '70px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Acciones</th>

              <th onClick={() => handleSort('recibo')} style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}>
                Recibo {getSortIcon('recibo')}
              </th>

              <th onClick={() => handleSort('beneficiario')} style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}>
                Beneficiario {getSortIcon('beneficiario')}
              </th>

              <th onClick={() => handleSort('monto')} style={{ padding: '8px 8px', textAlign: 'right', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}>
                Monto {getSortIcon('monto')}
              </th>

              <th onClick={() => handleSort('fecha')} style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}>
                Fecha {getSortIcon('fecha')}
              </th>

              <th onClick={() => handleSort('categoria')} style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', userSelect: 'none' }}>
                Categoría {getSortIcon('categoria')}
              </th>

              <th onClick={() => handleSort('observaciones')} style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}>
                Observaciones {getSortIcon('observaciones')}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagosOrdenados.map((pago) => {
              const nombreCompleto = formatearNombreConH(
                pago.beneficiario_nombre || '',
                pago.beneficiario_apellido || '',
                pago.beneficiario_tiene_hermanos || false
              )

              return (
                <tr
                  key={pago.id}
                  style={{ borderBottom: '1px solid #E8DEC4', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3ECD8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => setSelectedPago(pago)}
                >
                  <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #E8DEC4' }}>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                      {canEdit(pago) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(pago)
                          }}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            backgroundColor: '#F3ECD8',
                            color: '#24352A',
                            border: '1.5px solid #D1C9B4',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontFamily: 'Oswald, sans-serif',
                            lineHeight: 1.2,
                            minWidth: '20px'
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
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            backgroundColor: '#FEE2E2',
                            color: '#BF4E30',
                            border: '1.5px solid #FECACA',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontFamily: 'Oswald, sans-serif',
                            lineHeight: 1.2,
                            minWidth: '20px'
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '6px 8px', fontSize: 'clamp(10px, 2vw, 13px)', color: '#24352A', fontWeight: '600', borderRight: '1px solid #E8DEC4', whiteSpace: 'nowrap' }}>{pago.recibo || '-'}</td>
                  <td style={{ padding: '6px 8px', fontSize: 'clamp(10px, 2vw, 13px)', color: '#24352A', borderRight: '1px solid #E8DEC4', whiteSpace: 'nowrap' }}>{nombreCompleto || 'Sin nombre'}</td>
                  <td style={{ padding: '6px 8px', fontSize: 'clamp(10px, 2vw, 13px)', color: '#24352A', textAlign: 'right', fontWeight: '600', borderRight: '1px solid #E8DEC4', whiteSpace: 'nowrap' }}>
                    ${pago.monto.toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 'clamp(10px, 2vw, 13px)', color: '#24352A', borderRight: '1px solid #E8DEC4', whiteSpace: 'nowrap' }}>
                    {new Date(pago.fecha_pago).toLocaleDateString('es-AR')}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 'clamp(9px, 1.8vw, 12px)', color: '#24352A', borderRight: '1px solid #E8DEC4', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: 'clamp(8px, 1.5vw, 10px)',
                      backgroundColor: pago.categoria === 'C. ANUAL' ? '#FEF3C7' :
                                    pago.categoria === 'C. CORTO' ? '#D1FAE5' :
                                    pago.categoria === 'AFILIACION' ? '#E0E7FF' :
                                    pago.categoria === 'CUOTAS' ? '#F3E8FF' :
                                    '#F3F4F6'
                    }}>
                      {pago.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 'clamp(9px, 1.8vw, 12px)', color: '#7A7364', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pago.observaciones || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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

      {/* ✅ BOTÓN "VER MÁS" */}
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

      {/* MODAL DE DETALLE DEL PAGO */}
      {selectedPago && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }} onClick={() => setSelectedPago(null)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '480px',
            width: '100%',
            border: '2px solid #D1C9B4',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '2px solid #E8DEC4',
              paddingBottom: '12px'
            }}>
              <h2 style={{
                fontFamily: 'Oswald, sans-serif',
                fontWeight: '700',
                fontSize: 'clamp(15px, 3.5vw, 20px)',
                color: '#24352A',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: 0
              }}>
                💰 Detalle del Pago
              </h2>
              <button
                onClick={() => setSelectedPago(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#7A7364'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Recibo</p>
                <p style={{ fontSize: 'clamp(14px, 3vw, 18px)', color: '#24352A', fontWeight: '700', margin: '2px 0 0 0' }}>
                  {selectedPago.recibo || '-'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Rama</p>
                <p style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#24352A', margin: '2px 0 0 0' }}>
                  {selectedPago.rama}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Beneficiario</p>
                <p style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#24352A', fontWeight: '600', margin: '2px 0 0 0' }}>
                  {formatearNombreConH(
                    selectedPago.beneficiario_nombre || '',
                    selectedPago.beneficiario_apellido || '',
                    selectedPago.beneficiario_tiene_hermanos || false
                  )}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Fecha</p>
                <p style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#24352A', margin: '2px 0 0 0' }}>
                  {new Date(selectedPago.fecha_pago).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Monto</p>
                <p style={{ fontSize: 'clamp(14px, 3vw, 18px)', color: '#24352A', fontWeight: '700', margin: '2px 0 0 0' }}>
                  ${selectedPago.monto.toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Categoría</p>
                <p style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#24352A', margin: '2px 0 0 0' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: selectedPago.categoria === 'C. ANUAL' ? '#FEF3C7' :
                                  selectedPago.categoria === 'C. CORTO' ? '#D1FAE5' :
                                  selectedPago.categoria === 'AFILIACION' ? '#E0E7FF' :
                                  selectedPago.categoria === 'CUOTAS' ? '#F3E8FF' :
                                  '#F3F4F6'
                  }}>
                    {selectedPago.categoria}
                  </span>
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Medio de Pago</p>
                <p style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#24352A', margin: '2px 0 0 0' }}>
                  {selectedPago.medio_pago}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Observaciones</p>
                <p style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#24352A', margin: '2px 0 0 0' }}>
                  {selectedPago.observaciones || '-'}
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px',
              borderTop: '2px solid #E8DEC4',
              paddingTop: '16px',
              justifyContent: 'flex-end',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setSelectedPago(null)}
                style={{
                  backgroundColor: '#E8DEC4',
                  color: '#24352A',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Cerrar
              </button>
              {canEdit(selectedPago) && (
                <button
                  onClick={() => handleEdit(selectedPago)}
                  style={{
                    backgroundColor: '#24352A',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  ✏️ Editar
                </button>
              )}
              {canDelete(selectedPago) && (
                <button
                  onClick={() => handleDelete(selectedPago.id)}
                  style={{
                    backgroundColor: '#BF4E30',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  🗑️ Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}