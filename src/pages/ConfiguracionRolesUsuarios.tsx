import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

// ============================================
// DEFINICIÓN DE PERMISOS (Agrupados)
// ============================================
const PERMISOS_DISPONIBLES = [
  {
    grupo: 'Dashboard y Beneficiarios',
    items: [
      { id: 'crear_beneficiario', label: 'Agregar nuevo beneficiario' },
      { id: 'editar_beneficiario', label: 'Editar datos básicos (Nombre, Rama, Estado)' },
      { id: 'editar_info_benef', label: 'Editar Información (Uniforme, Promesa, Obs.)' },
      { id: 'editar_ficha_completa', label: 'Editar Ficha Completa (Datos personales, salud, etc.)' },
      { id: 'pasar_de_rama', label: 'Pasar de Rama / Registrar Partida Rover' },
    ]
  },
  {
    grupo: 'Pagos y Finanzas',
    items: [
      { id: 'crear_pago', label: 'Agregar Pagos' },
      { id: 'editar_pago', label: 'Editar Pagos' },
      { id: 'editar_planilla', label: 'Editar Celdas y Asistencia en Planillas (Tesorero)' },
      { id: 'editar_obs_planilla', label: 'Editar Observaciones en Planillas' },
    ]
  },
  {
    grupo: 'Legajos y Vida Scout',
    items: [
      { id: 'editar_legajo', label: 'Editar Legajos' },
      { id: 'editar_progresion', label: 'Editar Progresiones de Rama' },
      { id: 'editar_fecha_grupo', label: 'Editar Fecha de Ingreso al Grupo' },
      { id: 'agregar_campamento_asistido', label: 'Agregar Campamento Asistido (Falta crear esta función)' },
    ]
  },
  {
    grupo: 'Permisos y Solicitudes',
    items: [
      { id: 'crear_permiso', label: 'Crear Permiso de Salida/Acampe' },
      { id: 'ver_solicitud', label: 'Ver Solicitudes de Inscripción' },
      { id: 'aprobar_solicitud', label: 'Aprobar/Rechazar Solicitudes de Inscripción' },
    ]
  },
  {
    grupo: 'Administración del Sistema',
    items: [
      { id: 'ver_campamentos', label: 'Ver Página de Campamentos' },
      { id: 'ver_historial', label: 'Ver Historial / Logs' },
      { id: 'ver_config_planilla', label: 'Ver Configuración de Planillas (Año dinámico)' },
    ]
  }
]

const ROLES = [
  'Tesorero', 'Jefatura', 'Administrador',
  'JefeManada', 'JefeUnidad', 'JefeCaminantes', 'JefeRovers',
  'SubJefeManada', 'SubJefeUnidad', 'SubJefeCaminantes', 'SubJefeRovers',
  'AyudanteManada', 'AyudanteUnidad', 'AyudanteCaminantes', 'AyudanteRovers'
]

export default function ConfiguracionRolesUsuarios() {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState({ text: '', type: '' })
  
  const [configId, setConfigId] = useState<string>('')
  const [matrizPermisos, setMatrizPermisos] = useState<Record<string, string[]>>({})

  // ===== CARGAR CONFIG =====
  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard')
      return
    }
    
    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracion_grupo')
          .select('id, valores_planillas')
          .limit(1)
          .maybeSingle()

        if (error) throw error
        if (data) {
          setConfigId(data.id)
          // Buscamos si ya hay permisos guardados en el JSON. Si no, arranca vacío.
          const permisosGuardados = data.valores_planillas?.permisos_roles || {}
          setMatrizPermisos(permisosGuardados)
        }
      } catch (err) {
        console.error(err)
        setMensaje({ text: 'Error al cargar config', type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [isSuperAdmin, navigate])

  // ===== TOGGLE PERMISO =====
  const togglePermiso = (rol: string, permisoId: string) => {
    setMatrizPermisos(prev => {
      const permisosRolActuales = prev[rol] || []
      const yaTiene = permisosRolActuales.includes(permisoId)
      
      let nuevosPermisos
      if (yaTiene) {
        nuevosPermisos = permisosRolActuales.filter(p => p !== permisoId)
      } else {
        nuevosPermisos = [...permisosRolActuales, permisoId]
      }
      
      return { ...prev, [rol]: nuevosPermisos }
    })
  }

  // ===== GUARDAR CONFIG =====
  const guardarConfig = async () => {
    setGuardando(true)
    setMensaje({ text: '', type: '' })
    
    try {
      // 1. Traemos el JSON actual para no pisar el año_actual ni los montos
      const { data: actual, error: errorGet } = await supabase
        .from('configuracion_grupo')
        .select('valores_planillas')
        .eq('id', configId)
        .single()
        
      if (errorGet) throw errorGet

      // 2. Pisamos solo la parte de permisos_roles
      const nuevoJson = {
        ...actual.valores_planillas,
        permisos_roles: matrizPermisos
      }

      // 3. Actualizamos
      const { error } = await supabase
        .from('configuracion_grupo')
        .update({ valores_planillas: nuevoJson })
        .eq('id', configId)

      if (error) throw error
      
      setMensaje({ text: '✅ Permisos guardados correctamente', type: 'success' })
      setTimeout(() => setMensaje({ text: '', type: '' }), 3000)
    } catch (err: any) {
      console.error(err)
      setMensaje({ text: `❌ Error: ${err.message}`, type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Oswald' }}>Cargando matriz de permisos...</div>

  return (
    <div style={{ fontFamily: 'Oswald, sans-serif', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', color: '#24352A', textTransform: 'uppercase', margin: 0 }}>
          🔐 Matriz de Permisos
        </h1>
        <p style={{ color: '#7A7364', fontSize: '14px', marginTop: '4px' }}>
          Configurá qué puede hacer cada rol. (Todavía estamos en la fase de prueba, en la próxima actualización se aplicarán estos permisos a la app real).
        </p>
      </div>

      {mensaje.text && (
        <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', backgroundColor: mensaje.type === 'error' ? '#FEE2E2' : '#D1FAE5', color: mensaje.type === 'error' ? '#BF4E30' : '#166534', fontWeight: 'bold' }}>
          {mensaje.text}
        </div>
      )}

      {/* MATRIZ */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '2px solid #D1C9B4', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#24352A', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#24352A', zIndex: 10 }}>Acción / Módulo</th>
              {ROLES.map(rol => (
                <th key={rol} style={{ padding: '12px', textAlign: 'center', minWidth: '80px', borderLeft: '1px solid #3D4F3F' }}>
                  {rol.replace('Jefe', 'J.').replace('SubJefe', 'SJ.').replace('Ayudante', 'Ay.')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISOS_DISPONIBLES.map((grupo, idxGrupo) => (
              <React.Fragment key={idxGrupo}>
                {/* Título del Grupo */}
                <tr style={{ backgroundColor: '#F3ECD8', borderBottom: '2px solid #D1C9B4' }}>
                  <td colSpan={ROLES.length + 1} style={{ padding: '8px 12px', fontWeight: 'bold', color: '#24352A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {grupo.grupo}
                  </td>
                </tr>
                {/* Items del Grupo */}
                {grupo.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E8DEC4' }}>
                    <td style={{ padding: '10px 12px', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 5, borderRight: '1px solid #E8DEC4', fontWeight: '500' }}>
                      {item.label}
                    </td>
                    {ROLES.map(rol => {
                      const tienePermiso = (matrizPermisos[rol] || []).includes(item.id)
                      // SuperAdmin no se toca, siempre tiene todo
                      if (rol === 'SUPER_ADMIN') return <td key={rol} style={{ textAlign: 'center', borderLeft: '1px solid #E8DEC4', backgroundColor: '#F0F7F0' }}>✅</td>
                      
                      return (
                        <td key={rol} style={{ textAlign: 'center', borderLeft: '1px solid #E8DEC4' }}>
                          <input 
                            type="checkbox" 
                            checked={tienePermiso}
                            onChange={() => togglePermiso(rol, item.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#24352A' }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* BOTÓN GUARDAR */}
      <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
        <button
          onClick={guardarConfig}
          disabled={guardando}
          style={{
            padding: '14px 40px', backgroundColor: guardando ? '#7A7364' : '#24352A', color: 'white',
            border: 'none', borderRadius: '50px', cursor: guardando ? 'wait' : 'pointer',
            fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}
        >
          {guardando ? 'Guardando...' : '💾 Guardar Permisos'}
        </button>
      </div>
    </div>
  )
}