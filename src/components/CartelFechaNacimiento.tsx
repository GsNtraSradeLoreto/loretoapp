import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function CartelFechaNacimiento() {
  const { profile, actualizarFechaNacimiento } = useAuth()
  const [cerrado, setCerrado] = useState(false)
  const [mostrarInput, setMostrarInput] = useState(false)
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // No mostrar si:
  // - no hay perfil
  // - ya tiene fecha cargada
  // - el usuario ya cerró el cartel
  if (!profile || profile.fecha_nacimiento || cerrado) return null

  const handleGuardar = async () => {
    setError('')

    if (!fecha) {
      setError('Ingresá tu fecha de nacimiento')
      return
    }

    // Validar edad
    const hoy = new Date()
    const nacimiento = new Date(fecha)
    const edad = hoy.getFullYear() - nacimiento.getFullYear()
    if (edad < 5 || edad > 100) {
      setError('Ingresá una fecha válida')
      return
    }

    try {
      setGuardando(true)
      await actualizarFechaNacimiento(fecha)
      // Al guardar, el componente se oculta solo (profile.fecha_nacimiento ya no es null)
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{
      backgroundColor: '#FEF3C7',
      border: '2px solid #F5C842',
      borderLeft: '6px solid #C48A2A',
      borderRadius: '10px',
      padding: '12px 14px',
      marginBottom: '16px',
      fontFamily: 'Oswald, sans-serif',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: '22px', lineHeight: 1 }}>🎂</span>

      <div style={{ flex: 1, minWidth: '200px' }}>
        {!mostrarInput ? (
          <>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#7A5C00',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px'
            }}>
              ¡Cargá tu fecha de nacimiento!
            </div>
            <div style={{
              fontSize: '11px',
              color: '#7A5C00',
              marginBottom: '8px'
            }}>
              Así aparecés en la lista de cumpleaños del grupo.
            </div>
            <button
              onClick={() => setMostrarInput(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#C48A2A',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}
            >
              Cargar fecha
            </button>
          </>
        ) : (
          <>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#7A5C00',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px'
            }}>
              Tu fecha de nacimiento
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '2px solid #D1C9B4',
                  borderRadius: '6px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white',
                  flex: 1,
                  minWidth: '140px'
                }}
              />
              <button
                onClick={handleGuardar}
                disabled={guardando}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#C48A2A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: guardando ? 'wait' : 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '600',
                  opacity: guardando ? 0.6 : 1
                }}
              >
                {guardando ? '...' : '💾 Guardar'}
              </button>
              <button
                onClick={() => { setMostrarInput(false); setError(''); setFecha('') }}
                disabled={guardando}
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  color: '#7A5C00',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '11px',
                  textDecoration: 'underline'
                }}
              >
                Cancelar
              </button>
            </div>

            {error && (
              <div style={{
                marginTop: '6px',
                fontSize: '11px',
                color: '#BF4E30',
                fontWeight: '600'
              }}>
                ⚠️ {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* ✕ Cerrar (no vuelve a aparecer hasta recargar) */}
      <button
        onClick={() => setCerrado(true)}
        title="Cerrar"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#7A5C00',
          fontSize: '16px',
          padding: '2px 6px',
          lineHeight: 1,
          flexShrink: 0
        }}
      >
        ✕
      </button>
    </div>
  )
}