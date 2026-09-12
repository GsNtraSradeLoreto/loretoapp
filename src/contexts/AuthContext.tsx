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
}

interface AuthContextType {
  user: any
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  // Roles base
  isSuperAdmin: boolean
  isJefatura: boolean
  isTesorero: boolean
  isAdministrador: boolean
  // Roles de rama
  getRolData: () => { tipo: 'jefe' | 'ayudante' | 'viewer' | 'admin', rama: string | null }
  // Permisos generales
  canViewAll: boolean
  canEditAll: boolean
  canViewRama: (rama: string) => boolean
  canEditRama: (rama: string) => boolean
  // Permisos específicos de finanzas
  canViewAllFinanzas: boolean
  canEditFinanzas: (rama?: string) => boolean
  canCreatePagos: boolean
  // Permisos específicos de campamentos
  canEditCampamentos: (rama?: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await getProfile(session.user.id)
        }
        setLoading(false)
      } catch (error) {
        console.error('Error al cargar sesión:', error)
        setLoading(false)
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await getProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const getProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('usuarios')
            .insert({
              id: userId,
              nombre: 'Usuario',
              apellido: '',
              email: user?.email || '',
              rol: 'viewer',
              rama_asignada: null,
              activo: true
            })
            .select()
            .single()

          if (!insertError && newProfile) {
            setProfile(newProfile)
          }
        }
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error al cargar perfil:', error)
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

  // =============================================
  // PERMISOS POR ROL
  // =============================================

  const rol = profile?.rol || 'viewer'

  // Roles base
  const isSuperAdmin = rol === 'SUPER_ADMIN'
  const isJefatura = rol === 'Jefatura' || rol === 'SUPER_ADMIN'
  const isTesorero = rol === 'Tesorero' || rol === 'SUPER_ADMIN'
  const isAdministrador = rol === 'Administrador' || rol === 'SUPER_ADMIN'

  // Roles de rama
  const esJefe = rol === 'JefeManada' || rol === 'JefeUnidad' || rol === 'JefeCaminantes' || rol === 'JefeRovers'
  const esAyudante = rol === 'AyudanteManada' || rol === 'AyudanteUnidad' || rol === 'AyudanteCaminantes' || rol === 'AyudanteRovers'

  // Obtener la rama del rol
  const getRamaFromRol = (rol: string): string | null => {
    if (rol === 'JefeManada' || rol === 'AyudanteManada') return 'Manada'
    if (rol === 'JefeUnidad' || rol === 'AyudanteUnidad') return 'Unidad Scout'
    if (rol === 'JefeCaminantes' || rol === 'AyudanteCaminantes') return 'Caminantes'
    if (rol === 'JefeRovers' || rol === 'AyudanteRovers') return 'Rovers'
    return null
  }

  const ramaAsignada = getRamaFromRol(rol)

  // Función para obtener datos del rol
  const getRolData = () => {
    if (isSuperAdmin || isJefatura || isAdministrador || isTesorero || rol === 'viewer') {
      return { tipo: 'admin' as const, rama: null }
    }
    if (esJefe) return { tipo: 'jefe' as const, rama: ramaAsignada }
    if (esAyudante) return { tipo: 'ayudante' as const, rama: ramaAsignada }
    return { tipo: 'viewer' as const, rama: null }
  }

  // Permisos generales
  const canViewAll = isSuperAdmin || isJefatura || isAdministrador || isTesorero || rol === 'viewer'
  const canEditAll = isSuperAdmin || isJefatura

  // Verificar si puede ver una rama específica
  const canViewRama = (rama: string): boolean => {
    if (canViewAll) return true
    if (esJefe && ramaAsignada === rama) return true
    if (esAyudante && ramaAsignada === rama) return true
    return false
  }

  // Verificar si puede editar una rama específica
  const canEditRama = (rama: string): boolean => {
    if (canEditAll) return true
    if (esJefe && ramaAsignada === rama) return true
    // Ayudante NO puede editar
    return false
  }

  // Permisos específicos de finanzas
  const canViewAllFinanzas = isSuperAdmin || isJefatura || isTesorero || isAdministrador
  
  const canEditFinanzas = (rama?: string): boolean => {
    if (isSuperAdmin) return true
    if (isTesorero) return true
    if (isJefatura) return false
    if (esJefe && rama && ramaAsignada === rama) return true
    // Ayudante NO puede editar finanzas
    return false
  }

  // Permisos para crear pagos
  const canCreatePagos = (): boolean => {
    if (isSuperAdmin) return true
    if (isTesorero) return true
    if (esJefe) return true
    // Ayudante NO puede crear pagos
    return false
  }

  // Permisos específicos de campamentos
  const canEditCampamentos = (rama?: string): boolean => {
    if (isSuperAdmin || isJefatura || isAdministrador) return true
    if (esJefe && rama && ramaAsignada === rama) return true
    // Ayudante NO puede editar campamentos
    return false
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signOut,
      isSuperAdmin,
      isJefatura,
      isTesorero,
      isAdministrador,
      getRolData,
      canViewAll,
      canViewRama,
      canEditAll,
      canEditRama,
      canViewAllFinanzas,
      canEditFinanzas,
      canCreatePagos: canCreatePagos(),
      canEditCampamentos
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