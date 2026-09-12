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
    } catch (error) {
      setMessage({ text: '❌ Error al cambiar estado del usuario', type: 'error' })
    }
  }

  const getRolLabel = (rol: string) => {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': '👑 Super Admin',
      'Jefatura': '🏅 Jefatura',
      'Administrador': '📋 Administrador',
      'Tesorero': '💰 Tesorero',
      'viewer': '👀 Viewer',
      'JefeManada': '🧭 Jefe de Manada',
      'JefeUnidad': '🧭 Jefe de Unidad',
      'JefeCaminantes': '🧭 Jefe de Caminantes',
      'JefeRovers': '🧭 Jefe de Rovers',
      'AyudanteManada': '🧭 Ayudante de Manada',
      'AyudanteUnidad': '🧭 Ayudante de Unidad',
      'AyudanteCaminantes': '🧭 Ayudante de Caminantes',
      'AyudanteRovers': '🧭 Ayudante de Rovers'
    }
    return labels[rol] || rol
  }

  const roles = [
    { value: 'SUPER_ADMIN', label: '👑 Super Admin' },
    { value: 'Jefatura', label: '🏅 Jefatura' },
    { value: 'Administrador', label: '📋 Administrador' },
    { value: 'Tesorero', label: '💰 Tesorero' },
    { value: 'viewer', label: '👀 Viewer' },
    { value: 'JefeManada', label: '🧭 Jefe de Manada' },
    { value: 'JefeUnidad', label: '🧭 Jefe de Unidad' },
    { value: 'JefeCaminantes', label: '🧭 Jefe de Caminantes' },
    { value: 'JefeRovers', label: '🧭 Jefe de Rovers' },
    { value: 'AyudanteManada', label: '🧭 Ayudante de Manada' },
    { value: 'AyudanteUnidad', label: '🧭 Ayudante de Unidad' },
    { value: 'AyudanteCaminantes', label: '🧭 Ayudante de Caminantes' },
    { value: 'AyudanteRovers', label: '🧭 Ayudante de Rovers' }
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

      {/* Tarjetas de estadísticas RESPONSIVE */}
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

      {/* TABLA CON SCROLL HORIZONTAL */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '2px solid #D1C9B4',
        overflow: 'auto'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'Oswald, sans-serif',
          minWidth: '600px'
        }}>
          <thead style={{ backgroundColor: '#24352A' }}>
            <tr>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(10px, 2vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(10px, 2vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#F3ECD8', fontSize: 'clamp(10px, 2vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rol</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', color: '#F3ECD8', fontSize: 'clamp(10px, 2vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', color: '#F3ECD8', fontSize: 'clamp(10px, 2vw, 12px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => {
              const isEditing = editando === usuario.id
              const nombreCompleto = `${usuario.nombre}${usuario.apellido ? ' ' + usuario.apellido : ''}`

              return (
                <tr key={usuario.id} style={{ borderBottom: '1px solid #E8DEC4' }}>
                  <td style={{ padding: '8px 10px', fontSize: 'clamp(11px, 2.5vw, 14px)', color: '#24352A', whiteSpace: 'nowrap' }}>
                    {nombreCompleto}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 'clamp(10px, 2vw, 13px)', color: '#7A7364', whiteSpace: 'nowrap' }}>
                    {usuario.email}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 'clamp(10px, 2vw, 13px)', whiteSpace: 'nowrap' }}>
                    {isEditing ? (
                      <select
                        value={editRol}
                        onChange={(e) => setEditRol(e.target.value)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 'clamp(10px, 2vw, 12px)',
                          border: '2px solid #D1C9B4',
                          borderRadius: '4px',
                          outline: 'none',
                          fontFamily: 'Oswald, sans-serif',
                          backgroundColor: 'white'
                        }}
                      >
                        {roles.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ color: '#24352A' }}>{getRolLabel(usuario.rol)}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: 'clamp(9px, 1.8vw, 11px)',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      backgroundColor: usuario.activo ? '#D1FAE5' : '#FEE2E2',
                      color: usuario.activo ? '#5C7A5E' : '#BF4E30',
                      whiteSpace: 'nowrap'
                    }}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleRolChange(usuario.id, editRol)}
                            style={{
                              padding: '4px 8px',
                              fontSize: 'clamp(9px, 1.8vw, 11px)',
                              backgroundColor: '#24352A',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setEditando(null)
                              setMessage({ text: '', type: '' })
                            }}
                            style={{
                              padding: '4px 8px',
                              fontSize: 'clamp(9px, 1.8vw, 11px)',
                              backgroundColor: '#E8DEC4',
                              color: '#24352A',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditando(usuario.id)
                              setEditRol(usuario.rol)
                              setMessage({ text: '', type: '' })
                            }}
                            style={{
                              padding: '4px 8px',
                              fontSize: 'clamp(9px, 1.8vw, 11px)',
                              backgroundColor: '#F3ECD8',
                              color: '#24352A',
                              border: '2px solid #D1C9B4',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleToggleActivo(usuario.id, usuario.activo)}
                            style={{
                              padding: '4px 8px',
                              fontSize: 'clamp(9px, 1.8vw, 11px)',
                              backgroundColor: usuario.activo ? '#FEE2E2' : '#D1FAE5',
                              color: usuario.activo ? '#BF4E30' : '#5C7A5E',
                              border: '2px solid transparent',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontFamily: 'Oswald, sans-serif',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {usuario.activo ? '🔴 Desactivar' : '🟢 Activar'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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