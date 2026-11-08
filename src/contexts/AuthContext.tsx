import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Profile {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  rama_asignada: string | null
  activo: boolean
  fecha_nacimiento: string | null
}

interface AuthContextType {
  user: any
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  actualizarFechaNacimiento: (fecha: string) => Promise<void>
  isSuperAdmin: boolean
  isJefatura: boolean
  isTesorero: boolean
  isAdministrador: boolean
  getRolData: () => { tipo: 'jefe' | 'subjefe' | 'ayudante' | 'viewer' | 'admin', rama: string | null }
  esJefe: boolean
  esSubJefe: boolean
  esAyudante: boolean
  canViewAll: boolean
  canEditAll: boolean
  canViewRama: (rama: string) => boolean
  canEditRama: (rama: string) => boolean
  canViewAllFinanzas: boolean
  canEditFinanzas: (rama?: string) => boolean
  canCreatePagos: boolean
  canEditCampamentos: (rama?: string) => boolean
  matrizPermisos: Record<string, string[]>
  puedeHacer: (permiso: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [matrizPermisos, setMatrizPermisos] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await getProfile(session.user.id, session.user.email)
        }
      } catch (error) {
        console.error('Error al cargar sesión:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await getProfile(session.user.id, session.user.email)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const getProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Usamos maybeSingle en vez de single para que no explote si no lo encuentra

      // 1. Cargamos la matriz de permisos
      const { data: configData } = await supabase
        .from('configuracion_grupo')
        .select('valores_planillas')
        .limit(1)
        .maybeSingle()
      
      if (configData?.valores_planillas?.permisos_roles) {
        setMatrizPermisos(configData.valores_planillas.permisos_roles)
      }

      if (error) {
        console.error('Error al buscar perfil:', error)
        return
      }

      // Si encontró el perfil, lo guardamos
      if (data) {
        setProfile(data)

        // Actualizamos último acceso (silenciosamente)
        supabase
          .from('usuarios')
          .update({ ultimo_acceso: new Date().toISOString() })
          .eq('id', userId)
          .then(({ error }) => {
            if (error) console.warn('⚠️ No se pudo actualizar ultimo_acceso:', error)
          })
      } else {
        // Si NO encontró el perfil (quizás porque falló el registro o la sesión es vieja),
        // NO intentamos insertar nada acá para evitar el error 400.
        console.warn('⚠️ El usuario está en Auth pero no tiene perfil en la tabla usuarios.')
      }
    } catch (error) {
      console.error('Error general al cargar perfil:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const actualizarFechaNacimiento = async (fecha: string) => {
    if (!profile?.id) throw new Error('No hay usuario logueado')

    const { error } = await supabase
      .from('usuarios')
      .update({ fecha_nacimiento: fecha })
      .eq('id', profile.id)

    if (error) throw error

    setProfile({ ...profile, fecha_nacimiento: fecha })
  }

  // =============================================
  // PERMISOS POR ROL
  // =============================================

  const rol = profile?.rol || 'viewer'

  const isSuperAdmin = rol === 'SUPER_ADMIN'
  const isJefatura = rol === 'Jefatura' || rol === 'SUPER_ADMIN'
  const isTesorero = rol === 'Tesorero' || rol === 'SUPER_ADMIN'
  const isAdministrador = rol === 'Administrador' || rol === 'SUPER_ADMIN'

  const esJefe = rol === 'JefeManada' || rol === 'JefeUnidad' || rol === 'JefeCaminantes' || rol === 'JefeRovers'
  const esSubJefe = rol === 'SubJefeManada' || rol === 'SubJefeUnidad' || rol === 'SubJefeCaminantes' || rol === 'SubJefeRovers'
  const esAyudante = rol === 'AyudanteManada' || rol === 'AyudanteUnidad' || rol === 'AyudanteCaminantes' || rol === 'AyudanteRovers'

  const getRamaFromRol = (rol: string): string | null => {
    if (rol === 'JefeManada' || rol === 'SubJefeManada' || rol === 'AyudanteManada') return 'Manada'
    if (rol === 'JefeUnidad' || rol === 'SubJefeUnidad' || rol === 'AyudanteUnidad') return 'Unidad Scout'
    if (rol === 'JefeCaminantes' || rol === 'SubJefeCaminantes' || rol === 'AyudanteCaminantes') return 'Caminantes'
    if (rol === 'JefeRovers' || rol === 'SubJefeRovers' || rol === 'AyudanteRovers') return 'Rovers'
    return null
  }

  const ramaAsignada = getRamaFromRol(rol)

  const getRolData = () => {
    if (isSuperAdmin || isJefatura || isAdministrador || isTesorero) {
      return { tipo: 'admin' as const, rama: null }
    }
    if (esJefe) return { tipo: 'jefe' as const, rama: ramaAsignada }
    if (esSubJefe) return { tipo: 'subjefe' as const, rama: ramaAsignada }
    if (esAyudante) return { tipo: 'ayudante' as const, rama: ramaAsignada }
    return { tipo: 'viewer' as const, rama: null }
  }

  const canViewAll = isSuperAdmin || isJefatura || isAdministrador || isTesorero
  const canEditAll = isSuperAdmin || isJefatura

  const canViewRama = (rama: string): boolean => {
    if (canViewAll) return true
    if (esJefe && ramaAsignada === rama) return true
    if (esSubJefe && ramaAsignada === rama) return true
    if (esAyudante && ramaAsignada === rama) return true
    return false
  }

  const canEditRama = (rama: string): boolean => {
    if (canEditAll) return true
    if (esJefe && ramaAsignada === rama) return true
    return false
  }

  const canViewAllFinanzas = isSuperAdmin || isJefatura || isTesorero || isAdministrador
  
  const canEditFinanzas = (rama?: string): boolean => {
    if (isSuperAdmin) return true
    if (isTesorero) return true
    if (isJefatura) return false
    if (esJefe && rama && ramaAsignada === rama) return true
    return false
  }

  const canCreatePagos = (): boolean => {
    if (isSuperAdmin) return true
    if (isTesorero) return true
    if (esJefe) return true
    return false
  }

  const canEditCampamentos = (rama?: string): boolean => {
    if (isSuperAdmin || isJefatura || isAdministrador) return true
    if (esJefe && rama && ramaAsignada === rama) return true
    return false
  }

  const puedeHacer = (permiso: string): boolean => {
    if (isSuperAdmin) return true
    const permisosDelRol = matrizPermisos[rol] || []
    return permisosDelRol.includes(permiso)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signOut,
      actualizarFechaNacimiento,
      isSuperAdmin,
      isJefatura,
      isTesorero,
      isAdministrador,
      getRolData,
      esJefe,
      esSubJefe,
      esAyudante,
      canViewAll,
      canViewRama,
      canEditAll,
      canEditRama,
      canViewAllFinanzas,
      canEditFinanzas,
      canCreatePagos: puedeHacer('crear_pago'),
      canEditCampamentos,
      matrizPermisos,
      puedeHacer
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}