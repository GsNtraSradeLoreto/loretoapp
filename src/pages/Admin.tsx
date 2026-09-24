import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  rama_asignada: string | null
  activo: boolean
  creado_en: string
}

export default function Admin() {
  const { isSuperAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [editando, setEditando] = useState<string | null>(null)
  const [editRol, setEditRol] = useState('')

  useEffect(() => {
    if (!isSuperAdmin) return
    loadUsuarios()
  }, [isSuperAdmin])

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('creado_en', { ascending: true })

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error('Error:', error)
      setMessage({ text: '❌ Error al cargar usuarios', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleRolChange = async (userId: string, newRol: string) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ rol: newRol })
        .eq('id', userId)

      if (error) throw error

      setMessage({ text: '✅ Rol actualizado correctamente', type: 'success' })
      loadUsuarios()
      setEditando(null)

      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error) {
      setMessage({ text: '❌ Error al actualizar rol', type: 'error' })
    }
  }

  const handleToggleActivo = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setMessage({
        text: `✅ Usuario ${!currentStatus ? 'activado' : 'desactivado'} correctamente`,
        type: 'success'
      })
      loadUsuarios()

      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (error) {
      setMessage({ text: '❌ Error al cambiar estado del usuario', type: 'error' })
    }
  }

  // ===== Configuración de colores por rol =====
  const getRolStyle = (rol: string) => {
    // Colores de ramas (Scouts de Argentina)
    const colores = {
      amarillo: { bg: '#FFF9E0', text: '#B8860B', border: '#F5C518' },
      verde:    { bg: '#E8F5E9', text: '#1B5E20', border: '#2E7D32' },
      celeste:  { bg: '#E1F5FE', text: '#01579B', border: '#03A9F4' },
      rojo:     { bg: '#FFEBEE', text: '#B71C1C', border: '#D32F2F' },
      dorado:   { bg: '#FFF8E7', text: '#8B6F00', border: '#C48A2A' },
      azul:     { bg: '#E0E7FF', text: '#3730A3', border: '#3B82F6' },
      naranja:  { bg: '#FFF3E0', text: '#B45309', border: '#F59E0B' },
      gris:     { bg: '#F3F4F6', text: '#4B5563', border: '#9CA3AF' }
    }

    const map: Record<string, keyof typeof colores> = {
      'SUPER_ADMIN': 'dorado',
      'Jefatura': 'dorado',
      'Administrador': 'azul',
      'Tesorero': 'naranja',
      'viewer': 'gris',
      'JefeManada': 'amarillo',
      'JefeUnidad': 'verde',
      'JefeCaminantes': 'celeste',
      'JefeRovers': 'rojo',
      'AyudanteManada': 'amarillo',
      'AyudanteUnidad': 'verde',
      'AyudanteCaminantes': 'celeste',
      'AyudanteRovers': 'rojo'
    }

    const key = map[rol] || 'gris'
    return colores[key]
  }

  const getRolLabel = (rol: string) => {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': '👑 Super Admin',
      'Jefatura': '🏅 Jefatura',
      'Administrador': '📋 Administrador',
      'Tesorero': '💰 Tesorero',
      'viewer': '👀 Viewer',
      'JefeManada': '🐺 Jefe de Manada',
      'JefeUnidad': '⚜️ Jefe de Unidad',
      'JefeCaminantes': '🏔️ Jefe de Caminantes',
      'JefeRovers': '🔥 Jefe de Rovers',
      'AyudanteManada': '🐺 Ayudante de Manada',
      'AyudanteUnidad': '⚜️ Ayudante de Unidad',
      'AyudanteCaminantes': '🏔️ Ayudante de Caminantes',
      'AyudanteRovers': '🔥 Ayudante de Rovers'
    }
    return labels[rol] || rol
  }

  const roles = [
    { value: 'SUPER_ADMIN', label: '👑 Super Admin' },
    { value: 'Jefatura', label: '🏅 Jefatura' },
    { value: 'Administrador', label: '📋 Administrador' },
    { value: 'Tesorero', label: '💰 Tesorero' },
    { value: 'viewer', label: '👀 Viewer' },
    { value: 'JefeManada', label: '🐺 Jefe de Manada' },
    { value: 'JefeUnidad', label: '⚜️ Jefe de Unidad' },
    { value: 'JefeCaminantes', label: '🏔️ Jefe de Caminantes' },
    { value: 'JefeRovers', label: '🔥 Jefe de Rovers' },
    { value: 'AyudanteManada', label: '🐺 Ayudante de Manada' },
    { value: 'AyudanteUnidad', label: '⚜️ Ayudante de Unidad' },
    { value: 'AyudanteCaminantes', label: '🏔️ Ayudante de Caminantes' },
    { value: 'AyudanteRovers', label: '🔥 Ayudante de Rovers' }
  ]

  if (!isSuperAdmin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '48px 16px',
        fontFamily: 'Oswald, sans-serif',
        color: '#BF4E30',
        textAlign: 'center',
        fontSize: 'clamp(12px, 2.5vw, 16px)'
      }}>
        ⚠️ No tenés permisos para acceder a esta página
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <span style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>Cargando usuarios...</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '700',
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          ⚙️ Panel de Administración
        </h1>
        <p style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '400',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          color: '#7A7364',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: 0
        }}>
          Gestión de usuarios y roles
        </p>
      </div>

      {message.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          border: '1px solid',
          fontFamily: 'Oswald, sans-serif',
          ...(message.type === 'error' ? {
            backgroundColor: '#FEE2E2',
            color: '#BF4E30',
            borderColor: '#FECACA'
          } : {
            backgroundColor: '#D1FAE5',
            color: '#5C7A5E',
            borderColor: '#A7F3D0'
          })
        }}>
          {message.text}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
        gap: '6px',
        marginBottom: '20px'
      }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '6px 8px', border: '2px solid #D1C9B4', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: 'clamp(14px, 3vw, 20px)', color: '#24352A', margin: 0 }}>
            {usuarios.length}
          </p>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '500', fontSize: 'clamp(8px, 1.5vw, 9px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 0 0' }}>
            Total
          </p>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '6px 8px', border: '2px solid #D1C9B4', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: 'clamp(14px, 3vw, 20px)', color: '#24352A', margin: 0 }}>
            {usuarios.filter(u => u.activo).length}
          </p>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '500', fontSize: 'clamp(8px, 1.5vw, 9px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 0 0' }}>
            Activos
          </p>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '6px 8px', border: '2px solid #D1C9B4', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: 'clamp(14px, 3vw, 20px)', color: '#24352A', margin: 0 }}>
            {usuarios.filter(u => u.rol === 'SUPER_ADMIN').length}
          </p>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '500', fontSize: 'clamp(8px, 1.5vw, 9px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 0 0' }}>
            Admins
          </p>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '6px 8px', border: '2px solid #D1C9B4', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: 'clamp(14px, 3vw, 20px)', color: '#24352A', margin: 0 }}>
            {usuarios.filter(u => u.rol.startsWith('Jefe')).length}
          </p>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '500', fontSize: 'clamp(8px, 1.5vw, 9px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 0 0' }}>
            Jefes
          </p>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '6px 8px', border: '2px solid #D1C9B4', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: 'clamp(14px, 3vw, 20px)', color: '#24352A', margin: 0 }}>
            {usuarios.filter(u => u.rol.startsWith('Ayudante')).length}
          </p>
          <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '500', fontSize: 'clamp(8px, 1.5vw, 9px)', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 0 0' }}>
            Ayudantes
          </p>
        </div>
      </div>

      {/* LISTA DE USUARIOS (cards) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {usuarios.map((usuario) => {
          const isEditing = editando === usuario.id
          const nombreCompleto = `${usuario.nombre}${usuario.apellido ? ' ' + usuario.apellido : ''}`
          const inicial = (usuario.nombre || 'U').charAt(0).toUpperCase()
          const rolStyle = getRolStyle(usuario.rol)

          return (
            <div
              key={usuario.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '12px 14px',
                border: '2px solid #D1C9B4',
                fontFamily: 'Oswald, sans-serif',
                opacity: usuario.activo ? 1 : 0.7,
                transition: 'all 0.2s'
              }}
            >
              {/* Fila 1: Avatar + Nombre + Botones de acción */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '6px'
              }}>
                {/* Avatar con inicial */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#BF4E30',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  fontFamily: 'Oswald, sans-serif',
                  flexShrink: 0
                }}>
                  {inicial}
                </div>

                {/* Nombre + Email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: '700',
                    fontSize: 'clamp(13px, 3vw, 15px)',
                    color: '#24352A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {nombreCompleto}
                  </div>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: '400',
                    fontSize: 'clamp(11px, 2.2vw, 12px)',
                    color: '#7A7364',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {usuario.email}
                  </div>
                </div>

                {/* Botones de acción (solo si NO está en modo edición) */}
                {!isEditing && (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditando(usuario.id)
                        setEditRol(usuario.rol)
                        setMessage({ text: '', type: '' })
                      }}
                      title="Editar rol"
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: 0,
                        backgroundColor: '#F3ECD8',
                        color: '#24352A',
                        border: '1.5px solid #D1C9B4',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleToggleActivo(usuario.id, usuario.activo)}
                      title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: 0,
                        backgroundColor: usuario.activo ? '#FEE2E2' : '#D1FAE5',
                        color: usuario.activo ? '#BF4E30' : '#5C7A5E',
                        border: '1.5px solid ' + (usuario.activo ? '#FECACA' : '#A7F3D0'),
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                    >
                      {usuario.activo ? '🔴' : '🟢'}
                    </button>
                  </div>
                )}
              </div>

              {/* Fila 2: Chip de rol (o selector si está editando) */}
              <div style={{ marginTop: '8px' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      value={editRol}
                      onChange={(e) => setEditRol(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: 'clamp(11px, 2.5vw, 13px)',
                        border: '2px solid #D1C9B4',
                        borderRadius: '6px',
                        outline: 'none',
                        fontFamily: 'Oswald, sans-serif',
                        backgroundColor: 'white',
                        boxSizing: 'border-box'
                      }}
                    >
                      {roles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditando(null)
                          setMessage({ text: '', type: '' })
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          backgroundColor: '#E8DEC4',
                          color: '#24352A',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: 600
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleRolChange(usuario.id, editRol)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: 'clamp(11px, 2.5vw, 13px)',
                          backgroundColor: '#24352A',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontFamily: 'Oswald, sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: 600
                        }}
                      >
                        💾 Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: 'clamp(11px, 2.5vw, 13px)',
                      fontWeight: '600',
                      fontFamily: 'Oswald, sans-serif',
                      letterSpacing: '0.3px',
                      backgroundColor: rolStyle.bg,
                      color: rolStyle.text,
                      border: `1.5px solid ${rolStyle.border}`
                    }}>
                      {getRolLabel(usuario.rol)}
                    </span>

                    {/* Chip de estado */}
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: 'clamp(10px, 2vw, 11px)',
                      fontWeight: '500',
                      fontFamily: 'Oswald, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      backgroundColor: usuario.activo ? '#D1FAE5' : '#FEE2E2',
                      color: usuario.activo ? '#5C7A5E' : '#BF4E30'
                    }}>
                      {usuario.activo ? '● Activo' : '● Inactivo'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {usuarios.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          fontFamily: 'Oswald, sans-serif',
          color: '#7A7364',
          fontSize: 'clamp(11px, 2.5vw, 14px)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          No hay usuarios registrados
        </div>
      )}
    </div>
  )
}