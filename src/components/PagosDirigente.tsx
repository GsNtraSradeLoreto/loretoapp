import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatFecha } from '../utils/formatFecha'
import { getAnioActivo } from '../lib/getAnioActivo'

const ETIQUETAS_OBSERVACIONES = ['Rendido Ok', 'Falta Recibito', 'No rendido']

interface Pago {
  id: string
  concepto: string
  monto: number
  fecha_pago: string
  comprobante_url: string | null
  observaciones: string | null
  medio_pago: string | null
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
  const [monto, setMonto] = useState('')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [subiendoComprobante, setSubiendoComprobante] = useState(false)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [anioActivo, setAnioActivo] = useState<number | null>(null)
  
  const [categoria, setCategoria] = useState('')
  const [categoriaOtro, setCategoriaOtro] = useState('')
  const [medioPago, setMedioPago] = useState('')
  const [reciboGenerado, setReciboGenerado] = useState('')

  // Edición inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editMonto, setEditMonto] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editCategoria, setEditCategoria] = useState('')
  const [editCategoriaOtro, setEditCategoriaOtro] = useState('')
  const [editMedioPago, setEditMedioPago] = useState('')
  const [editObservaciones, setEditObservaciones] = useState('')
  const [editGuardando, setEditGuardando] = useState(false)

  const categorias = [
    { value: 'AFILIACION', label: 'Afiliación' },
    { value: 'CUOTAS', label: 'Cuotas' },
    { value: 'C. CORTO', label: 'Campamento Corto' },
    { value: 'C. ANUAL', label: 'Campamento Anual' },
    { value: 'OTRO', label: 'Otro' }
  ]
  const mediosPago = ['Efectivo', 'Mercadopago']

  useEffect(() => {
    if (dirigenteId) {
      cargarAnioActivo()
      cargarPagos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirigenteId])

  const cargarAnioActivo = async () => {
    const anio = await getAnioActivo()
    setAnioActivo(anio)
  }

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
        .from('beneficiarios')
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
    if (!categoria || !monto || !fechaPago || !medioPago) {
      setMensaje({ texto: '❌ Completá todos los campos obligatorios', tipo: 'error' })
      return
    }
    if (categoria === 'OTRO' && !categoriaOtro.trim()) {
      setMensaje({ texto: '❌ Especificá el concepto "Otro"', tipo: 'error' })
      return
    }

    setGuardando(true)
    setMensaje(null)

    try {
      if (anioActivo === null) {
        setMensaje({ texto: '❌ No se pudo determinar el período activo.', tipo: 'error' })
        setGuardando(false)
        return
      }

      let categoriaFinal = categoria
      if (categoria === 'OTRO') {
        categoriaFinal = categoriaOtro.trim().toUpperCase()
      }

      const { error: err } = await supabase.from('pagos_dirigentes').insert({
        dirigente_id: dirigenteId,
        recibo: reciboGenerado,
        monto: parseFloat(monto),
        fecha_pago: fechaPago,
        observaciones: observaciones.trim() || null,
        registrado_por: profile?.id || null,
        anio: anioActivo,
        tipo_pago: 'dirigente',
        rama: 'Dirigentes y otros',
        categoria: categoriaFinal,
        medio_pago: medioPago,
        comprobante_url: comprobanteUrl
      })

      if (err) throw err

      setMensaje({ texto: `✅ Pago registrado con recibo ${reciboGenerado}`, tipo: 'ok' })
      setAgregando(false)
      setMonto('')
      setFechaPago(new Date().toISOString().split('T')[0])
      setObservaciones('')
      setComprobanteUrl(null)
      setCategoria('')
      setCategoriaOtro('')
      setMedioPago('')
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

  const agregarEtiqueta = async (pagoId: string, etiqueta: string) => {
    const pago = pagos.find(p => p.id === pagoId)
    if (!pago) return

    const actual = pago.observaciones || ''
    if (actual === etiqueta) return

    setPagos(prev => prev.map(p => p.id === pagoId ? { ...p, observaciones: etiqueta } : p))

    supabase.from('pagos_dirigentes').update({ observaciones: etiqueta }).eq('id', pagoId).then(({ error }) => {
      if (error) {
        console.error('Error al guardar etiqueta:', error)
        setPagos(prev => prev.map(p => p.id === pagoId ? { ...p, observaciones: actual } : p))
      }
    })
  }

  const abrirEdicion = (pago: Pago) => {
    const categoriasEstandar = ['AFILIACION', 'CUOTAS', 'C. CORTO', 'C. ANUAL']
    const esOtro = !categoriasEstandar.includes(pago.categoria || '')
    
    setEditandoId(pago.id)
    setEditMonto(pago.monto.toString())
    setEditFecha(pago.fecha_pago)
    setEditCategoria(esOtro ? 'OTRO' : (pago.categoria || ''))
    setEditCategoriaOtro(esOtro ? (pago.categoria || '') : '')
    setEditMedioPago(pago.medio_pago || 'Efectivo')
    setEditObservaciones(pago.observaciones || '')
  }

  const guardarEdicion = async (id: string) => {
    if (!editMonto || !editFecha || !editCategoria || !editMedioPago) return
    if (editCategoria === 'OTRO' && !editCategoriaOtro.trim()) return

    setEditGuardando(true)
    let categoriaFinal = editCategoria
    if (editCategoria === 'OTRO') {
      categoriaFinal = editCategoriaOtro.trim().toUpperCase()
    }

    const { error: err } = await supabase.from('pagos_dirigentes').update({
      monto: parseFloat(editMonto),
      fecha_pago: editFecha,
      categoria: categoriaFinal,
      medio_pago: editMedioPago,
      observaciones: editObservaciones.trim() || null
    }).eq('id', id)

    if (!err) {
      setMensaje({ texto: '✅ Pago actualizado', tipo: 'ok' })
      await cargarPagos()
      setEditandoId(null)
    } else {
      setMensaje({ texto: '❌ Error: ' + err.message, tipo: 'error' })
    }
    setEditGuardando(false)
  }

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

      {/* Botón Nuevo Pago */}
      {puedeEditar && !agregando && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={() => {
              if (anioActivo) {
                supabase.from('pagos_dirigentes').select('recibo').eq('anio', anioActivo).order('recibo', { ascending: false }).limit(1).then(({ data }) => {
                  let sig = 1
                  if (data && data.length > 0 && data[0].recibo) {
                    const match = data[0].recibo.match(/D-(\d+)/)
                    if (match) sig = parseInt(match[1], 10) + 1
                  }
                  setReciboGenerado(`D-${String(sig).padStart(2, '0')}`)
                })
              }
              setAgregando(true)
            }}
            style={{
              backgroundColor: '#24352A', color: 'white', padding: '6px 14px',
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '11px', fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600
            }}
          >
            + Nuevo Pago
          </button>
        </div>
      )}

      {/* Formulario Inline (Crear) */}
      {agregando && (
        <div style={{ backgroundColor: 'white', border: '2px solid #24352A', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', color: '#24352A', margin: '0 0 12px 0', textTransform: 'uppercase' }}>Nuevo Pago</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Recibo</label>
              <input type="text" value={reciboGenerado} readOnly style={{ ...inputStyle, backgroundColor: '#F3F4F6' }} />
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Concepto *</label>
              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value)
                  if (e.target.value !== 'OTRO') setCategoriaOtro('')
                }}
                style={inputStyle}
              >
                <option value="">Seleccionar...</option>
                {categorias.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Medio de Pago *</label>
              <select value={medioPago} onChange={e => setMedioPago(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {mediosPago.map(mp => (
                  <option key={mp} value={mp}>{mp}</option>
                ))}
              </select>
            </div>
          </div>

          {categoria === 'OTRO' && (
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Especificar Concepto *</label>
              <input type="text" value={categoriaOtro} onChange={e => setCategoriaOtro(e.target.value)} placeholder="Ej: Garrafa, Colaboración" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Observaciones</label>
            <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" style={inputStyle} />
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pagos.map((pago) => {
            const estaEditando = editandoId === pago.id

            if (estaEditando) {
              return (
                <div key={pago.id} style={{ backgroundColor: '#F9F6EE', borderBottom: '1px solid #E8DEC4', padding: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={labelStyle}>Monto</label>
                      <input type="number" value={editMonto} onChange={e => setEditMonto(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Fecha</label>
                      <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Concepto</label>
                      <select value={editCategoria} onChange={e => {
                        setEditCategoria(e.target.value)
                        if (e.target.value !== 'OTRO') setEditCategoriaOtro('')
                      }} style={inputStyle}>
                        <option value="">Seleccionar...</option>
                        {categorias.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Medio</label>
                      <select value={editMedioPago} onChange={e => setEditMedioPago(e.target.value)} style={inputStyle}>
                        {mediosPago.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                      </select>
                    </div>
                  </div>
                  {editCategoria === 'OTRO' && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>Especificar</label>
                      <input type="text" value={editCategoriaOtro} onChange={e => setEditCategoriaOtro(e.target.value)} style={inputStyle} />
                    </div>
                  )}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={labelStyle}>Observaciones</label>
                    <input type="text" value={editObservaciones} onChange={e => setEditObservaciones(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditandoId(null)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#E8DEC4', color: '#24352A', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={() => guardarEdicion(pago.id)} disabled={editGuardando} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#24352A', color: 'white', fontWeight: 600, cursor: 'pointer' }}>💾 Guardar</button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={pago.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '10px 12px',
                  borderBottom: '1px solid #E8DEC4',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(12px, 3vw, 14px)', color: '#24352A', fontWeight: '600' }}>
                    {pago.recibo || '-'} · ${(pago.monto || 0).toLocaleString()}
                  </div>
                  <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#7A7364', marginTop: '2px' }}>
                    {formatFecha(pago.fecha_pago)} · {pago.categoria || 'Sin concepto'}
                    {pago.observaciones && ` · ${pago.observaciones}`}
                  </div>
                  
                  {puedeEditar && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {ETIQUETAS_OBSERVACIONES.map(etq => {
                        const yaEsta = (pago.observaciones || '') === etq
                        return (
                          <button
                            key={etq}
                            onClick={() => !yaEsta && agregarEtiqueta(pago.id, etq)}
                            disabled={yaEsta}
                            style={{
                              padding: '2px 8px', fontSize: '9px', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                              backgroundColor: yaEsta ? '#D1FAE5' : '#F3ECD8', color: yaEsta ? '#5C7A5E' : '#24352A',
                              border: `1px solid ${yaEsta ? '#A7F3D0' : '#D1C9B4'}`, borderRadius: '10px', cursor: yaEsta ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {yaEsta ? '✓ ' : '+ '}{etq}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {pago.comprobante_url && (
                    <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontSize: '16px' }} title="Ver comprobante">📄</a>
                  )}
                  {puedeEditar && (
                    <>
                      <button onClick={() => abrirEdicion(pago)} style={{ background: '#F3ECD8', border: '1px solid #D1C9B4', borderRadius: '6px', cursor: 'pointer', padding: '4px 8px', fontSize: '14px' }} title="Editar pago">✏️</button>
                      <button onClick={() => eliminarPago(pago.id)} style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', padding: '4px 8px', fontSize: '14px' }} title="Eliminar pago">🗑️</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
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