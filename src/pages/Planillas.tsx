import React from 'react'

const Planillas = () => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '700',
          fontSize: '24px',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          📊 Planillas
        </h1>
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '400',
          fontSize: '14px',
          color: '#7A7364',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: 0
        }}>
          Reportes y planillas del grupo
        </p>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        border: '2px solid #D1C9B4',
        textAlign: 'center'
      }}>
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: '18px',
          color: '#7A7364'
        }}>
          🏗️ Sección en construcción
        </p>
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontSize: '14px',
          color: '#7A7364'
        }}>
          Aquí irán los reportes y planillas del grupo
        </p>
      </div>
    </div>
  )
}

export default Planillas