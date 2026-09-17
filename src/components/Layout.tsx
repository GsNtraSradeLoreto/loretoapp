import React, { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import { supabase } from '../lib/supabase'
import { useSwipe } from '../hooks/useSwipe'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, isSuperAdmin, isJefatura, isAdministrador } = useAuth()
  const navigate = useNavigate()
  const [esCelular, setEsCelular] = React.useState(window.innerWidth < 640)
  React.useEffect(() => {
    const handleResize = () => setEsCelular(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const location = useLocation()
  const [showMenu, setShowMenu] = React.useState(false)
  const [refrescando, setRefrescando] = React.useState(false)
  const [novedades, setNovedades] = React.useState(0)
  const [dragOffset, setDragOffset] = React.useState(0)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleRefresh = () => {
    setRefrescando(true)
    setTimeout(() => {
      window.location.reload()
    }, 400)
  }

  // Cargar cantidad de novedades (solo Jefatura/Super Admin)
  React.useEffect(() => {
    if (!isSuperAdmin && !isJefatura) return

    supabase
      .rpc('contar_novedades_auditoria')
      .then(({ data, error }) => {
        if (!error && typeof data === 'number') {
          setNovedades(data)
        }
      })
  }, [isSuperAdmin, isJefatura])

  // ============================================
  // NAVEGACIÓN POR SWIPE (solo en páginas principales)
  // ============================================
  const rutasNav = [
    { path: '/dashboard' },
    { path: '/pagos' },
    ...(isSuperAdmin || isJefatura ? [{ path: '/campamentos' }, { path: '/auditoria' }] : []),
    ...(isSuperAdmin || isJefatura || isAdministrador ? [{ path: '/admin' }] : [])
  ]

  const indiceActual = rutasNav.findIndex(r => r.path === location.pathname)
  const estoyEnRutaPrincipal = indiceActual !== -1

  // Solo permitir swipe si estoy en una de las rutas principales
  const swipeHabilitado = estoyEnRutaPrincipal

  const handleSwipeLeft = () => {
    if (!estoyEnRutaPrincipal) return
    if (indiceActual < rutasNav.length - 1) {
      navigate(rutasNav[indiceActual + 1].path)
    }
  }

  const handleSwipeRight = () => {
    if (!estoyEnRutaPrincipal) return
    if (indiceActual > 0) {
      navigate(rutasNav[indiceActual - 1].path)
    }
  }

  const handleDrag = (deltaX: number) => {
    if (!swipeHabilitado) return
    const limitado = Math.max(-50, Math.min(50, deltaX))
    setDragOffset(limitado)
  }

  const handleDragEnd = () => {
    setDragOffset(0)
  }

  useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 100,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
    enabled: swipeHabilitado
  })

  const nombreCompleto = profile?.nombre
    ? `${profile.nombre}${profile.apellido ? ' ' + profile.apellido : ''}`
    : 'Usuario'

  const Badge = () => {
    if (novedades <= 0) return null
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '20px',
        height: '20px',
        padding: '0 6px',
        backgroundColor: '#B71C1C',
        color: 'white',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: '700',
        fontFamily: 'Oswald, sans-serif',
        marginLeft: '8px',
        lineHeight: 1
      }}>
        {novedades > 99 ? '99+' : novedades}
      </span>
    )
  }

  return (
    <div style={{
      backgroundColor: '#E8DEC4',
      minHeight: '100vh',
      fontFamily: 'Oswald, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '72px',
      overflowX: 'hidden',
      width: '100%',
      maxWidth: '100vw'
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <header style={{
        backgroundColor: '#24352A',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        borderBottom: '4px solid #BF4E30',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
        width: '100%'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>

             <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <img
                src="/logo-grupo.png"
                alt="LoretApp"
                style={{
                  height: esCelular ? '36px' : '42px',
                  width: esCelular ? '36px' : '42px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  flexShrink: 0
                }}
              />
              <span style={{
                fontSize: esCelular ? '16px' : '20px',
                fontWeight: '700',
                color: '#F3ECD8',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontFamily: 'Oswald, sans-serif',
                whiteSpace: 'nowrap'
              }}>
                LoretApp
              </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <button
                onClick={handleRefresh}
                disabled={refrescando}
                title="Actualizar página"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'transparent',
                  color: '#F3ECD8',
                  border: '2px solid rgba(243, 236, 216, 0.3)',
                  borderRadius: '50%',
                  cursor: refrescando ? 'wait' : 'pointer',
                  opacity: refrescando ? 0.6 : 1,
                  transition: 'all 0.2s',
                  padding: 0,
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  if (!refrescando) {
                    e.currentTarget.style.backgroundColor = '#BF4E30'
                    e.currentTarget.style.borderColor = '#BF4E30'
                    e.currentTarget.style.transform = 'scale(1.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(243, 236, 216, 0.3)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    animation: refrescando ? 'spin 0.8s linear infinite' : 'none'
                  }}
                >
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontFamily: 'Oswald, sans-serif'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D4F3F'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#BF4E30',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    fontFamily: 'Oswald, sans-serif'
                  }}>
                    {nombreCompleto.charAt(0).toUpperCase()}
                  </div>
                                   {!esCelular && (
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#F3ECD8',
                      fontFamily: 'Oswald, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {nombreCompleto}
                    </span>
                  )}
                  <svg style={{ width: '16px', height: '16px', color: '#F3ECD8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    marginTop: '8px',
                    width: '220px',
                    backgroundColor: '#F3ECD8',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    border: '2px solid #D1C9B4',
                    padding: '4px 0',
                    zIndex: 10
                  }}>
                    <Link
                      to="/dashboard"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        color: '#24352A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setShowMenu(false)}
                    >
                      <span style={{ marginRight: '8px' }}>🏠</span>
                      Inicio
                    </Link>

                    <Link
                      to="/pagos"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        color: '#24352A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setShowMenu(false)}
                    >
                      <span style={{ marginRight: '8px' }}>💰</span>
                      Pagos
                    </Link>

                    <Link
                      to="/campamentos"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        color: '#24352A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setShowMenu(false)}
                    >
                      <span style={{ marginRight: '8px' }}>🏕️</span>
                      Campamentos
                    </Link>

                    <Link
                      to="/planillas"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        color: '#24352A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setShowMenu(false)}
                    >
                      <span style={{ marginRight: '8px' }}>📊</span>
                      Planillas
                    </Link>

                    {(isSuperAdmin || isJefatura) && (
                      <Link
                        to="/auditoria"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          color: '#24352A',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => setShowMenu(false)}
                      >
                        <span style={{ marginRight: '8px' }}>📋</span>
                        Historial
                        <Badge />
                      </Link>
                    )}

                    {isSuperAdmin && (
                      <Link
                        to="/admin"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          color: '#24352A',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderTop: '1px solid #D1C9B4',
                          borderBottom: '1px solid #D1C9B4',
                          margin: '2px 0'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => setShowMenu(false)}
                      >
                        <span style={{ marginRight: '8px' }}>⚙️</span>
                        Administración
                      </Link>
                    )}

                    <Link
                      to="/perfil"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        color: '#24352A',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setShowMenu(false)}
                    >
                      <span style={{ marginRight: '8px' }}>👤</span>
                      Mi Perfil
                    </Link>

                    <button
                      onClick={() => {
                        setShowMenu(false)
                        handleLogout()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '8px 16px',
                        color: '#BF4E30',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: 'Oswald, sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderTop: '1px solid #D1C9B4',
                        marginTop: '2px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ marginRight: '8px' }}>🚪</span>
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal CON swipe */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '24px 16px',
          flex: 1,
          width: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          transform: `translateX(${dragOffset}px)`,
          transition: dragOffset === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </main>

      <BottomNav />
    </div>
  )
}