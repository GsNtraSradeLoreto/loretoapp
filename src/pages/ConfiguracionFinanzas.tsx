import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================
// CONSTANTES
// ============================================
const MESES = [
  { key: '01', label: 'Enero' },
  { key: '02', label: 'Febrero' },
  { key: '03', label: 'Marzo' },
  { key: '04', label: 'Abril' },
  { key: '05', label: 'Mayo' },
  { key: '06', label: 'Junio' },
  { key: '07', label: 'Julio' },
  { key: '08', label: 'Agosto' },
  { key: '09', label: 'Septiembre' },
  { key: '10', label: 'Octubre' },
  { key: '11', label: 'Noviembre' },
  { key: '12', label: 'Diciembre' }
]

const MESES_CUOTAS = MESES.filter(m => ['04', '05', '06', '07', '08', '09', '10', '11', '12'].includes(m.key))

const COLORES = {
  verdeScout: '#24352A',
  terracota: '#BF4E30',
  verdeClaro: '#5C7A5E',
  dorado: '#C48A2A',
  textoPrincipal: '#24352A',
  textoSecundario: '#7A7364',
  bordeSuave: '#E8DEC4',
  gris: '#A89E86',
  arena: '#F3ECD8'
}

// ============================================
// HELPERS
// ============================================
const formatMonto = (monto: number) => {
  if (monto === undefined || monto === null) return ''
  return `$${monto.toLocaleString('es-AR')}`
}

const parseMonto = (str: string): number => {
  const limpio = str.replace(/[^\d]/g, '')
  return parseInt(limpio, 10) || 0
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function Configuracion() {
  const { profile, isSuperAdmin, isTesorero } = useAuth()

  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Año seleccionado en la UI (para editar)
  const [anioVista, setAnioVista] = useState<number>(new Date().getFullYear())

  // Año activo de la app (el que se guarda como anio_actual)
  const [anioActivo, setAnioActivo] = useState<number>(2026)

  // Modal para agregar año
  const [modalAgregarAnio, setModalAgregarAnio] = useState(false)
  const [nuevoAnio, setNuevoAnio] = useState('')

  // Modal para confirmar cambio de año activo
  const [modalCambiarAnio, setModalCambiarAnio] = useState(false)

  const puedeEditar = isSuperAdmin || isTesorero

  // ===== CARGAR CONFIG =====
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracion_grupo')
          .select('*')
          .limit(1)
          .maybeSingle()

        if (error) throw error
        if (data) {
          setConfig(data)
          const anio = data.valores_planillas?.anio_actual || 2026
          setAnioActivo(anio)
          setAnioVista(anio)
        }
      } catch (err) {
        console.error('Error al cargar config:', err)
        setMensaje({ tipo: 'error', texto: 'No se pudo cargar la configuración' })
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  // ===== GUARDAR CONFIG =====
  const guardar = async () => {
    if (!config) return
    setGuardando(true)
    setMensaje(null)
    try {
      const { error } = await supabase
        .from('configuracion_grupo')
        .update({ valores_planillas: config.valores_planillas })
        .eq('id', config.id)

      if (error) throw error
      setMensaje({ tipo: 'ok', texto: '✅ Cambios guardados' })
      setTimeout(() => setMensaje(null), 3000)
    } catch (err) {
      console.error('Error al guardar:', err)
      setMensaje({ tipo: 'error', texto: 'Error al guardar. Revisá la consola.' })
    } finally {
      setGuardando(false)
    }
  }

  // ===== ACTUALIZAR UN VALOR DEL JSON =====
  const setValorAfiliacion = (anio: string, mes: string, valor: number) => {
    setConfig((prev: any) => ({
      ...prev,
      valores_planillas: {
        ...prev.valores_planillas,
        afiliacion: {
          ...prev.valores_planillas.afiliacion,
          [anio]: {
            ...(prev.valores_planillas.afiliacion?.[anio] || {}),
            [mes]: valor
          }
        }
      }
    }))
  }

  const setValorCuota = (anio: string, mes: string, tipo: 'unico' | 'hermano', valor: number) => {
    setConfig((prev: any) => ({
      ...prev,
      valores_planillas: {
        ...prev.valores_planillas,
        cuotas: {
          ...prev.valores_planillas.cuotas,
          [anio]: {
            ...(prev.valores_planillas.cuotas?.[anio] || {}),
            [mes]: {
              ...(prev.valores_planillas.cuotas?.[anio]?.[mes] || { unico: 0, hermano: 0 }),
              [tipo]: valor
            }
          }
        }
      }
    }))
  }

  const setValorCamp = (tipoCamp: 'camp_corto' | 'camp_anual', anio: string, tipo: 'unico' | 'hermano' | 'dirigente', valor: number) => {
    setConfig((prev: any) => ({
      ...prev,
      valores_planillas: {
        ...prev.valores_planillas,
        [tipoCamp]: {
          ...prev.valores_planillas[tipoCamp],
          [anio]: {
            ...(prev.valores_planillas[tipoCamp]?.[anio] || { unico: 0, hermano: 0, dirigente: 0 }),
            [tipo]: valor
          }
        }
      }
    }))
  }

  // ===== AGREGAR AÑO =====
  const agregarAnio = () => {
    const anioNum = parseInt(nuevoAnio, 10)
    if (isNaN(anioNum) || anioNum < 2020 || anioNum > 2100) {
      alert('Ingresá un año válido (ej: 2027)')
      return
    }

    setConfig((prev: any) => ({
      ...prev,
      valores_planillas: {
        ...prev.valores_planillas,
        afiliacion: {
          ...prev.valores_planillas.afiliacion,
          [anioNum]: {
            '01': 42000, '02': 42000, '03': 42000, '04': 42000,
            '05': 42000, '06': 42000, '07': 42000, '08': 42000,
            '09': 42000, '10': 42000, '11': 42000, '12': 42000
          }
        },
        cuotas: {
          ...prev.valores_planillas.cuotas,
          [anioNum]: {
            '04': { unico: 0, hermano: 0 },
            '05': { unico: 0, hermano: 0 },
            '06': { unico: 0, hermano: 0 },
            '07': { unico: 0, hermano: 0 },
            '08': { unico: 0, hermano: 0 },
            '09': { unico: 0, hermano: 0 },
            '10': { unico: 0, hermano: 0 },
            '11': { unico: 0, hermano: 0 },
            '12': { unico: 0, hermano: 0 }
          }
        },
        camp_corto: {
          ...prev.valores_planillas.camp_corto,
          [anioNum]: { unico: 0, hermano: 0, dirigente: 0 }
        },
        camp_anual: {
          ...prev.valores_planillas.camp_anual,
          [anioNum + 1]: { unico: 0, hermano: 0, dirigente: 0 }
        }
      }
    }))

    setAnioVista(anioNum)
    setNuevoAnio('')
    setModalAgregarAnio(false)
    setMensaje({ tipo: 'ok', texto: `Año ${anioNum} agregado. No olvides guardar.` })
  }

  // ===== CAMBIAR AÑO ACTIVO =====
  const cambiarAnioActivo = () => {
    setConfig((prev: any) => ({
      ...prev,
      valores_planillas: {
        ...prev.valores_planillas,
        anio_actual: anioVista
      }
    }))
    setAnioActivo(anioVista)
    setModalCambiarAnio(false)
    setMensaje({ tipo: 'ok', texto: `Año activo cambiado a ${anioVista}. Guardá para aplicar.` })
  }

  // ===== AÑOS DISPONIBLES =====
  const aniosDisponibles = config?.valores_planillas?.afiliacion
    ? Object.keys(config.valores_planillas.afiliacion).map(Number).sort()
    : []

  // ===== RENDER =====
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: COLORES.textoSecundario }}>
          Cargando configuración...
        </span>
      </div>
    )
  }

  if (!puedeEditar) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Oswald, sans-serif', color: COLORES.terracota }}>
        ⚠️ Solo SuperAdmin y Tesorero pueden ver esta página
      </div>
    )
  }

  if (!config) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Oswald, sans-serif', color: COLORES.terracota }}>
        No se pudo cargar la configuración
      </div>
    )
  }

  const vp = config.valores_planillas
  const anioVistaStr = anioVista.toString()
  const afiliacionAnio = vp.afiliacion?.[anioVistaStr] || {}
  const cuotasAnio = vp.cuotas?.[anioVistaStr] || {}
  const campCortoAnio = vp.camp_corto?.[anioVistaStr] || { unico: 0, hermano: 0, dirigente: 0 }
  const campAnualAnio = vp.camp_anual?.[anioVista + 1] || { unico: 0, hermano: 0, dirigente: 0 }

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontWeight: '700', fontSize: 'clamp(18px, 4vw, 24px)',
          color: COLORES.verdeScout, textTransform: 'uppercase',
          letterSpacing: '1px', margin: 0
        }}>
          ⚙️ Configuración
        </h1>
        <p style={{
          fontSize: 'clamp(11px, 2.5vw, 14px)', color: COLORES.textoSecundario,
          textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 0 0'
        }}>
          Valores de planillas y año activo
        </p>
      </div>

      {/* MENSAJE */}
      {mensaje && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          backgroundColor: mensaje.tipo === 'ok' ? '#F0F7F0' : '#FEE2E2',
          color: mensaje.tipo === 'ok' ? COLORES.verdeClaro : COLORES.terracota,
          border: `2px solid ${mensaje.tipo === 'ok' ? COLORES.verdeClaro : COLORES.terracota}`,
          fontSize: '13px',
          fontWeight: '600'
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* BARRA: AÑO ACTIVO + SELECTOR */}
      <div style={{
        backgroundColor: COLORES.verdeScout,
        color: 'white',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
            Año activo de la app
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>
            {anioActivo}
          </div>
        </div>

        {anioVista !== anioActivo && (
          <button
            onClick={() => setModalCambiarAnio(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: COLORES.dorado,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            🌐 Hacer {anioVista} el año activo
          </button>
        )}
      </div>

      {/* SELECTOR DE AÑO A EDITAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: COLORES.textoPrincipal }}>
          Editando año:
        </span>
        <select
          value={anioVista}
          onChange={(e) => setAnioVista(parseInt(e.target.value, 10))}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            fontFamily: 'Oswald, sans-serif',
            border: `2px solid ${COLORES.verdeScout}`,
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {aniosDisponibles.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <button
          onClick={() => setModalAgregarAnio(true)}
          style={{
            padding: '8px 14px',
            backgroundColor: COLORES.verdeClaro,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          + Agregar año
        </button>
      </div>

      {/* AFILIACIÓN */}
      <Seccion titulo={`📋 AFILIACIÓN ${anioVista}`}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '10px'
        }}>
          {MESES.map(m => (
            <div key={m.key} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '600',
                color: COLORES.textoPrincipal
              }}>
                {m.label}
              </label>
              <input
                type="text"
                value={formatMonto(afiliacionAnio[m.key] || 0)}
                onChange={(e) => setValorAfiliacion(anioVistaStr, m.key, parseMonto(e.target.value))}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          ))}
        </div>
      </Seccion>

      {/* CUOTAS */}
      <Seccion titulo={`💰 CUOTAS ${anioVista}`}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '10px'
        }}>
          {MESES_CUOTAS.map(m => {
            const cuotaMes = cuotasAnio[m.key] || { unico: 0, hermano: 0 }
            return (
              <div key={m.key} style={{
                border: `1.5px solid ${COLORES.bordeSuave}`,
                borderRadius: '8px',
                padding: '8px 10px',
                backgroundColor: 'white'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: COLORES.verdeScout, marginBottom: '6px' }}>
                  {m.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', minWidth: '60px', color: COLORES.textoSecundario }}>
                      Único
                    </label>
                    <input
                      type="text"
                      value={formatMonto(cuotaMes.unico)}
                      onChange={(e) => setValorCuota(anioVistaStr, m.key, 'unico', parseMonto(e.target.value))}
                      style={inputStyleSmall}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', minWidth: '60px', color: COLORES.textoSecundario }}>
                      Hermano
                    </label>
                    <input
                      type="text"
                      value={formatMonto(cuotaMes.hermano)}
                      onChange={(e) => setValorCuota(anioVistaStr, m.key, 'hermano', parseMonto(e.target.value))}
                      style={inputStyleSmall}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Seccion>

      {/* CAMPAMENTO CORTO */}
      <Seccion titulo={`🏕️ CAMPAMENTO CORTO ${anioVista}`}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '10px'
        }}>
          <CampoMonto
            label="Único"
            valor={campCortoAnio.unico || 0}
            onChange={(v) => setValorCamp('camp_corto', anioVistaStr, 'unico', v)}
          />
          <CampoMonto
            label="Hermano"
            valor={campCortoAnio.hermano || 0}
            onChange={(v) => setValorCamp('camp_corto', anioVistaStr, 'hermano', v)}
          />
          <CampoMonto
            label="Dirigente"
            valor={campCortoAnio.dirigente || 0}
            onChange={(v) => setValorCamp('camp_corto', anioVistaStr, 'dirigente', v)}
          />
        </div>
      </Seccion>

      {/* CAMPAMENTO ANUAL */}
      <Seccion titulo={`🏕️ CAMPAMENTO ANUAL ${anioVista + 1}`}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '10px'
        }}>
          <CampoMonto
            label="Único"
            valor={campAnualAnio.unico || 0}
            onChange={(v) => setValorCamp('camp_anual', (anioVista + 1).toString(), 'unico', v)}
          />
          <CampoMonto
            label="Hermano"
            valor={campAnualAnio.hermano || 0}
            onChange={(v) => setValorCamp('camp_anual', (anioVista + 1).toString(), 'hermano', v)}
          />
          <CampoMonto
            label="Dirigente"
            valor={campAnualAnio.dirigente || 0}
            onChange={(v) => setValorCamp('camp_anual', (anioVista + 1).toString(), 'dirigente', v)}
          />
        </div>
      </Seccion>

      {/* BOTÓN GUARDAR */}
      <div style={{
        position: 'sticky',
        bottom: '20px',
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10
      }}>
        <button
          onClick={guardar}
          disabled={guardando}
          style={{
            padding: '14px 32px',
            backgroundColor: guardando ? COLORES.gris : COLORES.verdeScout,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: guardando ? 'wait' : 'pointer',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '15px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          {guardando ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>

      {/* MODAL AGREGAR AÑO */}
      {modalAgregarAnio && (
        <Modal onCerrar={() => setModalAgregarAnio(false)}>
          <h3 style={{ margin: '0 0 12px 0', color: COLORES.verdeScout, fontSize: '16px' }}>
            Agregar nuevo año
          </h3>
          <p style={{ fontSize: '13px', color: COLORES.textoSecundario, marginTop: 0 }}>
            Ingresá el año que querés agregar (ej: 2027). Se creará vacío para que lo completes.
          </p>
          <input
            type="number"
            value={nuevoAnio}
            onChange={(e) => setNuevoAnio(e.target.value)}
            placeholder="2027"
            style={{ ...inputStyle, fontSize: '16px', padding: '10px 12px', marginBottom: '14px' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setModalAgregarAnio(false)}
              style={btnSecundario}
            >
              Cancelar
            </button>
            <button onClick={agregarAnio} style={btnPrimario}>
              Agregar
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL CAMBIAR AÑO ACTIVO */}
      {modalCambiarAnio && (
        <Modal onCerrar={() => setModalCambiarAnio(false)}>
          <h3 style={{ margin: '0 0 12px 0', color: COLORES.terracota, fontSize: '16px' }}>
            ⚠️ Cambiar año activo de la app
          </h3>
          <p style={{ fontSize: '13px', color: COLORES.textoPrincipal, marginTop: 0 }}>
            Vas a cambiar el año activo de <strong>{anioActivo}</strong> a <strong>{anioVista}</strong>.
          </p>
          <p style={{ fontSize: '12px', color: COLORES.textoSecundario }}>
            Esto va a afectar TODA la app: planillas, PDFs, filtros, etc. Todos los movimientos se van a filtrar por el año {anioVista}.
          </p>
          <p style={{ fontSize: '12px', color: COLORES.terracota, fontWeight: '600' }}>
            Después de cambiarlo, acordate de hacer click en "Guardar cambios".
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button onClick={() => setModalCambiarAnio(false)} style={btnSecundario}>
              Cancelar
            </button>
            <button onClick={cambiarAnioActivo} style={{ ...btnPrimario, backgroundColor: COLORES.terracota }}>
              Sí, cambiar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================
// SUBCOMPONENTES
// ============================================
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: `2px solid ${COLORES.bordeSuave}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h3 style={{
        margin: '0 0 12px 0',
        fontSize: 'clamp(13px, 3vw, 16px)',
        color: COLORES.verdeScout,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '700'
      }}>
        {titulo}
      </h3>
      {children}
    </div>
  )
}

function CampoMonto({
  label, valor, onChange
}: {
  label: string
  valor: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <label style={{
        fontSize: '12px',
        fontWeight: '600',
        color: COLORES.textoPrincipal
      }}>
        {label}
      </label>
      <input
        type="text"
        value={formatMonto(valor)}
        onChange={(e) => onChange(parseMonto(e.target.value))}
        style={{ ...inputStyle, width: '100%' }}
      />
    </div>
  )
}

function Modal({ children, onCerrar }: { children: React.ReactNode; onCerrar: () => void }) {
  return (
    <div
      onClick={onCerrar}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '420px',
          width: '100%',
          fontFamily: 'Oswald, sans-serif',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================
// ESTILOS
// ============================================
const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  fontSize: '13px',
  border: `2px solid ${COLORES.bordeSuave}`,
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  boxSizing: 'border-box',
  color: COLORES.textoPrincipal,
  fontWeight: '600'
}

const inputStyleSmall: React.CSSProperties = {
  ...inputStyle,
  padding: '4px 6px',
  fontSize: '12px'
}

const btnPrimario: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: COLORES.verdeScout,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif',
  fontSize: '13px',
  fontWeight: '600'
}

const btnSecundario: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#ccc',
  color: '#333',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif',
  fontSize: '13px',
  fontWeight: '600'
}