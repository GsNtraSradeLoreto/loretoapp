import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ROLES_OPCIONES, getRolLabel } from '../lib/rolesLabels'
import { formatFechaHora } from '../utils/formatFecha'

// ============================================
// TIPOS
// ============================================
interface Dirigente {
  id: string
  usuario_id: string | null
  nombre: string
  apellido: string
  email: string | null
  dni: string | null
  fecha_nacimiento: string | null
  telefono: string | null
  direccion: string | null
  foto_url: string | null
  tipo: 'dirigente' | 'adulto'
  rol_grupo: string | null
  rama_asignada: string | null
  activo: boolean
  tiene_insignia_madera: boolean | null
  tiene_im_gestion: boolean | null
  observaciones: string | null
  cuenta_email?: string | null
  cuenta_rol?: string | null
  cuenta_activo?: boolean | null
  cuenta_ultimo_acceso?: string | null
  cuenta_creado_en?: string | null
  cuenta_foto_url?: string | null
}

interface UsuarioSinFicha {
  id: string
  nombre: string
  apellido: string | null
  email: string
  rol: string
  activo: boolean
  ultimo_acceso: string | null
  creado_en: string
  foto_url?: string | null
}

type Modo = 'cargando' | 'mi_perfil' | 'lista' | 'sin_ficha'
type OrdenTipo = 'apellido_asc' | 'acceso_desc' | 'acceso_asc' | 'alta_desc'

// ============================================
// HELPERS
// ============================================
const getRolStyle = (rol: string | null) => {
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
    'JefeManada': 'amarillo', 'JefeUnidad': 'verde', 'JefeCaminantes': 'celeste', 'JefeRovers': 'rojo',
    'SubJefeManada': 'amarillo', 'SubJefeUnidad': 'verde', 'SubJefeCaminantes': 'celeste', 'SubJefeRovers': 'rojo',
    'AyudanteManada': 'amarillo', 'AyudanteUnidad': 'verde', 'AyudanteCaminantes': 'celeste', 'AyudanteRovers': 'rojo'
  }
  const key = (rol && map[rol]) || 'gris'
  return colores[key]
}

// ============================================
// COMPONENTE
// ============================================
export default function Adultos() {
  const { profile, isSuperAdmin, isJefatura, isAdministrador, isTesorero, puedeHacer } = useAuth()
  const navigate = useNavigate()

  const [modo, setModo] = useState<Modo>('cargando')
  const [miDirigenteId, setMiDirigenteId] = useState<string | null>(null)
  const [dirigentes, setDirigentes] = useState<Dirigente[]>([])
  const [usuariosSinFicha, setUsuariosSinFicha] = useState<UsuarioSinFicha[]>([])
  const [cargandoLista, setCargandoLista] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)

  // Filtros y orden
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'dirigente' | 'adulto'>('todos')
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'inactivos'>('activos')
  const [filtroCuenta, setFiltroCuenta] = useState<'todos' | 'con_cuenta' | 'sin_cuenta' | 'sin_ficha'>('todos')
  const [orden, setOrden] = useState<OrdenTipo>('acceso_desc')

  // Edición inline
  const [editandoRolId, setEditandoRolId] = useState<string | null>(null)
  const [rolEdit, setRolEdit] = useState('')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  // Panel de creación de nuevo adulto
  const [creandoAdulto, setCreandoAdulto] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoDni, setNuevoDni] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<'dirigente' | 'adulto'>('dirigente')
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  // ¿Este usuario tiene permisos para ver la lista?
  const esAdminDeAdultos =
    isSuperAdmin || isJefatura || isAdministrador || isTesorero || puedeHacer('ver_adultos')

  // ¿Puede editar roles desde la lista? Solo SuperAdmin (como en Admin.tsx)
  const puedeEditarRoles = isSuperAdmin

  // 🕒 Si no es SuperAdmin/Admin, forzar orden alfabético
  useEffect(() => {
    if (!isSuperAdmin && !isAdministrador) {
      if (orden === 'acceso_desc' || orden === 'acceso_asc') {
        setOrden('apellido_asc')
      }
    }
  }, [isSuperAdmin, isAdministrador, orden])

  // =========================================================
  // MODO: determinar qué vista mostrar
  // =========================================================
  useEffect(() => {
    const decidirModo = async () => {
      if (!profile?.id) { setModo('sin_ficha'); return }

      const { data } = await supabase
        .from('dirigentes')
        .select('id')
        .eq('usuario_id', profile.id)
        .maybeSingle()

      if (data?.id) {
        setMiDirigenteId(data.id)
        if (esAdminDeAdultos) setModo('lista')
        else { navigate(`/adultos/${data.id}`, { replace: true }); setModo('mi_perfil') }
      } else {
        if (esAdminDeAdultos) setModo('lista')
        else setModo('sin_ficha')
      }
    }
    decidirModo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // =========================================================
  // Cargar lista
  // =========================================================
  useEffect(() => {
    if (modo === 'lista') cargarLista()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo])

  const cargarLista = async () => {
    setCargandoLista(true)
    setError('')

    // 1) Dirigentes
    const { data: dirData, error: dirErr } = await supabase
      .from('dirigentes')
      .select('*')
      .order('apellido', { ascending: true })

    if (dirErr) {
      setError('No se pudo cargar la lista de adultos.')
      setCargandoLista(false)
      return
    }

    // 2) Usuarios (todos, para enriquecer y detectar huérfanos)
    const { data: usrData, error: usrErr } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, ultimo_acceso, creado_en, foto_url')
      .order('apellido', { ascending: true })

    if (usrErr) {
      setError('No se pudieron cargar los usuarios.')
      setCargandoLista(false)
      return
    }

    const usuariosPorId = new Map<string, any>()
    ;(usrData || []).forEach((u: any) => usuariosPorId.set(u.id, u))

    // 3) Enriquecer dirigentes con datos de cuenta
    const dirigentesEnriquecidos = (dirData || []).map((d: any) => {
      const usr = d.usuario_id ? usuariosPorId.get(d.usuario_id) : null
      return {
        ...d,
        cuenta_email: usr?.email || null,
        cuenta_rol: usr?.rol || null,
        cuenta_activo: usr?.activo ?? null,
        cuenta_ultimo_acceso: usr?.ultimo_acceso || null,
        cuenta_creado_en: usr?.creado_en || null,
        cuenta_foto_url: usr?.foto_url || null
      }
    })

    setDirigentes(dirigentesEnriquecidos)

    // 4) Huérfanos (usuarios sin ficha)
    const idsUsuariosConFicha = new Set(
      (dirData || []).map((d: any) => d.usuario_id).filter(Boolean)
    )
    const huerfanos = (usrData || []).filter((u: any) => !idsUsuariosConFicha.has(u.id))
    setUsuariosSinFicha(huerfanos)

    setCargandoLista(false)
  }

  // =========================================================
  // Crear adulto/dirigente desde cero
  // =========================================================
  const crearAdulto = async () => {
    if (!nuevoNombre.trim() || !nuevoApellido.trim()) {
      setMensaje({ texto: '❌ Nombre y apellido son obligatorios', tipo: 'error' })
      return
    }

    setGuardandoNuevo(true)
    setMensaje(null)

    const { error: err } = await supabase.from('dirigentes').insert({
      nombre: nuevoNombre.trim(),
      apellido: nuevoApellido.trim(),
      email: nuevoEmail.trim() || null,
      dni: nuevoDni.trim() || null,
      tipo: nuevoTipo,
      activo: true
    })

    if (err) {
      setMensaje({ texto: '❌ Error al crear: ' + err.message, tipo: 'error' })
    } else {
      setMensaje({ texto: '✅ Adulto creado correctamente', tipo: 'ok' })
      setCreandoAdulto(false)
      setNuevoNombre('')
      setNuevoApellido('')
      setNuevoEmail('')
      setNuevoDni('')
      setNuevoTipo('dirigente')
      await cargarLista()
    }
    setGuardandoNuevo(false)
  }

  // =========================================================
  // Crear ficha desde usuario huérfano
  // =========================================================
  const crearFichaDesdeUsuario = async (usuario: UsuarioSinFicha) => {
    const confirmar = confirm(
      `¿Crear ficha de dirigente para ${usuario.nombre} ${usuario.apellido || ''} (${usuario.email})?`
    )
    if (!confirmar) return

    const { error: err } = await supabase.from('dirigentes').insert({
      usuario_id: usuario.id,
      nombre: usuario.nombre || '',
      apellido: usuario.apellido || '',
      email: usuario.email || null,
      tipo: 'dirigente',
      activo: true
    })

    if (err) {
      alert('❌ Error: ' + err.message)
      return
    }
    setMensaje({ texto: '✅ Ficha creada y vinculada', tipo: 'ok' })
    await cargarLista()
  }

  // =========================================================
  // Editar rol inline
  // =========================================================
  const iniciarEdicionRol = (usuarioId: string, rolActual: string) => {
    setEditandoRolId(usuarioId)
    setRolEdit(rolActual)
    setMensaje(null)
  }

  const cancelarEdicionRol = () => {
    setEditandoRolId(null)
    setRolEdit('')
  }

  const guardarRol = async (usuarioId: string) => {
    if (!confirm(`¿Cambiar el rol a "${getRolLabel(rolEdit)}"?\n\nEsto cambia los permisos del usuario en toda la app.`)) return

    setGuardandoId(usuarioId)
    const { error: err } = await supabase
      .from('usuarios')
      .update({ rol: rolEdit })
      .eq('id', usuarioId)

    if (err) {
      setMensaje({ texto: '❌ ' + err.message, tipo: 'error' })
    } else {
      setMensaje({ texto: '✅ Rol actualizado (el usuario debe recargar)', tipo: 'ok' })
      setEditandoRolId(null)
      await cargarLista()
    }
    setGuardandoId(null)
  }

  // =========================================================
  // Filtrado y orden
  // =========================================================
  const elementosFiltrados = (() => {
    const q = busqueda.trim().toLowerCase()

    const dirigentesFilt = dirigentes.filter((d) => {
      if (filtroTipo === 'adulto' && d.tipo !== 'adulto') return false
      if (filtroTipo === 'dirigente' && d.tipo !== 'dirigente') return false
      if (filtroActivo === 'activos' && !d.activo) return false
      if (filtroActivo === 'inactivos' && d.activo) return false
      if (filtroCuenta === 'con_cuenta' && !d.usuario_id) return false
      if (filtroCuenta === 'sin_cuenta' && d.usuario_id) return false
      if (filtroCuenta === 'sin_ficha') return false
      if (q) {
        const txt = `${d.nombre} ${d.apellido} ${d.email || ''} ${d.dni || ''}`.toLowerCase()
        if (!txt.includes(q)) return false
      }
      return true
    }).map(d => ({ tipo: 'dirigente' as const, data: d }))

    let usuariosFilt: { tipo: 'sin_ficha'; data: UsuarioSinFicha }[] = []
    if (filtroCuenta === 'todos' || filtroCuenta === 'sin_ficha') {
      if (filtroTipo === 'dirigente' || filtroTipo === 'adulto') {
        usuariosFilt = []
      } else {
        usuariosFilt = usuariosSinFicha.filter((u) => {
          if (q) {
            const txt = `${u.nombre} ${u.apellido || ''} ${u.email}`.toLowerCase()
            if (!txt.includes(q)) return false
          }
          return true
        }).map(u => ({ tipo: 'sin_ficha' as const, data: u }))
      }
    }

    const todos = [...dirigentesFilt, ...usuariosFilt]

    // Orden
    todos.sort((a, b) => {
      if (orden === 'apellido_asc') {
        const apA = a.tipo === 'dirigente' ? a.data.apellido : (a.data.apellido || '')
        const apB = b.tipo === 'dirigente' ? b.data.apellido : (b.data.apellido || '')
        return apA.localeCompare(apB, 'es', { sensitivity: 'base' })
      }

      if (orden === 'acceso_desc' || orden === 'acceso_asc') {
        const accA = a.tipo === 'dirigente' ? a.data.cuenta_ultimo_acceso : a.data.ultimo_acceso
        const accB = b.tipo === 'dirigente' ? b.data.cuenta_ultimo_acceso : b.data.ultimo_acceso
        const tsA = accA ? new Date(accA).getTime() : 0
        const tsB = accB ? new Date(accB).getTime() : 0
        if (tsA === 0 && tsB === 0) return 0
        if (tsA === 0) return 1
        if (tsB === 0) return -1
        return orden === 'acceso_desc' ? tsB - tsA : tsA - tsB
      }

      if (orden === 'alta_desc') {
        const cA = a.tipo === 'dirigente' ? a.data.cuenta_creado_en : a.data.creado_en
        const cB = b.tipo === 'dirigente' ? b.data.cuenta_creado_en : b.data.creado_en
        const tsA = cA ? new Date(cA).getTime() : 0
        const tsB = cB ? new Date(cB).getTime() : 0
        return tsB - tsA
      }

      return 0
    })

    return todos
  })()

  // Estadísticas
  const stats = {
    total: dirigentes.length + usuariosSinFicha.length,
    activos: dirigentes.filter(d => d.activo).length + usuariosSinFicha.filter(u => u.activo).length,
    conCuenta: dirigentes.filter(d => d.usuario_id).length + usuariosSinFicha.length,
    sinCuenta: dirigentes.filter(d => !d.usuario_id).length,
    sinFicha: usuariosSinFicha.length
  }

  // =========================================================
  // RENDERS
  // =========================================================

  if (modo === 'cargando') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'Oswald, sans-serif', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Cargando...
      </div>
    )
  }

  if (modo === 'sin_ficha') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
        <h2 style={{ fontFamily: 'Oswald, sans-serif', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
          Sin ficha de dirigente
        </h2>
        <p style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364', marginBottom: '24px', fontSize: '14px' }}>
          Tu cuenta no tiene una ficha de adulto/dirigente vinculada. Si sos dirigente del grupo, pedile a la Jefatura que vincule tu cuenta.
        </p>
        <Link
          to="/perfil"
          style={{
            display: 'inline-block',
            backgroundColor: '#24352A',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '14px'
          }}
        >
          Ir a Mi Perfil (cuenta)
        </Link>
      </div>
    )
  }

  // MODO LISTA
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Oswald, sans-serif', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '22px', margin: 0 }}>
            👥 Adultos y Dirigentes
          </h1>
          <p style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364', fontSize: '13px', margin: '4px 0 0 0' }}>
            {elementosFiltrados.length} de {stats.total} registros
          </p>
        </div>
        <button
          onClick={() => setCreandoAdulto(!creandoAdulto)}
          style={{
            backgroundColor: creandoAdulto ? '#BF4E30' : '#24352A',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {creandoAdulto ? '✕ Cancelar' : '➕ Nuevo Adulto'}
        </button>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(isSuperAdmin || isJefatura) && (
            <Link
              to="/formacion"
              title="Ver formación de todos los dirigentes"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#24352A', color: 'white',
                padding: '8px 14px', borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                fontSize: '12px', fontWeight: '600'
              }}
            >
              🎓 Formación General
            </Link>
          )}

          {isSuperAdmin && (
            <Link
              to="/configuracion-roles"
              title="Configurar permisos de roles"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#C48A2A', color: 'white',
                padding: '8px 14px', borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                fontSize: '12px', fontWeight: '600'
              }}
            >
              🔐 Permisos de Roles
            </Link>
          )}
        </div>
      </div>

      {/* ESTADÍSTICAS (solo SuperAdmin) */}
      {isSuperAdmin && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '6px',
          marginBottom: '16px'
        }}>
          {[
            { label: 'Total', valor: stats.total, color: '#24352A' },
            { label: 'Activos', valor: stats.activos, color: '#5C7A5E' },
            { label: 'Con cuenta', valor: stats.conCuenta, color: '#24352A' },
            { label: 'Sin cuenta', valor: stats.sinCuenta, color: '#C48A2A' },
            { label: 'Sin ficha', valor: stats.sinFicha, color: '#BF4E30' }
          ].map(s => (
            <div key={s.label} style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '8px 10px',
              border: '2px solid #D1C9B4',
              textAlign: 'center'
            }}>
              <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '700', fontSize: '20px', color: s.color, margin: 0 }}>
                {s.valor}
              </p>
              <p style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '500', fontSize: '10px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 0 0' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}
      {/* PANEL DE CREACIÓN DE NUEVO ADULTO */}
      {creandoAdulto && (
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #24352A',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontFamily: 'Oswald, sans-serif',
            color: '#24352A',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '14px',
            margin: '0 0 14px 0',
            fontWeight: '700'
          }}>
            ➕ Nuevo Adulto / Dirigente
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelForm}>Nombre *</label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                style={inputForm}
                placeholder="Ej: Juan"
                disabled={guardandoNuevo}
              />
            </div>
            <div>
              <label style={labelForm}>Apellido *</label>
              <input
                type="text"
                value={nuevoApellido}
                onChange={(e) => setNuevoApellido(e.target.value)}
                style={inputForm}
                placeholder="Ej: Pérez"
                disabled={guardandoNuevo}
              />
            </div>
            <div>
              <label style={labelForm}>Email</label>
              <input
                type="email"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                style={inputForm}
                placeholder="opcional"
                disabled={guardandoNuevo}
              />
            </div>
            <div>
              <label style={labelForm}>DNI</label>
              <input
                type="text"
                value={nuevoDni}
                onChange={(e) => setNuevoDni(e.target.value)}
                style={inputForm}
                placeholder="opcional"
                disabled={guardandoNuevo}
              />
            </div>
            <div>
              <label style={labelForm}>Tipo</label>
              <select
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value as 'dirigente' | 'adulto')}
                style={inputForm}
                disabled={guardandoNuevo}
              >
                <option value="dirigente">Dirigente (trabaja en rama)</option>
                <option value="adulto">Adulto (cocina, apoyo, etc.)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setCreandoAdulto(false)
                setNuevoNombre('')
                setNuevoApellido('')
                setNuevoEmail('')
                setNuevoDni('')
                setNuevoTipo('dirigente')
              }}
              disabled={guardandoNuevo}
              style={{
                backgroundColor: '#E8DEC4',
                color: '#24352A',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: guardandoNuevo ? 'not-allowed' : 'pointer',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '12px',
                fontWeight: '600',
                opacity: guardandoNuevo ? 0.5 : 1
              }}
            >
              Cancelar
            </button>
            <button
              onClick={crearAdulto}
              disabled={guardandoNuevo}
              style={{
                backgroundColor: '#24352A',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: guardandoNuevo ? 'wait' : 'pointer',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '12px',
                fontWeight: '600',
                opacity: guardandoNuevo ? 0.6 : 1
              }}
            >
              {guardandoNuevo ? 'Guardando...' : '💾 Crear'}
            </button>
          </div>
        </div>
      )}

      {/* MENSAJE */}
      {mensaje && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '13px',
          fontFamily: 'Oswald, sans-serif',
          backgroundColor: mensaje.tipo === 'error' ? '#FEE2E2' : '#D1FAE5',
          color: mensaje.tipo === 'error' ? '#BF4E30' : '#5C7A5E',
          border: `1px solid ${mensaje.tipo === 'error' ? '#FECACA' : '#A7F3D0'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, email o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            flex: '1 1 240px', minWidth: '200px',
            padding: '8px 14px', fontSize: '14px',
            border: '2px solid #D1C9B4', borderRadius: '8px',
            outline: 'none',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: 'white'
          }}
        />
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} style={selectStyle}>
          <option value="todos">Todos</option>
          <option value="dirigente">Dirigentes</option>
          <option value="adulto">Adultos</option>
        </select>
        <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value as any)} style={selectStyle}>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <select value={filtroCuenta} onChange={(e) => setFiltroCuenta(e.target.value as any)} style={selectStyle}>
          <option value="todos">Todas las cuentas</option>
          <option value="con_cuenta">Con cuenta vinculada</option>
          <option value="sin_cuenta">Sin cuenta</option>
          <option value="sin_ficha">Usuarios sin ficha</option>
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value as any)} style={selectStyle}>
          <option value="apellido_asc">Apellido (A-Z)</option>
          {(isSuperAdmin || isAdministrador) && (
            <>
              <option value="acceso_desc">Último acceso (reciente)</option>
              <option value="acceso_asc">Último acceso (antiguo)</option>
            </>
          )}
          <option value="alta_desc">Fecha de alta (más nuevo)</option>
        </select>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#BF4E30', borderRadius: '8px', marginBottom: '16px', fontFamily: 'Oswald, sans-serif', fontSize: '14px' }}>
          ❌ {error}
        </div>
      )}

      {/* LISTA */}
      {cargandoLista ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'Oswald, sans-serif', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Cargando lista...
        </div>
      ) : elementosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', backgroundColor: 'white', borderRadius: '12px', border: '2px solid #D1C9B4', fontFamily: 'Oswald, sans-serif', color: '#7A7364' }}>
          No hay registros que coincidan con los filtros.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {elementosFiltrados.map((item) => {
            // ============ USUARIO SIN FICHA ============
            if (item.tipo === 'sin_ficha') {
              const u = item.data
              const nombreCompleto = `${u.apellido || ''}${u.apellido && u.nombre ? ', ' : ''}${u.nombre}`
              const iniciales = `${u.nombre?.charAt(0) || ''}${u.apellido?.charAt(0) || ''}`.toUpperCase()
              const editandoEste = editandoRolId === u.id

              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '14px',
                  backgroundColor: '#FEF9F0',
                  borderRadius: '12px',
                  border: '2px dashed #C48A2A',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      backgroundColor: '#7A7364', color: '#F3ECD8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: '700', fontFamily: 'Oswald, sans-serif', flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      {u.foto_url ? (
                        <img src={u.foto_url} alt={nombreCompleto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        iniciales
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Oswald, sans-serif', fontWeight: '600', fontSize: '15px',
                        color: '#24352A', textTransform: 'uppercase', letterSpacing: '0.5px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreCompleto}</span>
                        {u.id === profile?.id && (
                          <span style={{
                            fontSize: '9px',
                            backgroundColor: '#BF4E30',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            flexShrink: 0
                          }}>
                            VOS
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', color: '#7A7364', marginTop: '2px' }}>
                        {u.email}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {(() => { const s = getRolStyle(u.rol); return (
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                            fontSize: '10px', fontWeight: '600',
                            backgroundColor: s.bg, color: s.text, border: `1.5px solid ${s.border}`,
                            textTransform: 'uppercase'
                          }}>{getRolLabel(u.rol)}</span>
                        )})()}
                        <span style={{
                          fontSize: '10px', backgroundColor: '#FEF3C7', color: '#92400E',
                          padding: '2px 8px', borderRadius: '9999px',
                          fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                          letterSpacing: '0.5px', fontWeight: '600'
                        }}>
                          ⚠️ Sin ficha
                        </span>
                        {(isSuperAdmin || isAdministrador) && (
                          <span style={{
                            fontSize: '10px', backgroundColor: '#F3ECD8', color: '#7A7364',
                            padding: '2px 8px', borderRadius: '9999px',
                            fontFamily: 'Oswald, sans-serif',
                            letterSpacing: '0.5px', fontWeight: '500',
                            border: '1px solid #D1C9B4'
                          }}>
                            🕒 {formatFechaHora(u.ultimo_acceso)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'flex-start' }}>
                      {(isSuperAdmin || puedeHacer('editar_adultos')) && (
                        <button
                          onClick={() => crearFichaDesdeUsuario(u)}
                          style={{
                            backgroundColor: '#C48A2A', color: 'white',
                            padding: '6px 12px', borderRadius: '6px',
                            border: 'none', cursor: 'pointer',
                            fontFamily: 'Oswald, sans-serif',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            fontSize: '10px', fontWeight: '600'
                          }}
                        >
                          ➕ Crear ficha
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edición inline de rol (para usuarios huérfanos) */}
                  {puedeEditarRoles && (
                    <div style={{ width: '100%', paddingTop: '8px', borderTop: '1px dashed #D1C9B4' }}>
                      {editandoEste ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <select value={rolEdit} onChange={(e) => setRolEdit(e.target.value)} style={selectStyle}>
                            {ROLES_OPCIONES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={cancelarEdicionRol} style={btnCancelar}>Cancelar</button>
                            <button onClick={() => guardarRol(u.id)} disabled={guardandoId === u.id} style={btnGuardar}>
                              {guardandoId === u.id ? 'Guardando...' : '💾 Guardar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => iniciarEdicionRol(u.id, u.rol)} style={btnMiniEditar}>✏️ Editar rol</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            // ============ DIRIGENTE CON FICHA ============
            const d = item.data
            const nombreCompleto = `${d.apellido}${d.apellido && d.nombre ? ', ' : ''}${d.nombre}`
            const sinCuenta = !d.usuario_id
            const editandoEste = d.usuario_id && editandoRolId === d.usuario_id

            return (
              <div key={d.id} style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
                padding: '14px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px solid #D1C9B4',
                opacity: d.activo ? 1 : 0.65
              }}>
                {/* Fila superior: clickeable para ir a ficha */}
                <div
                  onClick={() => navigate(`/adultos/${d.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    backgroundColor: d.tipo === 'dirigente' ? '#24352A' : '#C48A2A',
                    color: '#F3ECD8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: '700',
                    fontFamily: 'Oswald, sans-serif',
                    flexShrink: 0, overflow: 'hidden'
                  }}>
                    {(d.foto_url || d.cuenta_foto_url) ? (
                      <img 
                        src={d.foto_url || d.cuenta_foto_url || ''} 
                        alt={nombreCompleto} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      `${d.nombre?.charAt(0) || ''}${d.apellido?.charAt(0) || ''}`.toUpperCase()
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Oswald, sans-serif', fontWeight: '600', fontSize: '15px',
                      color: '#24352A', textTransform: 'uppercase', letterSpacing: '0.5px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreCompleto}</span>
                      {d.usuario_id === profile?.id && (
                        <span style={{
                          fontSize: '9px',
                          backgroundColor: '#BF4E30',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontWeight: '700',
                          letterSpacing: '0.5px',
                          flexShrink: 0
                        }}>
                          VOS
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', color: '#7A7364', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span>{d.tipo === 'dirigente' ? '🧑‍🏫 Dirigente' : '🧑 Adulto'}</span>
                      {d.rama_asignada && <span>· {d.rama_asignada}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {d.cuenta_rol && (() => { const s = getRolStyle(d.cuenta_rol); return (
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                          fontSize: '10px', fontWeight: '600',
                          backgroundColor: s.bg, color: s.text, border: `1.5px solid ${s.border}`,
                          textTransform: 'uppercase'
                        }}>{getRolLabel(d.cuenta_rol)}</span>
                      )})()}
                      {sinCuenta && (
                        <span style={{
                          fontSize: '10px', backgroundColor: '#FEF3C7', color: '#92400E',
                          padding: '2px 8px', borderRadius: '9999px',
                          fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                          letterSpacing: '0.5px', fontWeight: '600'
                        }}>
                          🔗 Sin cuenta
                        </span>
                      )}
                      {!d.activo && (
                        <span style={{
                          fontSize: '10px', backgroundColor: '#E5E7EB', color: '#4B5563',
                          padding: '2px 8px', borderRadius: '9999px',
                          fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase',
                          letterSpacing: '0.5px', fontWeight: '600'
                        }}>
                          Inactivo
                        </span>
                      )}
                      {(isSuperAdmin || isAdministrador) && d.cuenta_ultimo_acceso && (
                        <span style={{
                          fontSize: '10px', backgroundColor: '#F3ECD8', color: '#7A7364',
                          padding: '2px 8px', borderRadius: '9999px',
                          fontFamily: 'Oswald, sans-serif',
                          letterSpacing: '0.5px', fontWeight: '500',
                          border: '1px solid #D1C9B4'
                        }}>
                          🕒 {formatFechaHora(d.cuenta_ultimo_acceso)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, color: '#7A7364', fontSize: '18px' }}>›</div>
                </div>

                {/* Edición inline de rol (solo si tiene cuenta y sos SuperAdmin) */}
                {puedeEditarRoles && d.usuario_id && (
                  <div style={{ paddingTop: '8px', borderTop: '1px dashed #E8DEC4' }}>
                    {editandoEste ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select value={rolEdit} onChange={(e) => setRolEdit(e.target.value)} style={selectStyle}>
                          {ROLES_OPCIONES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={cancelarEdicionRol} style={btnCancelar}>Cancelar</button>
                          <button onClick={() => guardarRol(d.usuario_id!)} disabled={guardandoId === d.usuario_id} style={btnGuardar}>
                            {guardandoId === d.usuario_id ? 'Guardando...' : '💾 Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => iniciarEdicionRol(d.usuario_id!, d.cuenta_rol || '')} style={btnMiniEditar}>✏️ Editar rol</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// ESTILOS REUTILIZABLES
// ============================================
const labelForm: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  color: '#7A7364',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'Oswald, sans-serif'
}

const inputForm: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '2px solid #D1C9B4',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  boxSizing: 'border-box'
}
const selectStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '14px',
  border: '2px solid #D1C9B4',
  borderRadius: '8px',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: 'white',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  outline: 'none',
  cursor: 'pointer'
}

const btnCancelar: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '11px',
  backgroundColor: '#E8DEC4',
  color: '#24352A',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 600
}

const btnGuardar: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '11px',
  backgroundColor: '#24352A',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 600
}

const btnMiniEditar: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '10px',
  backgroundColor: '#F3ECD8',
  color: '#24352A',
  border: '1.5px solid #D1C9B4',
  borderRadius: '5px',
  cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  fontWeight: 600
}

const btnMiniDesactivar: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '10px',
  backgroundColor: '#FEE2E2',
  color: '#BF4E30',
  border: '1.5px solid #FECACA',
  borderRadius: '5px',
  cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  fontWeight: 600
}

const btnMiniActivar: React.CSSProperties = {
  ...btnMiniDesactivar,
  backgroundColor: '#D1FAE5',
  color: '#5C7A5E',
  border: '1.5px solid #A7F3D0'
}