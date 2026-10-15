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
  fecha_ingreso_grupo: string
  tiene_uniforme: boolean
  fecha_entrega_uniforme: string
  hizo_tada: boolean
}

interface Campamento {
  id: string
  nombre: string
  fecha_inicio: string
  tipo: string
}

interface ProgresionManada {
  fecha_ingreso_manada: string | null
  fecha_pata_tierna: string | null
  fecha_saltador: string | null
  fecha_rastreador: string | null
  fecha_cazador: string | null
  nombre_caza: string | null
  tiene_promesa_manada: boolean
  fecha_promesa_manada: string | null
}

interface ProgresionUnidad {
  fecha_ingreso_unidad: string | null
  fecha_pista: string | null
  fecha_senda: string | null
  fecha_rumbo: string | null
  fecha_travesia: string | null
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string | null
  padrino_promesa_scout: string | null
}

interface ProgresionCaminantes {
  fecha_ingreso_caminantes: string | null
  fecha_ceremonia_bienvenida: string | null
  fecha_etapa1: string | null
  fecha_etapa2: string | null
  fecha_etapa3: string | null
  fecha_etapa4: string | null
  elemento_elegido: string[] | null
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string | null
  padrino_promesa_scout: string | null
}

interface ProgresionRovers {
  fecha_ingreso_rovers: string | null
  fecha_encuentro: string | null
  fecha_compromiso: string | null
  fecha_proyeccion: string | null
  fecha_partida: string | null
  nombre_totem: string | null
  campamento_totem: string | null
  tiene_promesa_scout: boolean
  fecha_promesa_scout: string | null
  padrino_promesa_scout: string | null
}

// ============================================
// COLORES
// ============================================
const COL = {
  verdeScout: '#24352A',
  dorado: '#C48A2A',
  crema: '#E8DEC4',
  terracota: '#BF4E30',
  grisClaro: '#F5F1E8'
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

// Genera un SVG con las iniciales del beneficiario (para cuando no tiene foto)
const generarInicialesSVG = (nombre: string, apellido: string): string => {
  const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="12" fill="#24352A"/>
    <text x="48" y="60" font-family="helvetica, sans-serif" font-size="38" fill="white" text-anchor="middle" font-weight="bold">${iniciales}</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

// Devuelve las ramas activas a partir de la rama inicial
const getRamasDesdeInicial = (ramaInicial: string): string[] => {
  const orden = ['Manada', 'Unidad Scout', 'Caminantes', 'Rovers']
  const idx = orden.indexOf(ramaInicial)
  if (idx === -1) return ['Manada', 'Unidad Scout', 'Caminantes', 'Rovers']
  return orden.slice(idx)
}

// Calcula la rama inicial del beneficiario
const calcularRamaInicial = (
  beneficiario: Beneficiario,
  prog: {
    manada: ProgresionManada | null
    unidad: ProgresionUnidad | null
    caminantes: ProgresionCaminantes | null
    rovers: ProgresionRovers | null
  }
): string => {
  const fechas: Array<{ rama: string; fecha: string }> = []

  if (prog.manada?.fecha_ingreso_manada) {
    fechas.push({ rama: 'Manada', fecha: prog.manada.fecha_ingreso_manada })
  }
  if (prog.unidad?.fecha_ingreso_unidad) {
    fechas.push({ rama: 'Unidad Scout', fecha: prog.unidad.fecha_ingreso_unidad })
  }
  if (prog.caminantes?.fecha_ingreso_caminantes) {
    fechas.push({ rama: 'Caminantes', fecha: prog.caminantes.fecha_ingreso_caminantes })
  }
  if (prog.rovers?.fecha_ingreso_rovers) {
    fechas.push({ rama: 'Rovers', fecha: prog.rovers.fecha_ingreso_rovers })
  }

  if (fechas.length === 0) {
    return beneficiario.rama === 'RoverPartida' ? 'Rovers' : beneficiario.rama
  }

  fechas.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return fechas[0].rama
}

// ============================================
// GENERAR PDF
// ============================================
export const generarPDFFichaSeguimiento = async (
  beneficiario: Beneficiario,
  progresiones: {
    manada: ProgresionManada | null
    unidad: ProgresionUnidad | null
    caminantes: ProgresionCaminantes | null
    rovers: ProgresionRovers | null
  },
  campamentos: Campamento[]
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const ancho = 210
  const alto = 297
  const margen = 8
  const anchoUtil = ancho - margen * 2

  let y = margen

  // ============================================
  // HEADER: Logo (izq) + Título + Foto (der)
  // ============================================
  const tamanoLogo = 18
  const tamanoFoto = 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  const xFecha = ancho - margen - 18
  doc.text(formatFechaHoy(), xFecha, y + 3, { align: 'right' })
  doc.text('v1.0', xFecha, y + 6.5, { align: 'right' })

  // Logo
  try {
    const logoBase64 = await cargarImagenBase64('/logo-grupo.png')
    doc.addImage(logoBase64, 'PNG', margen, y, tamanoLogo, tamanoLogo)
  } catch (err) {
    console.warn('No se pudo cargar el logo:', err)
  }

  // Foto del beneficiario
  try {
    let fotoBase64: string
    if (beneficiario.foto_url) {
      fotoBase64 = await cargarImagenBase64(beneficiario.foto_url)
    } else {
      fotoBase64 = generarInicialesSVG(beneficiario.nombre, beneficiario.apellido)
    }
    const tamanoFotoReal = 16
    doc.addImage(fotoBase64, 'PNG', ancho - margen - tamanoFotoReal, y, tamanoFotoReal, tamanoFotoReal)
  } catch (err) {
    console.warn('No se pudo cargar la foto:', err)
    try {
      const inicialesBase64 = generarInicialesSVG(beneficiario.nombre, beneficiario.apellido)
      const tamanoFotoReal = 16
      doc.addImage(inicialesBase64, 'PNG', ancho - margen - tamanoFotoReal, y, tamanoFotoReal, tamanoFotoReal)
    } catch {}
  }

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Ficha de Seguimiento Personal', ancho / 2, y + 8, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('Grupo Scout N°117 "Ntra. Sra. de Loreto"', ancho / 2, y + 13, { align: 'center' })

  y += Math.max(tamanoLogo, tamanoFoto) + 4

  // ============================================
  // DATOS DEL BENEFICIARIO
  // ============================================
  const altoFilaHeader = 6
  const yInicioDatosBenef = y

  // Fila 1
  doc.setFillColor(COL.crema)
  doc.rect(margen, y, 35, altoFilaHeader, 'F')
  doc.rect(margen + 120, y, 30, altoFilaHeader, 'F')

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.rect(margen, y, 35, altoFilaHeader, 'S')
  doc.rect(margen + 35, y, 85, altoFilaHeader, 'S')
  doc.rect(margen + 120, y, 30, altoFilaHeader, 'S')
  doc.rect(margen + 150, y, anchoUtil - 150, altoFilaHeader, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text('Nombre y Apellido', margen + 1, y + 4)
  doc.text('Ingreso al grupo', margen + 121, y + 4)

  doc.setFont('helvetica', 'normal')
  const nombreCompleto = `${beneficiario.apellido || ''}, ${beneficiario.nombre || ''}`.trim()
  doc.text(nombreCompleto, margen + 36, y + 4)
  const textoIngreso = formatFecha(beneficiario.fecha_ingreso_grupo)
  if (textoIngreso) {
    doc.text(textoIngreso, margen + 151, y + 4)
  }

  y += altoFilaHeader

  // Fila 2
  doc.setFillColor(COL.crema)
  doc.rect(margen, y, 45, altoFilaHeader, 'F')
  doc.rect(margen + 100, y, 35, altoFilaHeader, 'F')

  doc.rect(margen, y, 45, altoFilaHeader, 'S')
  doc.rect(margen + 45, y, 55, altoFilaHeader, 'S')
  doc.rect(margen + 100, y, 35, altoFilaHeader, 'S')
  doc.rect(margen + 135, y, anchoUtil - 135, altoFilaHeader, 'S')

  doc.setFont('helvetica', 'bold')
  doc.text('Recibió uniforme el día', margen + 1, y + 4)
  doc.text('Promesa Scout', margen + 101, y + 4)

  doc.setFont('helvetica', 'normal')
  const textoUniforme = formatFecha(beneficiario.fecha_entrega_uniforme)
  if (textoUniforme) {
    doc.text(textoUniforme, margen + 46, y + 4)
  }

  let fechaPromesaScout = ''
  if (progresiones.unidad?.tiene_promesa_scout && progresiones.unidad.fecha_promesa_scout) {
    fechaPromesaScout = formatFecha(progresiones.unidad.fecha_promesa_scout)
  } else if (progresiones.caminantes?.tiene_promesa_scout && progresiones.caminantes.fecha_promesa_scout) {
    fechaPromesaScout = formatFecha(progresiones.caminantes.fecha_promesa_scout)
  } else if (progresiones.rovers?.tiene_promesa_scout && progresiones.rovers.fecha_promesa_scout) {
    fechaPromesaScout = formatFecha(progresiones.rovers.fecha_promesa_scout)
  }
  doc.text(fechaPromesaScout, margen + 136, y + 4)

  y += altoFilaHeader

  // Borde externo del bloque de datos
  const yFinDatosBenef = y
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.6)
  doc.rect(margen - 1, yInicioDatosBenef - 1, anchoUtil + 2, yFinDatosBenef - yInicioDatosBenef + 2, 'S')

  y += 2

  // ============================================
  // RAMA INICIAL
  // ============================================
  const ramaInicial = calcularRamaInicial(beneficiario, progresiones)
  const ramasMostrar = getRamasDesdeInicial(ramaInicial)

  const ramaPromesaScout: string | null =
    progresiones.unidad?.tiene_promesa_scout && progresiones.unidad.fecha_promesa_scout ? 'Unidad Scout' :
    progresiones.caminantes?.tiene_promesa_scout && progresiones.caminantes.fecha_promesa_scout ? 'Caminantes' :
    progresiones.rovers?.tiene_promesa_scout && progresiones.rovers.fecha_promesa_scout ? 'Rovers' :
    null

  // ============================================
  // FUNCIÓN: dibujar bloque de rama
  // ============================================
  const dibujarBloqueRama = (
    nombreRama: string,
    fechaIngreso: string,
    filasProgresion: Array<{ label: string; fecha: string; extra?: string }>,
    filasExtras: Array<{ label: string; valor: string }>,
    campamentosRama: Campamento[]
  ) => {
    const altoTitulo = 7
    const altoFilaProg = 5.5
    const altoFilaCampHeader = 5.5
    const gapEntreTablas = 3

    const yInicioBloque = y

    // --- Título de la rama (sin línea inferior) ---
    const anchoFecha = anchoUtil - 140

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.4)

    // Fondo crema en la parte "Fecha de ingreso"
    doc.setFillColor(COL.crema)
    doc.rect(margen + 140, y, anchoFecha, altoTitulo, 'F')

    // Línea superior del título (ancho completo)
    doc.line(margen, y, margen + anchoUtil, y)
    // Línea izquierda
    doc.line(margen, y, margen, y + altoTitulo)
    // Línea derecha
    doc.line(margen + anchoUtil, y, margen + anchoUtil, y + altoTitulo)
    // Línea vertical entre "rama" y "fecha ingreso"
    doc.line(margen + 140, y, margen + 140, y + altoTitulo)
    // NO dibujamos la línea inferior

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(nombreRama, margen + 2, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('Fecha de ingreso', margen + 141, y + 3)
    doc.text('a la rama', margen + 141, y + 6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    if (fechaIngreso) {
      doc.text(fechaIngreso, margen + 140 + anchoFecha - 2, y + 4.5, { align: 'right' })
    }

    y += altoTitulo

    // Anchos de las 2 tablas
    const anchoProg = 90
    const anchoCamp = anchoUtil - anchoProg - gapEntreTablas
    const xProg = margen
    const xCamp = margen + anchoProg + gapEntreTablas

    // Alturas
    const cantFilasProg = filasProgresion.length

    const col1 = campamentosRama.filter((_, i) => i % 2 === 0)
    const col2 = campamentosRama.filter((_, i) => i % 2 === 1)
    const cantFilasCamp = Math.max(col1.length, col2.length, 4)

    const yInicialTablas = y

    // ============================================
    // TABLA 1: PROGRESIONES
    // ============================================
    let yProg = yInicialTablas

    doc.setFillColor(COL.crema)
    doc.rect(xProg, yProg, anchoProg, altoFilaCampHeader, 'F')
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(xProg, yProg, anchoProg, altoFilaCampHeader, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text('Progresiones', xProg + anchoProg / 2, yProg + 4, { align: 'center' })

    yProg += altoFilaCampHeader

    for (let i = 0; i < cantFilasProg; i++) {
      const filaProg = filasProgresion[i]

      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.2)
      doc.rect(xProg, yProg, 30, altoFilaProg, 'S')
      doc.rect(xProg + 30, yProg, anchoProg - 30, altoFilaProg, 'S')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)

      if (filaProg.fecha) {
        doc.text(filaProg.fecha, xProg + 2, yProg + 3.8)
        doc.setFont('helvetica', 'bold')

        const textHito = filaProg.extra
          ? `${filaProg.label} - ${filaProg.extra}`
          : filaProg.label

        const anchoMaxHito = anchoProg - 30 - 4
        let textoMostrar = textHito
        while (doc.getTextWidth(textoMostrar) > anchoMaxHito && textoMostrar.length > 0) {
          textoMostrar = textoMostrar.slice(0, -1)
        }
        if (textoMostrar.length < textHito.length) {
          textoMostrar = textoMostrar.slice(0, -1) + '…'
        }

        doc.text(textoMostrar, xProg + 32, yProg + 3.8)
      }

      yProg += altoFilaProg
    }

    // ============================================
    // TABLA 2: CAMPAMENTOS
    // ============================================
    let yCamp = yInicialTablas

    doc.setFillColor(COL.crema)
    doc.rect(xCamp, yCamp, anchoCamp, altoFilaCampHeader, 'F')
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(xCamp, yCamp, anchoCamp, altoFilaCampHeader, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text('Sus Campamentos', xCamp + anchoCamp / 2, yCamp + 4, { align: 'center' })

    yCamp += altoFilaCampHeader

    for (let i = 0; i < cantFilasCamp; i++) {
      const camp1 = col1[i]
      const camp2 = col2[i]

      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.2)
      doc.rect(xCamp, yCamp, anchoCamp / 2, altoFilaProg, 'S')
      doc.rect(xCamp + anchoCamp / 2, yCamp, anchoCamp / 2, altoFilaProg, 'S')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)

      if (camp1) {
        const texto = `${formatFecha(camp1.fecha_inicio)} · ${camp1.nombre}`.substring(0, 38)
        doc.text(texto, xCamp + 1, yCamp + 3.6)
      }
      if (camp2) {
        const texto = `${formatFecha(camp2.fecha_inicio)} · ${camp2.nombre}`.substring(0, 38)
        doc.text(texto, xCamp + anchoCamp / 2 + 1, yCamp + 3.6)
      }

      yCamp += altoFilaProg
    }

    y = Math.max(yProg, yCamp)

    // ============================================
    // Filas extras (sin línea superior, solo lateral + inferior)
    // ============================================
    for (const extra of filasExtras) {
      const anchoTotal = anchoUtil

      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.2)

      // Solo línea inferior
      doc.line(margen, y + altoFilaProg, margen + anchoTotal, y + altoFilaProg)
      // Líneas laterales
      doc.line(margen, y, margen, y + altoFilaProg)
      doc.line(margen + anchoTotal, y, margen + anchoTotal, y + altoFilaProg)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(0, 0, 0)

      const textoCompleto = `${extra.label}: ${extra.valor}`
      const anchoMaximo = anchoTotal - 4
      let textoMostrar = textoCompleto
      while (doc.getTextWidth(textoMostrar) > anchoMaximo && textoMostrar.length > 0) {
        textoMostrar = textoMostrar.slice(0, -1)
      }
      if (textoMostrar.length < textoCompleto.length) {
        textoMostrar = textoMostrar.slice(0, -1) + '…'
      }

      doc.text(textoMostrar, margen + 2, y + 3.7)

      y += altoFilaProg
    }

    // Borde externo del bloque
    const yFinBloque = y
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.6)
    doc.rect(margen - 1, yInicioBloque - 1, anchoUtil + 2, yFinBloque - yInicioBloque + 2, 'S')

    y += 2
  }

  // ============================================
  // ASIGNAR CAMPAMENTOS A CADA RAMA
  // ============================================
  const asignarCampamentosARama = (campamento: Campamento): string | null => {
    const fecha = campamento.fecha_inicio
    if (!fecha) return null

    const fManada = progresiones.manada?.fecha_ingreso_manada || null
    const fUnidad = progresiones.unidad?.fecha_ingreso_unidad || null
    const fCaminantes = progresiones.caminantes?.fecha_ingreso_caminantes || null
    const fRovers = progresiones.rovers?.fecha_ingreso_rovers || null

    if (fRovers && fecha >= fRovers) return 'Rovers'
    if (fCaminantes && fecha >= fCaminantes) return 'Caminantes'
    if (fUnidad && fecha >= fUnidad) return 'Unidad Scout'
    if (fManada && fecha >= fManada) return 'Manada'

    return ramaInicial
  }

  const campsPorRama: Record<string, Campamento[]> = {
    'Manada': [],
    'Unidad Scout': [],
    'Caminantes': [],
    'Rovers': []
  }

  for (const c of campamentos) {
    const rama = asignarCampamentosARama(c)
    if (rama && campsPorRama[rama]) {
      campsPorRama[rama].push(c)
    }
  }

  for (const rama of Object.keys(campsPorRama)) {
    campsPorRama[rama].sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))
  }

  // ============================================
  // BLOQUE: MANADA
  // ============================================
  if (ramasMostrar.includes('Manada')) {
    const prog = progresiones.manada
    const filasProg: Array<{ label: string; fecha: string; extra?: string }> = []

    filasProg.push({ label: 'Pata Tierna', fecha: formatFecha(prog?.fecha_pata_tierna) })
    filasProg.push({ label: 'Saltador', fecha: formatFecha(prog?.fecha_saltador) })
    filasProg.push({ label: 'Rastreador', fecha: formatFecha(prog?.fecha_rastreador) })
    filasProg.push({ label: 'Cazador', fecha: formatFecha(prog?.fecha_cazador) })

    const filasExtras: Array<{ label: string; valor: string }> = []
    if (prog?.tiene_promesa_manada && prog.fecha_promesa_manada) {
      filasExtras.push({ label: 'Toma de promesa de LYL', valor: formatFecha(prog.fecha_promesa_manada) })
    }
    if (prog?.nombre_caza) {
      filasExtras.push({ label: 'Nombre de caza', valor: prog.nombre_caza })
    }

    dibujarBloqueRama(
      'Lobatos y Lobeznas:',
      formatFecha(prog?.fecha_ingreso_manada),
      filasProg,
      filasExtras,
      campsPorRama['Manada']
    )
  }

  // ============================================
  // BLOQUE: UNIDAD SCOUT
  // ============================================
  if (ramasMostrar.includes('Unidad Scout')) {
    const prog = progresiones.unidad
    const filasProg: Array<{ label: string; fecha: string; extra?: string }> = []

    filasProg.push({ label: 'Pista', fecha: formatFecha(prog?.fecha_pista) })
    filasProg.push({ label: 'Senda', fecha: formatFecha(prog?.fecha_senda) })
    filasProg.push({ label: 'Rumbo', fecha: formatFecha(prog?.fecha_rumbo) })
    filasProg.push({ label: 'Travesía', fecha: formatFecha(prog?.fecha_travesia) })

    const filasExtras: Array<{ label: string; valor: string }> = []
    if (ramaPromesaScout === 'Unidad Scout' && prog?.tiene_promesa_scout && prog.fecha_promesa_scout) {
      filasExtras.push({
        label: 'Promesa Scout',
        valor: `${formatFecha(prog.fecha_promesa_scout)}${prog.padrino_promesa_scout ? ' - Padrino: ' + prog.padrino_promesa_scout : ''}`
      })
    }

    dibujarBloqueRama(
      'Unidad Scout',
      formatFecha(prog?.fecha_ingreso_unidad),
      filasProg,
      filasExtras,
      campsPorRama['Unidad Scout']
    )
  }

  // ============================================
  // BLOQUE: CAMINANTES
  // ============================================
  if (ramasMostrar.includes('Caminantes')) {
    const prog = progresiones.caminantes
    const filasProg: Array<{ label: string; fecha: string; extra?: string }> = []

    const elementos: (string | null)[] = Array.isArray(prog?.elemento_elegido)
      ? prog.elemento_elegido
      : [null, null, null, null]

    const getElemento = (i: number): string => {
      const el = elementos[i]
      return el || ''
    }

    filasProg.push({ label: 'Etapa 1', fecha: formatFecha(prog?.fecha_etapa1), extra: getElemento(0) })
    filasProg.push({ label: 'Etapa 2', fecha: formatFecha(prog?.fecha_etapa2), extra: getElemento(1) })
    filasProg.push({ label: 'Etapa 3', fecha: formatFecha(prog?.fecha_etapa3), extra: getElemento(2) })
    filasProg.push({ label: 'Etapa 4', fecha: formatFecha(prog?.fecha_etapa4), extra: getElemento(3) })

    const filasExtras: Array<{ label: string; valor: string }> = []
    if (ramaPromesaScout === 'Caminantes' && prog?.tiene_promesa_scout && prog.fecha_promesa_scout) {
      filasExtras.push({
        label: 'Promesa Scout',
        valor: `${formatFecha(prog.fecha_promesa_scout)}${prog.padrino_promesa_scout ? ' - Padrino: ' + prog.padrino_promesa_scout : ''}`
      })
    }
    if (beneficiario.hizo_tada) {
      filasExtras.push({ label: 'TADA realizado', valor: 'Sí' })
    }

    dibujarBloqueRama(
      'Caminantes',
      formatFecha(prog?.fecha_ingreso_caminantes),
      filasProg,
      filasExtras,
      campsPorRama['Caminantes']
    )
  }

  // ============================================
  // BLOQUE: ROVERS
  // ============================================
  if (ramasMostrar.includes('Rovers')) {
    const prog = progresiones.rovers
    const filasProg: Array<{ label: string; fecha: string; extra?: string }> = []

    filasProg.push({ label: 'Encuentro', fecha: formatFecha(prog?.fecha_encuentro) })
    filasProg.push({ label: 'Compromiso', fecha: formatFecha(prog?.fecha_compromiso) })
    filasProg.push({ label: 'Proyección', fecha: formatFecha(prog?.fecha_proyeccion) })
    filasProg.push({ label: 'Partida', fecha: formatFecha(prog?.fecha_partida) })

    const filasExtras: Array<{ label: string; valor: string }> = []
    if (ramaPromesaScout === 'Rovers' && prog?.tiene_promesa_scout && prog.fecha_promesa_scout) {
      filasExtras.push({
        label: 'Promesa Scout',
        valor: `${formatFecha(prog.fecha_promesa_scout)}${prog.padrino_promesa_scout ? ' - Padrino: ' + prog.padrino_promesa_scout : ''}`
      })
    }
    if (prog?.nombre_totem) {
      const textoTotem = prog.campamento_totem
        ? `${prog.nombre_totem} - Campamento que lo recibió: ${prog.campamento_totem}`
        : prog.nombre_totem
      filasExtras.push({ label: 'Nombre de tótem', valor: textoTotem })
    }

    dibujarBloqueRama(
      'Rovers',
      formatFecha(prog?.fecha_ingreso_rovers),
      filasProg,
      filasExtras,
      campsPorRama['Rovers']
    )
  }

  // ============================================
  // GUARDAR
  // ============================================
  const nombreArchivo = `FichaSeguimiento-${beneficiario.apellido}-${beneficiario.nombre}.pdf`
    .replace(/\s+/g, '_')

  doc.save(nombreArchivo)
}