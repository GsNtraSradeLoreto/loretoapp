import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// COLORES Y ESTILOS BASE (mismos que Inscripcion)
// ============================================
const COLORES = {
  verdeScout: '#24352A',
  terracota: '#BF4E30',
  verdeClaro: '#5C7A5E',
  dorado: '#C48A2A',
  textoPrincipal: '#24352A',
  textoSecundario: '#7A7364',
  bordeSuave: '#E8DEC4',
  fondo: '#F5F1E8'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: `2px solid ${COLORES.bordeSuave}`,
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  boxSizing: 'border-box',
  color: COLORES.textoPrincipal
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: COLORES.textoPrincipal,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
  fontFamily: 'Oswald, sans-serif'
}

const aclaracionStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontStyle: 'italic',
  color: COLORES.textoSecundario,
  fontWeight: '400',
  textTransform: 'none',
  letterSpacing: '0',
  marginTop: '2px'
}

const seccionStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '20px 16px',
  marginBottom: '20px',
  border: `2px solid ${COLORES.bordeSuave}`,
  fontFamily: 'Oswald, sans-serif'
}

const tituloSeccionStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '700',
  color: COLORES.verdeScout,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '16px',
  paddingBottom: '10px',
  borderBottom: `2px dashed ${COLORES.bordeSuave}`
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '14px'
}

const gridFullStyle: React.CSSProperties = {
  ...gridStyle,
  gridTemplateColumns: '1fr'
}

// ============================================
// COMPONENTE
// ============================================
export default function BeneficiarioNuevo() {
  const navigate = useNavigate()
  const { isSuperAdmin, isJefatura } = useAuth()

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  // Foto
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  // Permisos: solo SUPER_ADMIN y Jefatura
  const puedeCrear = isSuperAdmin || isJefatura

  const hoy = new Date().toISOString().split('T')[0]

  // Formulario
  const [form, setForm] = useState({
    // Rama + fechas del grupo
    rama: '',
    fecha_ingreso_grupo: hoy,
    tiene_hermanos: false,

    // Email de contacto
    email_contacto: '',

    // Menor (datos del beneficiario)
    menor_apellido: '',
    menor_nombre: '',
    menor_dni: '',
    menor_sexo: '',
    menor_fecha_nacimiento: '',
    menor_religion: '',
    menor_religion_otro: '',
    menor_nacionalidad: '',
    menor_provincia: '',
    menor_localidad: '',
    menor_codigo_postal: '',
    menor_direccion_calle: '',
    menor_direccion_numero: '',
    menor_direccion_piso_dpto: '',
    menor_telefono_emergencia: '',
    menor_telefono_emergencia_pertenece_a: '',
    menor_celular: '',
    menor_obra_social: '',
    menor_obra_social_numero: '',
    menor_colegio: '',
    menor_estudios_cursados: '',
    menor_alergias_dieta: '',

    // Extras
    tiene_uniforme: false,
    fecha_entrega_uniforme: '',
    hizo_tada: false,
    observaciones: '',

    // Madre
    madre_apellido_nombre: '',
    madre_dni: '',
    madre_nacionalidad: '',
    madre_fecha_nacimiento: '',
    madre_domicilio: '',
    madre_localidad: '',
    madre_codigo_postal: '',
    madre_ocupacion: '',
    madre_info_extra: '',

    // Padre
    padre_apellido_nombre: '',
    padre_dni: '',
    padre_nacionalidad: '',
    padre_fecha_nacimiento: '',
    padre_domicilio: '',
    padre_localidad: '',
    padre_codigo_postal: '',
    padre_ocupacion: '',
    padre_info_extra: '',

    // Otra info
    adulto_a_cargo: '',
    info_importancia_menor: ''
  })

  const setCampo = (key: string, valor: any) => {
    setForm(prev => ({ ...prev, [key]: valor }))
  }

  // ===== SUBIR FOTO =====
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('⚠️ La foto debe ser una imagen (JPG, PNG, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('⚠️ La foto no puede superar los 5MB')
      return
    }

    setError('')
    setFotoFile(file)

    const reader = new FileReader()
    reader.onload = () => setFotoPreview(reader.result as string)
    reader.readAsDataURL(file)

    setSubiendoFoto(true)
    try {
      const ext = file.name.split('.').pop()
      const nombreArchivo = `nuevo-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('beneficiarios')
        .upload(nombreArchivo, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('beneficiarios')
        .getPublicUrl(nombreArchivo)

      setFotoUrl(publicUrl)
    } catch (err: any) {
      console.error('Error al subir foto:', err)
      setError(`❌ Error al subir la foto: ${err.message}`)
      setFotoFile(null)
      setFotoPreview(null)
    } finally {
      setSubiendoFoto(false)
    }
  }

  // ===== GUARDAR =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!puedeCrear) {
      setError('⚠️ No tenés permisos para crear beneficiarios')
      return
    }

    // Validaciones
    if (!form.rama) {
      setError('⚠️ Seleccioná la rama')
      return
    }
    if (!form.menor_sexo) {
      setError('⚠️ Seleccioná el sexo del menor')
      return
    }
    if (!form.adulto_a_cargo) {
      setError('⚠️ Indicá quién está a cargo del menor')
      return
    }
    if (form.menor_religion === 'Otros' && !form.menor_religion_otro.trim()) {
      setError('⚠️ Especificá la religión')
      return
    }

    setGuardando(true)

    try {
      // 1) INSERT beneficiarios
      const { data: nuevoBenef, error: errBen } = await supabase
        .from('beneficiarios')
        .insert({
          nombre: form.menor_nombre.trim(),
          apellido: form.menor_apellido.trim(),
          rama: form.rama,
          estado: 'activo',
          fecha_nacimiento: form.menor_fecha_nacimiento || null,
          fecha_ingreso_grupo: form.fecha_ingreso_grupo || null,
          fecha_ingreso_rama: form.fecha_ingreso_grupo || null,
          tiene_uniforme: form.tiene_uniforme,
          fecha_entrega_uniforme: form.fecha_entrega_uniforme || null,
          tiene_hermanos: form.tiene_hermanos,
          hizo_tada: form.hizo_tada,
          observaciones: form.observaciones.trim() || null,
          foto_url: fotoUrl
        })
        .select()
        .single()

      if (errBen) throw errBen
      const beneficiarioId = nuevoBenef.id

      // 2) INSERT datos_personales_beneficiario
      const { error: errDatos } = await supabase
        .from('datos_personales_beneficiario')
        .insert({
          beneficiario_id: beneficiarioId,
          email_contacto: form.email_contacto.trim() || null,
          dni: form.menor_dni.trim() || null,
          sexo: form.menor_sexo || null,
          religion: form.menor_religion === 'Otros' ? 'Otros' : form.menor_religion || null,
          religion_otro: form.menor_religion === 'Otros' ? form.menor_religion_otro.trim() : null,
          nacionalidad: form.menor_nacionalidad.trim() || null,
          provincia: form.menor_provincia.trim() || null,
          localidad: form.menor_localidad.trim() || null,
          codigo_postal: form.menor_codigo_postal.trim() || null,
          direccion_calle: form.menor_direccion_calle.trim() || null,
          direccion_numero: form.menor_direccion_numero.trim() || null,
          direccion_piso_dpto: form.menor_direccion_piso_dpto.trim() || null,
          telefono_emergencia: form.menor_telefono_emergencia.trim() || null,
          telefono_emergencia_pertenece_a: form.menor_telefono_emergencia_pertenece_a.trim() || null,
          celular: form.menor_celular.trim() || null,
          obra_social: form.menor_obra_social.trim() || null,
          obra_social_numero: form.menor_obra_social_numero.trim() || null,
          colegio: form.menor_colegio.trim() || null,
          estudios_cursados: form.menor_estudios_cursados.trim() || null,
          alergias_dieta: form.menor_alergias_dieta.trim() || null,
          madre_apellido_nombre: form.madre_apellido_nombre.trim() || null,
          madre_dni: form.madre_dni.trim() || null,
          madre_nacionalidad: form.madre_nacionalidad.trim() || null,
          madre_fecha_nacimiento: form.madre_fecha_nacimiento || null,
          madre_domicilio: form.madre_domicilio.trim() || null,
          madre_localidad: form.madre_localidad.trim() || null,
          madre_codigo_postal: form.madre_codigo_postal.trim() || null,
          madre_ocupacion: form.madre_ocupacion.trim() || null,
          madre_info_extra: form.madre_info_extra.trim() || null,
          padre_apellido_nombre: form.padre_apellido_nombre.trim() || null,
          padre_dni: form.padre_dni.trim() || null,
          padre_nacionalidad: form.padre_nacionalidad.trim() || null,
          padre_fecha_nacimiento: form.padre_fecha_nacimiento || null,
          padre_domicilio: form.padre_domicilio.trim() || null,
          padre_localidad: form.padre_localidad.trim() || null,
          padre_codigo_postal: form.padre_codigo_postal.trim() || null,
          padre_ocupacion: form.padre_ocupacion.trim() || null,
          padre_info_extra: form.padre_info_extra.trim() || null,
          adulto_a_cargo: form.adulto_a_cargo || null,
          info_importancia_menor: form.info_importancia_menor.trim() || null
        })

      if (errDatos) throw errDatos

      // 3) INSERT legajo vacío
      const { error: errLegajo } = await supabase
        .from('legajos')
        .insert({
          beneficiario_id: beneficiarioId,
          ficha_datos_personales: false,
          ficha_seguimiento: false,
          autorizacion_ingreso: false,
          salidas_cercanas: false,
          uso_imagen: false,
          declaracion_jurada_salud: false,
          autorizacion_retirarse: false,
          partida_nacimiento: false,
          fotocopia_dni_beneficiario: false,
          fotocopia_dni_padre: false,
          fotocopia_dni_madre: false,
          fotocopia_vacunas: false,
          otros: false
        })

      if (errLegajo) throw errLegajo

      // 4) INSERT progresión de la rama
      const tablaProgresion = 
        form.rama === 'Manada' ? 'progresion_manada' :
        form.rama === 'Unidad Scout' ? 'progresion_unidad' :
        form.rama === 'Caminantes' ? 'progresion_caminantes' :
        'progresion_rovers'

      const campoFechaIngreso =
        form.rama === 'Manada' ? 'fecha_ingreso_manada' :
        form.rama === 'Unidad Scout' ? 'fecha_ingreso_unidad' :
        form.rama === 'Caminantes' ? 'fecha_ingreso_caminantes' :
        'fecha_ingreso_rovers'

      const { error: errProg } = await supabase
        .from(tablaProgresion)
        .insert({
          beneficiario_id: beneficiarioId,
          [campoFechaIngreso]: form.fecha_ingreso_grupo || hoy,
          fecha_periodo_introductorio: form.fecha_ingreso_grupo || hoy,
          progresion_actual: 'Periodo Introductorio',
          oculto: false
        })

      if (errProg) throw errProg

      // Todo ok → ir al perfil del nuevo beneficiario
      navigate(`/beneficiario/${beneficiarioId}`)
    } catch (err: any) {
      console.error('Error al guardar:', err)
      setError(`❌ Error: ${err.message}`)
    } finally {
      setGuardando(false)
    }
  }

  // ===== SIN PERMISOS =====
  if (!puedeCrear) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Oswald, sans-serif' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ color: COLORES.terracota, textTransform: 'uppercase' }}>
          No tenés permisos para crear beneficiarios
        </h2>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: COLORES.verdeScout,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase'
          }}
        >
          ← Volver al Dashboard
        </button>
      </div>
    )
  }

  // ===== FORMULARIO =====
  return (
    <div style={{
      minHeight: '100vh',
      padding: '20px 16px 60px',
      fontFamily: 'Oswald, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          backgroundColor: COLORES.verdeScout,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          border: `2px solid ${COLORES.terracota}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(18px, 4vw, 22px)',
              fontWeight: '700',
              color: '#F3ECD8',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: 0
            }}>
              ➕ Nuevo Beneficiario
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#D1C9B4',
              margin: '4px 0 0 0',
              textTransform: 'uppercase'
            }}>
              Grupo Scout N°117
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#F3ECD8',
              border: '2px solid #F3ECD8',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            ✕ Cancelar
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ============ DATOS DEL GRUPO ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>📌 Datos del Grupo</div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Rama *</label>
                <select
                  value={form.rama}
                  onChange={(e) => setCampo('rama', e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Manada">🐺 Manada</option>
                  <option value="Unidad Scout">⚜️ Unidad Scout</option>
                  <option value="Caminantes">🏔️ Caminantes</option>
                  <option value="Rovers">🔥 Rovers</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha de ingreso al grupo *</label>
                <input
                  type="date"
                  value={form.fecha_ingreso_grupo}
                  onChange={(e) => setCampo('fecha_ingreso_grupo', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridFullStyle, marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={form.tiene_hermanos}
                  onChange={(e) => setCampo('tiene_hermanos', e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: COLORES.verdeScout }}
                  id="tiene_hermanos"
                />
                <label htmlFor="tiene_hermanos" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                  Tiene hermanos en el grupo
                </label>
              </div>
            </div>
          </div>

          {/* ============ CONTACTO ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>📧 Contacto</div>
            <div style={gridFullStyle}>
              <div>
                <label style={labelStyle}>Correo electrónico principal</label>
                <input
                  type="email"
                  value={form.email_contacto}
                  onChange={(e) => setCampo('email_contacto', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ============ DATOS DEL MENOR ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>👦 Datos del Menor</div>

            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Apellidos *</label>
                <input
                  type="text"
                  value={form.menor_apellido}
                  onChange={(e) => setCampo('menor_apellido', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Nombres *</label>
                <input
                  type="text"
                  value={form.menor_nombre}
                  onChange={(e) => setCampo('menor_nombre', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>N° de DNI *</label>
                <input
                  type="text"
                  value={form.menor_dni}
                  onChange={(e) => setCampo('menor_dni', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Sexo *</label>
                <select
                  value={form.menor_sexo}
                  onChange={(e) => setCampo('menor_sexo', e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="X">X</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha de Nacimiento *</label>
                <input
                  type="date"
                  value={form.menor_fecha_nacimiento}
                  onChange={(e) => setCampo('menor_fecha_nacimiento', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Religión *</label>
                <select
                  value={form.menor_religion}
                  onChange={(e) => setCampo('menor_religion', e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Católica">Católica</option>
                  <option value="Cristiano Evangélico">Cristiano Evangélico</option>
                  <option value="LDS (Mormón)">LDS (Mormón)</option>
                  <option value="Judía">Judía</option>
                  <option value="Budista">Budista</option>
                  <option value="Islámica">Islámica</option>
                  <option value="Católica Ortodoxa">Católica Ortodoxa</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            {form.menor_religion === 'Otros' && (
              <div style={{ ...gridFullStyle, marginTop: '14px' }}>
                <div>
                  <label style={labelStyle}>Especificar religión *</label>
                  <input
                    type="text"
                    value={form.menor_religion_otro}
                    onChange={(e) => setCampo('menor_religion_otro', e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>
            )}

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Nacionalidad *</label>
                <input
                  type="text"
                  value={form.menor_nacionalidad}
                  onChange={(e) => setCampo('menor_nacionalidad', e.target.value)}
                  placeholder="Ej: Argentina"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Provincia *</label>
                <input
                  type="text"
                  value={form.menor_provincia}
                  onChange={(e) => setCampo('menor_provincia', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Localidad *</label>
                <input
                  type="text"
                  value={form.menor_localidad}
                  onChange={(e) => setCampo('menor_localidad', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Código Postal *</label>
                <input
                  type="text"
                  value={form.menor_codigo_postal}
                  onChange={(e) => setCampo('menor_codigo_postal', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Dirección - Calle *</label>
                <input
                  type="text"
                  value={form.menor_direccion_calle}
                  onChange={(e) => setCampo('menor_direccion_calle', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Número</label>
                <input
                  type="text"
                  value={form.menor_direccion_numero}
                  onChange={(e) => setCampo('menor_direccion_numero', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Piso/Dpto.</label>
                <input
                  type="text"
                  value={form.menor_direccion_piso_dpto}
                  onChange={(e) => setCampo('menor_direccion_piso_dpto', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Teléfono de Emergencia *</label>
                <input
                  type="tel"
                  value={form.menor_telefono_emergencia}
                  onChange={(e) => setCampo('menor_telefono_emergencia', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Pertenece a *</label>
                <input
                  type="text"
                  value={form.menor_telefono_emergencia_pertenece_a}
                  onChange={(e) => setCampo('menor_telefono_emergencia_pertenece_a', e.target.value)}
                  placeholder="Ej: Mamá, Papá, Abuela..."
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Celular del menor</label>
                <input
                  type="tel"
                  value={form.menor_celular}
                  onChange={(e) => setCampo('menor_celular', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Obra Social / Prepaga</label>
                <input
                  type="text"
                  value={form.menor_obra_social}
                  onChange={(e) => setCampo('menor_obra_social', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>N° de Afiliado</label>
                <input
                  type="text"
                  value={form.menor_obra_social_numero}
                  onChange={(e) => setCampo('menor_obra_social_numero', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Colegio al que asiste *</label>
                <input
                  type="text"
                  value={form.menor_colegio}
                  onChange={(e) => setCampo('menor_colegio', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Estudios Cursados *</label>
                <input
                  type="text"
                  value={form.menor_estudios_cursados}
                  onChange={(e) => setCampo('menor_estudios_cursados', e.target.value)}
                  placeholder="Ej: Primaria, Secundaria..."
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridFullStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>
                  Alergias o Dieta Especial
                  <span style={aclaracionStyle}>(si no tiene, escribir "Ninguna")</span>
                </label>
                <textarea
                  value={form.menor_alergias_dieta}
                  onChange={(e) => setCampo('menor_alergias_dieta', e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Foto */}
            <div style={{ ...gridFullStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>
                  Foto
                  <span style={aclaracionStyle}>(opcional - podés cargarla después)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{
                    display: 'inline-block',
                    padding: '10px 16px',
                    backgroundColor: COLORES.fondo,
                    border: `2px dashed ${COLORES.bordeSuave}`,
                    borderRadius: '8px',
                    cursor: subiendoFoto ? 'wait' : 'pointer',
                    fontSize: '13px',
                    color: COLORES.textoSecundario,
                    fontWeight: '600'
                  }}>
                    {subiendoFoto ? '⏳ Subiendo...' : fotoFile ? '🔄 Cambiar foto' : '📷 Subir foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      style={{ display: 'none' }}
                      disabled={subiendoFoto}
                    />
                  </label>
                  {fotoPreview && (
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: `2px solid ${COLORES.bordeSuave}`
                      }}
                    />
                  )}
                  {fotoUrl && (
                    <span style={{ color: COLORES.verdeClaro, fontSize: '13px', fontWeight: '600' }}>
                      ✅ Foto cargada
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Extras */}
            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={form.tiene_uniforme}
                  onChange={(e) => setCampo('tiene_uniforme', e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: COLORES.verdeScout }}
                  id="tiene_uniforme"
                />
                <label htmlFor="tiene_uniforme" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                  Tiene uniforme
                </label>
              </div>
              {form.tiene_uniforme && (
                <div>
                  <label style={labelStyle}>Fecha entrega uniforme</label>
                  <input
                    type="date"
                    value={form.fecha_entrega_uniforme}
                    onChange={(e) => setCampo('fecha_entrega_uniforme', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            {(form.rama === 'Caminantes' || form.rama === 'Rovers') && (
              <div style={{ ...gridFullStyle, marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={form.hizo_tada}
                    onChange={(e) => setCampo('hizo_tada', e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: COLORES.verdeScout }}
                    id="hizo_tada"
                  />
                  <label htmlFor="hizo_tada" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                    Realizó el TADA
                  </label>
                </div>
              </div>
            )}

            <div style={{ ...gridFullStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Observaciones internas</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setCampo('observaciones', e.target.value)}
                  rows={2}
                  placeholder="Observaciones visibles solo para el equipo de dirigentes..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* ============ DATOS DE LA MADRE ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>👩 Datos de la Madre</div>
            <div style={{
              fontSize: '12px',
              fontStyle: 'italic',
              color: COLORES.textoSecundario,
              marginBottom: '14px'
            }}>
              (en caso de no saber o no tener algún dato, escribir: NO POSEE)
            </div>

            <div style={gridFullStyle}>
              <div>
                <label style={labelStyle}>Apellido y Nombre *</label>
                <input
                  type="text"
                  value={form.madre_apellido_nombre}
                  onChange={(e) => setCampo('madre_apellido_nombre', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>N° de DNI *</label>
                <input
                  type="text"
                  value={form.madre_dni}
                  onChange={(e) => setCampo('madre_dni', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Nacionalidad *</label>
                <input
                  type="text"
                  value={form.madre_nacionalidad}
                  onChange={(e) => setCampo('madre_nacionalidad', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Fecha de Nacimiento *</label>
                <input
                  type="date"
                  value={form.madre_fecha_nacimiento}
                  onChange={(e) => setCampo('madre_fecha_nacimiento', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Ocupación *</label>
                <input
                  type="text"
                  value={form.madre_ocupacion}
                  onChange={(e) => setCampo('madre_ocupacion', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Domicilio *</label>
                <input
                  type="text"
                  value={form.madre_domicilio}
                  onChange={(e) => setCampo('madre_domicilio', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Localidad *</label>
                <input
                  type="text"
                  value={form.madre_localidad}
                  onChange={(e) => setCampo('madre_localidad', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Código Postal *</label>
                <input
                  type="text"
                  value={form.madre_codigo_postal}
                  onChange={(e) => setCampo('madre_codigo_postal', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridFullStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Otra información de importancia</label>
                <textarea
                  value={form.madre_info_extra}
                  onChange={(e) => setCampo('madre_info_extra', e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* ============ DATOS DEL PADRE ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>👨 Datos del Padre</div>
            <div style={{
              fontSize: '12px',
              fontStyle: 'italic',
              color: COLORES.textoSecundario,
              marginBottom: '14px'
            }}>
              (en caso de no saber o no tener algún dato, escribir: NO POSEE)
            </div>

            <div style={gridFullStyle}>
              <div>
                <label style={labelStyle}>Apellido y Nombre *</label>
                <input
                  type="text"
                  value={form.padre_apellido_nombre}
                  onChange={(e) => setCampo('padre_apellido_nombre', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>N° de DNI *</label>
                <input
                  type="text"
                  value={form.padre_dni}
                  onChange={(e) => setCampo('padre_dni', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Nacionalidad *</label>
                <input
                  type="text"
                  value={form.padre_nacionalidad}
                  onChange={(e) => setCampo('padre_nacionalidad', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Fecha de Nacimiento *</label>
                <input
                  type="date"
                  value={form.padre_fecha_nacimiento}
                  onChange={(e) => setCampo('padre_fecha_nacimiento', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Ocupación *</label>
                <input
                  type="text"
                  value={form.padre_ocupacion}
                  onChange={(e) => setCampo('padre_ocupacion', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Domicilio *</label>
                <input
                  type="text"
                  value={form.padre_domicilio}
                  onChange={(e) => setCampo('padre_domicilio', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Localidad *</label>
                <input
                  type="text"
                  value={form.padre_localidad}
                  onChange={(e) => setCampo('padre_localidad', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Código Postal *</label>
                <input
                  type="text"
                  value={form.padre_codigo_postal}
                  onChange={(e) => setCampo('padre_codigo_postal', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridFullStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Otra información de importancia</label>
                <textarea
                  value={form.padre_info_extra}
                  onChange={(e) => setCampo('padre_info_extra', e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* ============ OTRA INFORMACIÓN ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>📝 Otra información de interés</div>

            <div style={gridFullStyle}>
              <div>
                <label style={labelStyle}>¿Quién se encuentra a cargo del menor? *</label>
                <select
                  value={form.adulto_a_cargo}
                  onChange={(e) => setCampo('adulto_a_cargo', e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Madre y padre">Madre y padre</option>
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <div style={{ ...gridFullStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>Alguna otra información de importancia del menor</label>
                <textarea
                  value={form.info_importancia_menor}
                  onChange={(e) => setCampo('info_importancia_menor', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: `2px solid #BF4E30`,
              color: '#BF4E30',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {error}
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={guardando}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '16px',
                backgroundColor: '#E8DEC4',
                color: COLORES.verdeScout,
                border: 'none',
                borderRadius: '12px',
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
              type="submit"
              disabled={guardando || subiendoFoto}
              style={{
                flex: 2,
                minWidth: '200px',
                padding: '16px',
                backgroundColor: (guardando || subiendoFoto) ? COLORES.textoSecundario : COLORES.verdeScout,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: (guardando || subiendoFoto) ? 'wait' : 'pointer',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '16px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {guardando ? '⏳ Guardando...' : subiendoFoto ? '⏳ Subiendo foto...' : '✅ Crear Beneficiario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}