import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'
import { enviarEmail, formatFechaCorta } from '../lib/enviarEmail'

interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  tiene_hermanos: boolean
}

interface ConfiguracionGrupo {
  nombre_grupo: string
  telefono_grupo: string
  provincia: string
  ciudad: string
  direccion: string
  pueblo_cercano: string
  unidad_sanitaria_nombre: string
  unidad_sanitaria_telefono: string
  unidad_sanitaria_direccion: string
  destacamento_nombre: string
  destacamento_telefono: string
  destacamento_direccion: string
  zona_scouts: string
}

interface Transporte {
  tipo: 'publico' | 'propio'
  razon_social: string
  direccion: string
  telefono: string
  nro_habilitacion: string
  vehiculo_tipo: string
  vehiculo_marca: string
  vehiculo_modelo: string
  vehiculo_patente: string
}

interface Adulto {
  nombre: string
}

interface UsuarioSistema {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
}

function CampoTexto({
  label,
  valor,
  onChange,
  esEnSede,
  placeholder,
  requerido = true
}: {
  label: string
  valor: string
  onChange: (valor: string) => void
  esEnSede: boolean
  placeholder?: string
  requerido?: boolean
}) {
  const labelFinal = requerido && !esEnSede ? `${label} *` : label

  if (esEnSede) {
    return (
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>{labelFinal}</label>
        <div style={{
          padding: '8px 12px',
          fontSize: '13px',
          border: '2px solid #B8D4B8',
          borderRadius: '8px',
          backgroundColor: '#F0F7F0',
          color: '#24352A',
          fontFamily: 'Oswald, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>🏠</span>
          <span style={{ flex: 1 }}>{valor || '-'}</span>
          <span style={{
            fontSize: '9px',
            color: '#5C7A5E',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            Sede
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{labelFinal}</label>
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={requerido}
        style={inputStyle}
      />
    </div>
  )
}

export default function PermisoNuevo() {
  const navigate = useNavigate()
  const { getRolData, profile } = useAuth()

  const [config, setConfig] = useState<ConfiguracionGrupo | null>(null)
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const rolData = getRolData()
  const ramaAsignada = rolData.rama

  const [emailJefe, setEmailJefe] = useState(profile?.email || '')
  const [emailsAyudantes, setEmailsAyudantes] = useState<string[]>([])
  const [nuevoEmailAyudante, setNuevoEmailAyudante] = useState('')
  const [ayudantesDisponibles, setAyudantesDisponibles] = useState<UsuarioSistema[]>([])

  const [fechaSalida, setFechaSalida] = useState('')
  const [fechaLlegada, setFechaLlegada] = useState('')

  const [esEnSede, setEsEnSede] = useState(true)

  const [provincia, setProvincia] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [direccion, setDireccion] = useState('')
  const [puebloCercano, setPuebloCercano] = useState('')

  const [propietarioNombre, setPropietarioNombre] = useState('')
  const [propietarioTelefono, setPropietarioTelefono] = useState('')

  const [unidadSanitariaNombre, setUnidadSanitariaNombre] = useState('')
  const [unidadSanitariaTelefono, setUnidadSanitariaTelefono] = useState('')
  const [unidadSanitariaDireccion, setUnidadSanitariaDireccion] = useState('')

  const [destacamentoNombre, setDestacamentoNombre] = useState('')
  const [destacamentoTelefono, setDestacamentoTelefono] = useState('')
  const [destacamentoDireccion, setDestacamentoDireccion] = useState('')

  const [medioComunicacion, setMedioComunicacion] = useState('')
  const [otrosDetalles, setOtrosDetalles] = useState('')
  const [jefeCampo, setJefeCampo] = useState('')
  const [zonaScouts, setZonaScouts] = useState('')

  const [beneficiariosSeleccionados, setBeneficiariosSeleccionados] = useState<Set<string>>(new Set())
  const [filtroRamaParticipantes, setFiltroRamaParticipantes] = useState<string>('Todas')
  const [adultos, setAdultos] = useState<Adulto[]>([])
  const [nuevoAdulto, setNuevoAdulto] = useState('')

  const [transportes, setTransportes] = useState<Transporte[]>([])

  const [programaArchivo, setProgramaArchivo] = useState<File | null>(null)
  const [programaLink, setProgramaLink] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: configData, error: configError } = await supabase
        .from('configuracion_grupo')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (configError) throw configError

      if (configData) {
        setConfig(configData)
        precargarSede(configData)
      }

      let queryBenef = supabase
        .from('beneficiarios')
        .select('id, nombre, apellido, rama, tiene_hermanos')
        .eq('estado', 'activo')

      if (ramaAsignada) {
        queryBenef = queryBenef.eq('rama', ramaAsignada)
      }

      const { data: benefData, error: benefError } = await queryBenef
      if (benefError) throw benefError

      setBeneficiarios(benefData || [])

      // Cargar todos los usuarios activos (jefes y ayudantes)
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, email, rol')
        .eq('activo', true)

      if (usuariosError) throw usuariosError

      const todos = usuariosData || []

      // Ayudantes: solo de la misma rama que el jefe
      const rolesRama: Record<string, string> = {
        'Manada': 'AyudanteManada',
        'Unidad Scout': 'AyudanteUnidad',
        'Caminantes': 'AyudanteCaminantes',
        'Rovers': 'AyudanteRovers'
      }

      const rolAyudanteDeMiRama = ramaAsignada ? rolesRama[ramaAsignada] : null
      const ayudantesFiltrados = rolAyudanteDeMiRama
        ? todos.filter(u => u.rol === rolAyudanteDeMiRama)
        : []

      setAyudantesDisponibles(ayudantesFiltrados)

    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error al cargar: ${error.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const precargarSede = (c: ConfiguracionGrupo) => {
    setProvincia(c.provincia || '')
    setCiudad(c.ciudad || '')
    setDireccion(c.direccion || '')
    setPuebloCercano(c.pueblo_cercano || '')
    setPropietarioNombre(c.nombre_grupo || '')
    setPropietarioTelefono(c.telefono_grupo || '')
    setUnidadSanitariaNombre(c.unidad_sanitaria_nombre || '')
    setUnidadSanitariaTelefono(c.unidad_sanitaria_telefono || '')
    setUnidadSanitariaDireccion(c.unidad_sanitaria_direccion || '')
    setDestacamentoNombre(c.destacamento_nombre || '')
    setDestacamentoTelefono(c.destacamento_telefono || '')
    setDestacamentoDireccion(c.destacamento_direccion || '')
    setZonaScouts(c.zona_scouts || '')
  }

  const limpiarCampos = () => {
    setProvincia('')
    setCiudad('')
    setDireccion('')
    setPuebloCercano('')
    setPropietarioNombre('')
    setPropietarioTelefono('')
    setUnidadSanitariaNombre('')
    setUnidadSanitariaTelefono('')
    setUnidadSanitariaDireccion('')
    setDestacamentoNombre('')
    setDestacamentoTelefono('')
    setDestacamentoDireccion('')
    setZonaScouts('')
  }

  const handleCambioSede = (enSede: boolean) => {
    setEsEnSede(enSede)
    if (enSede && config) {
      precargarSede(config)
    } else {
      limpiarCampos()
    }
  }

  // ============================================
  // HELPERS: EMAILS AYUDANTES
  // ============================================
  const toggleEmailAyudante = (email: string) => {
    setEmailsAyudantes(prev => {
      if (prev.includes(email)) return prev.filter(e => e !== email)
      return [...prev, email]
    })
  }

  const agregarEmailManual = () => {
    const email = nuevoEmailAyudante.trim()
    if (!email) return
    if (!email.includes('@')) {
      setMessage({ text: '⚠️ Ingresá un email válido', type: 'warning' })
      return
    }
    if (emailsAyudantes.includes(email)) {
      setMessage({ text: '⚠️ Ese email ya está agregado', type: 'warning' })
      return
    }
    setEmailsAyudantes([...emailsAyudantes, email])
    setNuevoEmailAyudante('')
    setMessage({ text: '', type: '' })
  }

  const quitarEmailAyudante = (email: string) => {
    setEmailsAyudantes(emailsAyudantes.filter(e => e !== email))
  }

  // ============================================
  // HELPERS: PARTICIPANTES
  // ============================================
  const toggleBeneficiario = (id: string) => {
    const nuevo = new Set(beneficiariosSeleccionados)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    setBeneficiariosSeleccionados(nuevo)
  }

  const agregarAdultoManual = () => {
    const nombre = nuevoAdulto.trim()
    if (!nombre) return
    if (adultos.some(a => a.nombre === nombre)) {
      setMessage({ text: '⚠️ Ese adulto ya está agregado', type: 'warning' })
      return
    }
    setAdultos([...adultos, { nombre }])
    setNuevoAdulto('')
    setMessage({ text: '', type: '' })
  }

  const quitarAdulto = (index: number) => {
    setAdultos(adultos.filter((_, i) => i !== index))
  }

  // ============================================
  // HELPERS: TRANSPORTES
  // ============================================
  const agregarTransporte = (tipo: 'publico' | 'propio') => {
    setTransportes([...transportes, {
      tipo,
      razon_social: '',
      direccion: '',
      telefono: '',
      nro_habilitacion: '',
      vehiculo_tipo: '',
      vehiculo_marca: '',
      vehiculo_modelo: '',
      vehiculo_patente: ''
    }])
  }

  const actualizarTransporte = (index: number, campo: keyof Transporte, valor: string) => {
    const nuevos = [...transportes]
    nuevos[index] = { ...nuevos[index], [campo]: valor }
    setTransportes(nuevos)
  }

  const quitarTransporte = (index: number) => {
    setTransportes(transportes.filter((_, i) => i !== index))
  }

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })

    if (!emailJefe.trim()) {
      setMessage({ text: '⚠️ El email del jefe es obligatorio', type: 'warning' })
      return
    }
    if (!fechaSalida || !fechaLlegada) {
      setMessage({ text: '⚠️ Fecha de salida y llegada son obligatorias', type: 'warning' })
      return
    }
    if (!esEnSede) {
      if (!provincia || !ciudad || !direccion || !puebloCercano) {
        setMessage({ text: '⚠️ Provincia, ciudad, dirección y pueblo cercano son obligatorios', type: 'warning' })
        return
      }
      if (!propietarioNombre || !propietarioTelefono) {
        setMessage({ text: '⚠️ Nombre y teléfono del propietario son obligatorios', type: 'warning' })
        return
      }
      if (!unidadSanitariaNombre || !unidadSanitariaTelefono || !unidadSanitariaDireccion) {
        setMessage({ text: '⚠️ Los datos de la unidad sanitaria son obligatorios', type: 'warning' })
        return
      }
      if (!destacamentoNombre || !destacamentoTelefono || !destacamentoDireccion) {
        setMessage({ text: '⚠️ Los datos del destacamento policial son obligatorios', type: 'warning' })
        return
      }
    }

    // Contactos obligatorios siempre
    if (!medioComunicacion.trim()) {
      setMessage({ text: '⚠️ El medio de comunicación es obligatorio', type: 'warning' })
      return
    }
    if (!jefeCampo.trim()) {
      setMessage({ text: '⚠️ El jefe de campo es obligatorio', type: 'warning' })
      return
    }
    if (!zonaScouts.trim()) {
      setMessage({ text: '⚠️ La zona scouts es obligatoria', type: 'warning' })
      return
    }

    if (beneficiariosSeleccionados.size === 0) {
      setMessage({ text: '⚠️ Tenés que seleccionar al menos un beneficiario', type: 'warning' })
      return
    }
    if (adultos.length === 0) {
      setMessage({ text: '⚠️ Tenés que agregar al menos un adulto', type: 'warning' })
      return
    }

    // ✅ Confirmación antes de enviar
    const confirmado = window.confirm(
      '⚠️ ¿Estás seguro que deseás enviar este permiso a jefatura?\n\n' +
      'Una vez enviado NO se puede volver a editar.'
    )

    if (!confirmado) return

    setSaving(true)

    try {
      const { data: permiso, error: permisoError } = await supabase
        .from('permisos_salida')
        .insert({
          creado_por: profile?.id,
          creado_por_nombre: profile ? `${profile.nombre} ${profile.apellido || ''}`.trim() : null,
          rama: ramaAsignada,
          email_jefe: emailJefe.trim(),
          emails_ayudantes: emailsAyudantes.length > 0 ? emailsAyudantes : null,
          fecha_salida: fechaSalida || null,
          fecha_llegada: fechaLlegada || null,
          es_en_sede: esEnSede,
          provincia: provincia || null,
          ciudad: ciudad || null,
          direccion: direccion || null,
          pueblo_cercano: puebloCercano || null,
          propietario_nombre: propietarioNombre || null,
          propietario_telefono: propietarioTelefono || null,
          unidad_sanitaria_nombre: unidadSanitariaNombre || null,
          unidad_sanitaria_telefono: unidadSanitariaTelefono || null,
          unidad_sanitaria_direccion: unidadSanitariaDireccion || null,
          destacamento_nombre: destacamentoNombre || null,
          destacamento_telefono: destacamentoTelefono || null,
          destacamento_direccion: destacamentoDireccion || null,
          medio_comunicacion: medioComunicacion || null,
          otros_detalles: otrosDetalles || null,
          jefe_campo: jefeCampo || null,
          zona_scouts: zonaScouts || null,
          estado: 'pendiente'
        })
        .select()
        .single()

      if (permisoError) throw permisoError

      const participantesInsert: any[] = []

      beneficiariosSeleccionados.forEach(benefId => {
        participantesInsert.push({
          permiso_id: permiso.id,
          beneficiario_id: benefId,
          tipo: 'beneficiario'
        })
      })

      adultos.forEach(adulto => {
        participantesInsert.push({
          permiso_id: permiso.id,
          beneficiario_id: null,
          tipo: 'adulto',
          nombre_libre: adulto.nombre
        })
      })

      if (participantesInsert.length > 0) {
        const { error: partError } = await supabase
          .from('permisos_participantes')
          .insert(participantesInsert)
        if (partError) throw partError
      }

      if (transportes.length > 0) {
        const transportesInsert = transportes.map(t => ({
          permiso_id: permiso.id,
          tipo: t.tipo,
          razon_social: t.razon_social || null,
          direccion: t.direccion || null,
          telefono: t.telefono || null,
          nro_habilitacion: t.nro_habilitacion || null,
          vehiculo_tipo: t.vehiculo_tipo || null,
          vehiculo_marca: t.vehiculo_marca || null,
          vehiculo_modelo: t.vehiculo_modelo || null,
          vehiculo_patente: t.vehiculo_patente || null
        }))

        const { error: transError } = await supabase
          .from('permisos_transportes')
          .insert(transportesInsert)
        if (transError) throw transError
      }

      const nombreCompleto = profile ? `${profile.nombre} ${profile.apellido || ''}`.trim() : null

      if (programaArchivo) {
        const ext = programaArchivo.name.split('.').pop()
        const fileName = `original-${Date.now()}.${ext}`
        const filePath = `${permiso.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('permisos-programas')
          .upload(filePath, programaArchivo, { cacheControl: '3600', upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('permisos-programas')
          .getPublicUrl(filePath)

        await supabase
          .from('permisos_salida')
          .update({
            programa_original_url: publicUrl,
            programa_original_nombre: programaArchivo.name
          })
          .eq('id', permiso.id)

        await supabase
          .from('permisos_archivos')
          .insert({
            permiso_id: permiso.id,
            tipo: 'original',
            storage_path: filePath,
            nombre_archivo: programaArchivo.name,
            subido_por: profile?.id,
            subido_por_nombre: nombreCompleto
          })
      } else if (programaLink) {
        await supabase
          .from('permisos_salida')
          .update({ programa_original_link_externo: programaLink })
          .eq('id', permiso.id)

        await supabase
          .from('permisos_archivos')
          .insert({
            permiso_id: permiso.id,
            tipo: 'original',
            link_externo: programaLink,
            nombre_archivo: 'Link externo',
            subido_por: profile?.id,
            subido_por_nombre: nombreCompleto
          })
      }

      // Enviar mail a jefatura + superadmin
      try {
        const { data: jefaturas } = await supabase
          .from('usuarios')
          .select('email')
          .in('rol', ['Jefatura', 'SUPER_ADMIN'])
          .eq('activo', true)

        const destinatarios = (jefaturas || [])
          .map(j => j.email)
          .filter((e): e is string => !!e)

        if (destinatarios.length > 0) {
          await enviarEmail({
            tipo: 'nuevo_permiso',
            destinatarios,
            datos: {
              permiso_id: permiso.id,
              jefe_nombre: nombreCompleto || 'Un jefe de rama',
              fecha_salida: formatFechaCorta(fechaSalida),
              fecha_llegada: formatFechaCorta(fechaLlegada),
              ubicacion: [ciudad, provincia].filter(Boolean).join(', ')
            }
          })
        }
      } catch (mailError) {
        console.error('⚠️ Error al enviar mail de nuevo permiso:', mailError)
      }

      navigate(`/permisos/${permiso.id}`)
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ text: `❌ Error: ${error.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const beneficiariosFiltrados = beneficiarios.filter(b => {
    if (filtroRamaParticipantes !== 'Todas' && b.rama !== filtroRamaParticipantes) return false
    return true
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>
          Cargando...
        </span>
      </div>
    )
  }

  if (!config) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Oswald, sans-serif', color: '#BF4E30' }}>
        ⚠️ Falta configurar los datos del grupo (tabla `configuracion_grupo` vacía)
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '20px', flexWrap: 'wrap'
      }}>
        <button
          onClick={() => navigate('/permisos')}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', color: '#7A7364',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            padding: '4px 0'
          }}
        >
          ← Volver
        </button>
      </div>

      <h1 style={{
        fontSize: 'clamp(18px, 4vw, 24px)',
        color: '#24352A', textTransform: 'uppercase',
        letterSpacing: '1px', margin: '0 0 20px 0', fontWeight: '700'
      }}>
        📋 NUEVO PERMISO DE ACAMPE/SALIDA
      </h1>

      {message.text && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 13px)', border: '1px solid',
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

      <form onSubmit={handleSubmit}>
        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>👤 Datos del Jefe de Rama</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Tu email (jefe de rama) *</label>
            <input type="email" value={emailJefe} onChange={(e) => setEmailJefe(e.target.value)} style={inputStyle} required />
          </div>

          {/* Ayudantes disponibles */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Ayudantes de tu rama</label>
            <div style={{ fontSize: '10px', color: '#7A7364', marginBottom: '8px' }}>
              Tildá a tus ayudantes para agregarlos a la cadena de mails. Si no esta, podés agregar su correo abajo. (recorda que NO ES NECESARIO colocar las casillas de jefatura)
            </div>

            {ayudantesDisponibles.length === 0 ? (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#F5F5F5',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#7A7364',
                fontStyle: 'italic'
              }}>
                No hay ayudantes registrados en tu rama
              </div>
            ) : (
              <div style={{
                border: '2px solid #E8DEC4',
                borderRadius: '8px',
                padding: '4px',
                backgroundColor: 'white',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {ayudantesDisponibles.map((u) => {
                  const seleccionado = emailsAyudantes.includes(u.email)
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleEmailAyudante(u.email)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: seleccionado ? '#F3ECD8' : 'transparent',
                        borderBottom: '1px solid #F3ECD8'
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px',
                        borderRadius: '4px',
                        border: '2px solid #D1C9B4',
                        backgroundColor: seleccionado ? '#24352A' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {seleccionado && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#24352A', fontWeight: seleccionado ? '600' : '400' }}>
                          {u.nombre} {u.apellido}
                        </div>
                        <div style={{ fontSize: '10px', color: '#7A7364' }}>{u.email}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Agregar email manual */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Agregar otros emails (opcional)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="email"
                value={nuevoEmailAyudante}
                onChange={(e) => setNuevoEmailAyudante(e.target.value)}
                placeholder="ayudante@email.com"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarEmailManual() } }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={agregarEmailManual}
                style={{ padding: '8px 16px', backgroundColor: '#5C7A5E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', whiteSpace: 'nowrap' }}
              >
                + Agregar
              </button>
            </div>
          </div>

          {/* Lista de emails seleccionados */}
          {emailsAyudantes.length > 0 && (
            <div>
              <label style={labelStyle}>Emails seleccionados ({emailsAyudantes.length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {emailsAyudantes.map((email) => (
                  <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#F0F7F0', border: '1px solid #B8D4B8', borderRadius: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#24352A' }}>📧 {email}</span>
                    <button type="button" onClick={() => quitarEmailAyudante(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BF4E30', fontSize: '14px', padding: '2px 6px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>📅 Horarios</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Fecha y hora de salida *</label>
            <input type="datetime-local" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} style={inputStyle} required />
            <div style={{ fontSize: '10px', color: '#7A7364', marginTop: '4px' }}>(Tener en cuenta que sería la hora que concentran)</div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Fecha y hora de llegada *</label>
            <input type="datetime-local" value={fechaLlegada} onChange={(e) => setFechaLlegada(e.target.value)} style={inputStyle} required />
            <div style={{ fontSize: '10px', color: '#7A7364', marginTop: '4px' }}>(Hora de llegada al grupo o fin del campamento)</div>
          </div>
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>🏠 ¿Es en la sede del grupo?</div>

          <div style={{ fontSize: '11px', color: '#7A7364', marginBottom: '12px' }}>
            Si el campamento/salida es en la sede del grupo, precargamos los datos automáticamente. Si no, completá todo manualmente.
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleCambioSede(true)}
              style={{ flex: 1, minWidth: '120px', padding: '12px 16px', border: `2px solid ${esEnSede ? '#24352A' : '#D1C9B4'}`, borderRadius: '8px', backgroundColor: esEnSede ? '#F0F7F0' : 'white', color: esEnSede ? '#24352A' : '#7A7364', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}
            >
              ✅ Sí, es en la sede
            </button>
            <button
              type="button"
              onClick={() => handleCambioSede(false)}
              style={{ flex: 1, minWidth: '120px', padding: '12px 16px', border: `2px solid ${!esEnSede ? '#24352A' : '#D1C9B4'}`, borderRadius: '8px', backgroundColor: !esEnSede ? '#F0F7F0' : 'white', color: !esEnSede ? '#24352A' : '#7A7364', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}
            >
              📍 No, es en otro lugar
            </button>
          </div>
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>📍 Ubicación</div>
          <CampoTexto label="Provincia" valor={provincia} onChange={setProvincia} esEnSede={esEnSede} placeholder="Ej: Córdoba, Santa Fe..." />
          <CampoTexto label="Ciudad" valor={ciudad} onChange={setCiudad} esEnSede={esEnSede} placeholder="Ej: San Isidro, Tigre..." />
          <CampoTexto label="Dirección" valor={direccion} onChange={setDireccion} esEnSede={esEnSede} placeholder="Ej: Av. Siempre Viva 123" />
          <CampoTexto label="Pueblo cercano" valor={puebloCercano} onChange={setPuebloCercano} esEnSede={esEnSede} placeholder="Ej: Pilar, Escobar..." />
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>👤 Datos del Propietario</div>
          <CampoTexto label="Nombre y apellido" valor={propietarioNombre} onChange={setPropietarioNombre} esEnSede={esEnSede} placeholder="Ej: Juan Pérez" />
          <CampoTexto label="Teléfono del propietario/lugar" valor={propietarioTelefono} onChange={setPropietarioTelefono} esEnSede={esEnSede} placeholder="Ej: 11-1234-5678" />
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>🚨 Emergencias</div>

          <div style={{ fontSize: '11px', color: '#7A7364', marginBottom: '12px', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Unidad Sanitaria más cercana
          </div>

          <CampoTexto label="Nombre" valor={unidadSanitariaNombre} onChange={setUnidadSanitariaNombre} esEnSede={esEnSede} placeholder="Ej: Hospital Municipal" />
          <CampoTexto label="Teléfono" valor={unidadSanitariaTelefono} onChange={setUnidadSanitariaTelefono} esEnSede={esEnSede} placeholder="Ej: 11-1234-5678" />
          <CampoTexto label="Dirección" valor={unidadSanitariaDireccion} onChange={setUnidadSanitariaDireccion} esEnSede={esEnSede} placeholder="Ej: Av. Siempre Viva 123" />

          <div style={{ fontSize: '11px', color: '#7A7364', marginTop: '20px', marginBottom: '12px', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Destacamento Policial más cercano
          </div>

          <CampoTexto label="Nombre" valor={destacamentoNombre} onChange={setDestacamentoNombre} esEnSede={esEnSede} placeholder="Ej: Comisaría 5°" />
          <CampoTexto label="Teléfono" valor={destacamentoTelefono} onChange={setDestacamentoTelefono} esEnSede={esEnSede} placeholder="Ej: 11-1234-5678" />
          <CampoTexto label="Dirección" valor={destacamentoDireccion} onChange={setDestacamentoDireccion} esEnSede={esEnSede} placeholder="Ej: Av. Siempre Viva 123" />
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>📞 Contactos</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Medio de comunicación del campamento *</label>
            <input type="text" value={medioComunicacion} onChange={(e) => setMedioComunicacion(e.target.value)} placeholder="Celular del jefe de campo y/o jefe de rama" style={inputStyle} required />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Jefe de Campo (Nombre, apellido y Teléfono) *</label>
            <input type="text" value={jefeCampo} onChange={(e) => setJefeCampo(e.target.value)} placeholder="Ej: Juan Pérez - 11-1234-5678" style={inputStyle} required />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>OTROS (salidas, viajes, actividades especiales)</label>
            <textarea value={otrosDetalles} onChange={(e) => setOtrosDetalles(e.target.value)} placeholder="Detalles de traslados, actividades especiales, etc." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Zona Scouts del lugar *</label>
            {esEnSede ? (
              <div style={{
                padding: '8px 12px',
                fontSize: '13px',
                border: '2px solid #B8D4B8',
                borderRadius: '8px',
                backgroundColor: '#F0F7F0',
                color: '#24352A',
                fontFamily: 'Oswald, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '14px' }}>🏠</span>
                <span style={{ flex: 1 }}>{zonaScouts || '-'}</span>
                <span style={{
                  fontSize: '9px',
                  color: '#5C7A5E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600'
                }}>
                  Sede
                </span>
              </div>
            ) : (
              <input type="text" value={zonaScouts} onChange={(e) => setZonaScouts(e.target.value)} placeholder="Ej: Zona 5, Zona 12..." style={inputStyle} required />
            )}
          </div>

          <div style={{ fontSize: '10px', color: '#7A7364', marginTop: '-6px' }}>
            Si no sabés la zona, consultar en la oficina nacional al 11-3640-3544
          </div>
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>👥 Participantes</div>

          {/* Beneficiarios */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Beneficiarios ({beneficiariosSeleccionados.size} seleccionados)
              </label>

              {beneficiarios.length > 0 && (
                <select
                  value={filtroRamaParticipantes}
                  onChange={(e) => setFiltroRamaParticipantes(e.target.value)}
                  style={{ padding: '4px 10px', fontSize: '11px', border: '2px solid #D1C9B4', borderRadius: '6px', outline: 'none', fontFamily: 'Oswald, sans-serif', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  <option value="Todas">Todas las ramas</option>
                  <option value="Manada">🐺 Manada</option>
                  <option value="Unidad Scout">⚜️ Unidad Scout</option>
                  <option value="Caminantes">🏔️ Caminantes</option>
                  <option value="Rovers">🔥 Rovers</option>
                </select>
              )}
            </div>

            {beneficiarios.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#F5F5F5', borderRadius: '8px', color: '#7A7364', fontSize: '12px' }}>
                No hay beneficiarios activos para tu rama
              </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '2px solid #E8DEC4', borderRadius: '8px', padding: '4px', backgroundColor: 'white' }}>
                {beneficiariosFiltrados.map((b) => {
                  const seleccionado = beneficiariosSeleccionados.has(b.id)
                  const nombreCompleto = formatearNombreConH(b.nombre, b.apellido, b.tiene_hermanos)

                  return (
                    <div
                      key={b.id}
                      onClick={() => toggleBeneficiario(b.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: seleccionado ? '#F3ECD8' : 'transparent',
                        borderBottom: '1px solid #F3ECD8'
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '4px',
                        border: '2px solid #D1C9B4',
                        backgroundColor: seleccionado ? '#24352A' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {seleccionado && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#24352A', fontWeight: seleccionado ? '600' : '400' }}>
                          {nombreCompleto}
                        </div>
                        <div style={{ fontSize: '10px', color: '#7A7364' }}>{b.rama}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Adultos */}
          <div>
            <label style={labelStyle}>Adultos ({adultos.length})</label>

            <div style={{ fontSize: '10px', color: '#7A7364', marginBottom: '8px' }}>
              Escribí el nombre y apellido del adulto que va a la salida.
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={nuevoAdulto}
                onChange={(e) => setNuevoAdulto(e.target.value)}
                placeholder="Nombre y apellido"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarAdultoManual() } }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={agregarAdultoManual} style={{ padding: '8px 16px', backgroundColor: '#5C7A5E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                + Agregar
              </button>
            </div>

            {adultos.length > 0 && (
              <div>
                <label style={labelStyle}>Agregados ({adultos.length})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {adultos.map((adulto, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#F0F7F0', border: '1px solid #B8D4B8', borderRadius: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#24352A' }}>👤 {adulto.nombre}</span>
                      <button type="button" onClick={() => quitarAdulto(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BF4E30', fontSize: '14px', padding: '2px 6px' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>🚗 Transportes</div>

          <div style={{ fontSize: '11px', color: '#7A7364', marginBottom: '12px' }}>
            Agregá tantos transportes como necesites (públicos/privados contratados y vehículos propios)
          </div>

          {transportes.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              {transportes.map((t, idx) => (
                <div key={idx} style={{ backgroundColor: '#FAF8F4', border: '2px solid #D1C9B4', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#24352A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t.tipo === 'publico' ? '🚌 Transporte contratado' : '🚗 Vehículo propio'}
                    </span>
                    <button type="button" onClick={() => quitarTransporte(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BF4E30', fontSize: '14px', padding: '2px 6px' }}>🗑️</button>
                  </div>

                  {t.tipo === 'publico' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelSmallStyle}>Razón Social / Empresa</label>
                        <input type="text" value={t.razon_social} onChange={(e) => actualizarTransporte(idx, 'razon_social', e.target.value)} style={inputSmallStyle} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelSmallStyle}>Dirección</label>
                        <input type="text" value={t.direccion} onChange={(e) => actualizarTransporte(idx, 'direccion', e.target.value)} style={inputSmallStyle} />
                      </div>
                      <div>
                        <label style={labelSmallStyle}>Teléfono</label>
                        <input type="text" value={t.telefono} onChange={(e) => actualizarTransporte(idx, 'telefono', e.target.value)} style={inputSmallStyle} />
                      </div>
                      <div>
                        <label style={labelSmallStyle}>N° de Habilitación</label>
                        <input type="text" value={t.nro_habilitacion} onChange={(e) => actualizarTransporte(idx, 'nro_habilitacion', e.target.value)} style={inputSmallStyle} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><label style={labelSmallStyle}>Tipo</label><input type="text" value={t.vehiculo_tipo} onChange={(e) => actualizarTransporte(idx, 'vehiculo_tipo', e.target.value)} placeholder="Ej: Auto, Camioneta..." style={inputSmallStyle} /></div>
                      <div><label style={labelSmallStyle}>Marca</label><input type="text" value={t.vehiculo_marca} onChange={(e) => actualizarTransporte(idx, 'vehiculo_marca', e.target.value)} style={inputSmallStyle} /></div>
                      <div><label style={labelSmallStyle}>Modelo</label><input type="text" value={t.vehiculo_modelo} onChange={(e) => actualizarTransporte(idx, 'vehiculo_modelo', e.target.value)} style={inputSmallStyle} /></div>
                      <div><label style={labelSmallStyle}>Patente</label><input type="text" value={t.vehiculo_patente} onChange={(e) => actualizarTransporte(idx, 'vehiculo_patente', e.target.value)} style={inputSmallStyle} /></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => agregarTransporte('publico')} style={{ padding: '8px 16px', backgroundColor: '#5C7A5E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              + Transporte contratado
            </button>
            <button type="button" onClick={() => agregarTransporte('propio')} style={{ padding: '8px 16px', backgroundColor: '#C48A2A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              + Vehículo propio
            </button>
          </div>
        </div>

        <div style={seccionStyle}>
          <div style={seccionHeaderStyle}>📎 Programa de Actividades</div>

          <div style={{ fontSize: '11px', color: '#7A7364', marginBottom: '12px' }}>
            Subí el archivo (Word, PDF, etc.) o pegá un link de Drive
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Subir archivo</label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '2px dashed #D1C9B4', borderRadius: '8px', cursor: 'pointer', backgroundColor: programaArchivo ? '#D1FAE5' : '#FAF8F4', fontSize: '12px', color: programaArchivo ? '#166534' : '#7A7364', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {programaArchivo ? `📄 ${programaArchivo.name}` : '📎 Seleccionar archivo'}
              <input
                type="file"
                accept=".doc,.docx,.pdf,.odt,.txt,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      setMessage({ text: '⚠️ El archivo no debe superar 10 MB', type: 'warning' })
                      return
                    }
                    setProgramaArchivo(file)
                    setProgramaLink('')
                    setMessage({ text: '', type: '' })
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
            {programaArchivo && (
              <button type="button" onClick={() => setProgramaArchivo(null)} style={{ marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#BF4E30', fontSize: '11px', fontFamily: 'Oswald, sans-serif', textDecoration: 'underline' }}>
                ✕ Quitar archivo
              </button>
            )}
          </div>

          <div>
            <label style={labelStyle}>O link de Drive / externo</label>
            <input type="url" value={programaLink} onChange={(e) => { setProgramaLink(e.target.value); if (e.target.value) setProgramaArchivo(null) }} placeholder="https://drive.google.com/..." style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => navigate('/permisos')} disabled={saving} style={{ flex: 1, padding: '12px', backgroundColor: '#E8DEC4', color: '#24352A', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', opacity: saving ? 0.5 : 1 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', backgroundColor: '#24352A', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'wait' : 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando...' : '💾 Crear Permiso'}
          </button>
        </div>
      </form>
    </div>
  )
}

const seccionStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '16px',
  border: '2px solid #E8DEC4',
  padding: '16px',
  marginBottom: '16px'
}

const seccionHeaderStyle: React.CSSProperties = {
  fontSize: 'clamp(13px, 3vw, 15px)',
  fontWeight: '700',
  color: '#24352A',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  paddingBottom: '10px',
  marginBottom: '14px',
  borderBottom: '2px dashed #E8DEC4'
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#7A7364',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'block',
  marginBottom: '6px'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '2px solid #D1C9B4',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  boxSizing: 'border-box',
  backgroundColor: 'white'
}

const labelSmallStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#7A7364',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'block',
  marginBottom: '4px'
}

const inputSmallStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: '12px',
  border: '2px solid #D1C9B4',
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  boxSizing: 'border-box',
  backgroundColor: 'white'
}