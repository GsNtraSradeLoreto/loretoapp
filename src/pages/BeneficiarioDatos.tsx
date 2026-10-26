import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSwipe } from '../hooks/useSwipe'
import { ordenarListaBeneficiarios } from '../utils/ordenBeneficiarios'

// ============================================
// TIPOS
// ============================================
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
  hizo_tada: boolean
  foto_url: string | null
}

interface DatosPersonales {
  id?: string
  beneficiario_id?: string
  email_contacto: string
  dni: string
  sexo: string
  religion: string
  religion_otro: string
  nacionalidad: string
  provincia: string
  localidad: string
  codigo_postal: string
  direccion_calle: string
  direccion_numero: string
  direccion_piso_dpto: string
  telefono_emergencia: string
  telefono_emergencia_pertenece_a: string
  celular: string
  obra_social: string
  obra_social_numero: string
  colegio: string
  estudios_cursados: string
  alergias: string
  dieta_especial: string
  madre_apellido_nombre: string
  madre_dni: string
  madre_nacionalidad: string
  madre_fecha_nacimiento: string
  madre_domicilio: string
  madre_localidad: string
  madre_codigo_postal: string
  madre_ocupacion: string
  madre_info_extra: string
  padre_apellido_nombre: string
  padre_dni: string
  padre_nacionalidad: string
  padre_fecha_nacimiento: string
  padre_domicilio: string
  padre_localidad: string
  padre_codigo_postal: string
  padre_ocupacion: string
  padre_info_extra: string
  adulto_a_cargo: string
  info_importancia_menor: string
}

// ============================================
// CONSTANTES
// ============================================
const COL = {
  fondo: '#F5F1E8',
  verdeScout: '#24352A',
  terracota: '#BF4E30',
  verdeClaro: '#5C7A5E',
  dorado: '#C48A2A',
  textoPrincipal: '#24352A',
  textoSecundario: '#7A7364',
  bordeSuave: '#E8DEC4'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  border: `2px solid ${COL.bordeSuave}`,
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  boxSizing: 'border-box',
  color: COL.textoPrincipal
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: COL.textoSecundario,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
  fontFamily: 'Oswald, sans-serif'
}

const valorStyle: React.CSSProperties = {
  fontSize: 'clamp(13px, 3vw, 15px)',
  color: COL.textoPrincipal,
  fontFamily: 'Oswald, sans-serif',
  margin: 0,
  wordBreak: 'break-word'
}

// ============================================
// COMPONENTE: Sección (card)
// ============================================
const Seccion = ({
  icono,
  titulo,
  children,
  color = COL.verdeScout
}: {
  icono?: string
  titulo: string
  children: React.ReactNode
  color?: string
}) => (
  <div style={{
    backgroundColor: '#FFFFFF',
    border: `2px solid ${COL.bordeSuave}`,
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
    fontFamily: 'Oswald, sans-serif'
  }}>
    <div style={{
      fontSize: 'clamp(14px, 3.5vw, 17px)',
      fontWeight: '700',
      color: color,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      paddingBottom: '10px',
      marginBottom: '14px',
      borderBottom: `2px dashed ${COL.bordeSuave}`
    }}>
      {icono && `${icono} `}{titulo}
    </div>
    {children}
  </div>
)

// ============================================
// COMPONENTE: Campo (label + valor o input)
// ============================================
const Campo = ({
  label,
  valor,
  editando,
  onChange,
  tipo = 'text',
  spanFull = false,
  textarea = false,
  opciones = null
}: {
  label: string
  valor: string
  editando: boolean
  onChange: (v: string) => void
  tipo?: string
  spanFull?: boolean
  textarea?: boolean
  opciones?: { value: string; label: string }[] | null
}) => {
  return (
    <div style={spanFull ? { gridColumn: '1 / -1' } : {}}>
      <label style={labelStyle}>{label}</label>
      {editando ? (
        opciones ? (
          <select
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleccionar...</option>
            {opciones.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        ) : textarea ? (
          <textarea
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        ) : (
          <input
            type={tipo}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
        )
      ) : (
        <p style={valorStyle}>
          {valor && valor.trim() !== '' ? valor : <span style={{ color: COL.textoSecundario, fontStyle: 'italic' }}>-</span>}
        </p>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function BeneficiarioDatos() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSuperAdmin, isJefatura, getRolData, puedeHacer } = useAuth()

  const [beneficiario, setBeneficiario] = useState<Beneficiario | null>(null)
  const [datos, setDatos] = useState<DatosPersonales | null>(null)
  const [form, setForm] = useState<DatosPersonales | null>(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  // Swipe
  const [todosLosIds, setTodosLosIds] = useState<string[]>([])
  const [posicionActual, setPosicionActual] = useState(-1)
  const [dragOffset, setDragOffset] = useState(0)

  const rolData = getRolData()
  const esDirigente = rolData.tipo === 'jefe' || rolData.tipo === 'subjefe' || rolData.tipo === 'ayudante'
  const ramaAsignada = rolData.rama

  // ✅ Permiso dinámico para editar la ficha completa
  const puedeEditar = puedeHacer('editar_ficha_completa')

  // ============================================
  // EFECTOS
  // ============================================
  useEffect(() => {
    if (id) {
      cargarListaIds()
    }
  }, [])

  useEffect(() => {
    if (id && todosLosIds.length > 0) {
      const idx = todosLosIds.indexOf(id)
      setPosicionActual(idx)
    }
  }, [id, todosLosIds])

  useEffect(() => {
    if (id) {
      setEditando(false)
      setMessage({ text: '', type: '' })
      loadData()
    }
  }, [id])

  // ============================================
  // CARGAR LISTA DE IDs (para swipe)
  // ============================================
  const cargarListaIds = async () => {
    try {
      let query = supabase
        .from('beneficiarios')
        .select('id, nombre, apellido, rama, estado')

      if (!(isSuperAdmin || isJefatura)) {
        query = query.eq('estado', 'activo')
      }

      if (esDirigente && ramaAsignada) {
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
  // CARGAR DATOS
  // ============================================
  const loadData = async () => {
    try {
      setLoading(true)

      const [benRes, datosRes] = await Promise.all([
        supabase.from('beneficiarios').select('*').eq('id', id).single(),
        supabase.from('datos_personales_beneficiario').select('*').eq('beneficiario_id', id).maybeSingle()
      ])

      if (benRes.error) throw benRes.error

      setBeneficiario(benRes.data)

      // Normalizar datos personales (si no existen, crear objeto vacío)
      const datosNormalizados: DatosPersonales = {
        id: datosRes.data?.id,
        beneficiario_id: id,
        email_contacto: datosRes.data?.email_contacto || '',
        dni: datosRes.data?.dni || '',
        sexo: datosRes.data?.sexo || '',
        religion: datosRes.data?.religion || '',
        religion_otro: datosRes.data?.religion_otro || '',
        nacionalidad: datosRes.data?.nacionalidad || '',
        provincia: datosRes.data?.provincia || '',
        localidad: datosRes.data?.localidad || '',
        codigo_postal: datosRes.data?.codigo_postal || '',
        direccion_calle: datosRes.data?.direccion_calle || '',
        direccion_numero: datosRes.data?.direccion_numero || '',
        direccion_piso_dpto: datosRes.data?.direccion_piso_dpto || '',
        telefono_emergencia: datosRes.data?.telefono_emergencia || '',
        telefono_emergencia_pertenece_a: datosRes.data?.telefono_emergencia_pertenece_a || '',
        celular: datosRes.data?.celular || '',
        obra_social: datosRes.data?.obra_social || '',
        obra_social_numero: datosRes.data?.obra_social_numero || '',
        colegio: datosRes.data?.colegio || '',
        estudios_cursados: datosRes.data?.estudios_cursados || '',
        alergias: datosRes.data?.alergias || '',
        dieta_especial: datosRes.data?.dieta_especial || '',
        madre_apellido_nombre: datosRes.data?.madre_apellido_nombre || '',
        madre_dni: datosRes.data?.madre_dni || '',
        madre_nacionalidad: datosRes.data?.madre_nacionalidad || '',
        madre_fecha_nacimiento: datosRes.data?.madre_fecha_nacimiento || '',
        madre_domicilio: datosRes.data?.madre_domicilio || '',
        madre_localidad: datosRes.data?.madre_localidad || '',
        madre_codigo_postal: datosRes.data?.madre_codigo_postal || '',
        madre_ocupacion: datosRes.data?.madre_ocupacion || '',
        madre_info_extra: datosRes.data?.madre_info_extra || '',
        padre_apellido_nombre: datosRes.data?.padre_apellido_nombre || '',
        padre_dni: datosRes.data?.padre_dni || '',
        padre_nacionalidad: datosRes.data?.padre_nacionalidad || '',
        padre_fecha_nacimiento: datosRes.data?.padre_fecha_nacimiento || '',
        padre_domicilio: datosRes.data?.padre_domicilio || '',
        padre_localidad: datosRes.data?.padre_localidad || '',
        padre_codigo_postal: datosRes.data?.padre_codigo_postal || '',
        padre_ocupacion: datosRes.data?.padre_ocupacion || '',
        padre_info_extra: datosRes.data?.padre_info_extra || '',
        adulto_a_cargo: datosRes.data?.adulto_a_cargo || '',
        info_importancia_menor: datosRes.data?.info_importancia_menor || ''
      }

      setDatos(datosNormalizados)
      setForm(datosNormalizados)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // HELPERS
  // ============================================
  const setCampo = (key: keyof DatosPersonales, valor: string) => {
    if (!form) return
    setForm({ ...form, [key]: valor })
  }

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-'
    const partes = fecha.split('-')
    if (partes.length !== 3) return '-'
    return `${partes[2]}/${partes[1]}/${partes[0]}`
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

  const getRamaLabel = (rama: string) => {
    const labels: Record<string, string> = {
      'Manada': '🐺 Manada',
      'Unidad Scout': '⚜️ Unidad Scout',
      'Caminantes': '🏔️ Caminantes',
      'Rovers': '🔥 Rovers',
      'RoverPartida': 'Rovers de Partida'
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

  // ============================================
  // GUARDAR
  // ============================================
  const handleGuardar = async () => {
    if (!form || !beneficiario) return

    setGuardando(true)
    setMessage({ text: '', type: '' })

    try {
      // Limpiar strings vacíos a null
      const datosLimpios: any = { beneficiario_id: beneficiario.id }
      for (const key of Object.keys(form)) {
        if (key === 'id' || key === 'beneficiario_id') continue
        const valor = (form as any)[key]
        datosLimpios[key] = (typeof valor === 'string' && valor.trim() === '') ? null : valor
      }

      if (form.id) {
        // UPDATE
        const { error } = await supabase
          .from('datos_personales_beneficiario')
          .update(datosLimpios)
          .eq('id', form.id)
        if (error) throw error
      } else {
        // INSERT
        const { error } = await supabase
          .from('datos_personales_beneficiario')
          .insert(datosLimpios)
        if (error) throw error
      }

      setMessage({ text: '✅ Datos actualizados correctamente', type: 'success' })
      setEditando(false)

      await loadData()

      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const handleCancelar = () => {
    if (datos) setForm({ ...datos })
    setEditando(false)
    setMessage({ text: '', type: '' })
  }

  // ============================================
  // SWIPE / NAVEGACIÓN
  // ============================================
  const irAlAnterior = () => {
    if (posicionActual > 0) {
      const nuevoId = todosLosIds[posicionActual - 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}/datos`)
    }
  }

  const irAlSiguiente = () => {
    if (posicionActual < todosLosIds.length - 1) {
      const nuevoId = todosLosIds[posicionActual + 1]
      if (nuevoId) navigate(`/beneficiario/${nuevoId}/datos`)
    }
  }

  useSwipe({
    onSwipeLeft: irAlSiguiente,
    onSwipeRight: irAlAnterior,
    threshold: 100,
    onDrag: (dx: number) => setDragOffset(Math.max(-50, Math.min(50, dx))),
    onDragEnd: () => setDragOffset(0)
  })

  // ============================================
  // RENDERS TEMPRANOS
  // ============================================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COL.textoSecundario }}>Cargando...</span>
      </div>
    )
  }

  if (!beneficiario || !form) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COL.terracota }}>Beneficiario no encontrado</span>
      </div>
    )
  }

  const edad = calcularEdad(beneficiario.fecha_nacimiento)
  const fotoUrl = getFotoUrl(beneficiario.foto_url, beneficiario.nombre, beneficiario.apellido)
  const total = todosLosIds.length
  const actual = posicionActual + 1

  const valores = editando ? form : datos!

  // ============================================
  // JSX
  // ============================================
  return (
    <div
      style={{
        transform: `translateX(${dragOffset}px)`,
        transition: dragOffset === 0 ? 'transform 0.3s ease-out' : 'none',
        fontFamily: 'Oswald, sans-serif'
      }}
    >
      {/* Navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button
          onClick={() => navigate(`/beneficiario/${id}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: 'none',
            border: 'none', cursor: 'pointer', color: COL.textoSecundario, fontSize: '14px',
            fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px'
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
              disabled={posicionActual <= 0}
              style={{
                backgroundColor: posicionActual <= 0 ? COL.bordeSuave : COL.verdeScout,
                color: posicionActual <= 0 ? COL.textoSecundario : 'white',
                border: 'none', borderRadius: '6px', padding: '4px 12px',
                cursor: posicionActual <= 0 ? 'default' : 'pointer',
                fontFamily: 'Oswald, sans-serif', fontSize: '18px', lineHeight: 1.4,
                opacity: posicionActual <= 0 ? 0.5 : 1
              }}
            >◀</button>
            <button
              onClick={irAlSiguiente}
              disabled={posicionActual >= total - 1}
              style={{
                backgroundColor: posicionActual >= total - 1 ? COL.bordeSuave : COL.verdeScout,
                color: posicionActual >= total - 1 ? COL.textoSecundario : 'white',
                border: 'none', borderRadius: '6px', padding: '4px 12px',
                cursor: posicionActual >= total - 1 ? 'default' : 'pointer',
                fontFamily: 'Oswald, sans-serif', fontSize: '18px', lineHeight: 1.4,
                opacity: posicionActual >= total - 1 ? 0.5 : 1
              }}
            >▶</button>
          </div>
        </div>
      </div>

      {/* Header con botón Editar */}
      <div style={{
        backgroundColor: COL.verdeScout,
        borderRadius: '16px',
        padding: '20px 16px',
        marginBottom: '16px',
        border: '2px solid #BF4E30',
        boxShadow: '0 0 0 2px #111111',
        position: 'relative'
      }}>
        {puedeEditar && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            gap: '6px',
            zIndex: 2
          }}>
            {editando ? (
              <>
                <button
                  onClick={handleCancelar}
                  disabled={guardando}
                  style={{
                    backgroundColor: COL.bordeSuave,
                    color: COL.verdeScout,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    cursor: guardando ? 'not-allowed' : 'pointer',
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                    opacity: guardando ? 0.5 : 1
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  style={{
                    backgroundColor: COL.verdeClaro,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    cursor: guardando ? 'wait' : 'pointer',
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                    opacity: guardando ? 0.5 : 1
                  }}
                >
                  {guardando ? 'Guardando...' : '💾 Guardar'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditando(true)}
                style={{
                  backgroundColor: '#BF4E30',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ✏️ Editar todos los datos
              </button>
            )}
          </div>
        )}

        {/* Título */}
        <div style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: COL.dorado,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          📇 Ficha completa
        </div>

        {/* Foto */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img
            src={fotoUrl}
            alt={`${beneficiario.apellido}, ${beneficiario.nombre}`}
            style={{
              width: '140px',
              height: '140px',
              objectFit: 'cover',
              borderRadius: '16px',
              boxShadow: '0 0 0 2px #BF4E30, 0 0 0 4px #111111',
              display: 'block',
              margin: '0 auto'
            }}
          />
        </div>

        {/* Nombre */}
        <h1 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '700',
          fontSize: 'clamp(18px, 5vw, 24px)',
          color: '#F3ECD8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 12px 0',
          textAlign: 'center',
          wordBreak: 'break-word'
        }}>
          {beneficiario.apellido}, {beneficiario.nombre}
        </h1>

        {/* Chips */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            backgroundColor: '#BF4E30',
            color: '#FFFFFF',
            borderRadius: '20px',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            fontFamily: 'Oswald, sans-serif',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            {getRamaLabel(beneficiario.rama)}
          </span>

          {edad !== null && (
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              backgroundColor: 'rgba(243, 236, 216, 0.15)',
              border: '1.5px solid #D1C9B4',
              color: '#F3ECD8',
              borderRadius: '20px',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              fontFamily: 'Oswald, sans-serif',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontWeight: '500'
            }}>
              🎂 {edad} años
            </span>
          )}

          {beneficiario.estado === 'inactivo' && (
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              backgroundColor: '#FEE2E2',
              color: '#BF4E30',
              borderRadius: '20px',
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              fontFamily: 'Oswald, sans-serif',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Ex miembro
            </span>
          )}
        </div>
      </div>

      {/* Mensaje */}
      {message.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          border: '2px solid',
          fontFamily: 'Oswald, sans-serif',
          ...(message.type === 'error' ? {
            backgroundColor: '#FEE2E2', color: COL.terracota, borderColor: '#FECACA'
          } : {
            backgroundColor: '#D1FAE5', color: COL.verdeClaro, borderColor: '#A7F3D0'
          })
        }}>
          {message.text}
        </div>
      )}

      {/* ============================================ */}
      {/* DATOS DEL BENEFICIARIO (básicos) */}
      {/* ============================================ */}
      <Seccion icono="📋" titulo="Datos del beneficiario">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Fecha de nacimiento</label>
            <p style={valorStyle}>{formatFecha(beneficiario.fecha_nacimiento)}</p>
          </div>
          <div>
            <label style={labelStyle}>Fecha de ingreso al grupo</label>
            <p style={valorStyle}>{formatFecha(beneficiario.fecha_ingreso_grupo)}</p>
          </div>
          <div>
            <label style={labelStyle}>Fecha de ingreso a la rama</label>
            <p style={valorStyle}>{formatFecha(beneficiario.fecha_ingreso_rama)}</p>
          </div>
          <div>
            <label style={labelStyle}>Tiene hermanos en el grupo</label>
            <p style={valorStyle}>{beneficiario.tiene_hermanos ? '✅ Sí' : '❌ No'}</p>
          </div>
          <div>
            <label style={labelStyle}>Tiene uniforme</label>
            <p style={valorStyle}>
              {beneficiario.tiene_uniforme ? '✅ Sí' : '❌ No'}
              {beneficiario.fecha_entrega_uniforme && ` · ${formatFecha(beneficiario.fecha_entrega_uniforme)}`}
            </p>
          </div>
          {(beneficiario.rama === 'Caminantes' || beneficiario.rama === 'Rovers') && (
            <div>
              <label style={labelStyle}>Realizó el TADA</label>
              <p style={valorStyle}>{beneficiario.hizo_tada ? '✅ Sí' : '❌ No'}</p>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Observaciones</label>
            <p style={valorStyle}>
              {beneficiario.observaciones && beneficiario.observaciones.trim() !== ''
                ? beneficiario.observaciones
                : <span style={{ color: COL.textoSecundario, fontStyle: 'italic' }}>-</span>}
            </p>
          </div>
        </div>
      </Seccion>

      {/* ============================================ */}
      {/* DATOS PERSONALES */}
      {/* ============================================ */}
      <Seccion icono="👤" titulo="Datos personales">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <Campo label="Email de contacto" valor={valores.email_contacto} editando={editando} onChange={v => setCampo('email_contacto', v)} tipo="email" />
          <Campo label="N° de DNI" valor={valores.dni} editando={editando} onChange={v => setCampo('dni', v)} />
          <Campo
            label="Sexo"
            valor={valores.sexo}
            editando={editando}
            onChange={v => setCampo('sexo', v)}
            opciones={[
              { value: 'Masculino', label: 'Masculino' },
              { value: 'Femenino', label: 'Femenino' },
              { value: 'X', label: 'X' }
            ]}
          />
          <Campo label="Nacionalidad" valor={valores.nacionalidad} editando={editando} onChange={v => setCampo('nacionalidad', v)} />
          <Campo label="Religión" valor={valores.religion} editando={editando} onChange={v => setCampo('religion', v)} />
          {valores.religion === 'Otros' && (
            <Campo label="Especificar religión" valor={valores.religion_otro} editando={editando} onChange={v => setCampo('religion_otro', v)} />
          )}
          <Campo label="Provincia" valor={valores.provincia} editando={editando} onChange={v => setCampo('provincia', v)} />
          <Campo label="Localidad" valor={valores.localidad} editando={editando} onChange={v => setCampo('localidad', v)} />
          <Campo label="Código Postal" valor={valores.codigo_postal} editando={editando} onChange={v => setCampo('codigo_postal', v)} />
          <Campo label="Dirección - Calle" valor={valores.direccion_calle} editando={editando} onChange={v => setCampo('direccion_calle', v)} spanFull />
          <Campo label="Número" valor={valores.direccion_numero} editando={editando} onChange={v => setCampo('direccion_numero', v)} />
          <Campo label="Piso/Dpto" valor={valores.direccion_piso_dpto} editando={editando} onChange={v => setCampo('direccion_piso_dpto', v)} />
          <Campo label="Teléfono de emergencia" valor={valores.telefono_emergencia} editando={editando} onChange={v => setCampo('telefono_emergencia', v)} />
          <Campo label="Pertenece a" valor={valores.telefono_emergencia_pertenece_a} editando={editando} onChange={v => setCampo('telefono_emergencia_pertenece_a', v)} />
          <Campo label="Celular" valor={valores.celular} editando={editando} onChange={v => setCampo('celular', v)} />
          <Campo label="Obra social" valor={valores.obra_social} editando={editando} onChange={v => setCampo('obra_social', v)} />
          <Campo label="N° de afiliado" valor={valores.obra_social_numero} editando={editando} onChange={v => setCampo('obra_social_numero', v)} />
          <Campo label="Colegio" valor={valores.colegio} editando={editando} onChange={v => setCampo('colegio', v)} />
          <Campo label="Estudios cursados" valor={valores.estudios_cursados} editando={editando} onChange={v => setCampo('estudios_cursados', v)} />
          <Campo label="Alergias" valor={valores.alergias} editando={editando} onChange={v => setCampo('alergias', v)} textarea spanFull />
          <Campo label="Dieta especial" valor={valores.dieta_especial} editando={editando} onChange={v => setCampo('dieta_especial', v)} textarea spanFull />
        </div>
      </Seccion>

      {/* ============================================ */}
      {/* DATOS DE LA MADRE */}
      {/* ============================================ */}
      <Seccion icono="👩" titulo="Datos de la madre">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <Campo label="Apellido y Nombre" valor={valores.madre_apellido_nombre} editando={editando} onChange={v => setCampo('madre_apellido_nombre', v)} spanFull />
          <Campo label="N° de DNI" valor={valores.madre_dni} editando={editando} onChange={v => setCampo('madre_dni', v)} />
          <Campo label="Nacionalidad" valor={valores.madre_nacionalidad} editando={editando} onChange={v => setCampo('madre_nacionalidad', v)} />
          <Campo label="Fecha de nacimiento" valor={valores.madre_fecha_nacimiento} editando={editando} onChange={v => setCampo('madre_fecha_nacimiento', v)} tipo="date" />
          <Campo label="Ocupación" valor={valores.madre_ocupacion} editando={editando} onChange={v => setCampo('madre_ocupacion', v)} />
          <Campo label="Domicilio" valor={valores.madre_domicilio} editando={editando} onChange={v => setCampo('madre_domicilio', v)} spanFull />
          <Campo label="Localidad" valor={valores.madre_localidad} editando={editando} onChange={v => setCampo('madre_localidad', v)} />
          <Campo label="Código Postal" valor={valores.madre_codigo_postal} editando={editando} onChange={v => setCampo('madre_codigo_postal', v)} />
          <Campo label="Otra información" valor={valores.madre_info_extra} editando={editando} onChange={v => setCampo('madre_info_extra', v)} textarea spanFull />
        </div>
      </Seccion>

      {/* ============================================ */}
      {/* DATOS DEL PADRE */}
      {/* ============================================ */}
      <Seccion icono="👨" titulo="Datos del padre">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <Campo label="Apellido y Nombre" valor={valores.padre_apellido_nombre} editando={editando} onChange={v => setCampo('padre_apellido_nombre', v)} spanFull />
          <Campo label="N° de DNI" valor={valores.padre_dni} editando={editando} onChange={v => setCampo('padre_dni', v)} />
          <Campo label="Nacionalidad" valor={valores.padre_nacionalidad} editando={editando} onChange={v => setCampo('padre_nacionalidad', v)} />
          <Campo label="Fecha de nacimiento" valor={valores.padre_fecha_nacimiento} editando={editando} onChange={v => setCampo('padre_fecha_nacimiento', v)} tipo="date" />
          <Campo label="Ocupación" valor={valores.padre_ocupacion} editando={editando} onChange={v => setCampo('padre_ocupacion', v)} />
          <Campo label="Domicilio" valor={valores.padre_domicilio} editando={editando} onChange={v => setCampo('padre_domicilio', v)} spanFull />
          <Campo label="Localidad" valor={valores.padre_localidad} editando={editando} onChange={v => setCampo('padre_localidad', v)} />
          <Campo label="Código Postal" valor={valores.padre_codigo_postal} editando={editando} onChange={v => setCampo('padre_codigo_postal', v)} />
          <Campo label="Otra información" valor={valores.padre_info_extra} editando={editando} onChange={v => setCampo('padre_info_extra', v)} textarea spanFull />
        </div>
      </Seccion>

      {/* ============================================ */}
      {/* OTRA INFORMACIÓN */}
      {/* ============================================ */}
      <Seccion icono="📝" titulo="Otra información">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <Campo
            label="Adulto a cargo del menor"
            valor={valores.adulto_a_cargo}
            editando={editando}
            onChange={v => setCampo('adulto_a_cargo', v)}
            opciones={[
              { value: 'Madre y padre', label: 'Madre y padre' },
              { value: 'Madre', label: 'Madre' },
              { value: 'Padre', label: 'Padre' },
              { value: 'Otros', label: 'Otros' }
            ]}
            spanFull
          />
          <Campo
            label="Información de importancia del menor"
            valor={valores.info_importancia_menor}
            editando={editando}
            onChange={v => setCampo('info_importancia_menor', v)}
            textarea
            spanFull
          />
        </div>
      </Seccion>

      {/* Botón Guardar grande al final (por si el header quedó lejos) */}
      {editando && (
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          marginTop: '8px',
          marginBottom: '24px'
        }}>
          <button
            onClick={handleCancelar}
            disabled={guardando}
            style={{
              backgroundColor: COL.bordeSuave,
              color: COL.verdeScout,
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              cursor: guardando ? 'not-allowed' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              opacity: guardando ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            style={{
              backgroundColor: COL.verdeScout,
              color: 'white',
              padding: '12px 32px',
              borderRadius: '10px',
              border: 'none',
              cursor: guardando ? 'wait' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              opacity: guardando ? 0.5 : 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {guardando ? '⏳ Guardando...' : '✅ Guardar todos los datos'}
          </button>
        </div>
      )}
    </div>
  )
}