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
  fecha_nacimiento: string
  tiene_hermanos: boolean
  foto_url: string | null
}

interface Stats {
  total: number
  manada: number
  unidad: number
  caminantes: number
  rovers: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { 
    profile, 
    isSuperAdmin, 
    isJefatura, 
    isAdministrador, 
    isTesorero,
    getRolData
  } = useAuth()
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [filtered, setFiltered] = useState<Beneficiario[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRama, setFilterRama] = useState('Todas')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos')

  const rolData = getRolData()
  const esJefe = rolData.tipo === 'jefe'
  const esAyudante = rolData.tipo === 'ayudante'
  const esDirigente = esJefe || esAyudante
  const ramaAsignada = rolData.rama

  const verTodas = isSuperAdmin || isJefatura || isAdministrador || isTesorero
  const esSuperAdmin = isSuperAdmin

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
        let query = supabase
        .from('beneficiarios')
        .select('*')
        .order('estado', { ascending: true })   // 'activo' va antes que 'inactivo' alfabéticamente
        .order('apellido', { ascending: true })

      if (!esSuperAdmin) {
        query = query.eq('estado', 'activo')
      }

      if (esDirigente && ramaAsignada) {
        query = query.eq('rama', ramaAsignada)
        setFilterRama(ramaAsignada)
      }

      const { data: beneficiariosData, error: beneficiariosError } = await query
      if (beneficiariosError) throw beneficiariosError

      setBeneficiarios(beneficiariosData || [])
      setFiltered(beneficiariosData || [])

      let activos = beneficiariosData || []
      if (!esSuperAdmin) {
        activos = beneficiariosData?.filter(b => b.estado === 'activo') || []
      }

      setStats({
        total: activos.length,
        manada: activos.filter(b => b.rama === 'Manada').length,
        unidad: activos.filter(b => b.rama === 'Unidad Scout').length,
        caminantes: activos.filter(b => b.rama === 'Caminantes').length,
        rovers: activos.filter(b => b.rama === 'Rovers').length
      })

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

    useEffect(() => {
    let result = beneficiarios

    if (filterRama !== 'Todas') {
      result = result.filter(b => b.rama === filterRama)
    }

    // ✅ Filtro por estado (solo para Jefatura/Super Admin)
    if ((isSuperAdmin || isJefatura) && filterEstado !== 'todos') {
      if (filterEstado === 'activos') {
        result = result.filter(b => b.estado === 'activo')
      } else if (filterEstado === 'inactivos') {
        result = result.filter(b => b.estado === 'inactivo')
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(b =>
        b.nombre.toLowerCase().includes(term) ||
        b.apellido.toLowerCase().includes(term)
      )
    }

    setFiltered(result)
  }, [searchTerm, filterRama, filterEstado, beneficiarios, isSuperAdmin, isJefatura])

  const handleFilterByRama = (rama: string) => {
    setFilterRama(rama)
    setSearchTerm('')
  }

    const handleLimpiarFiltros = () => {
    if (esDirigente && ramaAsignada) {
      setFilterRama(ramaAsignada)
    } else {
      setFilterRama('Todas')
    }
    setFilterEstado('todos')
    setSearchTerm('')
  }

  const getRamasMostrar = () => {
    if (verTodas) {
      return ['Todas', 'Manada', 'Unidad Scout', 'Caminantes', 'Rovers']
    } else if (esDirigente && ramaAsignada) {
      return [ramaAsignada]
    }
    return ['Todas']
  }

  const ramasMostrar = getRamasMostrar()
  const nombre = profile?.nombre || 'Usuario'

  const getFotoUrl = (fotoUrl: string | null, nombre: string, apellido: string) => {
    if (fotoUrl) {
      return fotoUrl
    }
    const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <rect width="60" height="60" rx="8" fill="#24352A"/>
        <text x="30" y="38" font-family="Oswald, sans-serif" font-size="22" fill="white" text-anchor="middle">${iniciales || 'U'}</text>
      </svg>
    `)}`
  }

    const labelEstado = (estado: string) => {
    if (estado === 'activo') return 'Activo'
    if (estado === 'inactivo') return 'Ex miembro'
    return estado
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
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '700',
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          🏠 Inicio
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
          ¡Hola {nombre}!
        </p>
      </div>

      {/* Tarjetas de estadísticas - RESPONSIVE */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(auto-fit, minmax(60px, 1fr))`, 
        gap: '6px', 
        marginBottom: '24px',
        width: '100%'
      }}>
        {ramasMostrar.map((rama) => {
          const esTodas = rama === 'Todas'
          const isActive = esTodas ? filterRama === 'Todas' : filterRama === rama
          const getStatsValue = () => {
            if (esTodas) return stats?.total || 0
            if (rama === 'Manada') return stats?.manada || 0
            if (rama === 'Unidad Scout') return stats?.unidad || 0
            if (rama === 'Caminantes') return stats?.caminantes || 0
            if (rama === 'Rovers') return stats?.rovers || 0
            return 0
          }
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
                padding: '6px 4px', 
                border: '2px solid #D1C9B4',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '50px'
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
                fontSize: 'clamp(14px, 3vw, 20px)', 
                color: isActive ? 'white' : '#24352A', 
                margin: 0,
                lineHeight: 1
              }}>
                {getStatsValue()}
              </p>
              <p style={{ 
                fontFamily: 'Oswald, sans-serif', 
                fontWeight: '500', 
                fontSize: 'clamp(7px, 1.5vw, 9px)', 
                color: isActive ? '#D1C9B4' : '#7A7364', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px', 
                margin: '2px 0 0 0',
                lineHeight: 1
              }}>
                {getLabel()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Lista de Beneficiarios */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <h2 style={{
            fontFamily: 'Oswald, sans-serif',
            fontWeight: '600',
            fontSize: 'clamp(13px, 3vw, 16px)',
            color: '#24352A',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: 0
          }}>
                      📋 Beneficiarios
          </h2>
          <span style={{
            fontFamily: 'Oswald, sans-serif',
            fontWeight: '400',
            fontSize: 'clamp(10px, 2vw, 12px)',
            color: '#7A7364'
          }}>
            {filtered.length} registros
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '140px',
              padding: '6px 12px',
              fontSize: 'clamp(11px, 2vw, 13px)',
              border: '2px solid #D1C9B4',
              borderRadius: '6px',
              outline: 'none',
              fontFamily: 'Oswald, sans-serif',
              backgroundColor: 'white'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
          />

                    {verTodas && (
            <select
              value={
                filterEstado !== 'todos'
                  ? `estado:${filterEstado}`
                  : `rama:${filterRama}`
              }
              onChange={(e) => {
                const v = e.target.value
                if (v.startsWith('estado:')) {
                  setFilterEstado(v.replace('estado:', '') as 'todos' | 'activos' | 'inactivos')
                  setFilterRama('Todas')
                } else {
                  setFilterRama(v.replace('rama:', ''))
                  setFilterEstado('todos')
                }
              }}
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
              <option value="rama:Todas">Todas las ramas</option>
              <option value="rama:Manada">Manada</option>
              <option value="rama:Unidad Scout">Unidad</option>
              <option value="rama:Caminantes">Caminantes</option>
              <option value="rama:Rovers">Rovers</option>
              {(isSuperAdmin || isJefatura) && (
                <>
                  <option value="estado:activos">✅ Solo activos</option>
                  <option value="estado:inactivos">❌ Solo ex miembros</option>
                </>
              )}
            </select>
          )}

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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#BF4E30'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#BF4E30'
              }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map((beneficiario) => {
            const nombreCompleto = formatearNombreConH(
              beneficiario.nombre,
              beneficiario.apellido,
              beneficiario.tiene_hermanos
            )

            const fotoUrl = getFotoUrl(
              beneficiario.foto_url,
              beneficiario.nombre,
              beneficiario.apellido
            )

            return (
              <div
                key={beneficiario.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '2px solid #D1C9B4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#24352A'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                onClick={() => navigate(`/beneficiario/${beneficiario.id}`)}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  backgroundColor: '#F3ECD8',
                  border: '1px solid #D1C9B4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={fotoUrl}
                    alt={nombreCompleto}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
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
                          font-family: Oswald, sans-serif; font-size: 18px;
                          font-weight: 700;
                        `
                        fallback.textContent = iniciales || 'U'
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: '600',
                    fontSize: 'clamp(12px, 2.5vw, 15px)',
                    color: '#24352A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {nombreCompleto}
                  </div>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: '400',
                    fontSize: 'clamp(9px, 1.8vw, 11px)',
                    color: '#7A7364',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {beneficiario.rama} • {labelEstado(beneficiario.estado)}
                  </div>
                </div>

                <div style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontWeight: '400',
                  fontSize: '12px',
                  color: '#7A7364',
                  flexShrink: 0
                }}>
                  ▶
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            fontFamily: 'Oswald, sans-serif',
            color: '#7A7364',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            No se encontraron beneficiarios
          </div>
        )}
      </div>
    </div>
  )
}