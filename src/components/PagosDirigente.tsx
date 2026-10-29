import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatFecha } from '../utils/formatFecha'

interface Pago {
  id: string
  concepto: string
  monto: number
  fecha_pago: string
  comprobante_url: string | null
  observaciones: string | null
  creado_por: string | null
  creado_en: string
  numero_recibo: string | null
  anio: number | null
}

export default function PagosDirigente({
  dirigenteId,
  puedeEditar
}: {
  dirigenteId: string
  puedeEditar: boolean
}) {
  const { profile } = useAuth()
  const [pagos, setPagos] = useState<Pago[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)

  // Formulario
  const [agregando, setAgregando] = useState(false)
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (dirigenteId) cargarPagos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirigenteId])

  const cargarPagos = async () => {
    setCargando(true)
    const { data, error: err } = await supabase
      .from('pagos_dirigentes')
      .select('*')
      .eq('dirigente_id', dirigenteId)
      .order('fecha_pago', { ascending: false })

    if (err) {
      setError('No se pudieron cargar los pagos.')
      console.error(err)
    } else {
      setPagos(data || [])
    }
    setCargando(false)
  }

  const handleSubirComprobante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'].includes(file.type)) {
      setMensaje({ texto: '❌ Solo se permiten imágenes o PDF', tipo: 'error' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMensaje({ texto: '❌ El archivo no debe superar los 5 MB', tipo: 'error' })
      return
    }

    setSubiendoComprobante(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${dirigenteId}-pago-${Date.now()}.${ext}`
      const filePath = `pagos-dirigentes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beneficiarios') // Reutilizamos el bucket
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('beneficiarios')
        .getPublicUrl(filePath)

      setComprobanteUrl(publicUrl)
      setMensaje({ texto: '✅ Comprobante adjuntado', tipo: 'ok' })
    } catch (err: any) {
      setMensaje({ texto: '❌ Error al subir: ' + err.message, tipo: 'error' })
    } finally {
      setSubiendoComprobante(false)
    }
  }

  const guardarPago = async () => {
    if (!concepto.trim() || !monto || !fechaPago) {
      setMensaje({ texto: '❌ Completá concepto, monto y fecha', tipo: 'error' })
      return
    }

    setGuardando(true)
    setMensaje(null)

    try {
      // 1) Calcular el año del pago
      const anioPago = new Date(fechaPago).getFullYear()

      // 2) Buscar el último recibo de este año (GLOBAL para todos los dirigentes)
      const { data: ultimos, error: errUlt } = await supabase
        .from('pagos_dirigentes')
        .select('numero_recibo')
        .eq('anio', anioPago)
        .order('numero_recibo', { ascending: false })
        .limit(1)

      if (errUlt) throw errUlt

      let siguienteNumero = 1
      if (ultimos && ultimos.length > 0 && ultimos[0].numero_recibo) {
        // Extrae el número de "D-05" → 5
        const match = ultimos[0].numero_recibo.match(/D-(\d+)/)
        if (match) siguienteNumero = parseInt(match[1], 10) + 1
      }

      const numeroRecibo = `D-${String(siguienteNumero).padStart(2, '0')}`

      // 3) Insertar el pago con el número de recibo
      const { error: err } = await supabase.from('pagos_dirigentes').insert({
        dirigente_id: dirigenteId,
        concepto: concepto.trim(),
        monto: parseFloat(monto),
        fecha_pago: fechaPago,
        comprobante_url: comprobanteUrl,
        observaciones: observaciones.trim() || null,
        creado_por: profile?.id || null,
        numero_recibo: numeroRecibo,
        anio: anioPago
      })

      if (err) throw err

      setMensaje({ texto: `✅ Pago registrado con recibo ${numeroRecibo}`, tipo: 'ok' })
      setAgregando(false)
      setConcepto('')
      setMonto('')
      setFechaPago(new Date().toISOString().split('T')[0])
      setObservaciones('')
      setComprobanteUrl(null)
      await cargarPagos()
    } catch (err: any) {
      setMensaje({ texto: '❌ Error al guardar: ' + err.message, tipo: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const eliminarPago = async (id: string) => {
    if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) return
    const { error: err } = await supabase.from('pagos_dirigentes').delete().eq('id', id)
    if (err) setMensaje({ texto: '❌ Error al eliminar: ' + err.message, tipo: 'error' })
    else {
      setMensaje({ texto: '✅ Pago eliminado', tipo: 'ok' })
      await cargarPagos()
    }
  }

  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0)

  if (cargando) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#7A7364', fontFamily: 'Oswald' }}>Cargando pagos...</div>
  }

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      {/* Mensaje */}
      {mensaje && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
          backgroundColor: mensaje.tipo === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: mensaje.tipo === 'error' ? '#BF4E30' : '#5C7A5E',
          border: `1px solid ${mensaje.tipo === 'error' ? '#FECACA' : '#A7F3D0'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* Resumen */}
      <div style={{
        backgroundColor: '#F3ECD8', padding: '14px', borderRadius: '12px',
        border: '2px solid #D1C9B4', marginBottom: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pagado</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#24352A' }}>${totalPagado.toLocaleString('es-AR')}</div>
        </div>
        {puedeEditar && !agregando && (
          <button
            onClick={() => setAgregando(true)}
            style={{
              backgroundColor: '#C48A2A', color: 'white', padding: '8px 16px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
              letterSpacing: '0.5px', fontSize: '12px', fontWeight: '600'
            }}
          >
            ➕ Registrar Pago
          </button>
        )}
      </div>

      {/* Formulario Inline */}
      {agregando && (
        <div style={{ backgroundColor: 'white', border: '2px solid #24352A', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', color: '#24352A', margin: '0 0 12px 0', textTransform: 'uppercase' }}>Nuevo Pago</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Concepto *</label>
              <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej: Campamento Invierno" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Monto *</label>
              <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Observaciones</label>
            <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" style={inputStyle} />
          </div>
          
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Comprobante</label>
            {comprobanteUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#D1FAE5', padding: '6px 10px', borderRadius: '6px', border: '2px solid #A7F3D0' }}>
                <span>📄</span>
                <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#24352A', fontSize: '12px', fontWeight: '600' }}>Ver comprobante</a>
                <button onClick={() => setComprobanteUrl(null)} style={{ border: 'none', background: 'transparent', color: '#BF4E30', cursor: 'pointer', marginLeft: 'auto', fontWeight: 'bold' }}>✕</button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #D1C9B4', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#7A7364' }}>
                {subiendoComprobante ? 'Subiendo...' : '📎 Adjuntar comprobante'}
                <input type="file" accept="image/*,.pdf" onChange={handleSubirComprobante} style={{ display: 'none' }} disabled={subiendoComprobante} />
              </label>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setAgregando(false)} disabled={guardando} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#E8DEC4', color: '#24352A', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
            <button onClick={guardarPago} disabled={guardando || subiendoComprobante} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#24352A', color: 'white', cursor: 'pointer', fontWeight: '600' }}>
              {guardando ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Pagos */}
      {pagos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#7A7364', fontSize: '13px' }}>
          No hay pagos registrados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pagos.map(p => (
            <div key={p.id} style={{ backgroundColor: 'white', border: '2px solid #E8DEC4', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {p.numero_recibo && (
                    <span style={{
                      backgroundColor: '#24352A', color: 'white',
                      padding: '2px 8px', borderRadius: '6px',
                      fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px'
                    }}>
                      {p.numero_recibo}
                    </span>
                  )}
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#24352A' }}>
                    {p.concepto}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#7A7364', marginTop: '2px' }}>
                  {formatFecha(p.fecha_pago)} {p.observaciones && `· ${p.observaciones}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#5C7A5E' }}>
                  ${p.monto.toLocaleString('es-AR')}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {p.comprobante_url && (
                    <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontSize: '18px' }} title="Ver comprobante">📄</a>
                  )}
                  {puedeEditar && (
                    <button onClick={() => eliminarPago(p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.6 }} title="Eliminar pago">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: '600', color: '#7A7364',
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px', border: '2px solid #D1C9B4',
  borderRadius: '6px', outline: 'none', fontFamily: 'Oswald, sans-serif'
}