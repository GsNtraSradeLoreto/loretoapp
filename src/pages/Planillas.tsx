import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatearNombreConH } from '../utils/formatNombre'
import { ordenarListaBeneficiarios } from '../utils/ordenBeneficiarios'
import { generarPDFPlanilla } from '../lib/generarPDFPlanilla'

// ============================================
// INTERFACES
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

type Rama = 'Manada' | 'Unidad Scout' | 'Caminantes' | 'Rovers' | 'Dirigentes y otros'
type Concepto = 'afiliacion' | 'cuotas' | 'camp_corto' | 'camp_anual'

const RAMAS: Rama[] = ['Manada', 'Unidad Scout', 'Caminantes', 'Rovers', 'Dirigentes y otros']

const CONCEPTOS: { key: Concepto; label: string; emoji: string }[] = [
  { key: 'afiliacion', label: 'AFILIACIÓN 2026', emoji: '📋' },
  { key: 'cuotas', label: 'CUOTAS 2026', emoji: '💰' },
  { key: 'camp_corto', label: 'CAMPAMENTO CORTO 2026', emoji: '🏕️' },
  { key: 'camp_anual', label: 'CAMPAMENTO ANUAL 2027', emoji: '🏕️' }
]

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

const ANIO_ACTUAL = 2026

const COLORES = {
  verdeScout: '#24352A',
  terracota: '#BF4E30',
  verdeClaro: '#5C7A5E',
  dorado: '#C48A2A',
  textoPrincipal: '#24352A',
  textoSecundario: '#7A7364',
  bordeSuave: '#E8DEC4',
  gris: '#A89E86'
}

// ============================================
// HOOK: Detectar mobile
// ============================================
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

// ============================================
// HELPERS
// ============================================
const formatFecha = (fecha: string | null | undefined) => {
  if (!fecha) return ''
  const partes = fecha.split('-')
  if (partes.length !== 3) return ''
  return `${parseInt(partes[2])}/${parseInt(partes[1])}`
}

const formatMonto = (monto: number) => {
  return `$${monto.toLocaleString('es-AR')}`
}

const getNombreRama = (rama: Rama) => {
  const map: Record<Rama, string> = {
    'Manada': '🐺 Manada',
    'Unidad Scout': '⚜️ Unidad Scout',
    'Caminantes': '🏔️ Caminantes',
    'Rovers': '🔥 Rovers',
    'Dirigentes y otros': '👥 Dirigentes y otros'
  }
  return map[rama] || rama
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function Planillas() {
  const {
    profile,
    isSuperAdmin,
    isJefatura,
    isAdministrador,
    isTesorero,
    getRolData
  } = useAuth()

  const isMobile = useIsMobile()

  const [config, setConfig] = useState<any>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  const [conceptosAbiertos, setConceptosAbiertos] = useState<Set<Concepto>>(new Set())
  const [ramasAbiertas, setRamasAbiertas] = useState<Set<string>>(new Set())

  const [movimientos, setMovimientos] = useState<Record<string, Movimiento[]>>({})
  const [observaciones, setObservaciones] = useState<Record<string, Observacion[]>>({})
  const [beneficiarios, setBeneficiarios] = useState<Record<string, Beneficiario[]>>({})
  const [cargando, setCargando] = useState<Set<string>>(new Set())

  const rolData = getRolData()
  const esDirigente = rolData.tipo === 'jefe' || rolData.tipo === 'subjefe' || rolData.tipo === 'ayudante'
  const ramaAsignada = rolData.rama as Rama | null

  const puedeVerTodo = isSuperAdmin || isJefatura || isAdministrador || isTesorero
  const puedeEditar = isSuperAdmin || isTesorero

  const ramasVisibles: Rama[] = puedeVerTodo
    ? RAMAS
    : (esDirigente && ramaAsignada && ramaAsignada !== 'Dirigentes y otros')
      ? [ramaAsignada]
      : []

  // Cargar config
  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracion_grupo')
          .select('valores_planillas')
          .limit(1)
          .maybeSingle()

        if (error) throw error
        if (data) setConfig(data.valores_planillas)
      } catch (error) {
        console.error('Error al cargar config:', error)
      } finally {
        setLoadingConfig(false)
      }
    }
    cargarConfig()
  }, [])

  // Carga de datos
  const cargarDatos = async (concepto: Concepto, rama: Rama, forzar = false) => {
    const key = `${concepto}-${rama}`
    if (!forzar && movimientos[key] !== undefined) return

    setCargando(prev => new Set(prev).add(key))

    try {
      let beneficiariosCargados: Beneficiario[] = []
      if (rama !== 'Dirigentes y otros') {
        const { data: benef, error: errBenef } = await supabase
          .from('beneficiarios')
          .select('id, nombre, apellido, rama, estado, tiene_hermanos')
          .eq('rama', rama)

        if (errBenef) throw errBenef
        beneficiariosCargados = ordenarListaBeneficiarios(benef || []) as Beneficiario[]
      }

      const { data: mov, error: errMov } = await supabase
        .from('planilla_movimientos')
        .select('*')
        .eq('anio', ANIO_ACTUAL)
        .eq('rama', rama)
        .eq('concepto', concepto)

      if (errMov) throw errMov

      const { data: obs, error: errObs } = await supabase
        .from('planilla_observaciones')
        .select('*')
        .eq('anio', ANIO_ACTUAL)
        .eq('rama', rama)
        .eq('concepto', concepto)

      if (errObs) throw errObs

      setBeneficiarios(prev => ({ ...prev, [key]: beneficiariosCargados }))
      setMovimientos(prev => ({ ...prev, [key]: mov || [] }))
      setObservaciones(prev => ({ ...prev, [key]: obs || [] }))
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setCargando(prev => {
        const nuevo = new Set(prev)
        nuevo.delete(key)
        return nuevo
      })
    }
  }

  const toggleConcepto = (concepto: Concepto) => {
    setConceptosAbiertos(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(concepto)) nuevo.delete(concepto)
      else nuevo.add(concepto)
      return nuevo
    })
  }

  const toggleRama = (concepto: Concepto, rama: Rama) => {
    const key = `${concepto}-${rama}`
    setRamasAbiertas(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(key)) {
        nuevo.delete(key)
      } else {
        nuevo.add(key)
        if (movimientos[key] === undefined) {
          cargarDatos(concepto, rama)
        }
      }
      return nuevo
    })
  }

  // CRUD
  const crearMovimiento = async (
    concepto: Concepto, rama: Rama, beneficiarioId: string | null,
    fecha: string, monto: number, pagadoPor?: string,
    reciboEntregado?: boolean,
    nombreLibre?: string, categoria?: string
  ) => {
    try {
      const { data: nuevoMov, error } = await supabase
        .from('planilla_movimientos')
        .insert({
          anio: ANIO_ACTUAL, rama, concepto,
          beneficiario_id: beneficiarioId,
          nombre_libre: nombreLibre || null,
          categoria: categoria || 'beneficiario',
          fecha_pago: fecha, monto,
          pagado_por: pagadoPor || 'familia',
          recibo_entregado: reciboEntregado !== undefined ? reciboEntregado : true,
          creado_por: profile?.id
        })
        .select()
        .single()

      if (error) throw error

      // ✅ Actualizar solo el estado local (sin recargar todo)
      const key = `${concepto}-${rama}`
      setMovimientos(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), nuevoMov]
      }))
    } catch (error) {
      console.error('Error al crear movimiento:', error)
      alert('Error al guardar el pago')
    }
  }

  const actualizarMovimiento = async (
    concepto: Concepto, rama: Rama, id: string, fecha: string, monto: number,
    pagadoPor?: string, reciboEntregado?: boolean
  ) => {
    try {
      const { data: movActualizado, error } = await supabase
        .from('planilla_movimientos')
        .update({
          fecha_pago: fecha,
          monto,
          pagado_por: pagadoPor || 'familia',
          recibo_entregado: reciboEntregado !== undefined ? reciboEntregado : true
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // ✅ Actualizar solo el estado local
      const key = `${concepto}-${rama}`
      setMovimientos(prev => ({
        ...prev,
        [key]: (prev[key] || []).map(m => m.id === id ? movActualizado : m)
      }))
    } catch (error) {
      console.error('Error al actualizar:', error)
      alert('Error al guardar')
    }
  }

  const eliminarMovimiento = async (concepto: Concepto, rama: Rama, id: string) => {
    try {
      const { error } = await supabase.from('planilla_movimientos').delete().eq('id', id)
      if (error) throw error

      // ✅ Actualizar solo el estado local
      const key = `${concepto}-${rama}`
      setMovimientos(prev => ({
        ...prev,
        [key]: (prev[key] || []).filter(m => m.id !== id)
      }))
    } catch (error) {
      console.error('Error al eliminar:', error)
      alert('Error al eliminar')
    }
  }

  const guardarObservacion = async (
    concepto: Concepto, rama: Rama, beneficiarioId: string | null,
    texto: string, observacionId?: string, nombreLibre?: string
  ) => {
    try {
      const key = `${concepto}-${rama}`

      if (observacionId) {
        if (texto.trim() === '') {
          const { error } = await supabase
            .from('planilla_observaciones').delete().eq('id', observacionId)
          if (error) throw error

          setObservaciones(prev => ({
            ...prev,
            [key]: (prev[key] || []).filter(o => o.id !== observacionId)
          }))
        } else {
          const { data: obsActualizada, error } = await supabase
            .from('planilla_observaciones')
            .update({
              observacion: texto,
              actualizado_por: profile?.id,
              actualizado_en: new Date().toISOString()
            })
            .eq('id', observacionId)
            .select()
            .single()
          if (error) throw error

          setObservaciones(prev => ({
            ...prev,
            [key]: (prev[key] || []).map(o => o.id === observacionId ? obsActualizada : o)
          }))
        }
      } else if (texto.trim() !== '') {
        const { data: nuevaObs, error } = await supabase
          .from('planilla_observaciones')
          .insert({
            anio: ANIO_ACTUAL, rama, concepto,
            beneficiario_id: beneficiarioId,
            nombre_libre: nombreLibre || null,
            observacion: texto,
            actualizado_por: profile?.id
          })
          .select()
          .single()
        if (error) throw error

        setObservaciones(prev => ({
          ...prev,
          [key]: [...(prev[key] || []), nuevaObs]
        }))
      }
    } catch (error) {
      console.error('Error al guardar observación:', error)
      alert('Error al guardar observación')
    }
  }

  const getValorReferencia = (concepto: Concepto): string => {
    if (!config) return ''
    if (concepto === 'afiliacion') {
      const v = config.afiliacion_2026?.valor || 42000
      return `Valor: ${formatMonto(v)}`
    }
    if (concepto === 'cuotas') {
      const aj = config.cuotas_2026?.abril_julio
      const ad = config.cuotas_2026?.agosto_diciembre
      if (aj && ad) {
        return `Abr-Jul: Único ${formatMonto(aj.unico)} / Hermano ${formatMonto(aj.hermano)} · Ago-Dic: Único ${formatMonto(ad.unico)} / Hermano ${formatMonto(ad.hermano)}`
      }
    }
    if (concepto === 'camp_corto') {
      const c = config.camp_corto_2026
      if (c) return `Único ${formatMonto(c.unico)} / Hermano ${formatMonto(c.hermano)} / Dirigente ${formatMonto(c.dirigente)}`
    }
    if (concepto === 'camp_anual') {
      const c = config.camp_anual_2027
      if (c) return `Único ${formatMonto(c.unico)} / Hermano ${formatMonto(c.hermano)} / Dirigente ${formatMonto(c.dirigente)}`
    }
    return ''
  }

  // RENDER
  if (loadingConfig) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COLORES.textoSecundario }}>
          Cargando planillas...
        </span>
      </div>
    )
  }

  if (ramasVisibles.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Oswald, sans-serif', color: COLORES.terracota }}>
        ⚠️ No tenés permisos para ver las planillas
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontWeight: '700', fontSize: 'clamp(18px, 4vw, 24px)',
          color: COLORES.verdeScout, textTransform: 'uppercase',
          letterSpacing: '1px', margin: 0
        }}>
          📊 Planillas {ANIO_ACTUAL}
        </h1>
        <p style={{
          fontSize: 'clamp(11px, 2.5vw, 14px)', color: COLORES.textoSecundario,
          textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 0 0'
        }}>
          Reportes financieros por rama
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {CONCEPTOS.map(({ key, label, emoji }) => {
          const abierto = conceptosAbiertos.has(key)
          return (
            <div
              key={key}
              style={{
                backgroundColor: 'white',
                border: `2px solid ${COLORES.bordeSuave}`,
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            >
              <button
                onClick={() => toggleConcepto(key)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: '10px', padding: '14px 16px',
                  backgroundColor: abierto ? '#F3ECD8' : 'white',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif', textAlign: 'left'
                }}
              >
                <span style={{
                  fontSize: 'clamp(13px, 3vw, 16px)', fontWeight: '700',
                  color: COLORES.verdeScout, textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {emoji} {label}
                </span>
                <span style={{ fontSize: '18px', color: COLORES.textoSecundario }}>
                  {abierto ? '▲' : '▼'}
                </span>
              </button>

              {abierto && (
                <div style={{ padding: '12px 16px 16px 16px', borderTop: `2px dashed ${COLORES.bordeSuave}` }}>
                  <div style={{
                    backgroundColor: '#FFF8E7', border: `1.5px solid ${COLORES.dorado}`,
                    borderRadius: '8px', padding: '8px 12px', marginBottom: '12px',
                    fontSize: 'clamp(10px, 2.2vw, 12px)', color: COLORES.textoPrincipal
                  }}>
                    💵 {getValorReferencia(key)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ramasVisibles.map((rama) => {
                      if (key === 'cuotas' && rama === 'Dirigentes y otros') return null
                      const ramaKey = `${key}-${rama}`
                      const ramaAbierta = ramasAbiertas.has(ramaKey)
                      const cargandoEsta = cargando.has(ramaKey)

                      return (
                        <div
                          key={rama}
                          style={{
                            border: `1.5px solid ${COLORES.bordeSuave}`,
                            borderRadius: '10px',
                            overflow: 'hidden'
                          }}
                        >
                          <button
                            onClick={() => toggleRama(key, rama)}
                            style={{
                              width: '100%', display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', gap: '10px', padding: '10px 14px',
                              backgroundColor: ramaAbierta ? '#F0F7F0' : '#FAF8F4',
                              border: 'none', cursor: 'pointer',
                              fontFamily: 'Oswald, sans-serif', textAlign: 'left'
                            }}
                          >
                            <span style={{
                              fontSize: 'clamp(12px, 2.5vw, 14px)', fontWeight: '600',
                              color: COLORES.verdeClaro, textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {getNombreRama(rama)}
                            </span>
                            <span style={{ fontSize: '14px', color: COLORES.textoSecundario }}>
                              {ramaAbierta ? '▲' : '▼'}
                            </span>
                          </button>

                          {ramaAbierta && (
                            <div style={{ padding: '12px' }}>
                              {cargandoEsta ? (
                                <div style={{
                                  textAlign: 'center', padding: '20px 0',
                                  color: COLORES.textoSecundario, fontSize: '12px'
                                }}>
                                  Cargando...
                                </div>
                              ) : (
                                <>
                                  {/* Botón PDF */}
                                  <div style={{
                                    backgroundColor: '#FEF9EC',
                                    border: `1.5px solid ${COLORES.dorado}`,
                                    borderRadius: '10px',
                                    padding: isMobile ? '16px' : '10px 12px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isMobile ? '10px' : '6px',
                                    alignItems: 'center'
                                  }}>
                                    <button
                                      onClick={() => {
                                        generarPDFPlanilla({
                                          concepto: key,
                                          rama,
                                          beneficiarios: beneficiarios[ramaKey] || [],
                                          movimientos: movimientos[ramaKey] || [],
                                          observaciones: observaciones[ramaKey] || [],
                                          config
                                        })
                                      }}
                                      style={{
                                        padding: isMobile ? '14px 20px' : '10px 16px',
                                        backgroundColor: COLORES.verdeScout,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: isMobile ? '14px' : '13px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        fontWeight: '600',
                                        width: isMobile ? '100%' : 'auto',
                                        maxWidth: '400px'
                                      }}
                                    >
                                      📄 Descargar PDF
                                    </button>
                                    {isMobile && (
                                      <div style={{
                                        fontSize: '12px',
                                        color: COLORES.textoSecundario,
                                        textAlign: 'center',
                                        lineHeight: 1.4,
                                        maxWidth: '300px'
                                      }}>
                                        💡 En celular, la planilla se descarga en PDF para que la veas completa y clara.
                                      </div>
                                    )}
                                  </div>

                                  {/* Cartel total + Tabla (solo desktop) */}
                                  {!isMobile && (
                                    <>
                                      {/* Banner de total */}
                                      <div style={{
                                        backgroundColor: COLORES.verdeScout,
                                        color: 'white',
                                        borderRadius: '10px',
                                        padding: '12px 16px',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontFamily: 'Oswald, sans-serif',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                      }}>
                                        <span style={{
                                          fontSize: 'clamp(12px, 2.5vw, 14px)',
                                          fontWeight: '700',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px'
                                        }}>
                                          TOTAL {key === 'afiliacion' ? 'AFILIACIÓN' : key === 'cuotas' ? 'CUOTAS' : key === 'camp_corto' ? 'CAMPAMENTO CORTO' : 'CAMPAMENTO ANUAL'} {rama.toUpperCase()}
                                        </span>
                                        <span style={{
                                          fontSize: 'clamp(16px, 3.5vw, 20px)',
                                          fontWeight: '700',
                                          color: '#F3ECD8'
                                        }}>
                                          {formatMonto(
                                            (movimientos[ramaKey] || []).reduce((sum, m) => sum + m.monto, 0)
                                          )}
                                        </span>
                                      </div>

                                      {/* Tabla */}
                                      <TablaPlanilla
                                        concepto={key}
                                        rama={rama}
                                        beneficiarios={beneficiarios[ramaKey] || []}
                                        movimientos={movimientos[ramaKey] || []}
                                        observaciones={observaciones[ramaKey] || []}
                                        config={config}
                                        puedeEditar={puedeEditar}
                                        onCrear={crearMovimiento}
                                        onActualizar={actualizarMovimiento}
                                        onEliminar={eliminarMovimiento}
                                        onGuardarObservacion={guardarObservacion}
                                      />

                                      {/* Banner leyenda recibos */}
                                      <div style={{
                                        marginTop: '10px',
                                        padding: '8px 12px',
                                        backgroundColor: '#FEF3C7',
                                        border: `1.5px solid ${COLORES.dorado}`,
                                        borderRadius: '8px',
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 'clamp(10px, 2.2vw, 12px)',
                                        color: '#7A5C00',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        textAlign: 'center'
                                      }}>
                                        🟨 RESALTADAS EN AMARILLO LOS RECIBOS NO ENTREGADOS
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// TABLA PLANILLA
// ============================================
function TablaPlanilla({
  concepto, rama, beneficiarios, movimientos, observaciones, config, puedeEditar,
  onCrear, onActualizar, onEliminar, onGuardarObservacion
}: {
  concepto: Concepto
  rama: Rama
  beneficiarios: Beneficiario[]
  movimientos: Movimiento[]
  observaciones: Observacion[]
  config: any
  puedeEditar: boolean
  onCrear: (concepto: Concepto, rama: Rama, benefId: string | null, fecha: string, monto: number, pagadoPor?: string, reciboEntregado?: boolean, nombreLibre?: string, categoria?: string) => void
  onActualizar: (concepto: Concepto, rama: Rama, id: string, fecha: string, monto: number, pagadoPor?: string, reciboEntregado?: boolean) => void
  onEliminar: (concepto: Concepto, rama: Rama, id: string) => void
  onGuardarObservacion: (concepto: Concepto, rama: Rama, benefId: string | null, texto: string, obsId?: string, nombreLibre?: string) => void
}) {
  const esCuotas = concepto === 'cuotas'
  const esCamp = concepto === 'camp_corto' || concepto === 'camp_anual'

  // Máximo de pagos (para afiliación y camps) — solo pagos de FAMILIA
  const maxPagos = esCuotas ? 0 : Math.max(2, ...beneficiarios.map(b => {
    return movimientos.filter(m => m.beneficiario_id === b.id && m.pagado_por !== 'grupo').length
  }))

  // Separar activos e inactivos
  const activos = beneficiarios.filter(b => b.estado === 'activo')
  const inactivos = beneficiarios.filter(b => b.estado === 'inactivo')
  const ordenados = [...activos, ...inactivos]

  if (beneficiarios.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '16px 0',
        color: COLORES.textoSecundario, fontSize: '12px', fontStyle: 'italic'
      }}>
        {rama === 'Dirigentes y otros'
          ? '🚧 Cargá el primer pago para agregar personas'
          : 'No hay beneficiarios en esta rama'}
      </div>
    )
  }

  const getTotalMes = (mesKey: string) =>
    movimientos
      .filter(m => m.fecha_pago.startsWith(`2026-${mesKey}`))
      .reduce((sum, m) => sum + m.monto, 0)

  return (
    <div style={{
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      border: `2px solid ${COLORES.bordeSuave}`,
      borderRadius: '10px'
    }}>
      <table style={{
        borderCollapse: 'separate',
        borderSpacing: 0,
        fontSize: 'clamp(11px, 2.3vw, 13px)',
        fontFamily: 'Oswald, sans-serif',
        width: '100%'
      }}>
        <thead>
          <tr>
            <th style={{
              ...thStickyLeft,
              minWidth: '140px',
              maxWidth: '140px'
            }}>
              Beneficiario
            </th>
            {esCuotas ? (
              MESES_CUOTAS.map(m => (
                <th key={m.key} style={{
                  ...thNormal,
                  padding: '8px 6px',
                  minWidth: '90px'
                }}>{m.label}</th>
              ))
            ) : (
              Array.from({ length: maxPagos }, (_, i) => (
                <th key={i} style={{
                  ...thNormal,
                  padding: '8px 6px',
                  minWidth: '110px'
                }}>PAGO {i + 1}</th>
              ))
            )}
            {esCamp && (
              <th style={{
                ...thNormal,
                backgroundColor: COLORES.terracota,
                minWidth: '100px',
                padding: '8px 6px'
              }}>
                FALTA PAGAR
              </th>
            )}
            <th style={{
              ...thNormal,
              minWidth: '180px',
              maxWidth: '300px',
              padding: '8px 8px',
              textAlign: 'left'
            }}>
              OBSERVACIONES
            </th>
            <th style={{
              ...thNormal,
              minWidth: '110px',
              padding: '8px 6px'
            }}>
              PAGÓ EL GRUPO
            </th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((b, idx) => {
            const movsBenef = movimientos
              .filter(m => m.beneficiario_id === b.id)
              .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))

            const movsFamilia = movsBenef.filter(m => m.pagado_por !== 'grupo')
            const pagoGrupo = movsBenef.find(m => m.pagado_por === 'grupo')

            const obs = observaciones.find(o => o.beneficiario_id === b.id)
            const total = movsBenef.reduce((sum, m) => sum + m.monto, 0)
            const esInactivo = b.estado === 'inactivo'
            const bgFila = esInactivo ? '#F3F4F6' : (idx % 2 === 0 ? 'white' : '#FAF8F4')
            const nombreFormateado = formatearNombreConH(b.nombre, b.apellido, b.tiene_hermanos)

            const valorCamp = esCamp ? (
              concepto === 'camp_corto'
                ? (b.tiene_hermanos ? config?.camp_corto_2026?.hermano : config?.camp_corto_2026?.unico) || 0
                : (b.tiene_hermanos ? config?.camp_anual_2027?.hermano : config?.camp_anual_2027?.unico) || 0
            ) : 0
            const faltaPagar = esCamp ? Math.max(0, valorCamp - total) : 0

            return (
              <tr key={b.id}>
                <td style={{
                  ...tdStickyLeft,
                  backgroundColor: bgFila,
                  opacity: esInactivo ? 0.65 : 1,
                  textDecoration: esInactivo ? 'line-through' : 'none'
                }}>
                  <div style={{
                    fontSize: 'clamp(11px, 2.3vw, 13px)',
                    fontWeight: '600',
                    color: esInactivo ? COLORES.gris : COLORES.textoPrincipal,
                    lineHeight: 1.2,
                    wordBreak: 'break-word'
                  }}>
                    {nombreFormateado}
                  </div>
                  {esInactivo && (
                    <div style={{
                      fontSize: '10px',
                      color: COLORES.terracota,
                      fontStyle: 'italic',
                      marginTop: '2px',
                      textDecoration: 'none'
                    }}>
                      (Ex miembro)
                    </div>
                  )}
                </td>

                {esCuotas ? (
                  MESES_CUOTAS.map(mes => {
                    const mov = movsFamilia.find(m => m.fecha_pago.startsWith(`2026-${mes.key}`))
                    return (
                      <CeldaPago
                        key={mes.key}
                        movimiento={mov}
                        puedeEditar={puedeEditar}
                        bgFila={bgFila}
                        onCrear={(fecha, monto, pagadoPor, reciboEntregado) => onCrear(concepto, rama, b.id, fecha, monto, pagadoPor, reciboEntregado)}
                        onActualizar={(id, fecha, monto, pagadoPor, reciboEntregado) => onActualizar(concepto, rama, id, fecha, monto, pagadoPor, reciboEntregado)}
                        onEliminar={(id) => onEliminar(concepto, rama, id)}
                      />
                    )
                  })
                ) : (
                  Array.from({ length: maxPagos }, (_, i) => {
                    const mov = movsFamilia[i]
                    return (
                      <CeldaPago
                        key={i}
                        movimiento={mov}
                        puedeEditar={puedeEditar}
                        bgFila={bgFila}
                        onCrear={(fecha, monto, pagadoPor, reciboEntregado) => onCrear(concepto, rama, b.id, fecha, monto, pagadoPor, reciboEntregado)}
                        onActualizar={(id, fecha, monto, pagadoPor, reciboEntregado) => onActualizar(concepto, rama, id, fecha, monto, pagadoPor, reciboEntregado)}
                        onEliminar={(id) => onEliminar(concepto, rama, id)}
                      />
                    )
                  })
                )}

                {/* FALTA PAGAR (solo camps) */}
                {esCamp && (
                  <td style={{
                    ...tdNormal,
                    backgroundColor: faltaPagar === 0
                      ? (esInactivo ? '#E8DEC4' : '#F0F7F0')
                      : '#FEE2E2',
                    color: faltaPagar === 0 ? COLORES.verdeClaro : COLORES.terracota,
                    fontWeight: '700',
                    textAlign: 'center',
                    opacity: esInactivo ? 0.65 : 1,
                    minWidth: '100px',
                    padding: '6px 6px'
                  }}>
                    <div style={{
                      fontSize: 'clamp(13px, 2.6vw, 16px)',
                      whiteSpace: 'nowrap'
                    }}>
                      {faltaPagar === 0 ? '✅' : formatMonto(faltaPagar)}
                    </div>
                  </td>
                )}

                {/* Observaciones */}
                <td style={{
                  ...tdNormal,
                  backgroundColor: esInactivo ? '#E8DEC4' : bgFila,
                  padding: '8px',
                  opacity: esInactivo ? 0.65 : 1,
                  minWidth: '180px',
                  maxWidth: '300px',
                  fontSize: '13px',
                  verticalAlign: 'middle',
                  textAlign: 'left'
                }}>
                  <CeldaObservacion
                    observacion={obs}
                    puedeEditar={puedeEditar}
                    onGuardar={(texto) => onGuardarObservacion(concepto, rama, b.id, texto, obs?.id)}
                  />
                </td>

                {/* PAGÓ EL GRUPO */}
                <CeldaPagoGrupo
                  movimiento={pagoGrupo}
                  puedeEditar={puedeEditar}
                  bgFila={bgFila}
                  onCrear={(fecha, monto, pagadoPor, reciboEntregado) => onCrear(concepto, rama, b.id, fecha, monto, pagadoPor, reciboEntregado)}
                  onActualizar={(id, fecha, monto, pagadoPor, reciboEntregado) => onActualizar(concepto, rama, id, fecha, monto, pagadoPor, reciboEntregado)}
                  onEliminar={(id) => onEliminar(concepto, rama, id)}
                />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
// ============================================
// CELDA PAGÓ EL GRUPO
// ============================================
function CeldaPagoGrupo({
  movimiento, puedeEditar, bgFila, onCrear, onActualizar, onEliminar
}: {
  movimiento: Movimiento | undefined
  puedeEditar: boolean
  bgFila: string
  onCrear: (fecha: string, monto: number, pagadoPor?: string, reciboEntregado?: boolean) => void
  onActualizar: (id: string, fecha: string, monto: number, pagadoPor?: string, reciboEntregado?: boolean) => void
  onEliminar: (id: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const abrirEdicion = () => {
    if (!puedeEditar) return
    if (movimiento) {
      setFecha(movimiento.fecha_pago)
      setMonto(movimiento.monto.toString())
    } else {
      setFecha(new Date().toISOString().split('T')[0])
      setMonto('')
    }
    setEditando(true)
  }

  const cerrarYGuardar = () => {
    const montoNum = parseFloat(monto)
    if (fecha && montoNum > 0) {
      if (movimiento) onActualizar(movimiento.id, fecha, montoNum, 'grupo', true)
      else onCrear(fecha, montoNum, 'grupo', true)
    } else if (movimiento && !monto) {
      onEliminar(movimiento.id)
    }
    setEditando(false)
    setFecha('')
    setMonto('')
  }

  useEffect(() => {
    if (!editando) return
    const handleClickFuera = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        cerrarYGuardar()
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [editando, fecha, monto])

  if (editando) {
    return (
      <td style={{ ...tdNormal, padding: '4px', backgroundColor: bgFila, minWidth: '110px' }}>
        <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            autoFocus
            style={inputInlineStyle}
          />
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="$"
            onKeyDown={(e) => { if (e.key === 'Enter') cerrarYGuardar() }}
            style={inputInlineStyle}
          />
        </div>
      </td>
    )
  }

  if (!movimiento) {
    return (
      <td
        onClick={abrirEdicion}
        style={{
          ...tdNormal,
          textAlign: 'center',
          cursor: puedeEditar ? 'pointer' : 'default',
          backgroundColor: bgFila,
          color: '#D1C9B4',
          fontSize: '14px'
        }}
      >
        {puedeEditar ? '+' : '—'}
      </td>
    )
  }

  return (
    <td
      onClick={abrirEdicion}
      style={{
        ...tdNormal,
        textAlign: 'center',
        cursor: puedeEditar ? 'pointer' : 'default',
        backgroundColor: '#E8F5E9',
        padding: '8px 6px'
      }}
    >
      <div style={{
        whiteSpace: 'nowrap',
        lineHeight: 1.3
      }}>
        <span style={{
          fontSize: '11px',
          color: COLORES.textoSecundario,
          fontWeight: '400'
        }}>
          {formatFecha(movimiento.fecha_pago)}
        </span>
        <span style={{
          fontSize: '11px',
          color: COLORES.textoSecundario,
          fontWeight: '400'
        }}>
          {' - '}
        </span>
        <span style={{
          fontSize: 'clamp(13px, 2.6vw, 16px)',
          color: COLORES.textoPrincipal,
          fontWeight: '700'
        }}>
          {formatMonto(movimiento.monto)}
        </span>
      </div>
    </td>
  )
}

// ============================================
// CELDA PAGO
// ============================================
function CeldaPago({
  movimiento, puedeEditar, bgFila, onCrear, onActualizar, onEliminar
}: {
  movimiento: Movimiento | undefined
  puedeEditar: boolean
  bgFila: string
  onCrear: (fecha: string, monto: number, pagadoPor?: string, reciboEntregado?: boolean) => void
  onActualizar: (id: string, fecha: string, monto: number, pagadoPor?: string, reciboEntregado?: boolean) => void
  onEliminar: (id: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const [reciboEntregado, setReciboEntregado] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const abrirEdicion = () => {
    if (!puedeEditar) return
    if (movimiento) {
      setFecha(movimiento.fecha_pago)
      setMonto(movimiento.monto.toString())
      setReciboEntregado(movimiento.recibo_entregado !== false)
    } else {
      setFecha(new Date().toISOString().split('T')[0])
      setMonto('')
      setReciboEntregado(true)
    }
    setEditando(true)
  }

  const cerrarYGuardar = () => {
    const montoNum = parseFloat(monto)
    if (fecha && montoNum > 0) {
      if (movimiento) onActualizar(movimiento.id, fecha, montoNum, 'familia', reciboEntregado)
      else onCrear(fecha, montoNum, 'familia', reciboEntregado)
    } else if (movimiento && !monto) {
      onEliminar(movimiento.id)
    }
    setEditando(false)
    setFecha('')
    setMonto('')
    setReciboEntregado(true)
  }

  useEffect(() => {
    if (!editando) return
    const handleClickFuera = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        cerrarYGuardar()
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [editando, fecha, monto, reciboEntregado])

  if (editando) {
    return (
      <td style={{ ...tdNormal, padding: '4px', backgroundColor: bgFila, minWidth: '120px' }}>
        <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            autoFocus
            style={inputInlineStyle}
          />
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="$"
            onKeyDown={(e) => { if (e.key === 'Enter') cerrarYGuardar() }}
            style={inputInlineStyle}
          />
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontFamily: 'Oswald, sans-serif',
            cursor: 'pointer',
            userSelect: 'none',
            color: COLORES.textoPrincipal
          }}>
            <input
              type="checkbox"
              checked={reciboEntregado}
              onChange={(e) => setReciboEntregado(e.target.checked)}
              style={{ width: '13px', height: '13px', cursor: 'pointer' }}
            />
            📄 Recibo entregado
          </label>
        </div>
      </td>
    )
  }

  if (!movimiento) {
    return (
      <td
        onClick={abrirEdicion}
        style={{
          ...tdNormal,
          textAlign: 'center',
          cursor: puedeEditar ? 'pointer' : 'default',
          backgroundColor: bgFila,
          color: '#D1C9B4',
          fontSize: '14px'
        }}
      >
        {puedeEditar ? '+' : '—'}
      </td>
    )
  }

  const sinRecibo = movimiento.recibo_entregado === false
  const esPagoGrupo = movimiento.pagado_por === 'grupo'

  return (
    <td
      onClick={abrirEdicion}
      style={{
        ...tdNormal,
        textAlign: 'center',
        cursor: puedeEditar ? 'pointer' : 'default',
        backgroundColor: sinRecibo ? '#FCD34D' : (esPagoGrupo ? '#E8F5E9' : bgFila),
        padding: '8px 6px'
      }}
    >
      <div style={{
        whiteSpace: 'nowrap',
        lineHeight: 1.3
      }}>
        <span style={{
          fontSize: '11px',
          color: COLORES.textoSecundario,
          fontWeight: '400'
        }}>
          {formatFecha(movimiento.fecha_pago)}
        </span>
        <span style={{
          fontSize: '11px',
          color: COLORES.textoSecundario,
          fontWeight: '400'
        }}>
          {' - '}
        </span>
        <span style={{
          fontSize: 'clamp(13px, 2.6vw, 16px)',
          color: COLORES.textoPrincipal,
          fontWeight: '700'
        }}>
          {formatMonto(movimiento.monto)}
        </span>
      </div>
    </td>
  )
}

// ============================================
// CELDA OBSERVACIÓN
// ============================================
function CeldaObservacion({
  observacion, puedeEditar, onGuardar
}: {
  observacion: Observacion | undefined
  puedeEditar: boolean
  onGuardar: (texto: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const abrirEdicion = () => {
    if (!puedeEditar) return
    setTexto(observacion?.observacion || '')
    setEditando(true)
  }

  const cerrarYGuardar = () => {
    onGuardar(texto)
    setEditando(false)
  }

  useEffect(() => {
    if (!editando) return
    const handleClickFuera = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        cerrarYGuardar()
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [editando, texto])

  if (editando) {
    return (
      <div ref={wrapperRef} style={{ minWidth: '150px' }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Observación..."
          style={{
            width: '100%', padding: '4px 6px', fontSize: '12px',
            border: '2px solid #24352A', borderRadius: '4px',
            outline: 'none', fontFamily: 'Oswald, sans-serif',
            resize: 'vertical', boxSizing: 'border-box'
          }}
        />
      </div>
    )
  }

  return (
    <div
      onClick={abrirEdicion}
      style={{
        cursor: puedeEditar ? 'pointer' : 'default',
        fontSize: '13px',
        color: observacion ? COLORES.textoPrincipal : 'transparent',
        lineHeight: 1.35,
        wordBreak: 'break-word',
        minHeight: '22px'
      }}
    >
      {observacion?.observacion || ''}
    </div>
  )
}

// ============================================
// ESTILOS
// ============================================
const thNormal: React.CSSProperties = {
  padding: '8px 4px',
  fontSize: 'clamp(10px, 2.1vw, 12px)',
  fontWeight: '700',
  color: 'white',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  textAlign: 'center',
  backgroundColor: '#24352A',
  borderRight: '1px solid rgba(255,255,255,0.15)',
  position: 'sticky',
  top: 0,
  zIndex: 2
}

const thStickyLeft: React.CSSProperties = {
  ...thNormal,
  left: 0,
  zIndex: 4,
  minWidth: '140px',
  textAlign: 'left'
}

const tdNormal: React.CSSProperties = {
  padding: '6px 6px',
  fontSize: 'clamp(11px, 2.3vw, 13px)',
  color: '#24352A',
  borderBottom: '1px solid #E8DEC4',
  borderRight: '1px solid #E8DEC4',
  verticalAlign: 'middle'
}

const tdStickyLeft: React.CSSProperties = {
  ...tdNormal,
  position: 'sticky',
  left: 0,
  zIndex: 2,
  minWidth: '140px',
  maxWidth: '140px',
  boxShadow: '2px 0 4px rgba(0,0,0,0.06)'
}

const inputInlineStyle: React.CSSProperties = {
  width: '100%',
  padding: '3px 4px',
  fontSize: '11px',
  border: '2px solid #24352A',
  borderRadius: '3px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  boxSizing: 'border-box'
}