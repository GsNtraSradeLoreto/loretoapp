import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setMessage({ 
              text: '❌ Email o contraseña incorrectos', 
              type: 'error' 
            })
          } else {
            setMessage({ text: `❌ ${error.message}`, type: 'error' })
          }
          setLoading(false)
          return
        }

        setMessage({ 
          text: '✅ ¡Bienvenido!', 
          type: 'success' 
        })
        
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)

      } else {
        if (!nombre.trim()) {
          setMessage({ 
            text: '⚠️ Por favor, ingresá tu nombre.', 
            type: 'warning' 
          })
          setLoading(false)
          return
        }

        const { count } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })

        const esPrimerUsuario = count === 0

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre: nombre.trim(),
              apellido: apellido.trim() || '',
              rol: esPrimerUsuario ? 'SUPER_ADMIN' : 'viewer',
              activo: true
            }
          }
        })

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            setMessage({ 
              text: '⚠️ Este email ya está registrado.', 
              type: 'warning' 
            })
          } else {
            setMessage({ text: `❌ ${signUpError.message}`, type: 'error' })
          }
          setLoading(false)
          return
        }

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('usuarios')
            .insert({
              id: authData.user.id,
              nombre: nombre.trim(),
              apellido: apellido.trim() || '',
              email: email,
              rol: esPrimerUsuario ? 'SUPER_ADMIN' : 'viewer',
              activo: true
            })

          if (profileError) {
            console.error('Error al crear perfil:', profileError)
            setMessage({ 
              text: `⚠️ Error al crear el perfil. Contactá al administrador.`, 
              type: 'error' 
            })
            setLoading(false)
            return
          }

          setMessage({ 
            text: `✅ ¡Usuario creado! ${esPrimerUsuario ? 'Eres el primer usuario (SUPER_ADMIN).' : ''}`, 
            type: 'success' 
          })
          setNombre('')
          setApellido('')
          setEmail('')
          setPassword('')
          setIsLogin(true)
        }
        setLoading(false)
      }
    } catch (error: any) {
      setMessage({ 
        text: `❌ Error: ${error.message || 'Ocurrió un error inesperado'}`, 
        type: 'error' 
      })
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/reset-password',
      })

      if (error) {
        if (error.message.includes('not found')) {
          setMessage({ 
            text: '⚠️ No encontramos una cuenta con ese email.', 
            type: 'warning' 
          })
        } else {
          setMessage({ text: `❌ ${error.message}`, type: 'error' })
        }
        setLoading(false)
        return
      }

      setMessage({ 
        text: '✅ Te enviamos un email para restablecer tu contraseña.', 
        type: 'success' 
      })
      setShowResetPassword(false)
      setResetEmail('')
    } catch (error: any) {
      setMessage({ 
        text: `❌ Error: ${error.message || 'Ocurrió un error inesperado'}`, 
        type: 'error' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#E8DEC4',
      fontFamily: 'Oswald, sans-serif',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '420px',
        width: '100%',
        border: '3px solid #BF4E30',
boxShadow: '0 0 0 3px #111111, 0 10px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Logo y título */}
<div style={{ textAlign: 'center', marginBottom: '20px' }}>
  <img 
    src="/logo-grupo.png" 
    alt="Logo del Grupo Scout" 
    style={{ 
      display: 'block',
      margin: '0 auto 10px auto',
      width: '300px', 
      height: '300px', 
      objectFit: 'contain' /* Se cambió 'cover' por 'contain' para que el logo no se recorte si no es perfectamente cuadrado */
    }} 
  />
  
  <h1 style={{
    fontFamily: 'Oswald, sans-serif',
    fontWeight: '700',
    fontSize: '28px',
    color: '#24352A',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0
  }}>
    LoretApp
  </h1>
  <p style={{
    fontFamily: 'Oswald, sans-serif',
    fontWeight: '500',
    fontSize: '14px',
    color: '#7A7364',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    margin: '4px 0 0 0'
  }}>
    {showResetPassword ? 'Restablecer Contraseña' : 'Sistema de Gestión - GS. Ntra. Sra. de Loreto'}
  </p>
</div>

        {/* Mensajes */}
        {message.text && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            border: '1px solid',
            fontFamily: 'Oswald, sans-serif',
            ...(message.type === 'error' ? { 
              backgroundColor: '#FEE2E2', 
              color: '#BF4E30', 
              borderColor: '#FECACA' 
            } : message.type === 'warning' ? { 
              backgroundColor: '#FEF3C7', 
              color: '#C48A2A', 
              borderColor: '#FDE68A' 
            } : { 
              backgroundColor: '#D1FAE5', 
              color: '#5C7A5E', 
              borderColor: '#A7F3D0' 
            })
          }}>
            {message.text}
          </div>
        )}

        {/* Formulario de Reset Password */}
        {showResetPassword ? (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#7A7364',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
                fontFamily: 'Oswald, sans-serif'
              }}>
                Email
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '16px',
                  border: '2px solid #D1C9B4',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                placeholder="tu@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#24352A',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
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
              {loading ? 'Enviando...' : 'Enviar instrucciones'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowResetPassword(false)
                setMessage({ text: '', type: '' })
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginTop: '12px',
                color: '#7A7364',
                fontSize: '14px',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        ) : (
          /* Formulario de Login / Registro */
          <form onSubmit={handleSubmit}>
            {/* Campos de registro */}
            {!isLogin && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#7A7364',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
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
                      padding: '10px 14px',
                      fontSize: '16px',
                      border: '2px solid #D1C9B4',
                      borderRadius: '8px',
                      outline: 'none',
                      fontFamily: 'Oswald, sans-serif',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                    placeholder="Tu nombre"
                    required={!isLogin}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#7A7364',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                    fontFamily: 'Oswald, sans-serif'
                  }}>
                    Apellido (opcional)
                  </label>
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '16px',
                      border: '2px solid #D1C9B4',
                      borderRadius: '8px',
                      outline: 'none',
                      fontFamily: 'Oswald, sans-serif',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                    placeholder="Tu apellido"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#7A7364',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
                fontFamily: 'Oswald, sans-serif'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '16px',
                  border: '2px solid #D1C9B4',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'Oswald, sans-serif',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                placeholder="tu@email.com"
                required
              />
            </div>

            {/* Contraseña con botón mostrar/ocultar */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#7A7364',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
                fontFamily: 'Oswald, sans-serif'
              }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    fontSize: '16px',
                    border: '2px solid #D1C9B4',
                    borderRadius: '8px',
                    outline: 'none',
                    fontFamily: 'Oswald, sans-serif',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#24352A'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#D1C9B4'}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: '#7A7364',
                    padding: '4px',
                    lineHeight: 1
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Olvidé mi contraseña */}
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'block',
                  marginLeft: 'auto',
                  marginBottom: '16px',
                  color: '#7A7364',
                  fontSize: '13px',
                  fontFamily: 'Oswald, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#24352A',
                color: 'white',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontFamily: 'Oswald, sans-serif',
                transition: 'all 0.2s',
                opacity: loading ? 0.5 : 1,
                marginBottom: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3D4F3F'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#24352A'}
            >
              {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>

            {/* Alternar Login/Registro */}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage({ text: '', type: '' })
                setPassword('')
                setNombre('')
                setApellido('')
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#7A7364',
                fontSize: '14px',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {isLogin ? '¿No tenés cuenta? Crear una' : '¿Ya tenés cuenta? Iniciar sesión'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}