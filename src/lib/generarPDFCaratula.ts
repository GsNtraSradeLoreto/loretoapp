import jsPDF from 'jspdf'

// ============================================
// TIPOS
// ============================================
interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  fecha_nacimiento: string
}

interface DatosPersonales {
  email_contacto?: string | null
  dni?: string | null
  sexo?: string | null
  religion?: string | null
  religion_otro?: string | null
  nacionalidad?: string | null
  provincia?: string | null
  localidad?: string | null
  codigo_postal?: string | null
  direccion_calle?: string | null
  direccion_numero?: string | null
  direccion_piso_dpto?: string | null
  telefono_emergencia?: string | null
  telefono_emergencia_pertenece_a?: string | null
  celular?: string | null
  obra_social?: string | null
  obra_social_numero?: string | null
  colegio?: string | null
  estudios_cursados?: string | null
  alergias?: string | null
  dieta_especial?: string | null
  // Madre
  madre_apellido_nombre?: string | null
  madre_dni?: string | null
  madre_nacionalidad?: string | null
  madre_fecha_nacimiento?: string | null
  madre_domicilio?: string | null
  madre_localidad?: string | null
  madre_codigo_postal?: string | null
  madre_ocupacion?: string | null
  madre_info_extra?: string | null
  // Padre
  padre_apellido_nombre?: string | null
  padre_dni?: string | null
  padre_nacionalidad?: string | null
  padre_fecha_nacimiento?: string | null
  padre_domicilio?: string | null
  padre_localidad?: string | null
  padre_codigo_postal?: string | null
  padre_ocupacion?: string | null
  padre_info_extra?: string | null
  // Extras
  adulto_a_cargo?: string | null
  info_importancia_menor?: string | null
}

// ============================================
// COLORES (coinciden con la app)
// ============================================
const COL = {
  verdeScout: '#24352A',
  dorado: '#C48A2A',
  crema: '#E8DEC4',
  terracota: '#BF4E30',
  fondoGris: '#F5F1E8'
}

// ============================================
// HELPERS
// ============================================
const formatFecha = (fecha: string | null | undefined): string => {
  if (!fecha) return ''
  const partes = fecha.split('-')
  if (partes.length !== 3) return ''
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const formatFechaHoy = (): string => {
  const hoy = new Date()
  const dia = String(hoy.getDate()).padStart(2, '0')
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const anio = hoy.getFullYear()
  return `${dia}/${mes}/${anio}`
}

// Cargar imagen como base64 (necesario para jsPDF)
const cargarImagenBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject('No se pudo obtener el contexto del canvas')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject('No se pudo cargar la imagen')
    img.src = url
  })
}

// ============================================
// GENERAR PDF
// ============================================
export const generarPDFCaratula = async (
  beneficiario: Beneficiario,
  datos: DatosPersonales | null
) => {
  // Crear PDF A4 vertical
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const ancho = 210
  const margen = 10
  const anchoUtil = ancho - margen * 2

  // ============================================
  // HEADER (compactado)
  // ============================================
  let y = 8

  // Logo (arriba a la izquierda) — 20x20mm
  try {
    const logoBase64 = await cargarImagenBase64('/logo-grupo.png')
    doc.addImage(logoBase64, 'PNG', margen, y, 20, 20)
  } catch (err) {
    console.warn('No se pudo cargar el logo:', err)
  }

  // Datos del grupo (centrado, compactado)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(COL.verdeScout)
  doc.text('Grupo Scout Ntra. Sra. de Loreto', ancho / 2, y + 5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Colón 1341 (C.P. 1674) - Villa Raffo', ancho / 2, y + 9.5, { align: 'center' })
  doc.text('Distrito 1 - Zona 9', ancho / 2, y + 13, { align: 'center' })
  doc.text('Tres de Febrero - Buenos Aires', ancho / 2, y + 16.5, { align: 'center' })

  // Fecha (arriba a la derecha)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(COL.verdeScout)
  doc.text(`Villa Raffo, ${formatFechaHoy()}`, ancho - margen, y + 5, { align: 'right' })

  // Versión (arriba a la derecha, debajo de la fecha)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(100, 100, 100)
  doc.text('V7.10-2026', ancho - margen, y + 9, { align: 'right' })

  // Línea horizontal después del header
  y = y + 22
  doc.setDrawColor(COL.verdeScout)
  doc.setLineWidth(0.5)
  doc.line(margen, y, ancho - margen, y)

  y += 4

  // ============================================
  // FUNCIÓN AUXILIAR: dibujar bloque con título
  // ============================================
  const dibujarTituloBloque = (titulo: string, yActual: number) => {
    doc.setFillColor(COL.verdeScout)
    doc.rect(margen, yActual, anchoUtil, 5.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor('#FFFFFF')
    doc.text(titulo, margen + 2, yActual + 4)
    return yActual + 5.5
  }

  // ============================================
  // FUNCIÓN AUXILIAR: dibujar fila con campos
  // ============================================
  const dibujarFila = (
    campos: Array<{ label: string; valor: string; ancho: number }>,
    yActual: number,
    alto: number = 9
  ) => {
    let xActual = margen

    for (const campo of campos) {
      doc.setFillColor(COL.crema)
      doc.rect(xActual, yActual, campo.ancho, alto / 2, 'F')
      doc.setDrawColor(COL.verdeScout)
      doc.setLineWidth(0.3)
      doc.rect(xActual, yActual, campo.ancho, alto, 'S')

      // Label arriba
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(COL.verdeScout)
      const labelTexto = doc.splitTextToSize(campo.label, campo.ancho - 4)
      doc.text(labelTexto, xActual + 2, yActual + 2.8)

      // Valor abajo
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(0, 0, 0)
      const valorTexto = doc.splitTextToSize(campo.valor || '', campo.ancho - 4)
      if (valorTexto.length > 0) {
        doc.text(valorTexto.slice(0, 2), xActual + 2, yActual + alto / 2 + 2.8)
      }

      xActual += campo.ancho
    }

    return yActual + alto
  }

  // ============================================
  // BLOQUE 1 — DATOS DEL BENEFICIARIO
  // ============================================
  y = dibujarTituloBloque('DATOS PERSONALES DEL BENEFICIARIO', y)

  y = dibujarFila([
    { label: 'Apellidos y Nombres', valor: `${beneficiario.apellido || ''} ${beneficiario.nombre || ''}`.trim(), ancho: anchoUtil * 0.65 },
    { label: 'Fecha de Nacimiento', valor: formatFecha(beneficiario.fecha_nacimiento), ancho: anchoUtil * 0.35 }
  ], y, 11)

  const religionFinal = datos?.religion === 'Otro'
    ? (datos?.religion_otro || '')
    : (datos?.religion || '')

  y = dibujarFila([
    { label: 'N° Documento', valor: datos?.dni || '', ancho: anchoUtil * 0.35 },
    { label: 'Nacionalidad', valor: datos?.nacionalidad || '', ancho: anchoUtil * 0.30 },
    { label: 'Religión', valor: religionFinal, ancho: anchoUtil * 0.35 }
  ], y, 11)

  const domicilioCompleto = [
    datos?.direccion_calle,
    datos?.direccion_numero,
    datos?.direccion_piso_dpto
  ].filter(Boolean).join(' - ')

  y = dibujarFila([
    { label: 'Domicilio (Calle - Nro. - Piso-Dpto.)', valor: domicilioCompleto, ancho: anchoUtil * 0.55 },
    { label: 'Localidad', valor: datos?.localidad || '', ancho: anchoUtil * 0.25 },
    { label: 'Cód. Post.', valor: datos?.codigo_postal || '', ancho: anchoUtil * 0.20 }
  ], y, 11)

  y = dibujarFila([
    { label: 'Teléfono Emergencia', valor: datos?.telefono_emergencia || '', ancho: anchoUtil * 0.35 },
    { label: 'Pertenece a', valor: datos?.telefono_emergencia_pertenece_a || '', ancho: anchoUtil * 0.30 },
    { label: 'Obra Social', valor: datos?.obra_social || '', ancho: anchoUtil * 0.20 },
    { label: 'N° Afiliado', valor: datos?.obra_social_numero || '', ancho: anchoUtil * 0.15 }
  ], y, 11)

  y += 2

  // ============================================
  // BLOQUE 2 — DATOS DE LA MADRE
  // ============================================
  y = dibujarTituloBloque('DATOS PERSONALES DE LA MADRE', y)

  y = dibujarFila([
    { label: 'Apellidos y Nombres', valor: datos?.madre_apellido_nombre || '', ancho: anchoUtil * 0.65 },
    { label: 'Fecha de Nacimiento', valor: formatFecha(datos?.madre_fecha_nacimiento), ancho: anchoUtil * 0.35 }
  ], y, 11)

  y = dibujarFila([
    { label: 'N° Documento', valor: datos?.madre_dni || '', ancho: anchoUtil * 0.35 },
    { label: 'Nacionalidad', valor: datos?.madre_nacionalidad || '', ancho: anchoUtil * 0.30 },
    { label: 'Ocupación', valor: datos?.madre_ocupacion || '', ancho: anchoUtil * 0.35 }
  ], y, 11)

  y = dibujarFila([
    { label: 'Domicilio', valor: datos?.madre_domicilio || '', ancho: anchoUtil * 0.55 },
    { label: 'Localidad', valor: datos?.madre_localidad || '', ancho: anchoUtil * 0.25 },
    { label: 'Cód. Post.', valor: datos?.madre_codigo_postal || '', ancho: anchoUtil * 0.20 }
  ], y, 11)

  y += 2

  // ============================================
  // BLOQUE 3 — DATOS DEL PADRE
  // ============================================
  y = dibujarTituloBloque('DATOS PERSONALES DEL PADRE', y)

  y = dibujarFila([
    { label: 'Apellidos y Nombres', valor: datos?.padre_apellido_nombre || '', ancho: anchoUtil * 0.65 },
    { label: 'Fecha de Nacimiento', valor: formatFecha(datos?.padre_fecha_nacimiento), ancho: anchoUtil * 0.35 }
  ], y, 11)

  y = dibujarFila([
    { label: 'N° Documento', valor: datos?.padre_dni || '', ancho: anchoUtil * 0.35 },
    { label: 'Nacionalidad', valor: datos?.padre_nacionalidad || '', ancho: anchoUtil * 0.30 },
    { label: 'Ocupación', valor: datos?.padre_ocupacion || '', ancho: anchoUtil * 0.35 }
  ], y, 11)

  y = dibujarFila([
    { label: 'Domicilio', valor: datos?.padre_domicilio || '', ancho: anchoUtil * 0.55 },
    { label: 'Localidad', valor: datos?.padre_localidad || '', ancho: anchoUtil * 0.25 },
    { label: 'Cód. Post.', valor: datos?.padre_codigo_postal || '', ancho: anchoUtil * 0.20 }
  ], y, 11)

  y += 2

  // ============================================
  // BLOQUE 4 — ADULTO A CARGO
  // ============================================
  y = dibujarTituloBloque('ADULTO-S A CARGO DEL MENOR', y)

  y = dibujarFila([
    { label: 'Adulto a cargo', valor: datos?.adulto_a_cargo || '', ancho: anchoUtil }
  ], y, 11)

  y += 2

  // ============================================
  // BLOQUE 5 — SE ADJUNTA AL LEGAJO (compactado)
  // ============================================
  y = dibujarTituloBloque('SE ADJUNTA AL LEGAJO LA SIGUIENTE DOCUMENTACIÓN:', y)

  const documentos = [
    'Historia Clínica',
    'Autorización para ingreso de menores de 18 años',
    'Autorización anual para Salidas Cercanas',
    'Fotocopia primera y segunda hoja DNI del beneficiario',
    'Fotocopia primera y segunda hoja DNI del padre',
    'Fotocopia primera y segunda hoja DNI de la madre',
    'Fotocopia partida de nacimiento',
    'Fotocopia calendario de vacunación',
    'Autorización de uso de imagen',
    'Otro:'
  ]

  const anchoTablaDocs = anchoUtil * 0.65
  const anchoRevisiones = anchoUtil * 0.35
  const xDocs = margen
  const xRevisiones = margen + anchoTablaDocs

  // Fila del sub-encabezado
  const altoSubHeader = 5
  doc.setFillColor(COL.crema)
  doc.rect(xRevisiones, y, anchoRevisiones, altoSubHeader, 'F')
  doc.setDrawColor(COL.verdeScout)
  doc.setLineWidth(0.3)
  doc.rect(xRevisiones, y, anchoRevisiones, altoSubHeader, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(COL.verdeScout)
  doc.text('Revisiones', xRevisiones + anchoRevisiones / 2, y + 3.5, { align: 'center' })

  y += altoSubHeader

  const altoFilaDoc = 4.5
  const anchoColRevision = anchoRevisiones / 4

  for (const docTexto of documentos) {
    // Celda del documento
    doc.setDrawColor(COL.verdeScout)
    doc.setLineWidth(0.3)
    doc.rect(xDocs, y, anchoTablaDocs, altoFilaDoc, 'S')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0, 0, 0)
    doc.text(docTexto, xDocs + 2, y + 3)

    // 4 columnas de revisiones
    for (let i = 0; i < 4; i++) {
      const xRev = xRevisiones + i * anchoColRevision
      doc.rect(xRev, y, anchoColRevision, altoFilaDoc, 'S')
    }

    y += altoFilaDoc
  }

  y += 2

  // ============================================
  // BLOQUE 6 — ALERGIAS
  // ============================================
  y = dibujarTituloBloque('ALERGIAS:', y)

  const altoAlergias = 9
  doc.setDrawColor(COL.verdeScout)
  doc.setLineWidth(0.3)
  doc.rect(margen, y, anchoUtil, altoAlergias, 'S')

  if (datos?.alergias) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    const textoAlergias = doc.splitTextToSize(datos.alergias, anchoUtil - 4)
    doc.text(textoAlergias.slice(0, 2), margen + 2, y + 4)
  }

  y += altoAlergias + 2

  // ============================================
  // BLOQUE 6b — DIETA ESPECIAL
  // ============================================
  y = dibujarTituloBloque('DIETA ESPECIAL:', y)

  const altoDieta = 9
  doc.setDrawColor(COL.verdeScout)
  doc.setLineWidth(0.3)
  doc.rect(margen, y, anchoUtil, altoDieta, 'S')

  if (datos?.dieta_especial) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    const textoDieta = doc.splitTextToSize(datos.dieta_especial, anchoUtil - 4)
    doc.text(textoDieta.slice(0, 2), margen + 2, y + 4)
  }

  y += altoDieta + 2

  // ============================================
  // BLOQUE 7 — OTRA INFORMACIÓN
  // ============================================
  y = dibujarTituloBloque('ALGUNA OTRA INFORMACIÓN DE IMPORTANCIA DEL MENOR QUE QUIERA MENCIONAR:', y)

  // Alto de la caja = lo que queda de la hoja (con mínimo 12mm)
  const altoUltimaCaja = Math.max(12, 297 - margen - y)
  doc.setDrawColor(COL.verdeScout)
  doc.setLineWidth(0.3)
  doc.rect(margen, y, anchoUtil, altoUltimaCaja, 'S')

  if (datos?.info_importancia_menor) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    const textoInfo = doc.splitTextToSize(datos.info_importancia_menor, anchoUtil - 4)
    doc.text(textoInfo, margen + 2, y + 4)
  }

  // ============================================
  // GUARDAR
  // ============================================
  const nombreArchivo = `Caratula-${beneficiario.apellido}-${beneficiario.nombre}.pdf`
    .replace(/\s+/g, '_')

  doc.save(nombreArchivo)
}