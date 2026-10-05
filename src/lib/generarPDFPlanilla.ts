import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============================================
// TIPOS
// ============================================
interface Beneficiario {
  id: string
  nombre: string
  apellido: string
  rama: string
  estado: string
  tiene_hermanos: boolean
}

interface Movimiento {
  id: string
  anio: number
  rama: string
  concepto: string
  beneficiario_id: string | null
  categoria: string
  nombre_libre: string | null
  fecha_pago: string
  monto: number
  pagado_por?: string | null
  recibo_entregado?: boolean | null
  mes_inicio?: string | null
  mes_fin?: string | null
  no_aplica?: boolean | null
}

interface Observacion {
  id: string
  anio: number
  rama: string
  concepto: string
  beneficiario_id: string | null
  nombre_libre: string | null
  observacion: string
}

interface Asistencia {
  id: string
  anio: number
  rama: string
  concepto: string
  beneficiario_id: string | null
  nombre_libre: string | null
  asiste: 'si' | 'no' | 'no_se_sabe'
}

type Concepto = 'afiliacion' | 'cuotas' | 'camp_corto' | 'camp_anual'
type Rama = 'Manada' | 'Unidad Scout' | 'Caminantes' | 'Rovers' | 'Dirigentes y otros'

// ============================================
// HELPERS
// ============================================
const MESES_CUOTAS = [
  { key: '04', label: 'ABR' },
  { key: '05', label: 'MAY' },
  { key: '06', label: 'JUN' },
  { key: '07', label: 'JUL' },
  { key: '08', label: 'AGO' },
  { key: '09', label: 'SEP' },
  { key: '10', label: 'OCT' },
  { key: '11', label: 'NOV' },
  { key: '12', label: 'DIC' }
]

const FORMATO_OFICIO_LANDSCAPE: [number, number] = [356, 216]

// Grosor de la línea de corte
const GROSOR_LINEA_CORTE = 0.5

// ============================================
// COLORES POR RAMA (mismos que la web, en RGB)
// ============================================
interface ColorRamaPDF {
  color: [number, number, number]       // color del header de la tabla
  colorLinea: [number, number, number]  // color de las líneas de corte
  colorTexto: [number, number, number]  // color del texto del header
}

const getColorRamaPDF = (rama: Rama): ColorRamaPDF => {
  const map: Record<Rama, ColorRamaPDF> = {
    'Manada': {
      color: [244, 196, 48],       // #F4C430
      colorLinea: [184, 134, 11],  // #B8860B
      colorTexto: [36, 53, 42]     // verde oscuro
    },
    'Unidad Scout': {
      color: [46, 125, 50],        // #2E7D32
      colorLinea: [27, 94, 32],    // #1B5E20
      colorTexto: [255, 255, 255]
    },
    'Caminantes': {
      color: [79, 168, 216],       // #4FA8D8
      colorLinea: [44, 123, 168],  // #2C7BA8
      colorTexto: [255, 255, 255]
    },
    'Rovers': {
      color: [183, 28, 28],        // #B71C1C
      colorLinea: [127, 16, 16],   // #7F1010
      colorTexto: [255, 255, 255]
    },
    'Dirigentes y otros': {
      color: [230, 126, 34],       // #E67E22
      colorLinea: [179, 90, 15],   // #B35A0F
      colorTexto: [255, 255, 255]
    }
  }
  return map[rama] || map['Manada']
}

const formatFecha = (fecha: string | null | undefined) => {
  if (!fecha) return ''
  const partes = fecha.split('-')
  if (partes.length !== 3) return ''
  return `${parseInt(partes[2])}/${parseInt(partes[1])}`
}

const formatMonto = (monto: number) => {
  if (monto === undefined || monto === null) return ''
  return `$${monto.toLocaleString('es-AR')}`
}

const formatearNombre = (nombre: string, apellido: string, tieneHermanos: boolean) => {
  const nombreCompleto = `${apellido.toUpperCase()}, ${nombre}`
  return tieneHermanos ? `${nombreCompleto} (H)` : nombreCompleto
}

const getNombreConcepto = (concepto: Concepto): string => {
  const map: Record<Concepto, string> = {
    afiliacion: 'Afiliación',
    cuotas: 'Cuotas',
    camp_corto: 'Campamento Corto',
    camp_anual: 'Campamento Anual'
  }
  return map[concepto]
}

const getValorCampPDF = (
  concepto: Concepto,
  beneficiario: { tiene_hermanos: boolean },
  config: any,
  anio: number
): number => {
  if (!config) return 0
  if (concepto === 'camp_corto') {
    const c = config.camp_corto?.[anio.toString()]
    if (!c) return 0
    return beneficiario.tiene_hermanos ? (c.hermano || 0) : (c.unico || 0)
  }
  if (concepto === 'camp_anual') {
    const anioCamp = (anio + 1).toString()
    const c = config.camp_anual?.[anioCamp]
    if (!c) return 0
    return beneficiario.tiene_hermanos ? (c.hermano || 0) : (c.unico || 0)
  }
  return 0
}

// ============================================
// GENERAR PDF
// ============================================
export function generarPDFPlanilla({
  concepto,
  rama,
  beneficiarios,
  movimientos,
  observaciones,
  asistencias,
  config,
  anioActual
}: {
  concepto: Concepto
  rama: Rama
  beneficiarios: Beneficiario[]
  movimientos: Movimiento[]
  observaciones: Observacion[]
  asistencias?: Asistencia[]
  config: any
  anioActual?: number
}) {
  const anio = anioActual || config?.anio_actual || 2026
  const asistenciasData = asistencias || []
  const coloresRama = getColorRamaPDF(rama)

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: FORMATO_OFICIO_LANDSCAPE
  })

  const anchoPagina = 356
  const esCuotas = concepto === 'cuotas'
  const esCamp = concepto === 'camp_corto' || concepto === 'camp_anual'
  const esAfiliacion = concepto === 'afiliacion'

  // ====== CÁLCULO DE COLUMNAS ======
  // - Camp Anual: mínimo 5 columnas fijas
  // - Camp Corto: mínimo 3 columnas fijas
  // - Afiliación: mínimo 2 columnas
  const minColumnasFijas = concepto === 'camp_anual' ? 5 : concepto === 'camp_corto' ? 3 : 2
  const maxPagosPorBenef = new Map<string, number>()
  beneficiarios.forEach(b => {
    const count = movimientos.filter(m => m.beneficiario_id === b.id && m.pagado_por !== 'grupo').length
    maxPagosPorBenef.set(b.id, count)
  })
  const maxPagos = Math.max(minColumnasFijas, ...Array.from(maxPagosPorBenef.values()))

  // ====== ARMAR HEADERS ======
  const headers: string[] = []
  if (esCuotas) {
    headers.push(...MESES_CUOTAS.map(m => m.label))
    headers.push('TOTAL')
  } else if (esAfiliacion) {
    for (let i = 0; i < maxPagos; i++) {
      headers.push(`Pago ${i + 1}`)
    }
    headers.push('Observaciones')
    headers.push('Pagó el grupo')
  } else if (esCamp) {
    for (let i = 0; i < maxPagos; i++) {
      headers.push(`Pago ${i + 1}`)
    }
    headers.push('Total')
    headers.push('Falta pagar')
    headers.push('Asiste')
    headers.push('Observaciones')
  }

  // ====== SEPARAR ACTIVOS E INACTIVOS ======
  const activos = beneficiarios.filter(b => b.estado === 'activo')
  const inactivos = beneficiarios.filter(b => b.estado === 'inactivo')
  const ordenados = [...activos, ...inactivos]

  // ====== TOTALES PARA EL BANNER ======
  const totalPagos = movimientos
    .filter(m => !m.no_aplica)
    .reduce((sum, m) => sum + m.monto, 0)

  const totalFaltan = ordenados.reduce((sum, b) => {
    if (!esCamp) return sum
    const asist = asistenciasData.find(a => a.beneficiario_id === b.id)
    const estadoAsiste = asist?.asiste || 'no_se_sabe'
    if (estadoAsiste !== 'si' || b.estado === 'inactivo') return sum
    const valorCamp = getValorCampPDF(concepto, b, config, anio)
    const pagado = movimientos
      .filter(m => m.beneficiario_id === b.id && m.pagado_por !== 'grupo')
      .reduce((s, m) => s + m.monto, 0)
    return sum + Math.max(0, valorCamp - pagado)
  }, 0)

  const cantAsisten = asistenciasData.filter(a => a.asiste === 'si').length

  // ====== ARMAR FILAS ======
  const rows: any[][] = ordenados.map(b => {
    const movsBenef = movimientos
      .filter(m => m.beneficiario_id === b.id)
      .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

    const movsFamilia = movsBenef.filter(m => m.pagado_por !== 'grupo')
    const pagoGrupo = movsBenef.find(m => m.pagado_por === 'grupo')
    const obs = observaciones.find(o => o.beneficiario_id === b.id)
    const asistencia = asistenciasData.find(a => a.beneficiario_id === b.id)
    const asiste = asistencia?.asiste || 'no_se_sabe'

    const esInactivo = b.estado === 'inactivo'
    const nombre = formatearNombre(b.nombre, b.apellido, b.tiene_hermanos) + (esInactivo ? ' (Ex miembro)' : '')

    const fila: any[] = [nombre]

    if (esCuotas) {
      const marcas: Array<'pago' | 'n/a' | '-' | 'cubierto'> = MESES_CUOTAS.map(mes => {
        const mov = movsFamilia.find(m =>
          m.mes_inicio && m.mes_fin &&
          mes.key >= m.mes_inicio && mes.key <= m.mes_fin
        )
        if (!mov) return '-'
        if (mov.no_aplica) return 'n/a'
        if (mov.mes_inicio === mes.key) return 'pago'
        return 'cubierto'
      })

      const colSpans: number[] = marcas.map((marca, i) => {
        if (marca !== 'pago' && marca !== 'n/a') return 1
        const mov = movsFamilia.find(m =>
          MESES_CUOTAS[i].key >= (m.mes_inicio || '') && MESES_CUOTAS[i].key <= (m.mes_fin || '')
        )
        if (!mov) return 1
        return MESES_CUOTAS.filter(m => m.key >= (mov.mes_inicio || '') && m.key <= (mov.mes_fin || '')).length
      })

      let i = 0
      while (i < MESES_CUOTAS.length) {
        const marca = marcas[i]
        if (marca === 'pago' || marca === 'n/a') {
          const span = colSpans[i]
          fila.push({ content: ' ', colSpan: span })
          i += span
        } else if (marca === 'cubierto') {
          i++
        } else {
          fila.push('-')
          i++
        }
      }

      const totalBenef = movsFamilia
        .filter(m => !m.no_aplica)
        .reduce((sum, m) => sum + m.monto, 0)
      fila.push(totalBenef > 0 ? formatMonto(totalBenef) : '—')
    } else if (esAfiliacion) {
      for (let i = 0; i < maxPagos; i++) {
        const mov = movsFamilia[i]
        if (mov) {
          fila.push(' ')
        } else {
          fila.push('-')
        }
      }
      fila.push(obs?.observacion || '')
      fila.push(pagoGrupo ? ' ' : '-')
    } else if (esCamp) {
      for (let i = 0; i < maxPagos; i++) {
        const mov = movsFamilia[i]
        if (mov) {
          fila.push(' ')
        } else {
          fila.push('-')
        }
      }
      const totalFamilia = movsFamilia.reduce((sum, m) => sum + m.monto, 0)
      fila.push(totalFamilia > 0 ? formatMonto(totalFamilia) : '—')

      const valorCamp = getValorCampPDF(concepto, b, config, anio)
      const falta = Math.max(0, valorCamp - totalFamilia)
      fila.push(falta === 0 ? '✅' : formatMonto(falta))

      fila.push(asiste === 'si' ? 'SI' : asiste === 'no' ? 'NO' : '?')

      fila.push(obs?.observacion || '')
    }

    return fila
  })

  // ====== TÍTULO ======
  const nombreConcepto = getNombreConcepto(concepto)
  const fechaHoy = new Date()
  const fechaFormateada = `${fechaHoy.getDate()}/${fechaHoy.getMonth() + 1}/${fechaHoy.getFullYear()}`

  doc.setFillColor(36, 53, 42)
  doc.rect(0, 0, anchoPagina, 20, 'F')

  doc.setTextColor(243, 236, 216)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('LORETAPP', 10, 9)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Planilla ${nombreConcepto} ${anio} — ${rama}`, 10, 15)

  doc.setFontSize(9)
  doc.text(`Generado: ${fechaFormateada}`, anchoPagina - 10, 12, { align: 'right' })

  // ====== BANNER TOTAL ======
  const yTotalBanner = 23

  doc.setFillColor(36, 53, 42)
  doc.rect(10, yTotalBanner, anchoPagina - 20, 9, 'F')
  doc.setTextColor(243, 236, 216)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL ${nombreConcepto.toUpperCase()} ${rama.toUpperCase()}:`, 14, yTotalBanner + 6)

  if (esCamp) {
    const rightX = anchoPagina - 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    const txtAsisten = `Asisten: ${cantAsisten}`
    doc.text(txtAsisten, rightX, yTotalBanner + 6, { align: 'right' })
    const anchoAsisten = doc.getTextWidth(txtAsisten)

    const txtFaltan = `Faltan: ${formatMonto(totalFaltan)}`
    doc.text(txtFaltan, rightX - anchoAsisten - 8, yTotalBanner + 6, { align: 'right' })
    const anchoFaltan = doc.getTextWidth(txtFaltan)

    const txtPagos = `Pagos: ${formatMonto(totalPagos)}`
    doc.text(txtPagos, rightX - anchoAsisten - anchoFaltan - 16, yTotalBanner + 6, { align: 'right' })
  } else {
    doc.text(formatMonto(totalPagos), anchoPagina - 14, yTotalBanner + 6, { align: 'right' })
  }

  // ====== ÍNDICES DE COLUMNAS ======
  const numColumnasPago = esCuotas ? MESES_CUOTAS.length : maxPagos
  const colTotalIndex = (esCuotas || esCamp) ? 1 + numColumnasPago : -1
  const colFaltaPagarIndex = esCamp ? colTotalIndex + 1 : -1
  const colAsisteIndex = esCamp ? colFaltaPagarIndex + 1 : -1
  const colObsIndex = esAfiliacion
    ? 1 + numColumnasPago
    : esCamp
      ? colAsisteIndex + 1
      : -1
  const colGrupoIndex = esAfiliacion ? 1 + numColumnasPago + 1 : -1

  // ====== TABLA ======
  autoTable(doc, {
    startY: yTotalBanner + 12,
    head: [['Beneficiario', ...headers]],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.2,
      textColor: [36, 53, 42],
      lineColor: [209, 201, 180],
      lineWidth: 0.1,
      valign: 'middle',
      halign: 'center',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: coloresRama.color,
      textColor: coloresRama.colorTexto,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    columnStyles: (() => {
      const styles: Record<number, any> = {
        0: {
          // En Cuotas, Beneficiario un toque más chico
          cellWidth: esCuotas ? 65 : 75,
          halign: 'left',
          fontStyle: 'bold',
          fontSize: 9
        }
      }
      // En Cuotas, meses un toque más anchos
      const anchoColPago = esCuotas ? 26 : 30
      for (let i = 1; i <= numColumnasPago; i++) {
        styles[i] = {
          cellWidth: anchoColPago
        }
      }
      if (colTotalIndex > 0) {
        styles[colTotalIndex] = {
          cellWidth: esCuotas ? 29 : 26,
          fontStyle: 'bold',
          fillColor: [254, 249, 236]
        }
      }
      if (colFaltaPagarIndex > 0) {
        styles[colFaltaPagarIndex] = {
          cellWidth: 26
        }
      }
      if (colAsisteIndex > 0) {
        styles[colAsisteIndex] = {
          cellWidth: 18
        }
      }
      if (colObsIndex > 0) {
        styles[colObsIndex] = {
          halign: 'center'
        }
      }
      if (colGrupoIndex > 0) {
        styles[colGrupoIndex] = {
          cellWidth: 30
        }
      }
      return styles
    })(),
    alternateRowStyles: {
      fillColor: [250, 248, 244]
    },
    didParseCell: (data) => {
      if (data.column.index === 0 && data.section === 'body') {
        const nombre = data.cell.raw as string
        if (nombre && nombre.includes('(Ex miembro)')) {
          data.cell.styles.textColor = [168, 158, 134]
          data.cell.styles.fontStyle = 'italic'
        }
      }

      if (colObsIndex > 0 && data.column.index === colObsIndex && data.section === 'body') {
        data.cell.styles.halign = 'center'
        data.cell.styles.fontSize = 8
      }

      if (colTotalIndex > 0 && data.column.index === colTotalIndex && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [254, 249, 236]
        data.cell.styles.fontSize = esCuotas ? 10 : 11
      }

      if (esCamp && data.column.index === colFaltaPagarIndex && data.section === 'body') {
        const valor = data.cell.raw as string
        data.cell.styles.fontSize = 11
        data.cell.styles.fontStyle = 'bold'
        if (valor === '✅') {
          data.cell.styles.fillColor = [240, 247, 240]
          data.cell.styles.textColor = [92, 122, 94]
        } else if (valor && valor.startsWith('$')) {
          data.cell.styles.fillColor = [254, 226, 226]
          data.cell.styles.textColor = [191, 78, 48]
        } else if (valor === '—') {
          data.cell.styles.fillColor = [243, 244, 246]
          data.cell.styles.textColor = [122, 115, 100]
        }
      }

      if (colAsisteIndex > 0 && data.column.index === colAsisteIndex && data.section === 'body') {
        const valor = data.cell.raw as string
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fontSize = 10
        if (valor === 'SI') {
          data.cell.styles.fillColor = [209, 250, 229]
          data.cell.styles.textColor = [22, 101, 52]
        } else if (valor === 'NO') {
          data.cell.styles.fillColor = [254, 226, 226]
          data.cell.styles.textColor = [154, 52, 18]
        } else {
          data.cell.styles.fillColor = [243, 244, 246]
          data.cell.styles.textColor = [122, 115, 100]
        }
      }

      if (
        data.section === 'body' &&
        data.column.index > 0 &&
        data.column.index <= numColumnasPago
      ) {
        const beneficiario = ordenados[data.row.index]
        const movsFamilia = movimientos
          .filter(m => m.beneficiario_id === beneficiario.id && m.pagado_por !== 'grupo')
          .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

        if (esCuotas) {
          const mes = MESES_CUOTAS[data.column.index - 1]
          const movAsignado = movsFamilia.find(m =>
            m.mes_inicio && m.mes_fin &&
            mes.key >= m.mes_inicio && mes.key <= m.mes_fin
          )

          if (movAsignado) {
            if (movAsignado.no_aplica) {
              data.cell.styles.fillColor = [0, 0, 0]
            } else if (movAsignado.recibo_entregado === false) {
              data.cell.styles.fillColor = [252, 211, 77]
            } else {
              data.cell.styles.fillColor = [127, 183, 126]
            }
          }
        } else {
          const movAsignado = movsFamilia[data.column.index - 1]
          if (movAsignado && movAsignado.recibo_entregado === false) {
            data.cell.styles.fillColor = [252, 211, 77]
          } else if (movAsignado) {
            data.cell.styles.fillColor = [127, 183, 126]
          }
        }
      }

      if (colGrupoIndex > 0 && data.section === 'body' && data.column.index === colGrupoIndex) {
        const beneficiario = ordenados[data.row.index]
        const pagoGrupo = movimientos.find(
          m => m.beneficiario_id === beneficiario.id && m.pagado_por === 'grupo'
        )
        if (pagoGrupo) {
          data.cell.styles.fillColor = [127, 183, 126]
        }
      }
    },
    didDrawCell: (data) => {
      // ===== LÍNEAS DE CORTE (con color de rama) =====
      doc.setDrawColor(coloresRama.colorLinea[0], coloresRama.colorLinea[1], coloresRama.colorLinea[2])
      doc.setLineWidth(GROSOR_LINEA_CORTE)

      // 1. Línea IZQUIERDA de Beneficiario (columna 0)
      if (data.column.index === 0) {
        const x = data.cell.x
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 2. Línea IZQUIERDA de Pago 1 (equivale a "derecha de Beneficiario")
      if (data.column.index === 1) {
        const x = data.cell.x
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 3. Línea IZQUIERDA de TOTAL
      if (colTotalIndex > 0 && data.column.index === colTotalIndex) {
        const x = data.cell.x
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 3b. Línea DERECHA de TOTAL (solo cuotas)
      if (esCuotas && colTotalIndex > 0 && data.column.index === colTotalIndex) {
        const x = data.cell.x + data.cell.width
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 4. Línea DERECHA de FALTA PAGAR
      if (colFaltaPagarIndex > 0 && data.column.index === colFaltaPagarIndex) {
        const x = data.cell.x + data.cell.width
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 5. Línea DERECHA de ASISTE
      if (colAsisteIndex > 0 && data.column.index === colAsisteIndex) {
        const x = data.cell.x + data.cell.width
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 6. Línea IZQUIERDA de OBSERVACIONES (afiliación)
      if (esAfiliacion && colObsIndex > 0 && data.column.index === colObsIndex) {
        const x = data.cell.x
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 6b. Línea DERECHA de OBSERVACIONES (camps)
      if (esCamp && colObsIndex > 0 && data.column.index === colObsIndex) {
        const x = data.cell.x + data.cell.width
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 7. Línea IZQUIERDA de PAGÓ EL GRUPO (afiliación)
      if (esAfiliacion && colGrupoIndex > 0 && data.column.index === colGrupoIndex) {
        const x = data.cell.x
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // 8. Línea DERECHA de PAGÓ EL GRUPO (afiliación)
      if (esAfiliacion && colGrupoIndex > 0 && data.column.index === colGrupoIndex) {
        const x = data.cell.x + data.cell.width
        doc.line(x, data.cell.y, x, data.cell.y + data.cell.height)
      }

      // ===== CONTENIDO DINÁMICO (solo body) =====
      if (data.section !== 'body') return

      // Celdas de pagos / meses
      if (data.column.index > 0 && data.column.index <= numColumnasPago) {
        const beneficiario = ordenados[data.row.index]
        const movsFamilia = movimientos
          .filter(m => m.beneficiario_id === beneficiario.id && m.pagado_por !== 'grupo')
          .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

        let movAsignado: Movimiento | undefined
        if (esCuotas) {
          const mes = MESES_CUOTAS[data.column.index - 1]
          movAsignado = movsFamilia.find(m =>
            m.mes_inicio && m.mes_fin &&
            mes.key >= m.mes_inicio && mes.key <= m.mes_fin
          )
        } else {
          movAsignado = movsFamilia[data.column.index - 1]
        }

        if (movAsignado) {
          const cellCenterY = data.cell.y + data.cell.height / 2 + 1.2
          const cellCenterX = data.cell.x + data.cell.width / 2

          if (movAsignado.no_aplica) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(255, 255, 255)
            doc.text('N/A', cellCenterX, cellCenterY, { align: 'center' })
          } else {
            const mesKey = MESES_CUOTAS[data.column.index - 1]?.key
            const esInicioRango = !esCuotas || (movAsignado.mes_inicio === mesKey)

            if (esInicioRango) {
              const fecha = formatFecha(movAsignado.fecha_pago)
              const monto = formatMonto(movAsignado.monto)
              const anchoCelda = data.cell.width

              doc.setFontSize(7)
              doc.setFont('helvetica', 'normal')
              const anchoFecha = doc.getTextWidth(fecha)

              const separador = ' - '
              const anchoSeparador = doc.getTextWidth(separador)

              doc.setFontSize(11)
              doc.setFont('helvetica', 'bold')
              const anchoMonto = doc.getTextWidth(monto)

              const anchoTotal = anchoFecha + anchoSeparador + anchoMonto
              const inicioX = data.cell.x + (anchoCelda - anchoTotal) / 2

              doc.setFontSize(7)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(0, 0, 0)
              doc.text(fecha, inicioX, cellCenterY)

              doc.setFontSize(7)
              doc.text(separador, inicioX + anchoFecha, cellCenterY)

              doc.setFontSize(11)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(36, 53, 42)
              doc.text(monto, inicioX + anchoFecha + anchoSeparador, cellCenterY)
            }
          }
        }
      }

      // Columna Pagó el grupo
      if (colGrupoIndex > 0 && data.column.index === colGrupoIndex) {
        const beneficiario = ordenados[data.row.index]
        const pagoGrupo = movimientos.find(
          m => m.beneficiario_id === beneficiario.id && m.pagado_por === 'grupo'
        )

        if (pagoGrupo) {
          const fecha = formatFecha(pagoGrupo.fecha_pago)
          const monto = formatMonto(pagoGrupo.monto)
          const cellY = data.cell.y + data.cell.height / 2 + 1.2
          const cellLeft = data.cell.x + 1.5
          const cellRight = data.cell.x + data.cell.width - 1.5

          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          doc.text(fecha, cellLeft, cellY)

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(36, 53, 42)
          doc.text(monto, cellRight, cellY, { align: 'right' })
        }
      }
    }
  })

  // ====== LÍNEAS DE CORTE ARRIBA Y ABAJO DE LA TABLA ======
  const finalY = (doc as any).lastAutoTable.finalY
  const tableStartY = yTotalBanner + 12

  doc.setDrawColor(coloresRama.colorLinea[0], coloresRama.colorLinea[1], coloresRama.colorLinea[2])
  doc.setLineWidth(GROSOR_LINEA_CORTE)

  // Valores ajustados a la tabla real (margen de autoTable)
  const tableLeftX = 14
  const tableRightX = 342

  // Línea ARRIBA de la tabla
  doc.line(tableLeftX, tableStartY, tableRightX, tableStartY)

  // Línea ABAJO de la tabla
  doc.line(tableLeftX, finalY, tableRightX, finalY)

  // ====== LEYENDA abajo ======
  const leyendaY = finalY + 4

  doc.setFillColor(252, 211, 77)
  doc.rect(10, leyendaY, anchoPagina - 20, 7, 'F')
  doc.setTextColor(122, 92, 0)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('RESALTADAS EN AMARILLO LOS RECIBOS NO ENTREGADOS', anchoPagina / 2, leyendaY + 5, { align: 'center' })

  // ====== NOMBRE DEL ARCHIVO ======
  const fechaArchivo = `${fechaHoy.getDate()}-${fechaHoy.getMonth() + 1}-${fechaHoy.getFullYear().toString().slice(-2)}`
  const nombreArchivo = `${nombreConcepto} ${rama} ${fechaArchivo}.pdf`

  doc.save(nombreArchivo)
}