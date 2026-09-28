import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function BottomNav() {
  const location = useLocation()
  const { isSuperAdmin, isJefatura, isAdministrador, getRolData } = useAuth()
  const rolData = getRolData()
  const ramaUsuario = rolData.rama

  const [novedades, setNovedades] = React.useState(0)
  const [notifPermisos, setNotifPermisos] = React.useState(0)
  const [permisosPendientes, setPermisosPendientes] = React.useState(0)

  const isActive = (path: string) => location.pathname === path

  const puedeVerCampamentos = isSuperAdmin || isJefatura

  // ✅ Cargar novedades de auditoría
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

  // ✅ Notificaciones de permisos de mi rama
  const cargarNotifPermisos = React.useCallback(() => {
    if (!ramaUsuario) return

    supabase
      .from('permisos_notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('rama', ramaUsuario)
      .eq('visto', false)
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') {
          setNotifPermisos(count)
        }
      })
  }, [ramaUsuario])

  React.useEffect(() => {
    cargarNotifPermisos()
  }, [cargarNotifPermisos, location.pathname])

  // ✅ Escuchar evento de "notificaciones cambiaron"
  React.useEffect(() => {
    const handler = () => cargarNotifPermisos()
    window.addEventListener('notif-permisos-cambiaron', handler)
    return () => window.removeEventListener('notif-permisos-cambiaron', handler)
  }, [cargarNotifPermisos])

  // ✅ Permisos pendientes (jefatura/superadmin)
  React.useEffect(() => {
    if (!isSuperAdmin && !isJefatura) return

    supabase
      .from('permisos_salida')
      .select('id', { count: 'exact', head: true })
      .in('estado', ['pendiente', 'con_devoluciones'])
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') {
          setPermisosPendientes(count)
        }
      })
  }, [isSuperAdmin, isJefatura, location.pathname])

  const navItems = [
    { id: 'beneficiarios', label: 'Beneficiarios', icon: '👥', path: '/dashboard' },
    { id: 'pagos', label: 'Pagos', icon: '💰', path: '/pagos' },
    { id: 'permisos', label: 'Permisos', icon: '📋', path: '/permisos' },
  ]

  if (puedeVerCampamentos) {
    navItems.push({ id: 'campamentos', label: 'Campamentos', icon: '🏕️', path: '/campamentos' })
  }

  if (puedeVerCampamentos) {
    navItems.push({ id: 'auditoria', label: 'Historial', icon: '📋', path: '/auditoria' })
  }

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
      borderTop: '3px solid #111111',
      boxShadow: 'inset 0 2px 0 0 #BF4E30',
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
      {navItems.map((item) => {
        const activo = isActive(item.path)
        return (
          <Link
            key={item.id}
            to={item.path}
            className="bottom-nav-link"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: activo ? '#F3ECD8' : '#7A7364',
              fontSize: '10px',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px 6px',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
              minWidth: '44px',
              flex: 1,
              textAlign: 'center',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: activo ? '#BF4E30' : 'transparent',
              transition: 'all 0.2s ease',
              marginBottom: '2px'
            }}>
              <span style={{
                fontSize: activo ? '20px' : '19px',
                lineHeight: 1,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                {item.icon}
              </span>

              {item.id === 'auditoria' && novedades > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-6px',
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
                  boxShadow: '0 0 0 2px #24352A',
                  zIndex: 2
                }}>
                  {novedades > 99 ? '99+' : novedades}
                </span>
              )}

              {item.id === 'permisos' && ramaUsuario && notifPermisos > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-6px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  backgroundColor: '#C48A2A',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '700',
                  fontFamily: 'Oswald, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  boxShadow: '0 0 0 2px #24352A',
                  zIndex: 2
                }}>
                  {notifPermisos > 99 ? '99+' : notifPermisos}
                </span>
              )}

              {item.id === 'permisos' && (isSuperAdmin || isJefatura) && permisosPendientes > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-6px',
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
                  boxShadow: '0 0 0 2px #24352A',
                  zIndex: 2
                }}>
                  {permisosPendientes > 99 ? '99+' : permisosPendientes}
                </span>
              )}
            </div>

            <span style={{
              marginTop: '0px',
              fontSize: activo ? '10px' : '9px',
              fontWeight: activo ? '600' : '400',
              transition: 'all 0.2s ease',
              lineHeight: 1.1
            }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}