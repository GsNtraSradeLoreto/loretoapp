import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'

interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  estado: string
  tiene_hermanos: boolean
}

interface Campamento {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  ubicacion: string
  tipo: string
  rama_principal: string
  descripcion: string
  asistentes_count: number
}

interface Asistencia {
  beneficiario_id: string
  campamento_id: string
  nombre_completo: string
  rama: string
  seleccionado: boolean
}

type SortColumn = 'nombre' | 'fecha' | 'tipo'
type SortDirection = 'asc' | 'desc'

type VistaExpandida = 'detalle' | 'asistentes' | 'editar'

const STORAGE_KEY = 'campamentos_filtros_v1'

export default function Campamentos() {
  const navigate = useNavigate()
  const { isSuperAdmin, isJefatura, isAdministrador, getRolData } = useAuth()

  const [campamentos, setCampamentos] = useState<Campamento[]>([])
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [saving, setSaving] = useState(false)

  const [campamentoExpandidoId, setCampamentoExpandidoId] = useState<string | null>(null)
  const [vistaExpandida, setVistaExpandida] = useState<VistaExpandida>('detalle')
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [cargandoAsistencias, setCargandoAsistencias] = useState(false)
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    ubicacion: '',
    tipo: 'Anual',
    rama_principal: '',
    descripcion: ''
  })

  const [bannerCreacion, setBannerCreacion] = useState<{
    visible: boolean
    campamentoId: string | null
    nombre: string
  }>({ visible: false, campamentoId: null, nombre: '' })

  // Filtros y orden
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('fecha')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const [formData, setFormData] = useState({
    nombre: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    tipo: 'Anual',
    rama_principal: '',
    ubicacion: '',
    descripcion: ''
  })

  const rolData = getRolData()
  const ramaAsignada = rolData.rama

  const puedeVerPagina = isSuperAdmin || isJefatura

  const tiposCampamento = ['Anual', 'Corto', 'De Rama', 'Otro']

  const canCreate = (): boolean => isSuperAdmin || isJefatura || isAdministrador
  const canEdit = (): boolean => isSuperAdmin || isJefatura || isAdministrador
  const canDelete = (): boolean => isSuperAdmin
  const canAssign = (): boolean => isSuperAdmin || isJefatura || isAdministrador

  // ===== Cargar filtros y orden guardados =====
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.filterTipo) setFilterTipo(data.filterTipo)
        if (data.searchTerm) setSearchTerm(data.searchTerm)
        if (data.sortColumn) setSortColumn(data.sortColumn)
        if (data.sortDirection) setSortDirection(data.sortDirection)
      }
    } catch (e) {
      console.error('Error cargando filtros guardados:', e)
    }
  }, [])

  // ===== Guardar filtros y orden =====
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        filterTipo,
        searchTerm,
        sortColumn,
        sortDirection
      }))
    } catch (e) {
      console.error('Error guardando filtros:', e)
    }
  }, [filterTipo, searchTerm, sortColumn, sortDirection])

  // ===== Carga inicial =====
  useEffect(() => {
    if (!puedeVerPagina) return

    let isMounted = true

    const cargar = async () => {
      try {
        setLoading(true)

        const [campamentosRes, conteosRes, beneficiariosRes] = await Promise.all([
          supabase
            .from('campamentos')
            .select('id, nombre, fecha_inicio, fecha_fin, tipo, rama_principal, descripcion, ubicacion')
            .order('fecha_inicio', { ascending: false }),
          supabase.rpc('conteo_asistentes_campamentos'),
          supabase
            .from('beneficiarios')
            .select('id, nombre, apellido, rama, estado, tiene_hermanos')
            .eq('estado', 'activo')
            .order('apellido', { ascending: true })
        ])

        if (!isMounted) return

        if (campamentosRes.error) {
          console.error('❌ Error al cargar campamentos:', campamentosRes.error)
          setMessage({ text: `❌ Error: ${campamentosRes.error.message}`, type: 'error' })
          return
        }

        const conteosMap: { [id: string]: number } = {}
        if (conteosRes.data) {
          conteosRes.data.forEach((c: any) => {
            conteosMap[c.campamento_id] = Number(c.total) || 0
          })
        }

        const campamentosConConteo: Campamento[] = (campamentosRes.data || []).map(c => ({
          ...c,
          asistentes_count: conteosMap[c.id] || 0
        }))

        setCampamentos(campamentosConConteo)

        if (!beneficiariosRes.error) {
          setBeneficiarios(beneficiariosRes.data || [])
        }
      } catch (error) {
        if (!isMounted) return
        console.error('❌ Error general:', error)
        setMessage({ text: '❌ Error al cargar los datos', type: 'error' })
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    cargar()

    return () => {
      isMounted = false
    }
  }, [puedeVerPagina])

  // ===== Recargar (para después de guardar cambios) =====
  const loadData = async () => {
    try {
      const [campamentosRes, conteosRes, beneficiariosRes] = await Promise.all([
        supabase
          .from('campamentos')
          .select('id, nombre, fecha_inicio, fecha_fin, tipo, rama_principal, descripcion, ubicacion')
          .order('fecha_inicio', { ascending: false }),
        supabase.rpc('conteo_asistentes_campamentos'),
        supabase
          .from('beneficiarios')
          .select('id, nombre, apellido, rama, estado, tiene_hermanos')
          .eq('estado', 'activo')
          .order('apellido', { ascending: true })
      ])

      if (campamentosRes.error) {
        console.error('❌ Error al cargar campamentos:', campamentosRes.error)
        setMessage({ text: `❌ Error: ${campamentosRes.error.message}`, type: 'error' })
        return
      }

      const conteosMap: { [id: string]: number } = {}
      if (conteosRes.data) {
        conteosRes.data.forEach((c: any) => {
          conteosMap[c.campamento_id] = Number(c.total) || 0
        })
      }

      const campamentosConConteo: Campamento[] = (campamentosRes.data || []).map(c => ({
        ...c,
        asistentes_count: conteosMap[c.id] || 0
      }))

      setCampamentos(campamentosConConteo)

      if (!beneficiariosRes.error) {
        setBeneficiarios(beneficiariosRes.data || [])
      }
    } catch (error) {
      console.error('❌ Error general:', error)
      setMessage({ text: '❌ Error al cargar los datos', type: 'error' })
    }
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  const formatFechaCorta = (fecha: string) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`
  }

  // ✅ Nuevo formato: Tipo (Detalle) usando tipo + rama_principal
  const formatTipoConDetalle = (tipo: string, detalle: string) => {
    const detalleLimpio = (detalle || '').trim()
    const esTodas = !detalleLimpio || detalleLimpio.toLowerCase() === 'todas'

    if (esTodas || tipo === 'Anual' || tipo === 'Corto') {
      return tipo
    }
    return `${tipo} (${detalleLimpio})`
  }

  // ===== Cargar asistencias de un campamento =====
  const cargarAsistencias = async (campamentoId: string) => {
    setCargandoAsistencias(true)
    let isMounted = true

    try {
      const { data: asistenciasData, error } = await supabase
        .from('campamentos_asistidos')
        .select('beneficiario_id')
        .eq('campamento_id', campamentoId)

      if (!isMounted) return
      if (error) throw error

      const idsAsistentes = asistenciasData?.map(a => a.beneficiario_id) || []

      const lista = beneficiarios.map(b => ({
        beneficiario_id: b.id,
        campamento_id: campamentoId,
        nombre_completo: formatearNombreConH(b.nombre, b.apellido, b.tiene_hermanos),
        rama: b.rama,
        seleccionado: idsAsistentes.includes(b.id)
      }))

      if (!isMounted) return
      setAsistencias(lista)
    } catch (error) {
      if (!isMounted) return
      console.error('Error al cargar asistencias:', error)
      setMessage({ text: '❌ Error al cargar asistencias', type: 'error' })
    } finally {
      if (isMounted) setCargandoAsistencias(false)
      isMounted = false
    }
  }

  // ===== Toggle expandir campamento =====
  const toggleExpandir = (campamentoId: string) => {
    if (campamentoExpandidoId === campamentoId) {
      setCampamentoExpandidoId(null)
      setVistaExpandida('detalle')
      setAsistencias([])
      return
    }

    setBannerCreacion({ visible: false, campamentoId: null, nombre: '' })
    setCampamentoExpandidoId(campamentoId)
    setVistaExpandida('detalle')
    setAsistencias([])
    setMessage({ text: '', type: '' })
  }

  const irAVistaAsistentes = async (campamentoId: string) => {
    setVistaExpandida('asistentes')
    await cargarAsistencias(campamentoId)
  }

  const irAVistaEditar = (campamento: Campamento) => {
    setEditFormData({
      nombre: campamento.nombre,
      fecha_inicio: campamento.fecha_inicio,
      fecha_fin: campamento.fecha_fin || '',
      ubicacion: campamento.ubicacion || '',
      tipo: campamento.tipo,
      rama_principal: campamento.rama_principal === 'Todas' ? '' : (campamento.rama_principal || ''),
      descripcion: campamento.descripcion || ''
    })
    setVistaExpandida('editar')
  }

  const cerrarExpandido = () => {
    setCampamentoExpandidoId(null)
    setVistaExpandida('detalle')
    setAsistencias([])
    setMessage({ text: '', type: '' })
  }

  // ===== Crear campamento =====
  const handleCreateCampamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      // ✅ Nuevo: tipo guarda el tipo base, rama_principal guarda el detalle
      const tipoFinal = formData.tipo
      const detalleFinal = formData.rama_principal.trim() || 'Todas'

      const { data: campamento, error: campamentoError } = await supabase
        .from('campamentos')
        .insert({
          nombre: formData.nombre,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin || null,
          ubicacion: formData.ubicacion || null,
          tipo: tipoFinal,
          rama_principal: detalleFinal,
          descripcion: formData.descripcion || null
        })
        .select()
        .single()

      if (campamentoError) {
        if (campamentoError.message.includes('duplicate key')) {
          setMessage({ text: '⚠️ Ya existe un campamento con ese nombre', type: 'warning' })
        } else {
          throw campamentoError
        }
        setSaving(false)
        return
      }

      setShowForm(false)
      resetForm()
      await loadData()

      if (campamento) {
        setBannerCreacion({
          visible: true,
          campamentoId: campamento.id,
          nombre: campamento.nombre
        })
        setMessage({ text: `✅ Campamento "${campamento.nombre}" creado correctamente`, type: 'success' })
      }
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAgregarParticipantesAhora = async () => {
    if (!bannerCreacion.campamentoId) return

    const campamento = campamentos.find(c => c.id === bannerCreacion.campamentoId)
    if (!campamento) return

    setBannerCreacion({ visible: false, campamentoId: null, nombre: '' })
    setCampamentoExpandidoId(campamento.id)
    setVistaExpandida('asistentes')
    await cargarAsistencias(campamento.id)
  }

  const handleNoAgregarParticipantes = () => {
    setBannerCreacion({ visible: false, campamentoId: null, nombre: '' })
    setMessage({ text: '', type: '' })
  }

  // ===== Guardar edición =====
  const handleEditCampamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campamentoExpandidoId) return

    const campamentoOriginal = campamentos.find(c => c.id === campamentoExpandidoId)
    if (!campamentoOriginal) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const tipoFinal = editFormData.tipo
      const detalleFinal = editFormData.rama_principal.trim() || 'Todas'

      const { error } = await supabase
        .from('campamentos')
        .update({
          nombre: editFormData.nombre,
          fecha_inicio: editFormData.fecha_inicio,
          fecha_fin: editFormData.fecha_fin || null,
          ubicacion: editFormData.ubicacion || null,
          tipo: tipoFinal,
          rama_principal: detalleFinal,
          descripcion: editFormData.descripcion || null
        })
        .eq('id', campamentoExpandidoId)

      if (error) throw error

      if (campamentoOriginal.nombre !== editFormData.nombre) {
        await supabase
          .from('campamentos_asistidos')
          .update({ nombre_campamento: editFormData.nombre })
          .eq('campamento_id', campamentoExpandidoId)
      }

      setMessage({ text: '✅ Campamento actualizado correctamente', type: 'success' })
      setVistaExpandida('detalle')
      await loadData()

      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ===== Eliminar campamento =====
  const handleDeleteCampamento = async (campamento: Campamento) => {
    if (!confirm(`¿Estás seguro de que querés eliminar el campamento "${campamento.nombre}" y todas sus asistencias?`)) {
      return
    }

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error: deleteAsistidosError } = await supabase
        .from('campamentos_asistidos')
        .delete()
        .eq('campamento_id', campamento.id)

      if (deleteAsistidosError) throw deleteAsistidosError

      const { error: deleteCampamentoError } = await supabase
        .from('campamentos')
        .delete()
        .eq('id', campamento.id)

      if (deleteCampamentoError) throw deleteCampamentoError

      setMessage({ text: `✅ Campamento eliminado correctamente`, type: 'success' })
      cerrarExpandido()
      await loadData()

      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error al eliminar campamento:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // ===== Toggle selección de asistente =====
  const toggleSeleccion = (beneficiarioId: string) => {
    setAsistencias(prev => prev.map(a =>
      a.beneficiario_id === beneficiarioId
        ? { ...a, seleccionado: !a.seleccionado }
        : a
    ))
  }

  const seleccionarTodos = () => {
    setAsistencias(prev => prev.map(a => ({ ...a, seleccionado: true })))
  }

  const deseleccionarTodos = () => {
    setAsistencias(prev => prev.map(a => ({ ...a, seleccionado: false })))
  }

  // ===== Guardar asistencias =====
  const guardarAsistencias = async () => {
    if (!campamentoExpandidoId) return
    const campamentoId = campamentoExpandidoId

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const seleccionados = asistencias.filter(a => a.seleccionado)
      const idsSeleccionados = seleccionados.map(a => a.beneficiario_id)

      const { data: existentes, error: errorExistentes } = await supabase
        .from('campamentos_asistidos')
        .select('beneficiario_id')
        .eq('campamento_id', campamentoId)

      if (errorExistentes) throw errorExistentes

      const idsExistentes = existentes?.map(e => e.beneficiario_id) || []

      const agregar = idsSeleccionados.filter(id => !idsExistentes.includes(id))
      const eliminar = idsExistentes.filter(id => !idsSeleccionados.includes(id))

      if (agregar.length > 0) {
        const nuevos = agregar.map(id => ({
          beneficiario_id: id,
          campamento_id: campamentoId
        }))

        const { error: errorAgregar } = await supabase
          .from('campamentos_asistidos')
          .insert(nuevos)

        if (errorAgregar) throw errorAgregar
      }

      if (eliminar.length > 0) {
        const { error: errorEliminar } = await supabase
          .from('campamentos_asistidos')
          .delete()
          .eq('campamento_id', campamentoId)
          .in('beneficiario_id', eliminar)

        if (errorEliminar) throw errorEliminar
      }

      setMessage({
        text: `✅ Asistencias actualizadas: ${seleccionados.length} beneficiarios`,
        type: 'success'
      })

      await loadData()
      setVistaExpandida('detalle')
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date().toISOString().split('T')[0],
      tipo: 'Anual',
      rama_principal: '',
      ubicacion: '',
      descripcion: ''
    })
  }

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortColumn !== col) {
      return <span style={{ opacity: 0.35, marginLeft: '4px' }}>↕</span>
    }
    return <span style={{ marginLeft: '4px' }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  // ===== Filtros y orden =====
  const campamentosFiltrados = campamentos
    .filter(c => {
      if (filterTipo !== 'Todos') {
        if (c.tipo !== filterTipo) return false
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        return c.nombre.toLowerCase().includes(term)
      }
      return true
    })
    .sort((a, b) => {
      let valorA: any
      let valorB: any
      if (sortColumn === 'nombre') {
        valorA = a.nombre.toLowerCase()
        valorB = b.nombre.toLowerCase()
      } else if (sortColumn === 'fecha') {
        valorA = a.fecha_inicio || ''
        valorB = b.fecha_inicio || ''
      } else if (sortColumn === 'tipo') {
        valorA = a.tipo.toLowerCase()
        valorB = b.tipo.toLowerCase()
      }
      if (valorA < valorB) return sortDirection === 'asc' ? -1 : 1
      if (valorA > valorB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

  // ✅ Chequeo de permisos DESPUÉS de los hooks
  if (!puedeVerPagina) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
        textAlign: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#24352A',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Acceso Restringido
        </h2>
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(12px, 2.5vw, 16px)',
          color: '#7A7364',
          marginTop: '8px'
        }}>
          Solo la Jefatura de Grupo y el SUPER_ADMIN pueden acceder al listado general de campamentos.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '24px',
            backgroundColor: '#24352A',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          ← Volver al Inicio
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>Cargando...</span>
      </div>
    )
  }

  return (
    <div>
      {/* ENCABEZADO */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{
            fontFamily: 'Oswald, sans-serif',
            fontWeight: '700',
            fontSize: 'clamp(18px, 4vw, 24px)',
            color: '#24352A',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: 0
          }}>
            🏕️ Campamentos
          </h1>
          <p style={{
            fontFamily: 'Oswald, sans-serif',
            fontWeight: '400',
            fontSize: 'clamp(11px, 2.5vw, 14px)',
            color: '#7A7364',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '4px 0 0 0'
          }}>
            {campamentosFiltrados.length} de {campamentos.length} campamentos
          </p>
        </div>
        {canCreate() && (
          <button
            onClick={() => {
              setShowForm(!showForm)
              setMessage({ text: '', type: '' })
              setBannerCreacion({ visible: false, campamentoId: null, nombre: '' })
            }}
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
              width: '100%'
            }}
          >
            {showForm ? '✕ Cancelar' : '+ Nuevo Campamento'}
          </button>
        )}
      </div>

      {/* BANNER POST-CREACIÓN */}
      {bannerCreacion.visible && (
        <div style={{
          backgroundColor: '#F0F7F0',
          border: '2px solid #B8D4B8',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
          fontFamily: 'Oswald, sans-serif'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            color: '#24352A',
            fontWeight: '600'
          }}>
            ✅ Campamento "{bannerCreacion.nombre}" creado
          </div>
          <div style={{
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            color: '#24352A',
            marginBottom: '12px'
          }}>
            ¿Querés agregar los participantes ahora?
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleNoAgregarParticipantes}
              style={{
                flex: 1,
                padding: '8px 16px',
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                backgroundColor: '#E8DEC4',
                color: '#24352A',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600
              }}
            >
              No, después
            </button>
            <button
              onClick={handleAgregarParticipantesAhora}
              style={{
                flex: 1,
                padding: '8px 16px',
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                backgroundColor: '#5C7A5E',
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
              Sí, agregar ahora
            </button>
          </div>
        </div>
      )}

      {message.text && !campamentoExpandidoId && !bannerCreacion.visible && (
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

      {/* FORM CREAR */}
      {showForm && (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', padding: '16px',
          border: '2px solid #D1C9B4', marginBottom: '20px'
        }}>
          <h3 style={{
            fontFamily: 'Oswald, sans-serif', fontWeight: '600',
            fontSize: 'clamp(13px, 3vw, 16px)', color: '#24352A',
            textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0'
          }}>
            📝 Nuevo Campamento
          </h3>

          <form onSubmit={handleCreateCampamento} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Nombre del Campamento *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Campamento de Verano 2026"
                style={{
                  width: '100%', padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4', borderRadius: '6px',
                  outline: 'none', fontFamily: 'Oswald, sans-serif', backgroundColor: 'white',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Fecha Inicio *
              </label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                  fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Fecha Fin
              </label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                  fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                  fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                }}
                required
              >
                {tiposCampamento.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>

            {/* ✅ Campo de texto libre "A quién pertenece" - siempre visible */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                A quién pertenece
              </label>
              <input
                type="text"
                value={formData.rama_principal}
                onChange={(e) => setFormData({ ...formData, rama_principal: e.target.value })}
                placeholder="Ej: Caminantes, Patrulla Pantera, Grupo, etc."
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                  fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Ubicación
              </label>
              <input
                type="text"
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                placeholder="Ej: Parque Nacional, Ciudad, etc."
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                  fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del campamento..."
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                  fontFamily: 'Oswald, sans-serif', backgroundColor: 'white',
                  resize: 'vertical', minHeight: '60px', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setMessage({ text: '', type: '' }) }}
                style={{
                  padding: '8px 20px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  backgroundColor: '#E8DEC4', color: '#24352A', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 20px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                  backgroundColor: '#24352A', color: 'white', border: 'none',
                  borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  opacity: saving ? 0.5 : 1, flex: 1
                }}
              >
                {saving ? 'Creando...' : 'Crear Campamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1, minWidth: '160px', padding: '8px 12px',
            fontSize: 'clamp(11px, 2vw, 13px)', border: '2px solid #D1C9B4',
            borderRadius: '6px', outline: 'none', fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white', boxSizing: 'border-box'
          }}
        />
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          style={{
            padding: '8px 12px', fontSize: 'clamp(11px, 2vw, 13px)',
            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', cursor: 'pointer'
          }}
        >
          <option value="Todos">Todos los tipos</option>
          <option value="Anual">Anual</option>
          <option value="Corto">Corto</option>
          <option value="De Rama">De Rama</option>
          <option value="Otro">Otro</option>
        </select>
        {(filterTipo !== 'Todos' || searchTerm) && (
          <button
            onClick={() => { setFilterTipo('Todos'); setSearchTerm('') }}
            style={{
              padding: '8px 12px', fontSize: 'clamp(10px, 2vw, 12px)',
              border: '2px solid #BF4E30', borderRadius: '6px',
              backgroundColor: 'transparent', color: '#BF4E30', cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* LISTA DE CAMPAMENTOS (cards) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {campamentosFiltrados.map((campamento) => {
          const estaExpandido = campamentoExpandidoId === campamento.id

          return (
            <div key={campamento.id}>
              {/* CARD PRINCIPAL */}
              <div
                onClick={() => toggleExpandir(campamento.id)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: estaExpandido ? '12px 12px 0 0' : '12px',
                  padding: '12px 14px',
                  border: '2px solid #24352A',
                  borderBottom: estaExpandido ? 'none' : '2px solid #24352A',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontWeight: '700',
                  fontSize: 'clamp(13px, 3vw, 16px)',
                  color: '#24352A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  {campamento.nombre}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  fontSize: 'clamp(10px, 2.2vw, 12px)',
                  color: '#7A7364'
                }}>
                  <span>
                    📅 {formatFechaCorta(campamento.fecha_inicio)}
                    {campamento.fecha_fin && ` - ${formatFechaCorta(campamento.fecha_fin)}`}
                  </span>
                  <span>·</span>
                  <span>{formatTipoConDetalle(campamento.tipo, campamento.rama_principal)}</span>
                  <span>·</span>
                  <span>👥 {campamento.asistentes_count || 0}</span>
                </div>
              </div>

              {/* PANEL EXPANDIDO */}
              {estaExpandido && (
                <div style={{
                  backgroundColor: '#F9F6EE',
                  borderRadius: '0 0 12px 12px',
                  border: '2px solid #24352A',
                  borderTop: 'none',
                  padding: '14px 12px',
                  fontFamily: 'Oswald, sans-serif'
                }}>
                  {message.text && (
                    <div style={{
                      padding: '8px 12px', borderRadius: '6px', marginBottom: '12px',
                      fontSize: 'clamp(11px, 2.2vw, 13px)', border: '1px solid',
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

                  {/* ===== VISTA DETALLE ===== */}
                  {vistaExpandida === 'detalle' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Fecha Inicio</p>
                          <p style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#24352A', fontWeight: '600', margin: '2px 0 0 0' }}>
                            {formatFecha(campamento.fecha_inicio)}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Fecha Fin</p>
                          <p style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#24352A', fontWeight: '600', margin: '2px 0 0 0' }}>
                            {campamento.fecha_fin ? formatFecha(campamento.fecha_fin) : '-'}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Tipo</p>
                          <p style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#24352A', fontWeight: '600', margin: '2px 0 0 0' }}>
                            {formatTipoConDetalle(campamento.tipo, campamento.rama_principal)}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Asistentes</p>
                          <p style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#24352A', fontWeight: '600', margin: '2px 0 0 0' }}>
                            👥 {campamento.asistentes_count || 0}
                          </p>
                        </div>
                        {campamento.ubicacion && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Ubicación</p>
                            <p style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', color: '#24352A', margin: '2px 0 0 0' }}>
                              📍 {campamento.ubicacion}
                            </p>
                          </div>
                        )}
                        {campamento.descripcion && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <p style={{ fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Descripción</p>
                            <p style={{ fontSize: 'clamp(11px, 2.2vw, 13px)', color: '#24352A', margin: '2px 0 0 0', lineHeight: 1.5 }}>
                              {campamento.descripcion}
                            </p>
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        marginTop: '12px', borderTop: '2px solid #E8DEC4', paddingTop: '12px'
                      }}>
                        {canAssign() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              irAVistaAsistentes(campamento.id)
                            }}
                            style={{
                              padding: '10px 16px', fontSize: 'clamp(12px, 2.5vw, 14px)',
                              backgroundColor: '#5C7A5E', color: 'white', border: 'none',
                              borderRadius: '8px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600
                            }}
                          >
                            👥 Ver / editar asistentes
                          </button>
                        )}
                        {canEdit() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              irAVistaEditar(campamento)
                            }}
                            style={{
                              padding: '10px 16px', fontSize: 'clamp(12px, 2.5vw, 14px)',
                              backgroundColor: '#24352A', color: 'white', border: 'none',
                              borderRadius: '8px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600
                            }}
                          >
                            ✏️ Editar campamento
                          </button>
                        )}
                        {canDelete() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCampamento(campamento)
                            }}
                            disabled={saving}
                            style={{
                              padding: '10px 16px', fontSize: 'clamp(12px, 2.5vw, 14px)',
                              backgroundColor: '#FEE2E2', color: '#BF4E30',
                              border: '2px solid #FECACA', borderRadius: '8px',
                              cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                              fontWeight: 600, opacity: saving ? 0.5 : 1
                            }}
                          >
                            {saving ? 'Eliminando...' : '🗑️ Eliminar campamento'}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            cerrarExpandido()
                          }}
                          style={{
                            padding: '8px 16px', fontSize: 'clamp(11px, 2.2vw, 13px)',
                            backgroundColor: 'transparent', color: '#7A7364',
                            border: '2px solid #D1C9B4', borderRadius: '8px',
                            cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                            textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600
                          }}
                        >
                          ↑ Cerrar
                        </button>
                      </div>
                    </>
                  )}

                  {/* ===== VISTA ASISTENTES ===== */}
                  {vistaExpandida === 'asistentes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={seleccionarTodos}
                          style={{
                            padding: '6px 12px', fontSize: 'clamp(10px, 2vw, 12px)',
                            backgroundColor: '#5C7A5E', color: 'white', border: 'none',
                            borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}
                        >
                          ✅ Todos
                        </button>
                        <button
                          onClick={deseleccionarTodos}
                          style={{
                            padding: '6px 12px', fontSize: 'clamp(10px, 2vw, 12px)',
                            backgroundColor: '#E8DEC4', color: '#24352A', border: 'none',
                            borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}
                        >
                          ❌ Ninguno
                        </button>
                      </div>

                      <div style={{
                        maxHeight: '400px', overflowY: 'auto',
                        border: '1px solid #E8DEC4', borderRadius: '8px', padding: '4px',
                        backgroundColor: 'white'
                      }}>
                        {cargandoAsistencias ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: '#7A7364' }}>
                            Cargando asistentes...
                          </div>
                        ) : (
                          [...asistencias]
                            .sort((a, b) => {
                              const ordenA = ({ 'Manada': 1, 'Unidad Scout': 2, 'Caminantes': 3, 'Rovers': 4 } as Record<string, number>)[a.rama] || 99
                              const ordenB = ({ 'Manada': 1, 'Unidad Scout': 2, 'Caminantes': 3, 'Rovers': 4 } as Record<string, number>)[b.rama] || 99
                              if (ordenA !== ordenB) return ordenA - ordenB
                              return a.nombre_completo.localeCompare(b.nombre_completo)
                            })
                            .map((item) => (
                              <div
                                key={item.beneficiario_id}
                                onClick={() => toggleSeleccion(item.beneficiario_id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                  backgroundColor: item.seleccionado ? '#F3ECD8' : 'transparent',
                                  borderBottom: '1px solid #F3ECD8'
                                }}
                              >
                                <div style={{
                                  width: '20px', height: '20px', borderRadius: '4px',
                                  border: '2px solid #D1C9B4',
                                  backgroundColor: item.seleccionado ? '#24352A' : 'white',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {item.seleccionado && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                                    color: '#24352A',
                                    fontWeight: item.seleccionado ? '600' : '400'
                                  }}>
                                    {item.nombre_completo}
                                  </div>
                                  <div style={{
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 'clamp(9px, 1.8vw, 11px)',
                                    color: '#7A7364'
                                  }}>
                                    {item.rama}
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>

                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderTop: '2px solid #E8DEC4', paddingTop: '12px',
                        flexWrap: 'wrap', gap: '8px'
                      }}>
                        <span style={{
                          fontFamily: 'Oswald, sans-serif',
                          fontSize: 'clamp(10px, 2vw, 13px)', color: '#7A7364'
                        }}>
                          {asistencias.filter(a => a.seleccionado).length} seleccionados
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setVistaExpandida('detalle')}
                            style={{
                              padding: '8px 16px', fontSize: 'clamp(11px, 2.5vw, 13px)',
                              backgroundColor: '#E8DEC4', color: '#24352A', border: 'none',
                              borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}
                          >
                            Volver
                          </button>
                          <button
                            onClick={guardarAsistencias}
                            disabled={saving}
                            style={{
                              padding: '8px 16px', fontSize: 'clamp(11px, 2.5vw, 13px)',
                              backgroundColor: '#24352A', color: 'white', border: 'none',
                              borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                              opacity: saving ? 0.5 : 1
                            }}
                          >
                            {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ===== VISTA EDITAR ===== */}
                  {vistaExpandida === 'editar' && (
                    <form
                      onSubmit={handleEditCampamento}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
                    >
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                          Nombre *
                        </label>
                        <input
                          type="text"
                          value={editFormData.nombre}
                          onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                          }}
                          required
                          disabled={saving}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                          Fecha Inicio *
                        </label>
                        <input
                          type="date"
                          value={editFormData.fecha_inicio}
                          onChange={(e) => setEditFormData({ ...editFormData, fecha_inicio: e.target.value })}
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                          }}
                          required
                          disabled={saving}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                          Fecha Fin
                        </label>
                        <input
                          type="date"
                          value={editFormData.fecha_fin}
                          onChange={(e) => setEditFormData({ ...editFormData, fecha_fin: e.target.value })}
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                          }}
                          disabled={saving}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                          Tipo *
                        </label>
                        <select
                          value={editFormData.tipo}
                          onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                          }}
                          required
                          disabled={saving}
                        >
                          {tiposCampamento.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                        </select>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                          A quién pertenece
                        </label>
                        <input
                          type="text"
                          value={editFormData.rama_principal}
                          onChange={(e) => setEditFormData({ ...editFormData, rama_principal: e.target.value })}
                          placeholder="Ej: Caminantes, Patrulla Pantera, Grupo, etc."
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                          }}
                          disabled={saving}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                          Ubicación
                        </label>
                        <input
                          type="text"
                          value={editFormData.ubicacion}
                          onChange={(e) => setEditFormData({ ...editFormData, ubicacion: e.target.value })}
                          placeholder="Ej: Parque Nacional, Ciudad, etc."
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', boxSizing: 'border-box'
                          }}
                          disabled={saving}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                          Descripción
                        </label>
                        <textarea
                          value={editFormData.descripcion}
                          onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                          placeholder="Descripción del campamento..."
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none',
                            fontFamily: 'Oswald, sans-serif', backgroundColor: 'white',
                            resize: 'vertical', minHeight: '60px', boxSizing: 'border-box'
                          }}
                          disabled={saving}
                        />
                      </div>

                      <div style={{
                        gridColumn: '1 / -1', display: 'flex', gap: '8px',
                        borderTop: '2px solid #E8DEC4',
                        paddingTop: '12px', justifyContent: 'flex-end', flexWrap: 'wrap'
                      }}>
                        <button
                          type="button"
                          onClick={() => setVistaExpandida('detalle')}
                          style={{
                            padding: '8px 20px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            backgroundColor: '#E8DEC4', color: '#24352A', border: 'none',
                            borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            opacity: saving ? 0.5 : 1, flex: 1
                          }}
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          style={{
                            padding: '8px 20px', fontSize: 'clamp(11px, 2.5vw, 14px)',
                            backgroundColor: '#24352A', color: 'white', border: 'none',
                            borderRadius: '6px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            opacity: saving ? 0.5 : 1, flex: 1
                          }}
                        >
                          {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {campamentosFiltrados.length === 0 && campamentos.length > 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 0', fontFamily: 'Oswald, sans-serif',
          color: '#7A7364', fontSize: 'clamp(11px, 2.5vw, 14px)',
          textTransform: 'uppercase', letterSpacing: '1px'
        }}>
          No hay campamentos con esos filtros
        </div>
      )}

      {campamentos.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 0', fontFamily: 'Oswald, sans-serif',
          color: '#7A7364', fontSize: 'clamp(11px, 2.5vw, 14px)',
          textTransform: 'uppercase', letterSpacing: '1px'
        }}>
          No hay campamentos registrados
        </div>
      )}
    </div>
  )
}