import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function BottomNav() {
  const location = useLocation()
  const { isSuperAdmin, isJefatura, isAdministrador } = useAuth()

  const [novedades, setNovedades] = React.useState(0)

  const isActive = (path: string) => location.pathname === path

  // ✅ Solo SUPER_ADMIN y Jefatura ven la pestaña de Campamentos y Auditoría
  const puedeVerCampamentos = isSuperAdmin || isJefatura

  // Cargar novedades (solo si tiene permiso)
  React.useEffect(() => {
    if (!isSuperAdmin && !isJefatura) return

    supabase
      .rpc('contar_novedades_auditoria')
      .then(({ data, error }) => {
        if (!error && typeof data === 'number') {
          setNovedades(data)
        }
      })
  }, [isSuperAdmin, isJefatura, location.pathname])

  const navItems = [
    { id: 'beneficiarios', label: 'Beneficiarios', icon: '👥', path: '/dashboard' },
    { id: 'pagos', label: 'Pagos', icon: '💰', path: '/pagos' },
  ]

  // ✅ Campamentos solo para SUPER_ADMIN y Jefatura
  if (puedeVerCampamentos) {
    navItems.push({ id: 'campamentos', label: 'Campamentos', icon: '🏕️', path: '/campamentos' })
  }

  // ✅ Auditoría solo para SUPER_ADMIN y Jefatura
  if (puedeVerCampamentos) {
    navItems.push({ id: 'auditoria', label: 'Historial', icon: '📋', path: '/auditoria' })
  }

  // Admin solo ve el enlace de admin si tiene permisos
  if (isSuperAdmin || isJefatura || isAdministrador) {
    navItems.push({ id: 'admin', label: 'Admin', icon: '⚙️', path: '/admin' })
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#24352A',
      borderTop: '4px solid #BF4E30',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: '64px',
      zIndex: 100,
      padding: '0 8px',
      margin: 0,
      width: '100%',
      maxWidth: '100vw',
      boxSizing: 'border-box',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {navItems.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: isActive(item.path) ? '#F3ECD8' : '#7A7364',
            fontSize: '10px',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'all 0.2s',
            borderBottom: isActive(item.path) ? '2px solid #BF4E30' : '2px solid transparent',
            minWidth: '44px',
            flex: 1,
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <span style={{ fontSize: '20px', position: 'relative', display: 'inline-block' }}>
            {item.icon}
            {/* Badge de novedades solo en Historial */}
            {item.id === 'auditoria' && novedades > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-10px',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                backgroundColor: '#B71C1C',
                color: 'white',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '700',
                fontFamily: 'Oswald, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                boxShadow: '0 0 0 2px #24352A'
              }}>
                {novedades > 99 ? '99+' : novedades}
              </span>
            )}
          </span>
          <span style={{ marginTop: '2px', fontSize: '9px' }}>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}