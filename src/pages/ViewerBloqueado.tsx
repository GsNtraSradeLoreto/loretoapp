import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ViewerBloqueado() {
  const { signOut, profile, user } = useAuth()

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#E8DEC4',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: 'Oswald, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'white',
        border: '2px solid #D1C9B4',
        borderRadius: '16px',
        padding: '32px 24px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{
          color: '#24352A',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontSize: '22px',
          margin: '0 0 12px 0',
          fontWeight: '700'
        }}>
          Cuenta en Revisión
        </h1>
        <p style={{
          color: '#7A7364',
          fontSize: '14px',
          lineHeight: 1.6,
          margin: '0 0 8px 0'
        }}>
          Hola <strong>{profile?.nombre || user?.email}</strong>, tu cuenta todavía no tiene un rol asignado en LoretApp.
        </p>
        <p style={{
          color: '#7A7364',
          fontSize: '14px',
          lineHeight: 1.6,
          margin: '0 0 24px 0'
        }}>
          Hasta que un administrador te asigne un rol, no vas a poder ver la información de tu rama.
          <br />
          Por favor, ponete en contacto con el Jefe de Grupo o el Administrador.
        </p>
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A' }}>
          <p style={{ color: '#C48A2A', fontSize: '12px', margin: 0, fontWeight: '600', fontFamily: 'Oswald, sans-serif' }}>
            ⚠️ Importante: Hasta que no te asignen un rol, no podés volver a iniciar sesión.
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: '#24352A',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}