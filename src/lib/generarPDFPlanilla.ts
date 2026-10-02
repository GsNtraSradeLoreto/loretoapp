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

const getNombreRama = (rama: Rama): string => {
  return rama
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
  const esAfiliacion = concepto === 'afiliacion'
  const esCamp = concepto === 'camp_corto' || concepto === 'camp_anual'

  // ====== CÁLCULO DE COLUMNAS DINÁMICAS ======
  // Para afiliación y camps: máximo de pagos por beneficiario
  const maxPagosPorBenef = new Map<string, number>()
  beneficiarios.forEach(b => {
    const count = movimientos.filter(m => m.beneficiario_id === b.id).length
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
  headers.push('TOTAL')
  if (esCamp) headers.push('FALTA PAGAR')
  headers.push('OBSERVACIONES')

  // ====== SEPARAR ACTIVOS E INACTIVOS ======
  const activos = beneficiarios.filter(b => b.estado === 'activo')
  const inactivos = beneficiarios.filter(b => b.estado === 'inactivo')
  const ordenados = [...activos, ...inactivos]

  // ====== ARMAR FILAS ======
  const rows: any[][] = ordenados.map(b => {
    const movsBenef = movimientos
      .filter(m => m.beneficiario_id === b.id)
      .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

    const total = movsBenef.reduce((sum, m) => sum + m.monto, 0)
    const obs = observaciones.find(o => o.beneficiario_id === b.id)

    const esInactivo = b.estado === 'inactivo'
    const nombre = formatearNombre(b.nombre, b.apellido, b.tiene_hermanos) + (esInactivo ? ' (Ex miembro)' : '')

    const fila: any[] = [nombre]

    if (esCuotas) {
      MESES_CUOTAS.forEach(mes => {
        const mov = movsBenef.find(m => m.fecha_pago.startsWith(`2026-${mes.key}`))
        if (mov) {
          fila.push(`${formatFecha(mov.fecha_pago)}\n${formatMonto(mov.monto)}`)
        } else {
          fila.push('')
        }
      })
    } else {
      for (let i = 0; i < maxPagos; i++) {
        const mov = movsBenef[i]
        if (mov) {
          fila.push(`${formatFecha(mov.fecha_pago)}\n${formatMonto(mov.monto)}`)
        } else {
          fila.push('')
        }
      }
    }

    fila.push(formatMonto(total) || '$0')

    if (esCamp) {
      const valorCamp = concepto === 'camp_corto'
        ? (b.tiene_hermanos ? config?.camp_corto_2026?.hermano : config?.camp_corto_2026?.unico) || 0
        : (b.tiene_hermanos ? config?.camp_anual_2027?.hermano : config?.camp_anual_2027?.unico) || 0
      const falta = Math.max(0, valorCamp - total)
      fila.push(falta === 0 ? '✅' : formatMonto(falta))
    }

    fila.push(obs?.observacion || '')

    return fila
  })

  // ====== FILA DE TOTALES ======
  const totalGeneral = movimientos.reduce((sum, m) => sum + m.monto, 0)
  const filaTotales: any[] = ['TOTAL']
  if (esCuotas) {
    MESES_CUOTAS.forEach(() => filaTotales.push(''))
  } else {
    for (let i = 0; i < maxPagos; i++) filaTotales.push('')
  }
  filaTotales.push(formatMonto(totalGeneral))
  if (esCamp) filaTotales.push('')
  filaTotales.push('')

  rows.push(filaTotales)

  // ====== TÍTULO Y HEADER DEL PDF ======
  const nombreConcepto = getNombreConcepto(concepto)
  const fechaHoy = new Date()
  const fechaFormateada = `${fechaHoy.getDate()}/${fechaHoy.getMonth() + 1}/${fechaHoy.getFullYear()}`

  // Header verde bosque
  doc.setFillColor(36, 53, 42) // #24352A
  doc.rect(0, 0, 297, 20, 'F')

  // Título
  doc.setTextColor(243, 236, 216) // crema
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('LORETAPP', 10, 9)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Planilla ${nombreConcepto} 2026 — ${rama}`, 10, 15)

  // Fecha a la derecha
  doc.setFontSize(9)
  doc.text(`Generado: ${fechaFormateada}`, 287, 12, { align: 'right' })

  // ====== TABLA CON AUTOTABLE ======
  autoTable(doc, {
    startY: 24,
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
        cellWidth: 45,
        halign: 'left',
        fontStyle: 'bold',
        fontSize: 7
      }
    },
    alternateRowStyles: {
      fillColor: [250, 248, 244]
    },
    didParseCell: (data) => {
      // Estilos de la primera columna (nombre)
      if (data.column.index === 0 && data.section === 'body') {
        const nombre = data.cell.raw as string
        if (nombre.includes('(Ex miembro)')) {
          data.cell.styles.textColor = [168, 158, 134]
          data.cell.styles.fontStyle = 'italic'
        }
      }
      // Estilo de la columna TOTAL
      const colTotalIndex = 1 + (esCuotas ? MESES_CUOTAS.length : maxPagos)
      if (data.column.index === colTotalIndex && data.section === 'body') {
        data.cell.styles.fillColor = [254, 249, 236]
        data.cell.styles.fontStyle = 'bold'
      }
      // Estilo de la columna FALTA PAGAR (solo camps)
      if (esCamp) {
        const colFaltaIndex = colTotalIndex + 1
        if (data.column.index === colFaltaIndex && data.section === 'body') {
          const valor = data.cell.raw as string
          if (valor === '✅') {
            data.cell.styles.fillColor = [240, 247, 240]
            data.cell.styles.textColor = [92, 122, 94]
          } else if (valor && valor.startsWith('$')) {
            data.cell.styles.fillColor = [254, 226, 226]
            data.cell.styles.textColor = [191, 78, 48]
          }
        }
      }
      // Fila de totales
      if (data.row.index === rows.length - 1 && data.section === 'body') {
        data.cell.styles.fillColor = [36, 53, 42]
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  // ====== NOMBRE DEL ARCHIVO ======
  const fechaArchivo = `${fechaHoy.getDate()}-${fechaHoy.getMonth() + 1}-${fechaHoy.getFullYear().toString().slice(-2)}`
  const nombreArchivo = `${nombreConcepto} ${rama} ${fechaArchivo}.pdf`

  // ====== DESCARGAR ======
  doc.save(nombreArchivo)
}