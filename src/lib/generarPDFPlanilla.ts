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

// Formato Oficio horizontal (Argentina: 216 x 356mm → invertido)
const FORMATO_OFICIO_LANDSCAPE: [number, number] = [356, 216]

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

// ============================================
// GENERAR PDF
// ============================================
export function generarPDFPlanilla({
  concepto,
  rama,
  beneficiarios,
  movimientos,
  observaciones,
  config
}: {
  concepto: Concepto
  rama: Rama
  beneficiarios: Beneficiario[]
  movimientos: Movimiento[]
  observaciones: Observacion[]
  config: any
}) {
  // ====== CREAR PDF (Oficio horizontal) ======
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: FORMATO_OFICIO_LANDSCAPE
  })

  const anchoPagina = 356
  const esCuotas = concepto === 'cuotas'
  const esCamp = concepto === 'camp_corto' || concepto === 'camp_anual'

  // ====== CÁLCULO DE COLUMNAS ======
  const maxPagosPorBenef = new Map<string, number>()
  beneficiarios.forEach(b => {
    const count = movimientos.filter(m => m.beneficiario_id === b.id && m.pagado_por !== 'grupo').length
    maxPagosPorBenef.set(b.id, count)
  })
  const maxPagos = Math.max(2, ...Array.from(maxPagosPorBenef.values()))

  // ====== ARMAR HEADERS ======
  const headers: string[] = []
  if (esCuotas) {
    headers.push(...MESES_CUOTAS.map(m => m.label))
    headers.push('TOTAL')
  } else {
    for (let i = 0; i < maxPagos; i++) {
      headers.push(`Pago ${i + 1}`)
    }
    if (esCamp) headers.push('Total')
    if (esCamp) headers.push('Falta pagar')
    headers.push('Observaciones')
    headers.push('Pagó el grupo')
  }

  // ====== SEPARAR ACTIVOS E INACTIVOS ======
  const activos = beneficiarios.filter(b => b.estado === 'activo')
  const inactivos = beneficiarios.filter(b => b.estado === 'inactivo')
  const ordenados = [...activos, ...inactivos]

  // ====== ARMAR FILAS ======
  const rows: any[][] = ordenados.map(b => {
    const movsBenef = movimientos
      .filter(m => m.beneficiario_id === b.id)
      .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

    const movsFamilia = movsBenef.filter(m => m.pagado_por !== 'grupo')
    const pagoGrupo = movsBenef.find(m => m.pagado_por === 'grupo')
    const obs = observaciones.find(o => o.beneficiario_id === b.id)

    const esInactivo = b.estado === 'inactivo'
    const nombre = formatearNombre(b.nombre, b.apellido, b.tiene_hermanos) + (esInactivo ? ' (Ex miembro)' : '')

    const fila: any[] = [nombre]

    if (esCuotas) {
      // Para cada mes, marcar estado
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

      // Calcular colSpan de cada pago
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

      // TOTAL del beneficiario
      const totalBenef = movsFamilia
        .filter(m => !m.no_aplica)
        .reduce((sum, m) => sum + m.monto, 0)
      fila.push(totalBenef > 0 ? formatMonto(totalBenef) : '—')
    } else {
      for (let i = 0; i < maxPagos; i++) {
        const mov = movsFamilia[i]
        if (mov) {
          fila.push(' ')
        } else {
          fila.push('-')
        }
      }
      if (esCamp) {
        const totalFamilia = movsFamilia.reduce((sum, m) => sum + m.monto, 0)
        fila.push(totalFamilia > 0 ? formatMonto(totalFamilia) : '—')
      }
      if (esCamp) {
        const valorCamp = concepto === 'camp_corto'
          ? (b.tiene_hermanos ? config?.camp_corto_2026?.hermano : config?.camp_corto_2026?.unico) || 0
          : (b.tiene_hermanos ? config?.camp_anual_2027?.hermano : config?.camp_anual_2027?.unico) || 0
        const totalFamilia = movsFamilia.reduce((sum, m) => sum + m.monto, 0)
        const falta = Math.max(0, valorCamp - totalFamilia)
        fila.push(falta === 0 ? '✅' : formatMonto(falta))
      }
      fila.push(obs?.observacion || '')
      fila.push(pagoGrupo ? ' ' : '-')
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
  doc.text(`Planilla ${nombreConcepto} 2026 — ${rama}`, 10, 15)

  doc.setFontSize(9)
  doc.text(`Generado: ${fechaFormateada}`, anchoPagina - 10, 12, { align: 'right' })

  // ====== TOTAL arriba ======
  const totalGeneral = movimientos
    .filter(m => !m.no_aplica)
    .reduce((sum, m) => sum + m.monto, 0)
  const yTotalBanner = 23

  doc.setFillColor(36, 53, 42)
  doc.rect(10, yTotalBanner, anchoPagina - 20, 9, 'F')
  doc.setTextColor(243, 236, 216)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL ${nombreConcepto.toUpperCase()} ${rama.toUpperCase()}:`, 14, yTotalBanner + 6)
  doc.text(formatMonto(totalGeneral), anchoPagina - 14, yTotalBanner + 6, { align: 'right' })

  // ====== ÍNDICES DE COLUMNAS ======
  const numColumnasPago = esCuotas ? MESES_CUOTAS.length : maxPagos
  const colTotalIndex = (esCuotas || esCamp) ? 1 + numColumnasPago : -1
  const colFaltaPagarIndex = esCamp ? colTotalIndex + 1 : -1
  const colObsIndex = esCuotas ? -1 : (esCamp ? colTotalIndex + 2 : 1 + numColumnasPago)
  const colGrupoIndex = esCuotas ? -1 : headers.length // última columna (1-based, más el beneficiario)

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
      fillColor: [36, 53, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    columnStyles: (() => {
      const styles: Record<number, any> = {
        0: {
          cellWidth: 55,
          halign: 'left',
          fontStyle: 'bold',
          fontSize: 9
        }
      }
      // Columnas de meses / pagos
      const anchoColPago = esCuotas ? 26 : 30
      for (let i = 1; i <= numColumnasPago; i++) {
        styles[i] = {
          cellWidth: anchoColPago
        }
      }
      // Columna TOTAL
      if (colTotalIndex > 0) {
        styles[colTotalIndex] = {
          cellWidth: esCuotas ? 28 : 26,
          fontStyle: 'bold',
          fillColor: [254, 249, 236]
        }
      }
      // Columna Observaciones
      if (colObsIndex > 0) {
        styles[colObsIndex] = {
          halign: 'center'
        }
      }
      // Columna Pagó el grupo
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
      // Nombre ex miembro
      if (data.column.index === 0 && data.section === 'body') {
        const nombre = data.cell.raw as string
        if (nombre && nombre.includes('(Ex miembro)')) {
          data.cell.styles.textColor = [168, 158, 134]
          data.cell.styles.fontStyle = 'italic'
        }
      }

      // Columna Observaciones
      if (colObsIndex > 0 && data.column.index === colObsIndex && data.section === 'body') {
        data.cell.styles.halign = 'center'
        data.cell.styles.fontSize = 8
      }

      // Columna TOTAL
      if (colTotalIndex > 0 && data.column.index === colTotalIndex && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [254, 249, 236]
        data.cell.styles.fontSize = esCuotas ? 10 : 9
      }

      // Columna Falta pagar (camps)
      if (esCamp && data.column.index === colFaltaPagarIndex && data.section === 'body') {
        const valor = data.cell.raw as string
        if (valor === '✅') {
          data.cell.styles.fillColor = [240, 247, 240]
          data.cell.styles.textColor = [92, 122, 94]
        } else if (valor && valor.startsWith('$')) {
          data.cell.styles.fillColor = [254, 226, 226]
          data.cell.styles.textColor = [191, 78, 48]
        }
      }

      // Celdas de pagos: fondo según estado
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

      // Columna Pagó el grupo
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
      if (data.section !== 'body') return

      // Celdas de pagos
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

              // ===== BLOQUE CENTRADO: "fecha - monto" =====
              // Medimos anchos para centrar todo el bloque
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

              // Fecha (chica, negra)
              doc.setFontSize(7)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(0, 0, 0)
              doc.text(fecha, inicioX, cellCenterY)

              // Separador " - " (chico, negro)
              doc.setFontSize(7)
              doc.text(separador, inicioX + anchoFecha, cellCenterY)

              // Monto (grande, negrita, verde bosque)
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

  // ====== LEYENDA abajo ======
  const finalY = (doc as any).lastAutoTable.finalY + 4

  doc.setFillColor(252, 211, 77)
  doc.rect(10, finalY, anchoPagina - 20, 7, 'F')
  doc.setTextColor(122, 92, 0)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('RESALTADAS EN AMARILLO LOS RECIBOS NO ENTREGADOS', anchoPagina / 2, finalY + 5, { align: 'center' })

  // ====== NOMBRE DEL ARCHIVO ======
  const fechaArchivo = `${fechaHoy.getDate()}-${fechaHoy.getMonth() + 1}-${fechaHoy.getFullYear().toString().slice(-2)}`
  const nombreArchivo = `${nombreConcepto} ${rama} ${fechaArchivo}.pdf`

  doc.save(nombreArchivo)
}