import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { enviarEmail } from '../lib/enviarEmail'

// ============================================
// ESTILOS BASE
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
export default function Inscripcion() {
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  // Foto
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  // Formulario
  const [form, setForm] = useState({
    email_contacto: '',

    // Menor
    menor_apellido_nombre: '',
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

  const setCampo = (key: string, valor: string) => {
    setForm(prev => ({ ...prev, [key]: valor }))
  }

  // ===== SUBIR FOTO =====
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('⚠️ La foto debe ser una imagen (JPG, PNG, etc.)')
      return
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('⚠️ La foto no puede superar los 5MB')
      return
    }

    setError('')
    setFotoFile(file)

    // Preview
    const reader = new FileReader()
    reader.onload = () => setFotoPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Subir a Supabase Storage
    setSubiendoFoto(true)
    try {
      const ext = file.name.split('.').pop()
      const nombreArchivo = `inscripcion-${Date.now()}.${ext}`
      const ruta = `${nombreArchivo}`

      const { error: uploadError } = await supabase.storage
        .from('inscripcion-fotos')
        .upload(ruta, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('inscripcion-fotos')
        .getPublicUrl(ruta)

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

  // ===== ENVIAR MAILS DE AVISO A ADMINS =====
  const enviarMailsAviso = async (datos: {
    menor_nombre: string
    menor_fecha_nacimiento: string
    adulto_email: string
    adulto_telefono: string
  }) => {
    try {
      // 1. Obtener mails de admins desde la DB
      const { data: admins, error: adminsError } = await supabase
        .from('usuarios')
        .select('email, rol')
        .eq('activo', true)
        .in('rol', ['SUPER_ADMIN', 'Jefatura'])

      if (adminsError) {
        console.error('Error al obtener admins:', adminsError)
      }

      // 2. Armar lista de destinatarios
      const mailsAdmins = (admins || [])
        .map(a => a.email)
        .filter((e): e is string => !!e && e.includes('@'))

      const destinatarios = [
        'grupo117@scouts.org.ar',
        ...mailsAdmins
      ]

      // 3. Calcular edad
      let edad: number | undefined = undefined
      if (datos.menor_fecha_nacimiento) {
        const hoy = new Date()
        const nac = new Date(datos.menor_fecha_nacimiento)
        nac.setDate(nac.getDate() + 1)
        let e = hoy.getFullYear() - nac.getFullYear()
        const m = hoy.getMonth() - nac.getMonth()
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--
        edad = e
      }

      // 4. Enviar
      await enviarEmail({
        tipo: 'nueva_inscripcion',
        destinatarios,
        datos: {
          menor_nombre: datos.menor_nombre,
          menor_fecha_nacimiento: datos.menor_fecha_nacimiento,
          menor_edad: edad,
          adulto_email: datos.adulto_email,
          adulto_telefono: datos.adulto_telefono
        }
      })
    } catch (err) {
      // No rompemos el flujo si falla el mail
      console.error('Error al enviar mails de aviso:', err)
    }
  }

  // ===== ENVIAR FORMULARIO =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones básicas
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

    setEnviando(true)

    try {
      // Preparar datos
      const datos = {
        email_contacto: form.email_contacto.trim(),

        menor_apellido_nombre: form.menor_apellido_nombre.trim(),
        menor_dni: form.menor_dni.trim(),
        menor_sexo: form.menor_sexo,
        menor_fecha_nacimiento: form.menor_fecha_nacimiento || null,
        menor_religion: form.menor_religion === 'Otros' ? (form.menor_religion_otro.trim() || 'Otros') : form.menor_religion,
        menor_religion_otro: form.menor_religion === 'Otros' ? form.menor_religion_otro.trim() : null,
        menor_nacionalidad: form.menor_nacionalidad.trim(),
        menor_provincia: form.menor_provincia.trim(),
        menor_localidad: form.menor_localidad.trim(),
        menor_codigo_postal: form.menor_codigo_postal.trim(),
        menor_direccion_calle: form.menor_direccion_calle.trim(),
        menor_direccion_numero: form.menor_direccion_numero.trim() || null,
        menor_direccion_piso_dpto: form.menor_direccion_piso_dpto.trim() || null,
        menor_telefono_emergencia: form.menor_telefono_emergencia.trim(),
        menor_telefono_emergencia_pertenece_a: form.menor_telefono_emergencia_pertenece_a.trim() || null,
        menor_celular: form.menor_celular.trim() || null,
        menor_obra_social: form.menor_obra_social.trim() || null,
        menor_obra_social_numero: form.menor_obra_social_numero.trim() || null,
        menor_colegio: form.menor_colegio.trim(),
        menor_estudios_cursados: form.menor_estudios_cursados.trim(),
        menor_alergias_dieta: form.menor_alergias_dieta.trim() || null,
        menor_foto_url: fotoUrl,

        madre_apellido_nombre: form.madre_apellido_nombre.trim(),
        madre_dni: form.madre_dni.trim(),
        madre_nacionalidad: form.madre_nacionalidad.trim(),
        madre_fecha_nacimiento: form.madre_fecha_nacimiento || null,
        madre_domicilio: form.madre_domicilio.trim(),
        madre_localidad: form.madre_localidad.trim(),
        madre_codigo_postal: form.madre_codigo_postal.trim(),
        madre_ocupacion: form.madre_ocupacion.trim(),
        madre_info_extra: form.madre_info_extra.trim() || null,

        padre_apellido_nombre: form.padre_apellido_nombre.trim(),
        padre_dni: form.padre_dni.trim(),
        padre_nacionalidad: form.padre_nacionalidad.trim(),
        padre_fecha_nacimiento: form.padre_fecha_nacimiento || null,
        padre_domicilio: form.padre_domicilio.trim(),
        padre_localidad: form.padre_localidad.trim(),
        padre_codigo_postal: form.padre_codigo_postal.trim(),
        padre_ocupacion: form.padre_ocupacion.trim(),
        padre_info_extra: form.padre_info_extra.trim() || null,

        adulto_a_cargo: form.adulto_a_cargo,
        info_importancia_menor: form.info_importancia_menor.trim() || null
      }

      // Insert en la tabla
      const { error: insertError } = await supabase
        .from('solicitudes_inscripcion')
        .insert(datos)

      if (insertError) throw insertError

      // Enviar mails de aviso a admins (no bloquea si falla)
      enviarMailsAviso({
        menor_nombre: datos.menor_apellido_nombre,
        menor_fecha_nacimiento: datos.menor_fecha_nacimiento || '',
        adulto_email: datos.email_contacto,
        adulto_telefono: datos.menor_telefono_emergencia
      })

      setEnviado(true)
    } catch (err: any) {
      console.error('Error al enviar:', err)
      setError(`❌ Error al enviar la solicitud: ${err.message}`)
    } finally {
      setEnviando(false)
    }
  }

  // ===== PANTALLA DE GRACIAS =====
  if (enviado) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: COLORES.fondo,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Oswald, sans-serif'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px 24px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          border: `2px solid ${COLORES.bordeSuave}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: COLORES.verdeScout,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px'
          }}>
            ¡Solicitud enviada!
          </h1>
          <p style={{
            fontSize: '15px',
            color: COLORES.textoPrincipal,
            lineHeight: 1.5,
            marginBottom: '20px'
          }}>
            Tu pedido de inscripción fue recibido correctamente. Nos vamos a contactar con vos a la brevedad.
          </p>
          <div style={{
            backgroundColor: '#F0F7F0',
            border: `2px solid #B8D4B8`,
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            color: COLORES.verdeClaro,
            fontStyle: 'italic'
          }}>
            💡 Recordá traer <strong>por duplicado</strong> las fotocopias de DNI del menor, del padre y de la madre, partida de nacimiento, vacunas y apto médico si corresponde.
          </div>
        </div>
      </div>
    )
  }

  // ===== PANTALLA DEL FORMULARIO =====
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORES.fondo,
      padding: '20px 16px 60px',
      fontFamily: 'Oswald, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          backgroundColor: COLORES.verdeScout,
          borderRadius: '16px',
          padding: '24px 20px',
          marginBottom: '20px',
          textAlign: 'center',
          border: `2px solid ${COLORES.terracota}`
        }}>
          <img
            src="/logo-grupo.png"
            alt="LoretApp"
            style={{
              height: '60px',
              width: '60px',
              objectFit: 'contain',
              marginBottom: '12px',
              borderRadius: '8px'
            }}
          />
          <h1 style={{
            fontSize: 'clamp(18px, 4vw, 22px)',
            fontWeight: '700',
            color: '#F3ECD8',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: '0 0 8px 0'
          }}>
            Inscripción
          </h1>
          <p style={{
            fontSize: 'clamp(13px, 3vw, 15px)',
            color: '#F3ECD8',
            margin: 0,
            letterSpacing: '0.5px'
          }}>
            Grupo Scout N°117 "Ntra. Sra. de Loreto"
          </p>
        </div>

        {/* Aviso de documentación */}
        <div style={{
          backgroundColor: '#FFF8E7',
          border: `2px solid ${COLORES.dorado}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: COLORES.textoPrincipal,
          lineHeight: 1.6
        }}>
          <div style={{ fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>
            📋 Documentación a acercar por duplicado:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Fotocopia del DNI del menor</li>
            <li>Fotocopia del DNI de la madre</li>
            <li>Fotocopia del DNI del padre</li>
            <li>Fotocopia de la partida de nacimiento</li>
            <li>Fotocopia de vacunas</li>
            <li>Apto médico (si tiene)</li>
            <li>Cualquier otra documentación relacionada (medidas judiciales, temas médicos especiales, etc.)</li>
          </ul>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>

          {/* ============ CONTACTO ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>📧 Contacto</div>

            <div style={gridFullStyle}>
              <div>
                <label style={labelStyle}>
                  Correo electrónico *
                  <span style={aclaracionStyle}>
                    (te vamos a avisar acá cuando se reciba la solicitud)
                  </span>
                </label>
                <input
                  type="email"
                  value={form.email_contacto}
                  onChange={(e) => setCampo('email_contacto', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          </div>

          {/* ============ DATOS DEL MENOR ============ */}
          <div style={seccionStyle}>
            <div style={tituloSeccionStyle}>👦 Datos del menor</div>

            <div style={gridFullStyle}>
              <div>
                <label style={labelStyle}>
                  Apellido y Nombre del menor *
                  <span style={aclaracionStyle}>(como figura en el DNI)</span>
                </label>
                <input
                  type="text"
                  value={form.menor_apellido_nombre}
                  onChange={(e) => setCampo('menor_apellido_nombre', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ ...gridStyle, marginTop: '14px' }}>
              <div>
                <label style={labelStyle}>N° de DNI del menor *</label>
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
                  placeholder="Ej: Buenos Aires"
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
                <label style={labelStyle}>
                  Teléfono de Emergencia *
                  <span style={aclaracionStyle}>(sin guiones ni espacios)</span>
                </label>
                <input
                  type="tel"
                  value={form.menor_telefono_emergencia}
                  onChange={(e) => setCampo('menor_telefono_emergencia', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Pertenece a *
                  <span style={aclaracionStyle}>(a quién pertenece el teléfono de emergencia)</span>
                </label>
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
                <label style={labelStyle}>
                  Celular del menor
                  <span style={aclaracionStyle}>(solo si tiene - sin guiones)</span>
                </label>
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
                  Foto reciente
                  <span style={aclaracionStyle}>(4x4 o similar, opcional - para su futuro perfil)</span>
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
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
                <label style={labelStyle}>
                  Apellido y Nombre *
                  <span style={aclaracionStyle}>(como figura en el DNI)</span>
                </label>
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
                <label style={labelStyle}>
                  Otra información de importancia
                  <span style={aclaracionStyle}>(opcional)</span>
                </label>
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
                <label style={labelStyle}>
                  Apellido y Nombre *
                  <span style={aclaracionStyle}>(como figura en el DNI)</span>
                </label>
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
                <label style={labelStyle}>
                  Otra información de importancia
                  <span style={aclaracionStyle}>(opcional)</span>
                </label>
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
                <label style={labelStyle}>
                  Alguna otra información de importancia del menor
                  <span style={aclaracionStyle}>(opcional)</span>
                </label>
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

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={enviando || subiendoFoto}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: (enviando || subiendoFoto) ? COLORES.textoSecundario : COLORES.verdeScout,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: (enviando || subiendoFoto) ? 'wait' : 'pointer',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '16px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {enviando ? '⏳ Enviando...' : subiendoFoto ? '⏳ Subiendo foto...' : '✅ Enviar Solicitud'}
          </button>
        </form>
      </div>
    </div>
  )
}