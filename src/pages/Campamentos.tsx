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
  estado: string
  asistentes_ids: string[]
}

interface Asistencia {
  beneficiario_id: string
  campamento_id: string
  nombre_completo: string
  rama: string
  seleccionado: boolean
}

type SortColumn = 'nombre' | 'fecha' | 'tipo' | 'asistentes'
type SortDirection = 'asc' | 'desc'

const STORAGE_KEY = 'campamentos_filtros_v1'

export default function Campamentos() {
  const navigate = useNavigate()
  const { profile, isSuperAdmin, isJefatura, isAdministrador, getRolData } = useAuth()

  const puedeVerPagina = isSuperAdmin || isJefatura

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
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(11px, 2vw, 14px)',
          color: '#7A7364',
          marginTop: '4px'
        }}>
          Los Jefes de Rama pueden gestionar los campamentos desde el perfil de cada beneficiario.
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

  const [campamentos, setCampamentos] = useState<Campamento[]>([])
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [saving, setSaving] = useState(false)
  const [selectedCampamento, setSelectedCampamento] = useState<Campamento | null>(null)
  const [asistenciasPorCampamento, setAsistenciasPorCampamento] = useState<{
    [campamentoId: string]: Asistencia[]
  }>({})
  const [cargandoAsistencias, setCargandoAsistencias] = useState<string | null>(null)

  // ===== Filtros y orden (con persistencia) =====
  const [filterRama, setFilterRama] = useState('Todas')
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('fecha')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const [editandoCampamentoId, setEditandoCampamentoId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    ubicacion: '',
    tipo: 'Anual',
    rama_principal: 'Todas',
    descripcion: '',
    estado: 'planificado'
  })

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'
  const ramaAsignada = rolData.rama
  const esSuperAdmin = isSuperAdmin
  const esJefatura = isJefatura

  const [formData, setFormData] = useState({
    nombre: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    tipo: 'Anual',
    rama: '',
    otro_tipo: '',
    ubicacion: '',
    descripcion: ''
  })

  const tiposCampamento = ['Anual', 'Corto', 'De Rama', 'Otro']
  const ramas = ['Todas', 'Manada', 'Unidad Scout', 'Caminantes', 'Rovers']
  const estados = ['planificado', 'activo', 'finalizado', 'cancelado']

  const canCreate = (): boolean => esSuperAdmin || esJefatura || isAdministrador
  const canEdit = (): boolean => esSuperAdmin || esJefatura || isAdministrador
  const canDelete = (): boolean => esSuperAdmin
  const canAssign = (): boolean => esSuperAdmin || esJefatura || isAdministrador

  // ===== Cargar filtros y orden guardados =====
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.filterRama) setFilterRama(data.filterRama)
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
        filterRama,
        filterTipo,
        searchTerm,
        sortColumn,
        sortDirection
      }))
    } catch (e) {
      console.error('Error guardando filtros:', e)
    }
  }, [filterRama, filterTipo, searchTerm, sortColumn, sortDirection])

  useEffect(() => {
    loadData()
  }, [])

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  const formatTipo = (tipo: string, ramaPrincipal: string) => {
    // Si ya viene con la rama entre paréntesis, lo mostramos tal cual
    if (tipo.startsWith('De Rama (') && tipo.endsWith(')')) {
      return tipo
    }
    // Si es "De Rama" sin rama, la agregamos
    if (tipo === 'De Rama' && ramaPrincipal && ramaPrincipal !== 'Todas') {
      return `De Rama (${ramaPrincipal})`
    }
    return tipo
  }
  const loadData = async () => {
    try {
      setLoading(true)

      const { data: campamentosData, error: campamentosError } = await supabase
        .from('campamentos')
        .select('*')
        .order('fecha_inicio', { ascending: false })

      if (campamentosError) {
        console.error('❌ Error al cargar campamentos:', campamentosError)
        setMessage({ text: `❌ Error: ${campamentosError.message}`, type: 'error' })
        setLoading(false)
        return
      }

      if (!campamentosData || campamentosData.length === 0) {
        setCampamentos([])
        setLoading(false)
        return
      }

      const campamentoIds = campamentosData.map(c => c.id)
      const { data: asistenciasData, error: asistenciasError } = await supabase
        .from('campamentos_asistidos')
        .select('campamento_id, beneficiario_id')
        .in('campamento_id', campamentoIds)

      if (asistenciasError) {
        console.error('❌ Error al cargar asistencias:', asistenciasError)
        setCampamentos(campamentosData.map(c => ({ ...c, asistentes_ids: [] })))
        setLoading(false)
        return
      }

      const asistentesPorCampamento: { [campamentoId: string]: string[] } = {}
      asistenciasData?.forEach((item: any) => {
        if (!asistentesPorCampamento[item.campamento_id]) {
          asistentesPorCampamento[item.campamento_id] = []
        }
        if (item.beneficiario_id) {
          asistentesPorCampamento[item.campamento_id].push(item.beneficiario_id)
        }
      })

      const campamentosConAsistentes = campamentosData.map(campamento => ({
        ...campamento,
        asistentes_ids: asistentesPorCampamento[campamento.id] || []
      }))

      setCampamentos(campamentosConAsistentes)

      let beneficiariosQuery = supabase
        .from('beneficiarios')
        .select('id, nombre, apellido, rama, estado, tiene_hermanos')
        .eq('estado', 'activo')
        .order('apellido', { ascending: true })

      const { data: beneficiariosData, error: beneficiariosError } = await beneficiariosQuery
      if (!beneficiariosError) {
        setBeneficiarios(beneficiariosData || [])
      }

    } catch (error) {
      console.error('❌ Error general:', error)
      setMessage({ text: '❌ Error al cargar los datos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const cargarAsistencias = async (campamentoId: string) => {
    if (asistenciasPorCampamento[campamentoId]) {
      return
    }

    setCargandoAsistencias(campamentoId)
    try {
      const { data: asistenciasData, error } = await supabase
        .from('campamentos_asistidos')
        .select('beneficiario_id')
        .eq('campamento_id', campamentoId)

      if (error) throw error

      const idsAsistentes = asistenciasData?.map(a => a.beneficiario_id) || []

      const lista = beneficiarios.map(b => ({
        beneficiario_id: b.id,
        campamento_id: campamentoId,
        nombre_completo: formatearNombreConH(b.nombre, b.apellido, b.tiene_hermanos),
        rama: b.rama,
        seleccionado: idsAsistentes.includes(b.id)
      }))

      setAsistenciasPorCampamento(prev => ({
        ...prev,
        [campamentoId]: lista
      }))

    } catch (error) {
      console.error('Error al cargar asistencias:', error)
      setMessage({ text: '❌ Error al cargar asistencias', type: 'error' })
    } finally {
      setCargandoAsistencias(null)
    }
  }

  const handleCreateCampamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      let tipoFinal = formData.tipo
      if (formData.tipo === 'De Rama' && formData.rama) {
        tipoFinal = `De Rama (${formData.rama})`
      } else if (formData.tipo === 'Otro' && formData.otro_tipo) {
        tipoFinal = formData.otro_tipo
      }

      const { data: campamento, error: campamentoError } = await supabase
        .from('campamentos')
        .insert({
          nombre: formData.nombre,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin || null,
          ubicacion: formData.ubicacion || null,
          tipo: tipoFinal,
          rama_principal: formData.rama || 'Todas',
          descripcion: formData.descripcion || null,
          estado: 'planificado'
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

      setMessage({ text: `✅ Campamento "${formData.nombre}" creado correctamente`, type: 'success' })
      setShowForm(false)
      resetForm()
      await loadData()

      if (campamento) {
        const campamentoConAsistentes = {
          ...campamento,
          asistentes_ids: []
        }
        setSelectedCampamento(campamentoConAsistentes)
        await cargarAsistencias(campamento.id)
      }

    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const abrirEditModal = (campamento: Campamento) => {
    setEditandoCampamentoId(campamento.id)
    setEditFormData({
      nombre: campamento.nombre,
      fecha_inicio: campamento.fecha_inicio,
      fecha_fin: campamento.fecha_fin || '',
      ubicacion: campamento.ubicacion || '',
      tipo: campamento.tipo,
      rama_principal: campamento.rama_principal,
      descripcion: campamento.descripcion || '',
      estado: campamento.estado
    })
  }

  const handleEditCampamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editandoCampamentoId) return

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error } = await supabase
        .from('campamentos')
        .update({
          nombre: editFormData.nombre,
          fecha_inicio: editFormData.fecha_inicio,
          fecha_fin: editFormData.fecha_fin || null,
          ubicacion: editFormData.ubicacion || null,
          tipo: editFormData.tipo,
          rama_principal: editFormData.rama_principal,
          descripcion: editFormData.descripcion || null,
          estado: editFormData.estado
        })
        .eq('id', editandoCampamentoId)

      if (error) throw error

      const campamentoOriginal = campamentos.find(c => c.id === editandoCampamentoId)
      if (campamentoOriginal && campamentoOriginal.nombre !== editFormData.nombre) {
        await supabase
          .from('campamentos_asistidos')
          .update({ nombre_campamento: editFormData.nombre })
          .eq('campamento_id', editandoCampamentoId)
      }

      setMessage({ text: '✅ Campamento actualizado correctamente', type: 'success' })
      setEditandoCampamentoId(null)
      await loadData()

    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCampamento = async (campamentoId: string, nombreCampamento: string) => {
    if (!confirm(`¿Estás seguro de que querés eliminar el campamento "${nombreCampamento}" y todas sus asistencias?`)) {
      return
    }

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const { error: deleteAsistidosError } = await supabase
        .from('campamentos_asistidos')
        .delete()
        .eq('campamento_id', campamentoId)

      if (deleteAsistidosError) throw deleteAsistidosError

      const { error: deleteCampamentoError } = await supabase
        .from('campamentos')
        .delete()
        .eq('id', campamentoId)

      if (deleteCampamentoError) throw deleteCampamentoError

      setMessage({ text: `✅ Campamento "${nombreCampamento}" eliminado correctamente`, type: 'success' })

      if (selectedCampamento?.id === campamentoId) {
        setSelectedCampamento(null)
      }

      await loadData()

    } catch (error: any) {
      console.error('Error al eliminar campamento:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleSeleccion = (beneficiarioId: string) => {
    if (!selectedCampamento) return
    const campamentoId = selectedCampamento.id

    setAsistenciasPorCampamento(prev => {
      const asistenciasActuales = prev[campamentoId] || []
      return {
        ...prev,
        [campamentoId]: asistenciasActuales.map(a =>
          a.beneficiario_id === beneficiarioId
            ? { ...a, seleccionado: !a.seleccionado }
            : a
        )
      }
    })
  }

  const seleccionarTodos = () => {
    if (!selectedCampamento) return
    const campamentoId = selectedCampamento.id

    setAsistenciasPorCampamento(prev => {
      const asistenciasActuales = prev[campamentoId] || []
      return {
        ...prev,
        [campamentoId]: asistenciasActuales.map(a => ({ ...a, seleccionado: true }))
      }
    })
  }

  const deseleccionarTodos = () => {
    if (!selectedCampamento) return
    const campamentoId = selectedCampamento.id

    setAsistenciasPorCampamento(prev => {
      const asistenciasActuales = prev[campamentoId] || []
      return {
        ...prev,
        [campamentoId]: asistenciasActuales.map(a => ({ ...a, seleccionado: false }))
      }
    })
  }

  const guardarAsistencias = async () => {
    if (!selectedCampamento) return
    const campamentoId = selectedCampamento.id
    const asistenciasActuales = asistenciasPorCampamento[campamentoId] || []

    setSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const seleccionados = asistenciasActuales.filter(a => a.seleccionado)
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
      await cargarAsistencias(campamentoId)

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
      rama: '',
      otro_tipo: '',
      ubicacion: '',
      descripcion: ''
    })
  }

  // ===== Ordenar al hacer click en encabezado =====
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

  // ===== Aplicar filtros y orden =====
  const campamentosFiltrados = campamentos
    .filter(c => {
      if (filterRama !== 'Todas') {
        if (c.rama_principal !== filterRama) return false
      }
      if (filterTipo !== 'Todos') {
        if (filterTipo === 'De Rama') {
          if (!c.tipo.startsWith('De Rama')) return false
        } else {
          if (c.tipo !== filterTipo) return false
        }
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
      } else if (sortColumn === 'asistentes') {
        valorA = a.asistentes_ids?.length || 0
        valorB = b.asistentes_ids?.length || 0
      }
      if (valorA < valorB) return sortDirection === 'asc' ? -1 : 1
      if (valorA > valorB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px'
      }}>
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
              setSelectedCampamento(null)
              setMessage({ text: '', type: '' })
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

      {message.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          border: '1px solid',
          fontFamily: 'Oswald, sans-serif',
          ...(message.type === 'error' ? {
            backgroundColor: '#FEE2E2',
            color: '#BF4E30',
            borderColor: '#FECACA'
          } : message.type === 'warning' ? {
            backgroundColor: '#FEF3C7',
            color: '#C48A2A',
            borderColor: '#FDE68A'
          } : {
            backgroundColor: '#D1FAE5',
            color: '#5C7A5E',
            borderColor: '#A7F3D0'
          })
        }}>
          {message.text}
        </div>
      )}

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
                Fecha Inicio *
              </label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
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
                Fecha Fin
              </label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
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

            <div>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({
                    ...formData,
                    tipo: value,
                    rama: value === 'De Rama' ? formData.rama : '',
                    otro_tipo: value === 'Otro' ? formData.otro_tipo : ''
                  })
                }}
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
                {tiposCampamento.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            {formData.tipo === 'De Rama' && (
              <div>
                <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  Rama *
                </label>
                <select
                  value={formData.rama}
                  onChange={(e) => setFormData({ ...formData, rama: e.target.value })}
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
                  required={formData.tipo === 'De Rama'}
                >
                  <option value="">Seleccionar rama...</option>
                  <option value="Manada">🐺 Manada</option>
                  <option value="Unidad Scout">⚜️ Unidad Scout</option>
                  <option value="Caminantes">🏔️ Caminantes</option>
                  <option value="Rovers">🔥 Rovers</option>
                </select>
              </div>
            )}

            {formData.tipo === 'Otro' && (
              <div>
                <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  Especificar Tipo *
                </label>
                <input
                  type="text"
                  value={formData.otro_tipo}
                  onChange={(e) => setFormData({ ...formData, otro_tipo: e.target.value })}
                  placeholder="Ej: Jornada, Peregrinación, etc."
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
                  required={formData.tipo === 'Otro'}
                />
              </div>
            )}

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

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 'clamp(9px, 2vw, 12px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del campamento..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white',
                  resize: 'vertical',
                  minHeight: '60px'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setMessage({ text: '', type: '' })
                }}
                style={{
                  padding: '8px 20px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  backgroundColor: '#E8DEC4',
                  color: '#24352A',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  flex: 1
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  fontSize: 'clamp(11px, 2.5vw, 14px)',
                  backgroundColor: '#24352A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: saving ? 0.5 : 1,
                  flex: 1
                }}
              >
                {saving ? 'Creando...' : 'Crear Campamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '160px',
            padding: '8px 12px',
            fontSize: 'clamp(11px, 2vw, 13px)',
            border: '2px solid #D1C9B4',
            borderRadius: '6px',
            outline: 'none',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white'
          }}
        />
        <select
          value={filterRama}
          onChange={(e) => setFilterRama(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: 'clamp(11px, 2vw, 13px)',
            border: '2px solid #D1C9B4',
            borderRadius: '6px',
            outline: 'none',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="Todas">Todas las ramas</option>
          <option value="Manada">🐺 Manada</option>
          <option value="Unidad Scout">⚜️ Unidad Scout</option>
          <option value="Caminantes">🏔️ Caminantes</option>
          <option value="Rovers">🔥 Rovers</option>
        </select>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: 'clamp(11px, 2vw, 13px)',
            border: '2px solid #D1C9B4',
            borderRadius: '6px',
            outline: 'none',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="Todos">Todos los tipos</option>
          <option value="Anual">Anual</option>
          <option value="Corto">Corto</option>
          <option value="De Rama">De Rama</option>
          <option value="Otro">Otro</option>
        </select>
        {(filterRama !== 'Todas' || filterTipo !== 'Todos' || searchTerm) && (
          <button
            onClick={() => {
              setFilterRama('Todas')
              setFilterTipo('Todos')
              setSearchTerm('')
            }}
            style={{
              padding: '8px 12px',
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

      {/* TABLA */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #D1C9B4',
        overflow: 'auto',
        marginBottom: '24px'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(10px, 2vw, 13px)',
          minWidth: '600px'
        }}>
          <thead style={{ backgroundColor: '#24352A' }}>
            <tr>
              <th
                onClick={() => handleSort('nombre')}
                style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
              >
                Nombre <SortIcon col="nombre" />
              </th>
              <th
                onClick={() => handleSort('fecha')}
                style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
              >
                Fecha <SortIcon col="fecha" />
              </th>
              <th
                onClick={() => handleSort('tipo')}
                style={{ padding: '8px 8px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
              >
                Tipo <SortIcon col="tipo" />
              </th>
              <th
                onClick={() => handleSort('asistentes')}
                style={{ padding: '8px 8px', textAlign: 'center', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none' }}
              >
                Asistentes <SortIcon col="asistentes" />
              </th>
              <th style={{ padding: '8px 8px', textAlign: 'center', color: '#F3ECD8', fontSize: 'clamp(9px, 1.8vw, 11px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {campamentosFiltrados.map((campamento) => (
              <tr key={campamento.id} style={{ borderBottom: '1px solid #E8DEC4' }}>
                <td style={{ padding: '8px 8px', fontSize: 'clamp(11px, 2.5vw, 14px)', color: '#24352A', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {campamento.nombre}
                </td>
                <td style={{ padding: '8px 8px', fontSize: 'clamp(10px, 2vw, 13px)', color: '#24352A', whiteSpace: 'nowrap' }}>
                  {formatFecha(campamento.fecha_inicio)}
                  {campamento.fecha_fin && ` - ${formatFecha(campamento.fecha_fin)}`}
                </td>
                                <td style={{ padding: '8px 8px', fontSize: 'clamp(10px, 2vw, 13px)', color: '#24352A', whiteSpace: 'nowrap' }}>
                  {formatTipo(campamento.tipo, campamento.rama_principal)}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: 'clamp(10px, 2vw, 13px)', color: '#7A7364' }}>
                  <span
                    onClick={() => {
                      setSelectedCampamento(campamento)
                      cargarAsistencias(campamento.id)
                    }}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {campamento.asistentes_ids?.length || 0}
                  </span>
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {canAssign() && (
                      <button
                        onClick={() => {
                          setSelectedCampamento(campamento)
                          cargarAsistencias(campamento.id)
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: 'clamp(9px, 1.8vw, 11px)',
                          backgroundColor: '#F3ECD8',
                          color: '#24352A',
                          border: '2px solid #D1C9B4',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ✏️ Asignar
                      </button>
                    )}

                    {canEdit() && (
                      <button
                        onClick={() => abrirEditModal(campamento)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 'clamp(9px, 1.8vw, 11px)',
                          backgroundColor: '#E0E7FF',
                          color: '#24352A',
                          border: '2px solid #D1C9B4',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        📝 Editar
                      </button>
                    )}

                    {canDelete() && (
                      <button
                        onClick={() => handleDeleteCampamento(campamento.id, campamento.nombre)}
                        disabled={saving}
                        style={{
                          padding: '4px 8px',
                          fontSize: 'clamp(9px, 1.8vw, 11px)',
                          backgroundColor: '#FEE2E2',
                          color: '#BF4E30',
                          border: '2px solid #FECACA',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          opacity: saving ? 0.5 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {campamentosFiltrados.length === 0 && campamentos.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          fontFamily: 'Oswald, sans-serif',
          color: '#7A7364',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          No hay campamentos con esos filtros
        </div>
      )}

      {campamentos.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          fontFamily: 'Oswald, sans-serif',
          color: '#7A7364',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          No hay campamentos registrados
        </div>
      )}

      {/* MODAL EDITAR */}
      {editandoCampamentoId && (
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
        }} onClick={() => {
          if (!saving) {
            setEditandoCampamentoId(null)
            setMessage({ text: '', type: '' })
          }
        }}>
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
              marginBottom: '20px',
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
                ✏️ Editar Campamento
              </h2>
              {!saving && (
                <button
                  onClick={() => {
                    setEditandoCampamentoId(null)
                    setMessage({ text: '', type: '' })
                  }}
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
              )}
            </div>

            <form onSubmit={handleEditCampamento} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
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
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    border: '2px solid #D1C9B4',
                    borderRadius: '6px',
                    outline: 'none',
                    fontFamily: 'Oswald, sans-serif',
                    backgroundColor: 'white'
                  }}
                  disabled={saving}
                />
              </div>

              <div>
                <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  Tipo *
                </label>
                <select
                  value={editFormData.tipo}
                  onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
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
                  disabled={saving}
                >
                  {tiposCampamento.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  Rama Principal
                </label>
                <select
                  value={editFormData.rama_principal}
                  onChange={(e) => setEditFormData({ ...editFormData, rama_principal: e.target.value })}
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
                  disabled={saving}
                >
                  {ramas.map(rama => (
                    <option key={rama} value={rama}>{rama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                  Estado
                </label>
                <select
                  value={editFormData.estado}
                  onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
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
                  disabled={saving}
                >
                  {estados.map(estado => (
                    <option key={estado} value={estado}>{estado.toUpperCase()}</option>
                  ))}
                </select>
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
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    border: '2px solid #D1C9B4',
                    borderRadius: '6px',
                    outline: 'none',
                    fontFamily: 'Oswald, sans-serif',
                    backgroundColor: 'white'
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
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    border: '2px solid #D1C9B4',
                    borderRadius: '6px',
                    outline: 'none',
                    fontFamily: 'Oswald, sans-serif',
                    backgroundColor: 'white',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                  disabled={saving}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginTop: '8px', borderTop: '2px solid #E8DEC4', paddingTop: '16px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditandoCampamentoId(null)
                    setMessage({ text: '', type: '' })
                  }}
                  style={{
                    padding: '8px 20px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    backgroundColor: '#E8DEC4',
                    color: '#24352A',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    opacity: saving ? 0.5 : 1,
                    flex: 1
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    backgroundColor: '#24352A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    opacity: saving ? 0.5 : 1,
                    flex: 1
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR ASISTENTES */}
      {selectedCampamento && (
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
        }} onClick={() => {
          if (!saving) {
            setSelectedCampamento(null)
            setMessage({ text: '', type: '' })
          }
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '600px',
            width: '100%',
            border: '2px solid #D1C9B4',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '2px solid #E8DEC4',
              paddingBottom: '12px',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontWeight: '700',
                  fontSize: 'clamp(14px, 3vw, 18px)',
                  color: '#24352A',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0
                }}>
                  🏕️ {selectedCampamento.nombre}
                </h2>
                <p style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: 'clamp(10px, 2vw, 12px)',
                  color: '#7A7364',
                  margin: '2px 0 0 0'
                }}>
                  {formatFecha(selectedCampamento.fecha_inicio)}
                  {selectedCampamento.fecha_fin && ` - ${formatFecha(selectedCampamento.fecha_fin)}`}
                </p>
              </div>
              {!saving && (
                <button
                  onClick={() => {
                    setSelectedCampamento(null)
                    setMessage({ text: '', type: '' })
                  }}
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
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
              flexWrap: 'wrap',
              flexShrink: 0
            }}>
              <input
                type="text"
                placeholder="🔍 Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: '6px 12px',
                  fontSize: 'clamp(11px, 2vw, 13px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
              />
              <select
                value={filterRama}
                onChange={(e) => setFilterRama(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: 'clamp(11px, 2vw, 13px)',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {ramas.map(rama => (
                  <option key={rama} value={rama}>{rama}</option>
                ))}
              </select>
              <button
                onClick={seleccionarTodos}
                style={{
                  padding: '4px 10px',
                  fontSize: 'clamp(9px, 1.8vw, 11px)',
                  backgroundColor: '#5C7A5E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                ✅ Todos
              </button>
              <button
                onClick={deseleccionarTodos}
                style={{
                  padding: '4px 10px',
                  fontSize: 'clamp(9px, 1.8vw, 11px)',
                  backgroundColor: '#E8DEC4',
                  color: '#24352A',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                ❌ Ninguno
              </button>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              border: '1px solid #E8DEC4',
              borderRadius: '8px',
              padding: '4px'
            }}>
              {(asistenciasPorCampamento[selectedCampamento.id] || [])
                .filter(a => {
                  if (filterRama !== 'Todas' && a.rama !== filterRama) return false
                  if (searchTerm.trim()) {
                    const term = searchTerm.toLowerCase()
                    return a.nombre_completo.toLowerCase().includes(term)
                  }
                  return true
                })
                .sort((a, b) => {
                  if (a.rama !== b.rama) return a.rama.localeCompare(b.rama)
                  return a.nombre_completo.localeCompare(b.nombre_completo)
                })
                .map((item) => (
                  <div
                    key={item.beneficiario_id}
                    onClick={() => toggleSeleccion(item.beneficiario_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: item.seleccionado ? '#F3ECD8' : 'transparent',
                      borderBottom: '1px solid #F3ECD8',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '2px solid #D1C9B4',
                      backgroundColor: item.seleccionado ? '#24352A' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                        fontWeight: item.seleccionado ? '600' : '400',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
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
                ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              borderTop: '2px solid #E8DEC4',
              paddingTop: '16px',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <span style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: 'clamp(10px, 2vw, 13px)',
                color: '#7A7364'
              }}>
                {(asistenciasPorCampamento[selectedCampamento.id] || []).filter(a => a.seleccionado).length} seleccionados
              </span>
              <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setSelectedCampamento(null)
                    setMessage({ text: '', type: '' })
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    backgroundColor: '#E8DEC4',
                    color: '#24352A',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    opacity: saving ? 0.5 : 1
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarAsistencias}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    backgroundColor: '#24352A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    opacity: saving ? 0.5 : 1
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}