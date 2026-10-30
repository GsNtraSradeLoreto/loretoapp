import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Perfil() {
  const { profile, user } = useAuth()
  const [nombre, setNombre] = useState(profile?.nombre || '')
  const [apellido, setApellido] = useState(profile?.apellido || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Estados para la foto
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  // Cargar foto actual
  useEffect(() => {
    if (!profile?.id) return
    
    supabase
      .from('dirigentes')
      .select('foto_url')
      .eq('usuario_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.foto_url) {
          setFotoPerfil(`${data.foto_url}?t=${Date.now()}`)
        } else {
          supabase
            .from('usuarios')
            .select('foto_url')
            .eq('id', profile.id)
            .maybeSingle()
            .then(({ data: usrData }) => {
              if (usrData?.foto_url) {
                setFotoPerfil(`${usrData.foto_url}?t=${Date.now()}`)
              } else {
                setFotoPerfil(null)
              }
            })
        }
      })
  }, [profile?.id])

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setMessage({ text: '❌ Solo se permiten imágenes (JPG, PNG, WEBP)', type: 'error' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: '❌ La imagen no debe superar los 5 MB', type: 'error' })
      return
    }

    setSubiendoFoto(true)
    setMessage({ text: '', type: '' })

    try {
      const ext = file.name.split('.').pop()
      const fileName = `perfil-${profile.id}-${Date.now()}.${ext}`
      const filePath = `avatares/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beneficiarios')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('beneficiarios')
        .getPublicUrl(filePath)

      // 1) Intentar actualizar en la tabla de dirigentes (por si tiene ficha)
      const { data: dirigente, error: errFind } = await supabase
        .from('dirigentes')
        .select('id')
        .eq('usuario_id', profile.id)
        .maybeSingle()

      if (errFind) throw errFind

      if (dirigente) {
        // Si tiene ficha, guardamos ahí
        const { error: errDir } = await supabase
          .from('dirigentes')
          .update({ foto_url: publicUrl })
          .eq('id', dirigente.id)
        if (errDir) throw errDir
      } else {
        // Si no tiene ficha, guardamos en su cuenta (usuarios)
        const { error: errUsr } = await supabase
          .from('usuarios')
          .update({ foto_url: publicUrl })
          .eq('id', profile.id)
        if (errUsr) throw errUsr
      }

            setFotoPerfil(publicUrl)
      setMessage({ text: '✅ Foto actualizada correctamente', type: 'success' })
      
      // Avisamos a la app
      window.dispatchEvent(new Event('foto-perfil-cambiada'))
    } catch (err: any) {
      console.error('Error al subir foto:', err)
      setMessage({ text: '❌ Error al subir la foto: ' + err.message, type: 'error' })
    } finally {
      setSubiendoFoto(false)
    }
  }

  const handleEliminarFoto = async () => {
    if (!profile?.id) return
    if (!confirm('¿Eliminar la foto de perfil actual?')) return

    setSubiendoFoto(true)
    setMessage({ text: 'Eliminando...', type: 'success' })

    try {
      // 1. Borrar de la tabla DIRIGENTES (donde está la foto que ves en la ficha)
      const { error: errDir } = await supabase
        .from('dirigentes')
        .update({ foto_url: null })
        .eq('usuario_id', profile.id)

      if (errDir) console.error('Error al borrar de dirigentes:', errDir)

      // 2. Borrar de la tabla USUARIOS
      const { error: errUsr } = await supabase
        .from('usuarios')
        .update({ foto_url: null })
        .eq('id', profile.id)

      if (errUsr) {
        alert('Error de permisos: ' + errUsr.message)
        throw errUsr // 👈 Si falla, que frene y te avise
      }

      // 3. Limpiamos el estado local
      setFotoPerfil(null)
      setMessage({ text: '✅ Foto eliminada. Refrescá la página (F5) para ver el cambio.', type: 'success' })
      
      // 4. Forzamos un pequeño refresco después de 1 segundo para que el Header se entere
      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (err: any) {
      setMessage({ text: '❌ Error inesperado: ' + err.message, type: 'error' })
    } finally {
      setSubiendoFoto(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })
    setLoading(true)

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: nombre.trim(),
          apellido: apellido.trim() || ''
        })
        .eq('id', profile?.id)

      if (error) throw error
      setMessage({ text: '✅ Perfil actualizado correctamente', type: 'success' })
    } catch (error: any) {
      setMessage({ text: `❌ ${error.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })
    setLoading(true)

    if (newPassword.length < 6) {
      setMessage({ text: '⚠️ La contraseña debe tener al menos 6 caracteres', type: 'warning' })
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: '⚠️ Las contraseñas no coinciden', type: 'warning' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setMessage({ text: '✅ Contraseña actualizada correctamente', type: 'success' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (error: any) {
      setMessage({ text: `❌ ${error.message}`, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const iniciales = `${profile?.nombre?.charAt(0) || ''}${profile?.apellido?.charAt(0) || ''}`.toUpperCase()
  const nombreCompleto = `${profile?.nombre || ''}${profile?.apellido ? ' ' + profile?.apellido : ''}`

  return (
    <div style={{ maxWidth: '672px', margin: '0 auto' }}>
      {/* Encabezado estilo Control de Carpas */}
      <div style={{
        backgroundColor: '#24352A',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #D1C9B4',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* AVATAR CON FOTO */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#BF4E30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '700',
              color: 'white',
              fontFamily: 'Oswald, sans-serif',
              overflow: 'hidden'
            }}>
              {fotoPerfil ? (
                <img src={fotoPerfil} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                iniciales || 'U'
              )}
            </div>
            
            {/* Botón de cambiar foto */}
            <label style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              backgroundColor: '#24352A',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: subiendoFoto ? 'wait' : 'pointer',
              border: '2px solid #C48A2A',
              fontSize: '12px'
            }}>
              {subiendoFoto ? '⏳' : '📷'}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleSubirFoto} 
                style={{ display: 'none' }} 
                disabled={subiendoFoto} 
              />
            </label>

            {/* Botón de eliminar foto */}
            {fotoPerfil && (
              <button
                onClick={handleEliminarFoto}
                disabled={subiendoFoto}
                title="Eliminar foto"
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#BF4E30',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: subiendoFoto ? 'wait' : 'pointer',
                  border: '2px solid #24352A',
                  fontSize: '10px',
                  padding: 0
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div>
            <h1 style={{
              fontFamily: 'Oswald, sans-serif',
              fontWeight: '700',
              fontSize: '20px',
              color: '#F3ECD8',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: 0
            }}>
              {nombreCompleto || 'Usuario'}
            </h1>
            <p style={{
              fontFamily: 'Oswald, sans-serif',
              fontWeight: '400',
              fontSize: '14px',
              color: '#D1C9B4',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0
            }}>
              {user?.email}
            </p>
            <span style={{
              display: 'inline-block',
              marginTop: '4px',
              backgroundColor: '#BF4E30',
              color: 'white',
              fontSize: '10px',
              padding: '2px 12px',
              borderRadius: '9999px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: 'Oswald, sans-serif'
            }}>
              {profile?.rol || 'Viewer'}
            </span>
          </div>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          border: '1px solid',
          fontFamily: 'Oswald, sans-serif',
          ...(message.type === 'error' ? { backgroundColor: '#FEE2E2', color: '#BF4E30', borderColor: '#FECACA' } :
              message.type === 'warning' ? { backgroundColor: '#FEF3C7', color: '#C48A2A', borderColor: '#FDE68A' } :
              { backgroundColor: '#D1FAE5', color: '#5C7A5E', borderColor: '#A7F3D0' })
        }}>
          {message.text}
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #D1C9B4',
        marginBottom: '16px'
      }}>
        <h2 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '600',
          fontSize: '14px',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '16px'
        }}>
          📋 Datos personales
        </h2>
        
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#7A7364',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Oswald, sans-serif'
              }}>
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '16px',
                  border: '2px solid #D1C9B4',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                required
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#7A7364',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Oswald, sans-serif'
              }}>
                Apellido
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '16px',
                  border: '2px solid #D1C9B4',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#7A7364',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'Oswald, sans-serif'
            }}>
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{
                width: '100%',
                padding: '8px 16px',
                fontSize: '16px',
                border: '2px solid #D1C9B4',
                borderRadius: '8px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                cursor: 'not-allowed',
                fontFamily: 'Oswald, sans-serif'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#7A7364',
              marginTop: '4px',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              El email no se puede cambiar
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#24352A',
              color: 'white',
              padding: '8px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: 'Oswald, sans-serif',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D4F3F'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#24352A'}
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #D1C9B4'
      }}>
        <h2 style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: '600',
          fontSize: '14px',
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '16px'
        }}>
          🔒 Cambiar contraseña
        </h2>
        
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#24352A',
              fontSize: '14px',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#BF4E30'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#24352A'}
          >
            Cambiar contraseña →
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '448px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#7A7364',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Oswald, sans-serif'
              }}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '16px',
                  border: '2px solid #D1C9B4',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                required
                minLength={6}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#7A7364',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Oswald, sans-serif'
              }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '16px',
                  border: '2px solid #D1C9B4',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#24352A',
                  color: 'white',
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: 'Oswald, sans-serif',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D4F3F'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#24352A'}
              >
                {loading ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                style={{
                  backgroundColor: '#F3ECD8',
                  color: '#24352A',
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: '2px solid #D1C9B4',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: 'Oswald, sans-serif',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8DEC4'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3ECD8'}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}