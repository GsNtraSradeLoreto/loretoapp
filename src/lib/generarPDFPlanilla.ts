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

const formatFecha = (fecha: string | null | undefined) => {
  if (!fecha) return ''
  const partes = fecha.split('-')
  if (partes.length !== 3) return ''
  return `${parseInt(partes[2])}/${parseInt(partes[1])}`
}

const formatMonto = (monto: number) => {
  if (!monto) return ''
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
  // ====== CREAR PDF (A4 horizontal) ======
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

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
  } else {
    for (let i = 0; i < maxPagos; i++) {
      headers.push(`Pago ${i + 1}`)
    }
  }
  if (esCamp) headers.push('Falta pagar')
  headers.push('Observaciones')
  headers.push('Pagó el grupo')

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
      MESES_CUOTAS.forEach(mes => {
        const mov = movsFamilia.find(m => m.fecha_pago.startsWith(`2026-${mes.key}`))
        if (mov) {
          fila.push(`${formatFecha(mov.fecha_pago)} - ${formatMonto(mov.monto)}`)
        } else {
          fila.push('')
        }
      })
    } else {
      for (let i = 0; i < maxPagos; i++) {
        const mov = movsFamilia[i]
        if (mov) {
          fila.push(`${formatFecha(mov.fecha_pago)} - ${formatMonto(mov.monto)}`)
        } else {
          fila.push('')
        }
      }
    }

    // Falta pagar (solo camps)
    if (esCamp) {
      const valorCamp = concepto === 'camp_corto'
        ? (b.tiene_hermanos ? config?.camp_corto_2026?.hermano : config?.camp_corto_2026?.unico) || 0
        : (b.tiene_hermanos ? config?.camp_anual_2027?.hermano : config?.camp_anual_2027?.unico) || 0
      const totalFamilia = movsFamilia.reduce((sum, m) => sum + m.monto, 0)
      const falta = Math.max(0, valorCamp - totalFamilia)
      fila.push(falta === 0 ? '✅' : formatMonto(falta))
    }

    fila.push(obs?.observacion || '')
    fila.push(pagoGrupo ? `${formatFecha(pagoGrupo.fecha_pago)} - ${formatMonto(pagoGrupo.monto)}` : '')

    return fila
  })

  // ====== TÍTULO ======
  const nombreConcepto = getNombreConcepto(concepto)
  const fechaHoy = new Date()
  const fechaFormateada = `${fechaHoy.getDate()}/${fechaHoy.getMonth() + 1}/${fechaHoy.getFullYear()}`

  doc.setFillColor(36, 53, 42)
  doc.rect(0, 0, 297, 20, 'F')

  doc.setTextColor(243, 236, 216)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('LORETAPP', 10, 9)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Planilla ${nombreConcepto} 2026 — ${rama}`, 10, 15)

  doc.setFontSize(9)
  doc.text(`Generado: ${fechaFormateada}`, 287, 12, { align: 'right' })

  // ====== TOTAL arriba ======
  const totalGeneral = movimientos.reduce((sum, m) => sum + m.monto, 0)
  const yTotalBanner = 23

  doc.setFillColor(36, 53, 42)
  doc.rect(10, yTotalBanner, 277, 9, 'F')
  doc.setTextColor(243, 236, 216)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL ${nombreConcepto.toUpperCase()} ${rama.toUpperCase()}:`, 14, yTotalBanner + 6)
  doc.text(formatMonto(totalGeneral), 283, yTotalBanner + 6, { align: 'right' })

  // ====== ÍNDICES DE COLUMNAS ======
  const numColumnasPago = esCuotas ? MESES_CUOTAS.length : maxPagos
  const colFaltaPagarIndex = esCamp ? 1 + numColumnasPago : -1
  const colObsIndex = 1 + numColumnasPago + (esCamp ? 1 : 0)
  const colGrupoIndex = colObsIndex + 1

  // ====== TABLA ======
  autoTable(doc, {
    startY: yTotalBanner + 12,
    head: [['Beneficiario', ...headers]],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.5,
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
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: {
        cellWidth: 42,
        halign: 'left',
        fontStyle: 'bold',
        fontSize: 7
      }
    },
    alternateRowStyles: {
      fillColor: [250, 248, 244]
    },
    didParseCell: (data) => {
      // Nombre ex miembro
      if (data.column.index === 0 && data.section === 'body') {
        const nombre = data.cell.raw as string
        if (nombre.includes('(Ex miembro)')) {
          data.cell.styles.textColor = [168, 158, 134]
          data.cell.styles.fontStyle = 'italic'
        }
      }

      // Columna Observaciones
      if (data.column.index === colObsIndex && data.section === 'body') {
        data.cell.styles.halign = 'left'
        data.cell.styles.fontSize = 7
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

      // Celdas de pagos de familia: fondo amarillo si no tiene recibo
      if (
        data.section === 'body' &&
        data.column.index > 0 &&
        data.column.index <= numColumnasPago
      ) {
        const beneficiario = ordenados[data.row.index]
        const movsFamilia = movimientos
          .filter(m => m.beneficiario_id === beneficiario.id && m.pagado_por !== 'grupo')
          .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

        let movAsignado: Movimiento | undefined
        if (esCuotas) {
          const mes = MESES_CUOTAS[data.column.index - 1]
          movAsignado = movsFamilia.find(m => m.fecha_pago.startsWith(`2026-${mes.key}`))
        } else {
          movAsignado = movsFamilia[data.column.index - 1]
        }

        if (movAsignado) {
          if (movAsignado.recibo_entregado === false) {
            data.cell.styles.fillColor = [252, 211, 77]
          }
          // Formato: fecha chica + monto en negrita
          const fecha = formatFecha(movAsignado.fecha_pago)
          const monto = formatMonto(movAsignado.monto)
          data.cell.text = [`${fecha} - ${monto}`]
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fontSize = 8
        }
      }

      // Columna Pagó el grupo
      if (data.section === 'body' && data.column.index === colGrupoIndex) {
        const beneficiario = ordenados[data.row.index]
        const pagoGrupo = movimientos.find(
          m => m.beneficiario_id === beneficiario.id && m.pagado_por === 'grupo'
        )
        if (pagoGrupo) {
          data.cell.styles.fillColor = [232, 245, 233]
          const fecha = formatFecha(pagoGrupo.fecha_pago)
          const monto = formatMonto(pagoGrupo.monto)
          data.cell.text = [`${fecha} - ${monto}`]
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fontSize = 8
        }
      }
    }
  })

  // ====== LEYENDA abajo ======
  const finalY = (doc as any).lastAutoTable.finalY + 4

  doc.setFillColor(252, 211, 77)
  doc.rect(10, finalY, 277, 7, 'F')
  doc.setTextColor(122, 92, 0)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('RESALTADAS EN AMARILLO LOS RECIBOS NO ENTREGADOS', 148.5, finalY + 5, { align: 'center' })

  // ====== NOMBRE DEL ARCHIVO ======
  const fechaArchivo = `${fechaHoy.getDate()}-${fechaHoy.getMonth() + 1}-${fechaHoy.getFullYear().toString().slice(-2)}`
  const nombreArchivo = `${nombreConcepto} ${rama} ${fechaArchivo}.pdf`

  doc.save(nombreArchivo)
}