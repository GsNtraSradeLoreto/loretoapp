import React, { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, isSuperAdmin, isJefatura } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = React.useState(false)
  const [refrescando, setRefrescando] = React.useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleRefresh = () => {
    setRefrescando(true)
    // Pequeño delay para que se vea la animación antes de recargar
    setTimeout(() => {
      window.location.reload()
    }, 400)
  }

  const nombreCompleto = profile?.nombre
    ? `${profile.nombre}${profile.apellido ? ' ' + profile.apellido : ''}`
    : 'Usuario'

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
      {/* Animación spin para el botón refresh */}
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

            {/* Logo */}
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <span style={{ fontSize: '24px' }}>🏕️</span>
              <span style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#F3ECD8',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontFamily: 'Oswald, sans-serif'
              }}>
                LoretoApp
              </span>
            </Link>

            {/* Botón refresh + menú usuario */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              {/* Botón refresh global */}
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

              {/* Menú de usuario */}
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

      {/* Contenido principal */}
      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px 16px',
        flex: 1,
        width: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}