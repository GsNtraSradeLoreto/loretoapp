import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function CartelSolicitudesPendientes() {
  const { isSuperAdmin, isJefatura } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [cantidad, setCantidad] = useState(0)
  const [cerrado, setCerrado] = useState(false)
  const [loading, setLoading] = useState(true)

  // Solo SuperAdmin y Jefatura ven el cartel
  const puedeVer = isSuperAdmin || isJefatura

  // No mostrar si está en /solicitudes
  const estaEnSolicitudes = location.pathname === '/solicitudes'

  // Cargar cantidad de solicitudes pendientes
  useEffect(() => {
    if (!puedeVer) {
      setLoading(false)
      return
    }

    const cargar = async () => {
      try {
        const { count, error } = await supabase
          .from('solicitudes_inscripcion')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pendiente')

        if (!error && typeof count === 'number') {
          setCantidad(count)
        }
      } catch (err) {
        console.error('Error al cargar solicitudes pendientes:', err)
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [puedeVer, location.pathname])

  // No mostrar si:
  // - no tiene permiso
  // - está en /solicitudes
  // - no hay solicitudes pendientes
  // - el usuario ya cerró el cartel
  if (!puedeVer || estaEnSolicitudes || cantidad === 0 || cerrado || loading) {
    return null
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
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      cursor: 'pointer'
    }}
      onClick={() => navigate('/solicitudes')}
    >
      <span style={{ fontSize: '22px', lineHeight: 1 }}>📬</span>

      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '700',
          color: '#7A5C00',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '2px'
        }}>
          {cantidad === 1 ? '¡Hay 1 solicitud pendiente!' : `¡Hay ${cantidad} solicitudes pendientes!`}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#7A5C00'
        }}>
          Hacé click acá para revisarlas y aprobarlas.
        </div>
      </div>

      {/* ✕ Cerrar (vuelve a aparecer al recargar) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setCerrado(true)
        }}
        title="Cerrar (vuelve a aparecer al recargar)"
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