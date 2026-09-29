import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatearNombreConH } from '../utils/formatNombre'

// ============================================
// INTERFACES
// ============================================
interface Persona {
  id: string
  nombre: string
  apellido: string
  rama: string  // 'Manada', 'Unidad Scout', 'Caminantes', 'Rovers', o 'Dirigentes'
  rol: string   // 'beneficiario' o el rol real ('JefeManada', etc.)
  fecha_nacimiento: string
  foto_url: string | null
  tipo: 'beneficiario' | 'usuario'
  tiene_hermanos: boolean
}

interface PersonaConCumple extends Persona {
  proximoCumple: Date
  diasHasta: number
  edadQueCumple: number
  cumpleHoy: boolean
}

type OrdenTipo = 'proximos' | 'alfabetico' | 'rama' | 'edad' | 'mes'

// ============================================
// CONFIG
// ============================================
const ORDEN_RAMAS: Record<string, number> = {
  'Manada': 1,
  'Unidad Scout': 2,
  'Caminantes': 3,
  'Rovers': 4,
  'Dirigentes': 5
}

const COLORES_RAMA: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  'Manada': { bg: '#FFF9E0', text: '#B8860B', border: '#F5C518', emoji: '🐺' },
  'Unidad Scout': { bg: '#E8F5E9', text: '#1B5E20', border: '#2E7D32', emoji: '⚜️' },
  'Caminantes': { bg: '#E1F5FE', text: '#01579B', border: '#03A9F4', emoji: '🏔️' },
  'Rovers': { bg: '#FFEBEE', text: '#B71C1C', border: '#D32F2F', emoji: '🔥' },
  'Dirigentes': { bg: '#FFF8E7', text: '#8B6F00', border: '#C48A2A', emoji: '🎖️' }
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// ============================================
// HELPERS
// ============================================
const getRamaDeRol = (rol: string): string => {
  if (rol.startsWith('Jefe') || rol.startsWith('Ayudante')) return 'Dirigentes'
  return 'Dirigentes' // Jefatura, Tesorero, Admin, etc.
}

const calcularProximoCumple = (fechaNacimiento: string): { fecha: Date; dias: number; edad: number; esHoy: boolean } => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const [yearNac, monthNac, dayNac] = fechaNacimiento.split('-').map(Number)

  // Probar este año
  let proximo = new Date(hoy.getFullYear(), monthNac - 1, dayNac)
  proximo.setHours(0, 0, 0, 0)

  // Si ya pasó, probar el año que viene
  if (proximo < hoy) {
    proximo = new Date(hoy.getFullYear() + 1, monthNac - 1, dayNac)
  }

  const dias = Math.round((proximo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  const edad = proximo.getFullYear() - yearNac
  const esHoy = dias === 0

  return { fecha: proximo, dias, edad, esHoy }
}

const formatearFecha = (fecha: string | null): string => {
  if (!fecha) return '-'
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

const formatearCumple = (fecha: Date): string => {
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

const getIniciales = (nombre: string, apellido: string): string => {
  return (nombre.charAt(0) + apellido.charAt(0)).toUpperCase()
}

// ============================================
// COMPONENTE
// ============================================
export default function Cumpleanos() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [orden, setOrden] = useState<OrdenTipo>('proximos')
  const [filtroRama, setFiltroRama] = useState<string>('Todas')
  const [filtroMes, setFiltroMes] = useState<number | null>(null)

  useEffect(() => {
    loadPersonas()
  }, [])

  const loadPersonas = async () => {
    try {
      setLoading(true)

      // Cargar beneficiarios activos
      const { data: beneficiariosData, error: benefError } = await supabase
        .from('beneficiarios')
        .select('id, nombre, apellido, rama, fecha_nacimiento, foto_url, tiene_hermanos')
        .eq('estado', 'activo')
        .not('fecha_nacimiento', 'is', null)

      if (benefError) throw benefError

      // Cargar usuarios activos con fecha
      const { data: usuariosData, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, rol, fecha_nacimiento')
        .eq('activo', true)
        .not('fecha_nacimiento', 'is', null)

      if (userError) throw userError

      const beneficiarios: Persona[] = (beneficiariosData || []).map(b => ({
        id: b.id,
        nombre: b.nombre,
        apellido: b.apellido,
        rama: b.rama,
        rol: 'beneficiario',
        fecha_nacimiento: b.fecha_nacimiento,
        foto_url: b.foto_url,
        tipo: 'beneficiario',
        tiene_hermanos: b.tiene_hermanos || false
      }))

      const usuarios: Persona[] = (usuariosData || []).map(u => ({
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        rama: getRamaDeRol(u.rol),
        rol: u.rol,
        fecha_nacimiento: u.fecha_nacimiento,
        foto_url: null,
        tipo: 'usuario',
        tiene_hermanos: false
      }))

      setPersonas([...beneficiarios, ...usuarios])
    } catch (error) {
      console.error('Error al cargar personas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular próximo cumple + días + edad
  const personasConCumple: PersonaConCumple[] = useMemo(() => {
    return personas.map(p => {
      const { fecha, dias, edad, esHoy } = calcularProximoCumple(p.fecha_nacimiento)
      return {
        ...p,
        proximoCumple: fecha,
        diasHasta: dias,
        edadQueCumple: edad,
        cumpleHoy: esHoy
      }
    })
  }, [personas])

  // Próximos 5 cumpleaños (siempre ordenados por proximidad, sin filtros)
  const proximos5 = useMemo(() => {
    return [...personasConCumple]
      .sort((a, b) => a.diasHasta - b.diasHasta)
      .slice(0, 5)
  }, [personasConCumple])

  // Lista filtrada y ordenada
  const listaFiltrada = useMemo(() => {
    let lista = [...personasConCumple]

    // Filtro por rama
    if (filtroRama !== 'Todas') {
      lista = lista.filter(p => p.rama === filtroRama)
    }

    // Filtro por mes
    if (filtroMes !== null) {
      lista = lista.filter(p => p.proximoCumple.getMonth() === filtroMes)
    }

    // Orden
    if (orden === 'proximos') {
      lista.sort((a, b) => a.diasHasta - b.diasHasta)
    } else if (orden === 'alfabetico') {
      lista.sort((a, b) => {
        const cmp = a.apellido.localeCompare(b.apellido)
        if (cmp !== 0) return cmp
        return a.nombre.localeCompare(b.nombre)
      })
    } else if (orden === 'rama') {
      lista.sort((a, b) => {
        const oa = ORDEN_RAMAS[a.rama] || 99
        const ob = ORDEN_RAMAS[b.rama] || 99
        if (oa !== ob) return oa - ob
        return a.apellido.localeCompare(b.apellido)
      })
    } else if (orden === 'edad') {
      // Más chicos primero (menor edad que cumple)
      lista.sort((a, b) => a.edadQueCumple - b.edadQueCumple)
    } else if (orden === 'mes') {
      lista.sort((a, b) => {
        const ma = a.proximoCumple.getMonth()
        const mb = b.proximoCumple.getMonth()
        if (ma !== mb) return ma - mb
        return a.proximoCumple.getDate() - b.proximoCumple.getDate()
      })
    }

    return lista
  }, [personasConCumple, orden, filtroRama, filtroMes])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>
          Cargando cumpleaños...
        </span>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontWeight: '700',
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          🎂 Cumpleaños
        </h1>
        <p style={{
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          color: '#7A7364',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: '4px 0 0 0'
        }}>
          {personas.length} personas cargadas
        </p>
      </div>

      {/* Próximos 5 cumpleaños */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '2px solid #E8DEC4',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: 'clamp(14px, 3vw, 17px)',
          fontWeight: '700',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 14px 0',
          paddingBottom: '10px',
          borderBottom: '2px dashed #E8DEC4'
        }}>
          ⭐ Próximos 5 cumpleaños
        </h2>

        {proximos5.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            color: '#7A7364',
            fontSize: '13px'
          }}>
            No hay cumpleaños cargados todavía
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {proximos5.map((p, idx) => (
              <CardCumple key={p.id} persona={p} destacado={idx === 0 || p.cumpleHoy} />
            ))}
          </div>
        )}
      </div>

      {/* Filtros y orden */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '2px solid #E8DEC4',
        padding: '14px',
        marginBottom: '16px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{
            fontSize: '10px',
            color: '#7A7364',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '6px',
            fontWeight: '600'
          }}>
            Ordenar por
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { value: 'proximos', label: '🗓️ Próximos' },
              { value: 'alfabetico', label: '🔤 Alfabético' },
              { value: 'rama', label: '🎖️ Rama' },
              { value: 'edad', label: '👶 Edad' },
              { value: 'mes', label: '📅 Mes' }
            ].map(op => (
              <button
                key={op.value}
                onClick={() => setOrden(op.value as OrdenTipo)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  border: `2px solid ${orden === op.value ? '#24352A' : '#D1C9B4'}`,
                  borderRadius: '16px',
                  backgroundColor: orden === op.value ? '#24352A' : 'white',
                  color: orden === op.value ? 'white' : '#7A7364',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  fontWeight: '600'
                }}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{
            fontSize: '10px',
            color: '#7A7364',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '6px',
            fontWeight: '600'
          }}>
            Filtrar por rama
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['Todas', 'Manada', 'Unidad Scout', 'Caminantes', 'Rovers', 'Dirigentes'].map(r => (
              <button
                key={r}
                onClick={() => setFiltroRama(r)}
                style={{
                  padding: '5px 10px',
                  fontSize: '10px',
                  border: `2px solid ${filtroRama === r ? '#24352A' : '#D1C9B4'}`,
                  borderRadius: '14px',
                  backgroundColor: filtroRama === r ? '#24352A' : 'white',
                  color: filtroRama === r ? 'white' : '#7A7364',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  fontWeight: '600'
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{
            fontSize: '10px',
            color: '#7A7364',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '6px',
            fontWeight: '600'
          }}>
            Filtrar por mes (opcional)
          </label>
          <select
            value={filtroMes === null ? '' : filtroMes}
            onChange={(e) => setFiltroMes(e.target.value === '' ? null : Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '12px',
              border: '2px solid #D1C9B4',
              borderRadius: '6px',
              outline: 'none',
              fontFamily: 'Oswald, sans-serif',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">Todos los meses</option>
            {MESES.map((mes, idx) => (
              <option key={idx} value={idx}>{mes}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista completa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {listaFiltrada.map(p => (
          <CardCumple key={p.id} persona={p} compacto />
        ))}
      </div>

      {listaFiltrada.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          color: '#7A7364',
          fontSize: '13px',
          fontStyle: 'italic',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '2px solid #E8DEC4'
        }}>
          No hay cumpleaños con esos filtros
        </div>
      )}
    </div>
  )
}

// ============================================
// CARD DE CUMPLEAÑOS
// ============================================
function CardCumple({ persona, destacado = false, compacto = false }: { persona: PersonaConCumple; destacado?: boolean; compacto?: boolean }) {
  const colorRama = COLORES_RAMA[persona.rama] || COLORES_RAMA['Dirigentes']
  const nombreCompleto = persona.tipo === 'beneficiario'
    ? formatearNombreConH(persona.nombre, persona.apellido, persona.tiene_hermanos)
    : `${persona.nombre} ${persona.apellido}`

  const bordeIzq = persona.cumpleHoy ? '#BF4E30' : (destacado ? '#C48A2A' : colorRama.border)
  const bgCard = persona.cumpleHoy ? '#FFF0EB' : 'white'

  return (
    <div style={{
      backgroundColor: bgCard,
      borderRadius: '12px',
      padding: compacto ? '10px 12px' : '12px',
      border: `2px solid ${bordeIzq}`,
      borderLeft: `5px solid ${bordeIzq}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontFamily: 'Oswald, sans-serif',
      transition: 'all 0.2s'
    }}>
      {/* Foto o inicial */}
      <div style={{
        width: compacto ? '40px' : '52px',
        height: compacto ? '40px' : '52px',
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        backgroundColor: colorRama.bg,
        border: `2px solid ${colorRama.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        color: colorRama.text,
        fontSize: compacto ? '14px' : '16px'
      }}>
        {persona.foto_url ? (
          <img
            src={persona.foto_url}
            alt={nombreCompleto}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          getIniciales(persona.nombre, persona.apellido)
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: compacto ? '13px' : 'clamp(13px, 3vw, 15px)',
          fontWeight: '700',
          color: '#24352A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {persona.cumpleHoy && '🎉 '}{nombreCompleto}
        </div>

        <div style={{
          fontSize: compacto ? '10px' : '11px',
          color: '#7A7364',
          marginTop: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            display: 'inline-block',
            padding: '1px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: '600',
            backgroundColor: colorRama.bg,
            color: colorRama.text,
            border: `1px solid ${colorRama.border}`
          }}>
            {colorRama.emoji} {persona.rama}
          </span>
          <span>🎂 {formatearCumple(persona.proximoCumple)}</span>
          <span>👤 Cumple {persona.edadQueCumple} años</span>
        </div>
      </div>

      {/* Días restantes */}
      <div style={{
        flexShrink: 0,
        textAlign: 'right',
        paddingLeft: '8px'
      }}>
        {persona.cumpleHoy ? (
          <div style={{
            fontSize: compacto ? '11px' : '12px',
            fontWeight: '700',
            color: '#BF4E30',
            textTransform: 'uppercase'
          }}>
            ¡HOY!
          </div>
        ) : (
          <>
            <div style={{
              fontSize: compacto ? '13px' : '16px',
              fontWeight: '700',
              color: '#24352A',
              lineHeight: 1
            }}>
              {persona.diasHasta}
            </div>
            <div style={{
              fontSize: '8px',
              color: '#7A7364',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {persona.diasHasta === 1 ? 'día' : 'días'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}