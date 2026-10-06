import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// TIPOS
// ============================================
interface Solicitud {
  id: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  motivo_rechazo: string | null
  aprobada_por: string | null
  aprobada_en: string | null
  rama_asignada: string | null
  beneficiario_creado_id: string | null
  email_contacto: string

  menor_apellido: string
  menor_nombre: string
  menor_dni: string
  menor_sexo: string
  menor_fecha_nacimiento: string
  menor_religion: string | null
  menor_religion_otro: string | null
  menor_nacionalidad: string
  menor_provincia: string
  menor_localidad: string
  menor_codigo_postal: string
  menor_direccion_calle: string
  menor_direccion_numero: string | null
  menor_direccion_piso_dpto: string | null
  menor_telefono_emergencia: string
  menor_telefono_emergencia_pertenece_a: string | null
  menor_celular: string | null
  menor_obra_social: string | null
  menor_obra_social_numero: string | null
  menor_colegio: string
  menor_estudios_cursados: string
  menor_alergias_dieta: string | null
  menor_foto_url: string | null

  madre_apellido_nombre: string
  madre_dni: string
  madre_nacionalidad: string
  madre_fecha_nacimiento: string
  madre_domicilio: string
  madre_localidad: string
  madre_codigo_postal: string
  madre_ocupacion: string
  madre_info_extra: string | null

  padre_apellido_nombre: string
  padre_dni: string
  padre_nacionalidad: string
  padre_fecha_nacimiento: string
  padre_domicilio: string
  padre_localidad: string
  padre_codigo_postal: string
  padre_ocupacion: string
  padre_info_extra: string | null

  adulto_a_cargo: string
  info_importancia_menor: string | null

  creado_en: string
}

type FiltroEstado = 'pendiente' | 'aprobada' | 'rechazada'
type Rama = 'Manada' | 'Unidad Scout' | 'Caminantes' | 'Rovers'

const RAMAS: Rama[] = ['Manada', 'Unidad Scout', 'Caminantes', 'Rovers']

// ============================================
// COLORES
// ============================================
const COL = {
  verdeScout: '#24352A',
  terracota: '#BF4E30',
  verdeClaro: '#5C7A5E',
  dorado: '#C48A2A',
  textoPrincipal: '#24352A',
  textoSecundario: '#7A7364',
  bordeSuave: '#E8DEC4',
  fondo: '#F5F1E8',
  naranja: '#E67E22',
  rojo: '#B71C1C',
  verde: '#2E7D32',
  celeste: '#4FA8D8'
}

// ============================================
// HELPERS
// ============================================
const formatFecha = (fecha: string | null | undefined) => {
  if (!fecha) return '-'
  const partes = fecha.split('-')
  if (partes.length !== 3) return fecha
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const calcularEdad = (fechaNac: string): number => {
  if (!fechaNac) return 0
  const hoy = new Date()
  const nac = new Date(fechaNac)
  nac.setDate(nac.getDate() + 1)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

const sugerirRama = (edad: number): Rama => {
  if (edad <= 10) return 'Manada'
  if (edad <= 14) return 'Unidad Scout'
  if (edad <= 17) return 'Caminantes'
  return 'Rovers'
}

const getFotoUrl = (fotoUrl: string | null, nombre: string, apellido: string) => {
  if (fotoUrl) return fotoUrl
  const iniciales = `${apellido.charAt(0)}${nombre.charAt(0)}`.toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="16" fill="#24352A"/>
      <text x="48" y="60" font-family="Oswald, sans-serif" font-size="36" fill="#F3ECD8" text-anchor="middle" font-weight="700">${iniciales || 'U'}</text>
    </svg>
  `)}`
}

// Color de rama (mismo esquema que planillas)
const getColorRama = (rama: string): { color: string; bg: string } => {
  const map: Record<string, { color: string; bg: string }> = {
    'Manada': { color: '#B8860B', bg: '#FFF8E7' },
    'Unidad Scout': { color: '#1B5E20', bg: '#F0F7F0' },
    'Caminantes': { color: '#2C7BA8', bg: '#E8F4FB' },
    'Rovers': { color: '#7F1010', bg: '#FEE8E8' }
  }
  return map[rama] || { color: COL.verdeScout, bg: COL.fondo }
}

// ============================================
// COMPONENTE
// ============================================
export default function Solicitudes() {
  const { profile, isSuperAdmin, isJefatura, isAdministrador, getRolData } = useAuth()
  const navigate = useNavigate()

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FiltroEstado>('pendiente')
  const [expandida, setExpandida] = useState<string | null>(null)

  const [formAprobar, setFormAprobar] = useState<Record<string, {
    apellido: string
    nombre: string
    rama: Rama
  }>>({})

  const [formRechazar, setFormRechazar] = useState<Record<string, {
    mostrar: boolean
    motivo: string
  }>>({})

  const [guardando, setGuardando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const rolData = getRolData()
  const esJefeRama = rolData.tipo === 'jefe'
  const puedeVer = isSuperAdmin || isJefatura || isAdministrador || esJefeRama
  const puedeAprobar = isSuperAdmin || isJefatura

  const cargarSolicitudes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('solicitudes_inscripcion')
        .select('*')
        .order('creado_en', { ascending: false })

      if (error) throw error
      setSolicitudes((data || []) as Solicitud[])
    } catch (err: any) {
      console.error('Error al cargar solicitudes:', err)
      setMensaje({ tipo: 'error', texto: `Error: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarSolicitudes()
  }, [])

  const toggleExpandida = (id: string, solicitud: Solicitud) => {
    if (expandida === id) {
      setExpandida(null)
      return
    }
    setExpandida(id)

    if (!formAprobar[id]) {
      const edad = calcularEdad(solicitud.menor_fecha_nacimiento)
      setFormAprobar(prev => ({
        ...prev,
        [id]: {
          apellido: solicitud.menor_apellido,
          nombre: solicitud.menor_nombre,
          rama: sugerirRama(edad)
        }
      }))
    }
  }

  const aprobarSolicitud = async (solicitud: Solicitud) => {
    const form = formAprobar[solicitud.id]
    if (!form) return

    if (!form.apellido.trim() || !form.nombre.trim()) {
      setMensaje({ tipo: 'error', texto: '⚠️ Completá apellido y nombre' })
      return
    }

    setGuardando(solicitud.id)
    setMensaje(null)

    try {
      const hoy = new Date().toISOString().split('T')[0]

      const { data: nuevoBenef, error: errBenef } = await supabase
        .from('beneficiarios')
        .insert({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          rama: form.rama,
          fecha_nacimiento: solicitud.menor_fecha_nacimiento,
          fecha_ingreso_grupo: hoy,
          fecha_ingreso_rama: hoy,
          estado: 'activo',
          tiene_uniforme: false,
          tiene_hermanos: false,
          hizo_tada: false,
          observaciones: solicitud.info_importancia_menor || null,
          creado_por: profile?.id
        })
        .select()
        .single()

      if (errBenef) throw errBenef

      const { error: errDatos } = await supabase
        .from('datos_personales_beneficiario')
        .insert({
          beneficiario_id: nuevoBenef.id,
          email_contacto: solicitud.email_contacto,
          dni: solicitud.menor_dni,
          sexo: solicitud.menor_sexo,
          religion: solicitud.menor_religion,
          religion_otro: solicitud.menor_religion_otro,
          nacionalidad: solicitud.menor_nacionalidad,
          provincia: solicitud.menor_provincia,
          localidad: solicitud.menor_localidad,
          codigo_postal: solicitud.menor_codigo_postal,
          direccion_calle: solicitud.menor_direccion_calle,
          direccion_numero: solicitud.menor_direccion_numero,
          direccion_piso_dpto: solicitud.menor_direccion_piso_dpto,
          telefono_emergencia: solicitud.menor_telefono_emergencia,
          telefono_emergencia_pertenece_a: solicitud.menor_telefono_emergencia_pertenece_a,
          celular: solicitud.menor_celular,
          obra_social: solicitud.menor_obra_social,
          obra_social_numero: solicitud.menor_obra_social_numero,
          colegio: solicitud.menor_colegio,
          estudios_cursados: solicitud.menor_estudios_cursados,
          alergias_dieta: solicitud.menor_alergias_dieta,
          madre_apellido_nombre: solicitud.madre_apellido_nombre,
          madre_dni: solicitud.madre_dni,
          madre_nacionalidad: solicitud.madre_nacionalidad,
          madre_fecha_nacimiento: solicitud.madre_fecha_nacimiento,
          madre_domicilio: solicitud.madre_domicilio,
          madre_localidad: solicitud.madre_localidad,
          madre_codigo_postal: solicitud.madre_codigo_postal,
          madre_ocupacion: solicitud.madre_ocupacion,
          madre_info_extra: solicitud.madre_info_extra,
          padre_apellido_nombre: solicitud.padre_apellido_nombre,
          padre_dni: solicitud.padre_dni,
          padre_nacionalidad: solicitud.padre_nacionalidad,
          padre_fecha_nacimiento: solicitud.padre_fecha_nacimiento,
          padre_domicilio: solicitud.padre_domicilio,
          padre_localidad: solicitud.padre_localidad,
          padre_codigo_postal: solicitud.padre_codigo_postal,
          padre_ocupacion: solicitud.padre_ocupacion,
          padre_info_extra: solicitud.padre_info_extra,
          adulto_a_cargo: solicitud.adulto_a_cargo,
          info_importancia_menor: solicitud.info_importancia_menor
        })

      if (errDatos) console.error('Error al guardar datos personales:', errDatos)

      const tablaProgresion = form.rama === 'Manada'
        ? 'progresion_manada'
        : form.rama === 'Unidad Scout'
          ? 'progresion_unidad'
          : form.rama === 'Caminantes'
            ? 'progresion_caminantes'
            : 'progresion_rovers'

      const campoFecha = form.rama === 'Manada'
        ? 'fecha_ingreso_manada'
        : form.rama === 'Unidad Scout'
          ? 'fecha_ingreso_unidad'
          : form.rama === 'Caminantes'
            ? 'fecha_ingreso_caminantes'
            : 'fecha_ingreso_rovers'

      const { error: errProg } = await supabase
        .from(tablaProgresion)
        .insert({
          beneficiario_id: nuevoBenef.id,
          [campoFecha]: hoy,
          progresion_actual: 'Período Introductorio'
        })

      if (errProg) console.error('Error al crear progresión:', errProg)

      const { error: errUpdate } = await supabase
        .from('solicitudes_inscripcion')
        .update({
          estado: 'aprobada',
          rama_asignada: form.rama,
          beneficiario_creado_id: nuevoBenef.id,
          aprobada_por: profile?.id,
          aprobada_en: new Date().toISOString()
        })
        .eq('id', solicitud.id)

      if (errUpdate) throw errUpdate

      setMensaje({ tipo: 'ok', texto: `✅ ${form.apellido}, ${form.nombre} aprobado en ${form.rama}` })
      setExpandida(null)
      await cargarSolicitudes()

      setTimeout(() => setMensaje(null), 4000)
    } catch (err: any) {
      console.error('Error al aprobar:', err)
      setMensaje({ tipo: 'error', texto: `❌ Error: ${err.message}` })
    } finally {
      setGuardando(null)
    }
  }

  const rechazarSolicitud = async (solicitud: Solicitud) => {
    const form = formRechazar[solicitud.id]
    if (!form || !form.motivo.trim()) {
      setMensaje({ tipo: 'error', texto: '⚠️ Escribí un motivo de rechazo' })
      return
    }

    setGuardando(solicitud.id)
    try {
      const { error } = await supabase
        .from('solicitudes_inscripcion')
        .update({
          estado: 'rechazada',
          motivo_rechazo: form.motivo.trim(),
          aprobada_por: profile?.id,
          aprobada_en: new Date().toISOString()
        })
        .eq('id', solicitud.id)

      if (error) throw error

      setMensaje({ tipo: 'ok', texto: `Solicitud rechazada` })
      setExpandida(null)
      setFormRechazar(prev => ({ ...prev, [solicitud.id]: { mostrar: false, motivo: '' } }))
      await cargarSolicitudes()

      setTimeout(() => setMensaje(null), 4000)
    } catch (err: any) {
      console.error('Error al rechazar:', err)
      setMensaje({ tipo: 'error', texto: `❌ Error: ${err.message}` })
    } finally {
      setGuardando(null)
    }
  }

  if (!puedeVer) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Oswald, sans-serif', color: COL.terracota }}>
        ⚠️ No tenés permisos para ver esta página
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COL.textoSecundario }}>
          Cargando solicitudes...
        </span>
      </div>
    )
  }

  const filtradas = solicitudes.filter(s => s.estado === filtro)
  const contPendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const contAprobadas = solicitudes.filter(s => s.estado === 'aprobada').length
  const contRechazadas = solicitudes.filter(s => s.estado === 'rechazada').length

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>

      {/* ============ HEADER ============ */}
      <div style={{
        backgroundColor: COL.verdeScout,
        borderRadius: '16px',
        padding: '24px 20px',
        marginBottom: '20px',
        border: `2px solid ${COL.terracota}`,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
        <h1 style={{
          fontSize: 'clamp(18px, 4vw, 24px)',
          fontWeight: '700',
          color: '#F3ECD8',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          margin: '0 0 6px 0'
        }}>
          Solicitudes de inscripción
        </h1>
        <p style={{
          fontSize: 'clamp(11px, 2.5vw, 13px)',
          color: '#D1C9B4',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: 0
        }}>
          Nuevos ingresos al Grupo Scout
        </p>
      </div>

      {/* ============ MENSAJE ============ */}
      {mensaje && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '16px',
          backgroundColor: mensaje.tipo === 'ok' ? '#D1FAE5' : '#FEE2E2',
          color: mensaje.tipo === 'ok' ? '#166534' : COL.terracota,
          border: `2px solid ${mensaje.tipo === 'ok' ? '#86EFAC' : '#FECACA'}`,
          fontSize: '14px',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* ============ TABS ============ */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'pendiente' as const, label: 'Pendientes', emoji: '⏳', color: COL.naranja, bg: '#FEF3E2', count: contPendientes },
          { key: 'aprobada' as const, label: 'Aprobadas', emoji: '✅', color: COL.verde, bg: '#E8F5E9', count: contAprobadas },
          { key: 'rechazada' as const, label: 'Rechazadas', emoji: '❌', color: COL.rojo, bg: '#FEE8E8', count: contRechazadas }
        ].map(tab => {
          const activo = filtro === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setFiltro(tab.key)}
              style={{
                padding: '6px 12px',
                backgroundColor: activo ? tab.color : 'white',
                color: activo ? 'white' : tab.color,
                border: `1.5px solid ${tab.color}`,
                borderRadius: '20px',
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span style={{
                backgroundColor: activo ? 'rgba(255,255,255,0.3)' : tab.bg,
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: '700'
              }}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ============ LISTA ============ */}
      {filtradas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'white',
          borderRadius: '16px',
          border: `2px dashed ${COL.bordeSuave}`,
          color: COL.textoSecundario
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {filtro === 'pendiente' ? '🎉' : filtro === 'aprobada' ? '📭' : '📭'}
          </div>
          <div style={{
            fontSize: '15px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {filtro === 'pendiente' && 'No hay solicitudes pendientes'}
            {filtro === 'aprobada' && 'Todavía no aprobaste ninguna solicitud'}
            {filtro === 'rechazada' && 'No hay solicitudes rechazadas'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtradas.map(solicitud => {
            const abierta = expandida === solicitud.id
            const edad = calcularEdad(solicitud.menor_fecha_nacimiento)
            const ramaSugerida = sugerirRama(edad)
            const form = formAprobar[solicitud.id] || {
              apellido: solicitud.menor_apellido,
              nombre: solicitud.menor_nombre,
              rama: ramaSugerida
            }
            const rechForm = formRechazar[solicitud.id] || { mostrar: false, motivo: '' }
            const fotoUrl = getFotoUrl(solicitud.menor_foto_url, solicitud.menor_nombre, solicitud.menor_apellido)

            const colorEstado = solicitud.estado === 'pendiente' ? COL.naranja
              : solicitud.estado === 'aprobada' ? COL.verde
              : COL.rojo

            return (
              <div
                key={solicitud.id}
                style={{
                  backgroundColor: 'white',
                  border: `2px solid ${abierta ? colorEstado : COL.bordeSuave}`,
                  borderLeft: `6px solid ${colorEstado}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  boxShadow: abierta ? `0 4px 12px rgba(0,0,0,0.08)` : 'none'
                }}
              >
                {/* Header de la tarjeta */}
                <button
                  onClick={() => toggleExpandida(solicitud.id, solicitud)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: abierta ? '#FAF8F4' : 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'center',
                    fontFamily: 'Oswald, sans-serif',
                    textAlign: 'left'
                  }}
                >
                  {/* Foto */}
                  <img
                    src={fotoUrl}
                    alt={solicitud.menor_nombre}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: `2px solid ${colorEstado}`
                    }}
                  />

                  {/* Datos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 'clamp(14px, 3vw, 16px)',
                      fontWeight: '700',
                      color: COL.verdeScout,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px',
                      wordBreak: 'break-word'
                    }}>
                      {solicitud.menor_apellido}, {solicitud.menor_nombre}
                    </div>
                    <div style={{
                      fontSize: 'clamp(11px, 2.5vw, 13px)',
                      color: COL.textoSecundario,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <span>🎂 {edad} años</span>
                      <span>📅 Enviada el {formatFecha(solicitud.creado_en.split('T')[0])}</span>
                      {solicitud.rama_asignada && (
                        <span style={{ color: colorEstado, fontWeight: '600' }}>
                          ✅ {solicitud.rama_asignada}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Flecha */}
                  <span style={{
                    fontSize: '20px',
                    color: colorEstado,
                    flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform: abierta ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}>
                    ▼
                  </span>
                </button>

                {/* Detalle */}
                {abierta && (
                  <div style={{
                    padding: '16px',
                    borderTop: `2px dashed ${COL.bordeSuave}`,
                    backgroundColor: '#FAF8F4'
                  }}>
                    <Seccion titulo="👤 Datos del menor" emoji="">
                      <Fila label="Apellidos" valor={solicitud.menor_apellido} />
                      <Fila label="Nombres" valor={solicitud.menor_nombre} />
                      <Fila label="DNI" valor={solicitud.menor_dni} />
                      <Fila label="Sexo" valor={solicitud.menor_sexo} />
                      <Fila label="Fecha de nacimiento" valor={formatFecha(solicitud.menor_fecha_nacimiento)} />
                      <Fila label="Edad" valor={`${edad} años`} />
                      <Fila label="Nacionalidad" valor={solicitud.menor_nacionalidad} />
                      <Fila label="Religión" valor={solicitud.menor_religion} />
                      <Fila label="Domicilio" valor={`${solicitud.menor_direccion_calle} ${solicitud.menor_direccion_numero || ''} ${solicitud.menor_direccion_piso_dpto || ''}`.trim()} />
                      <Fila label="Localidad" valor={solicitud.menor_localidad} />
                      <Fila label="Provincia" valor={solicitud.menor_provincia} />
                      <Fila label="Código Postal" valor={solicitud.menor_codigo_postal} />
                      <Fila label="Teléfono emergencia" valor={solicitud.menor_telefono_emergencia} />
                      {solicitud.menor_telefono_emergencia_pertenece_a && (
                        <Fila label="Teléfono pertenece a" valor={solicitud.menor_telefono_emergencia_pertenece_a} />
                      )}
                      {solicitud.menor_celular && <Fila label="Celular del menor" valor={solicitud.menor_celular} />}
                      {solicitud.menor_obra_social && <Fila label="Obra Social" valor={solicitud.menor_obra_social} />}
                      {solicitud.menor_obra_social_numero && <Fila label="N° Afiliado" valor={solicitud.menor_obra_social_numero} />}
                      <Fila label="Colegio" valor={solicitud.menor_colegio} />
                      <Fila label="Estudios cursados" valor={solicitud.menor_estudios_cursados} />
                      {solicitud.menor_alergias_dieta && <Fila label="Alergias / Dieta" valor={solicitud.menor_alergias_dieta} />}
                      <Fila label="Email de contacto" valor={solicitud.email_contacto} />
                    </Seccion>

                    <Seccion titulo="👩 Datos de la madre">
                      <Fila label="Apellido y nombre" valor={solicitud.madre_apellido_nombre} />
                      <Fila label="DNI" valor={solicitud.madre_dni} />
                      <Fila label="Nacionalidad" valor={solicitud.madre_nacionalidad} />
                      <Fila label="Fecha de nacimiento" valor={formatFecha(solicitud.madre_fecha_nacimiento)} />
                      <Fila label="Domicilio" valor={solicitud.madre_domicilio} />
                      <Fila label="Localidad" valor={solicitud.madre_localidad} />
                      <Fila label="Código Postal" valor={solicitud.madre_codigo_postal} />
                      <Fila label="Ocupación" valor={solicitud.madre_ocupacion} />
                      {solicitud.madre_info_extra && <Fila label="Info extra" valor={solicitud.madre_info_extra} />}
                    </Seccion>

                    <Seccion titulo="👨 Datos del padre">
                      <Fila label="Apellido y nombre" valor={solicitud.padre_apellido_nombre} />
                      <Fila label="DNI" valor={solicitud.padre_dni} />
                      <Fila label="Nacionalidad" valor={solicitud.padre_nacionalidad} />
                      <Fila label="Fecha de nacimiento" valor={formatFecha(solicitud.padre_fecha_nacimiento)} />
                      <Fila label="Domicilio" valor={solicitud.padre_domicilio} />
                      <Fila label="Localidad" valor={solicitud.padre_localidad} />
                      <Fila label="Código Postal" valor={solicitud.padre_codigo_postal} />
                      <Fila label="Ocupación" valor={solicitud.padre_ocupacion} />
                      {solicitud.padre_info_extra && <Fila label="Info extra" valor={solicitud.padre_info_extra} />}
                    </Seccion>

                    <Seccion titulo="📝 Otra información">
                      <Fila label="Adulto a cargo" valor={solicitud.adulto_a_cargo} />
                      {solicitud.info_importancia_menor && (
                        <Fila label="Info adicional" valor={solicitud.info_importancia_menor} />
                      )}
                    </Seccion>

                    {/* APROBAR */}
                    {solicitud.estado === 'pendiente' && puedeAprobar && (
                      <div style={{
                        background: `linear-gradient(135deg, #F0F7F0 0%, #E8F5E9 100%)`,
                        border: `2px solid ${COL.verdeClaro}`,
                        borderRadius: '14px',
                        padding: '18px',
                        marginTop: '18px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: COL.verdeScout,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          ⚙️ Aprobar solicitud
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '12px',
                          marginBottom: '14px'
                        }}>
                          <CampoForm label="Apellidos *">
                            <input
                              type="text"
                              value={form.apellido}
                              onChange={(e) => setFormAprobar(prev => ({
                                ...prev,
                                [solicitud.id]: { ...form, apellido: e.target.value }
                              }))}
                              style={inputStyle}
                              disabled={guardando === solicitud.id}
                            />
                          </CampoForm>
                          <CampoForm label="Nombres *">
                            <input
                              type="text"
                              value={form.nombre}
                              onChange={(e) => setFormAprobar(prev => ({
                                ...prev,
                                [solicitud.id]: { ...form, nombre: e.target.value }
                              }))}
                              style={inputStyle}
                              disabled={guardando === solicitud.id}
                            />
                          </CampoForm>
                          <CampoForm label={`Rama (sugerida: ${ramaSugerida})`}>
                            <select
                              value={form.rama}
                              onChange={(e) => setFormAprobar(prev => ({
                                ...prev,
                                [solicitud.id]: { ...form, rama: e.target.value as Rama }
                              }))}
                              style={inputStyle}
                              disabled={guardando === solicitud.id}
                            >
                              {RAMAS.map(r => {
                                const c = getColorRama(r)
                                return (
                                  <option key={r} value={r}>{r}</option>
                                )
                              })}
                            </select>
                          </CampoForm>
                        </div>

                        {/* Preview de rama elegida */}
                        <div style={{
                          backgroundColor: getColorRama(form.rama).bg,
                          border: `1px solid ${getColorRama(form.rama).color}`,
                          borderRadius: '8px',
                          padding: '8px 12px',
                          marginBottom: '14px',
                          fontSize: '12px',
                          color: getColorRama(form.rama).color,
                          fontWeight: '600',
                          textAlign: 'center'
                        }}>
                          Se va a crear en {form.rama} · Período Introductorio
                        </div>

                        <button
                          onClick={() => aprobarSolicitud(solicitud)}
                          disabled={guardando === solicitud.id}
                          style={{
                            width: '100%',
                            padding: '16px',
                            background: guardando === solicitud.id
                              ? COL.textoSecundario
                              : `linear-gradient(135deg, ${COL.verde} 0%, ${COL.verdeClaro} 100%)`,
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: guardando === solicitud.id ? 'wait' : 'pointer',
                            fontFamily: 'Oswald, sans-serif',
                            fontSize: '15px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            boxShadow: guardando === solicitud.id ? 'none' : '0 4px 12px rgba(46, 125, 50, 0.3)'
                          }}
                        >
                          {guardando === solicitud.id ? '⏳ Procesando...' : '✅ Aprobar y crear beneficiario'}
                        </button>
                      </div>
                    )}

                    {/* RECHAZAR */}
                    {solicitud.estado === 'pendiente' && puedeAprobar && (
                      <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        {!rechForm.mostrar ? (
                          <button
                            onClick={() => setFormRechazar(prev => ({
                              ...prev,
                              [solicitud.id]: { mostrar: true, motivo: '' }
                            }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: COL.textoSecundario,
                              fontSize: '12px',
                              fontFamily: 'Oswald, sans-serif',
                              textDecoration: 'underline',
                              letterSpacing: '0.5px'
                            }}
                          >
                            ❌ Rechazar solicitud
                          </button>
                        ) : (
                          <div style={{
                            backgroundColor: '#FEE8E8',
                            border: `2px solid ${COL.rojo}`,
                            borderRadius: '12px',
                            padding: '14px',
                            textAlign: 'left'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: COL.rojo,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '8px'
                            }}>
                              Motivo del rechazo *
                            </label>
                            <textarea
                              value={rechForm.motivo}
                              onChange={(e) => setFormRechazar(prev => ({
                                ...prev,
                                [solicitud.id]: { mostrar: true, motivo: e.target.value }
                              }))}
                              rows={2}
                              style={{ ...inputStyle, resize: 'vertical', marginBottom: '10px' }}
                              disabled={guardando === solicitud.id}
                              placeholder="Escribí el motivo..."
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setFormRechazar(prev => ({
                                  ...prev,
                                  [solicitud.id]: { mostrar: false, motivo: '' }
                                }))}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: '#E8DEC4',
                                  color: COL.textoPrincipal,
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontFamily: 'Oswald, sans-serif',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => rechazarSolicitud(solicitud)}
                                disabled={guardando === solicitud.id}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: COL.rojo,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: guardando === solicitud.id ? 'wait' : 'pointer',
                                  fontFamily: 'Oswald, sans-serif',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {guardando === solicitud.id ? '⏳...' : 'Confirmar rechazo'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ESTADOS FINALES */}
                    {solicitud.estado === 'aprobada' && (
                      <div style={{
                        background: `linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)`,
                        border: `2px solid ${COL.verde}`,
                        borderRadius: '12px',
                        padding: '16px',
                        marginTop: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '6px' }}>✅</div>
                        <div style={{
                          fontSize: '14px',
                          color: '#166534',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Aprobada · {solicitud.rama_asignada}
                        </div>
                        {solicitud.beneficiario_creado_id && (
                          <button
                            onClick={() => navigate(`/beneficiario/${solicitud.beneficiario_creado_id}`)}
                            style={{
                              marginTop: '10px',
                              padding: '8px 16px',
                              backgroundColor: '#166534',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontFamily: 'Oswald, sans-serif',
                              fontSize: '12px',
                              fontWeight: '700',
                              textTransform: 'uppercase'
                            }}
                          >
                            Ver beneficiario →
                          </button>
                        )}
                      </div>
                    )}

                    {solicitud.estado === 'rechazada' && (
                      <div style={{
                        background: `linear-gradient(135deg, #FEE8E8 0%, #FECACA 100%)`,
                        border: `2px solid ${COL.rojo}`,
                        borderRadius: '12px',
                        padding: '16px',
                        marginTop: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '6px' }}>❌</div>
                        <div style={{
                          fontSize: '14px',
                          color: COL.rojo,
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Rechazada
                        </div>
                        {solicitud.motivo_rechazo && (
                          <div style={{
                            marginTop: '8px',
                            fontStyle: 'italic',
                            fontSize: '12px',
                            color: COL.rojo
                          }}>
                            Motivo: {solicitud.motivo_rechazo}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// SUBCOMPONENTES
// ============================================
function Seccion({ titulo, emoji, children }: { titulo: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: '#FAF8F4',
      borderRadius: '12px',
      padding: '14px',
      marginBottom: '12px',
      border: `1px solid ${COL.bordeSuave}`
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '700',
        color: COL.verdeScout,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '10px',
        paddingBottom: '6px',
        borderBottom: `1px dashed ${COL.bordeSuave}`
      }}>
        {emoji} {titulo}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '8px'
      }}>
        {children}
      </div>
    </div>
  )
}

function Fila({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor || valor === '-' || valor === 'null') return null

  // Detectar si el texto es muy largo para ocupar toda la fila
  const esLargo = valor.length > 50

  return (
    <div style={{
      gridColumn: esLargo ? '1 / -1' : 'auto',
      backgroundColor: '#FFFFFF',
      border: `1.5px solid ${COL.bordeSuave}`,
      borderRadius: '8px',
      padding: '8px 10px',
      minWidth: 0
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: '700',
        color: COL.textoSecundario,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '2px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '13px',
        color: COL.textoPrincipal,
        fontWeight: '600',
        wordBreak: 'break-word'
      }}>
        {valor}
      </div>
    </div>
  )
}

function CampoForm({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: '700',
        color: COL.verdeScout,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px'
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ============================================
// ESTILOS
// ============================================
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: `2px solid ${COL.bordeSuave}`,
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  boxSizing: 'border-box',
  color: COL.textoPrincipal
}