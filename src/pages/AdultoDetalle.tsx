import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import FormacionDirigente from '../components/FormacionDirigente'
import { getRolLabel, ROLES_OPCIONES } from '../lib/rolesLabels'
import { formatFechaHora } from '../utils/formatFecha'
import PagosDirigente from '../components/PagosDirigente'

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
  cursos: any
  validaciones: any
  tiene_insignia_madera: boolean | null
  rama_im: string | null
  im_sistema_anterior: boolean | null
  tiene_im_gestion: boolean | null
  observaciones: string | null
  creado_en: string
  actualizado_en: string
}

type Tab = 'datos' | 'formacion' | 'pagos'

export default function AdultoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile, isSuperAdmin, isAdministrador, puedeHacer } = useAuth()

  const [dirigente, setDirigente] = useState<Dirigente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('datos')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)

  // Form state
    const [vinculando, setVinculando] = useState(false)
  const [busquedaUsuario, setBusquedaUsuario] = useState('')
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<any[]>([])
  const [buscandoUsuarios, setBuscandoUsuarios] = useState(false)
  const [vinculandoError, setVinculandoError] = useState('')
  const [cuentaEmail, setCuentaEmail] = useState('')
  const [cuentaRol, setCuentaRol] = useState('')
  const [cuentaActivo, setCuentaActivo] = useState(true)
  const [cuentaUltimoAcceso, setCuentaUltimoAcceso] = useState<string | null>(null)
  const [guardandoCuenta, setGuardandoCuenta] = useState(false)
  const [mensajeCuenta, setMensajeCuenta] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
    const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    dni: '',
    fecha_nacimiento: '',
    telefono: '',
    direccion: '',
    tipo: 'dirigente' as 'dirigente' | 'adulto',
    rol_grupo: '',
    rama_asignada: '',
    activo: true,
    observaciones: ''
  })

  // ¿Puedo editar?
  const puedeEditar =
    isSuperAdmin ||
    puedeHacer('editar_adultos') ||
    // Un dirigente puede editar su propia ficha (por ahora permitimos)
    (dirigente?.usuario_id && dirigente.usuario_id === profile?.id)

  // =========================================================
  // Cargar ficha
  // =========================================================
    useEffect(() => {
    if (!id) return
    cargarFicha()

    // 🔥 Escuchamos si la foto cambió
    window.addEventListener('foto-perfil-cambiada', cargarFicha)
    return () => window.removeEventListener('foto-perfil-cambiada', cargarFicha)
  }, [id])

  // =========================================================
  // Subir foto de perfil
  // =========================================================
  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !dirigente) return

    // Validaciones
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setMensaje({ texto: '❌ Solo se permiten imágenes (JPG, PNG, WEBP)', tipo: 'error' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMensaje({ texto: '❌ La imagen no debe superar los 5 MB', tipo: 'error' })
      return
    }

    setSubiendoFoto(true)
    setMensaje(null)

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${dirigente.id}-${Date.now()}.${ext}`
      // Usamos un bucket nuevo o el de beneficiarios
      const filePath = `dirigentes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('beneficiarios') // 👈 Usamos el bucket que ya tenés
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('beneficiarios')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('dirigentes')
        .update({ foto_url: publicUrl })
        .eq('id', dirigente.id)

      if (updateError) throw updateError

      setMensaje({ texto: '✅ Foto actualizada correctamente', tipo: 'ok' })
      await cargarFicha()
    } catch (err: any) {
      console.error('Error al subir foto:', err)
      setMensaje({ texto: '❌ Error al subir la foto: ' + err.message, tipo: 'error' })
    } finally {
      setSubiendoFoto(false)
    }
  }

  const handleEliminarFoto = async () => {
    if (!dirigente || !dirigente.foto_url) return
    if (!confirm('¿Eliminar la foto de perfil actual?')) return

    setSubiendoFoto(true)
    const { error: err } = await supabase
      .from('dirigentes')
      .update({ foto_url: null })
      .eq('id', dirigente.id)

    if (err) {
      setMensaje({ texto: '❌ Error al eliminar foto: ' + err.message, tipo: 'error' })
    } else {
      setMensaje({ texto: '✅ Foto eliminada', tipo: 'ok' })
      await cargarFicha()
    }
    setSubiendoFoto(false)
  }

    const cargarFicha = async () => {
    setCargando(true)
    setError('')
    const { data, error: err } = await supabase
      .from('dirigentes')
      .select('*')
      .eq('id', id)
      .single()

    if (err || !data) {
      console.error('Error cargando dirigente:', err)
      setError('No se pudo cargar la ficha del dirigente.')
      setCargando(false)
      return
    }

    // 🆕 Buscar foto en usuarios (igual que el Header)
    let fotoFinal = data.foto_url
    if (!fotoFinal && data.usuario_id) {
      const { data: usrData } = await supabase
        .from('usuarios')
        .select('foto_url')
        .eq('id', data.usuario_id)
        .maybeSingle()
      
      if (usrData?.foto_url) fotoFinal = usrData.foto_url
    }

    setDirigente({ 
      ...data, 
      // Si hay foto, le agregamos el anti-caché para que el navegador no muestre la vieja
      foto_url: fotoFinal ? `${fotoFinal}?t=${Date.now()}` : null 
    })
    setForm({
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      email: data.email || '',
      dni: data.dni || '',
      fecha_nacimiento: data.fecha_nacimiento || '',
      telefono: data.telefono || '',
      direccion: data.direccion || '',
      tipo: data.tipo || 'dirigente',
      rol_grupo: data.rol_grupo || '',
      rama_asignada: data.rama_asignada || '',
      activo: data.activo ?? true,
      observaciones: data.observaciones || ''
    })
    setCargando(false)
  }
  
    // =========================================================
  // Cargar datos de la cuenta de login vinculada
  // =========================================================
  const cargarCuenta = async () => {
    if (!dirigente?.usuario_id) {
      setCuentaEmail('')
      setCuentaRol('')
      setCuentaActivo(true)
      setCuentaUltimoAcceso(null)
      return
    }
    const { data, error: err } = await supabase
      .from('usuarios')
      .select('id, email, rol, activo, ultimo_acceso')
      .eq('id', dirigente.usuario_id)
      .maybeSingle()

    if (err || !data) return
    setCuentaEmail(data.email || '')
    setCuentaRol(data.rol || '')
    setCuentaActivo(data.activo !== false)
    setCuentaUltimoAcceso(data.ultimo_acceso || null)
  }

  useEffect(() => {
    if (dirigente) cargarCuenta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirigente?.usuario_id])

  // =========================================================
  // Guardar datos de la cuenta (nombre y apellido de usuarios)
  // =========================================================
 
  // =========================================================
  // Cambiar contraseña
  // =========================================================
    // =========================================================
  // Cambiar rol en la app
  // =========================================================
  const cambiarRolApp = async (nuevoRol: string) => {
    if (!dirigente?.usuario_id) return
    if (!confirm(`¿Cambiar el rol de esta cuenta a "${nuevoRol}"?\n\nEsto cambia los permisos, la rama y el cargo del dirigente.`)) return

    setGuardandoCuenta(true)
    setMensajeCuenta(null)

    // 1) Calcular la rama según el nuevo rol
    let nuevaRama: string | null = null
    if (nuevoRol.includes('Manada')) nuevaRama = 'Manada'
    else if (nuevoRol.includes('Unidad')) nuevaRama = 'Unidad Scout'
    else if (nuevoRol.includes('Caminantes')) nuevaRama = 'Caminantes'
    else if (nuevoRol.includes('Rovers')) nuevaRama = 'Rovers'

    // 2) Actualizar la tabla usuarios (rol + rama)
    const { error: errUsr } = await supabase
      .from('usuarios')
      .update({ rol: nuevoRol, rama_asignada: nuevaRama })
      .eq('id', dirigente.usuario_id)

    if (errUsr) {
      setMensajeCuenta({ texto: '❌ ' + errUsr.message, tipo: 'error' })
      setGuardandoCuenta(false)
      return
    }

    // 3) Sincronizar la ficha del dirigente (rol_grupo + rama_asignada)
    //    Convertimos el rol técnico (JefeUnidad) a un texto lindo para mostrar (Jefe de Unidad)
    const rolTexto = getRolLabel(nuevoRol).replace('Subjefe', 'Sub-Jefe')
    const { error: errDir } = await supabase
      .from('dirigentes')
      .update({
        rol_grupo: rolTexto,
        rama_asignada: nuevaRama
      })
      .eq('id', dirigente.id)

    if (errDir) {
      setMensajeCuenta({ texto: '⚠️ Rol actualizado en la cuenta, pero falló la sincronización con la ficha: ' + errDir.message, tipo: 'error' })
    } else {
      setMensajeCuenta({ texto: '✅ Rol, rama y cargo actualizados.', tipo: 'ok' })
      await cargarFicha()
    }
    setGuardandoCuenta(false)
  }

  // =========================================================
  // Activar / desactivar cuenta
  // =========================================================
  const toggleActivoCuenta = async (nuevoEstado: boolean) => {
    if (!dirigente?.usuario_id) return
    const accion = nuevoEstado ? 'activar' : 'desactivar'
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} esta cuenta?\n\n${nuevoEstado ? 'El usuario podrá volver a loguearse.' : 'El usuario NO podrá loguearse.'}`)) return

    setGuardandoCuenta(true)
    setMensajeCuenta(null)
    const { error: err } = await supabase
      .from('usuarios')
      .update({ activo: nuevoEstado })
      .eq('id', dirigente.usuario_id)

    if (err) {
      setMensajeCuenta({ texto: '❌ ' + err.message, tipo: 'error' })
    } else {
      setCuentaActivo(nuevoEstado)
      setMensajeCuenta({ texto: `✅ Cuenta ${nuevoEstado ? 'activada' : 'desactivada'}`, tipo: 'ok' })
    }
    setGuardandoCuenta(false)
  }

  // =========================================================
  // Desvincular cuenta (saca usuario_id del dirigente)
  // =========================================================
  const desvincularCuenta = async () => {
    if (!dirigente) return
    if (!confirm(`¿Desvincular esta ficha de la cuenta "${cuentaEmail}"?\n\nEl usuario va a seguir existiendo, pero no estará vinculado a este dirigente.`)) return

    setGuardandoCuenta(true)
    setMensajeCuenta(null)
    const { error: err } = await supabase
      .from('dirigentes')
      .update({ usuario_id: null })
      .eq('id', dirigente.id)

    if (err) {
      setMensajeCuenta({ texto: '❌ ' + err.message, tipo: 'error' })
    } else {
      setMensajeCuenta({ texto: '✅ Cuenta desvinculada', tipo: 'ok' })
      await cargarFicha()
    }
    setGuardandoCuenta(false)
  }
  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensajeCuenta(null)

    if (newPassword.length < 6) {
      setMensajeCuenta({ texto: '⚠️ La contraseña debe tener al menos 6 caracteres', tipo: 'error' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMensajeCuenta({ texto: '⚠️ Las contraseñas no coinciden', tipo: 'error' })
      return
    }

    setGuardandoCuenta(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err
      setMensajeCuenta({ texto: '✅ Contraseña actualizada correctamente', tipo: 'ok' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err: any) {
      setMensajeCuenta({ texto: '❌ ' + (err.message || 'Error al cambiar contraseña'), tipo: 'error' })
    } finally {
      setGuardandoCuenta(false)
    }
  }
  // =========================================================
  // Buscar usuarios para vincular
  // =========================================================
  const buscarUsuarios = async (terminoManual?: string) => {
    const termino = (terminoManual ?? busquedaUsuario).trim()
    if (!termino) return

    setBuscandoUsuarios(true)
    setVinculandoError('')
    setUsuariosEncontrados([])

    // 1) Obtener IDs de usuarios YA vinculados a OTROS dirigentes
    const { data: vinculados } = await supabase
      .from('dirigentes')
      .select('usuario_id')
      .not('usuario_id', 'is', null)

    const idsVinculados = new Set(
      (vinculados || []).map((d: any) => d.usuario_id).filter(Boolean)
    )

    // 2) Buscar usuarios por email O nombre O apellido (case-insensitive)
    const { data, error: err } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol')
      .or(`email.ilike.%${termino}%,nombre.ilike.%${termino}%,apellido.ilike.%${termino}%`)
      .limit(20)

    if (err) {
      console.error(err)
      setVinculandoError('Error buscando usuarios.')
      setBuscandoUsuarios(false)
      return
    }

    // 3) Excluir los ya vinculados a otro dirigente
    const filtrados = (data || []).filter((u: any) => !idsVinculados.has(u.id))

    setUsuariosEncontrados(filtrados)

    if (filtrados.length === 0) {
      setVinculandoError('No se encontraron usuarios disponibles con ese criterio.')
    }

    setBuscandoUsuarios(false)
  }

  // =========================================================
  // Vincular cuenta seleccionada
  // =========================================================
  const vincularCuenta = async (usuarioId: string) => {
    if (!dirigente) return
    
    // Validación extra de seguridad en frontend
    if (dirigente.usuario_id) {
      setVinculandoError('Este dirigente ya tiene una cuenta vinculada.')
      return
    }
    
    setGuardando(true) // Usamos el estado de guardando para bloquear la UI mientras procesa
    setVinculandoError('')

    const { error: err } = await supabase
      .from('dirigentes')
      .update({ usuario_id: usuarioId })
      .eq('id', dirigente.id)

    if (err) {
      console.error(err)
      setVinculandoError('Error al vincular la cuenta: ' + err.message)
    } else {
      setVinculando(false)
      setBusquedaUsuario('')
      setUsuariosEncontrados([])
      setMensaje({ texto: '✅ Cuenta vinculada exitosamente', tipo: 'ok' })
      await cargarFicha()
    }
    setGuardando(false)
  }
    // =========================================================
  // Sugerencias automáticas de usuario según nombre/apellido del dirigente
  // =========================================================
  const buscarSugerencias = async () => {
    if (!dirigente) return

    setBuscandoUsuarios(true)
    setVinculandoError('')
    setUsuariosEncontrados([])

    // 1) Obtener IDs ya vinculados a otros dirigentes
    const { data: vinculados } = await supabase
      .from('dirigentes')
      .select('usuario_id')
      .not('usuario_id', 'is', null)

    const idsVinculados = new Set(
      (vinculados || []).map((d: any) => d.usuario_id).filter(Boolean)
    )

    // 2) Traer TODOS los usuarios y hacer matching fuzzy en JS
    const { data: todosUsuarios, error: err } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol')

    if (err) {
      console.error(err)
      setVinculandoError('No se pudieron cargar los usuarios.')
      setBuscandoUsuarios(false)
      return
    }

    // 3) Normalizar strings para comparar (acentos, mayúsculas)
    const normalizar = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, '')

    const nombreDir = normalizar(dirigente.nombre)
    const apellidoDir = normalizar(dirigente.apellido)
    const tokensDir = `${nombreDir} ${apellidoDir}`.split(' ').filter(t => t.length >= 3)

    // 4) Puntuar cada usuario
    const sugerencias = (todosUsuarios || [])
      .filter((u: any) => !idsVinculados.has(u.id)) // excluir ya vinculados
      .map((u: any) => {
        const textoUsuario = normalizar(`${u.nombre || ''} ${u.apellido || ''} ${u.email || ''}`)
        let puntaje = 0

        // +1 por cada token del dirigente que aparece en el usuario
        tokensDir.forEach(token => {
          if (textoUsuario.includes(token)) puntaje += 2
        })

        // BONUS: si el email contiene apellido Y nombre juntos
        const emailNorm = normalizar(u.email || '')
        if (apellidoDir && emailNorm.includes(apellidoDir)) puntaje += 3
        if (nombreDir && emailNorm.includes(nombreDir)) puntaje += 2

        return { ...u, puntaje }
      })
      .filter((u: any) => u.puntaje >= 2) // mínimo algo de coincidencia
      .sort((a: any, b: any) => b.puntaje - a.puntaje) // mayor puntaje primero
      .slice(0, 8) // máximo 8 sugerencias

    setUsuariosEncontrados(sugerencias)

    if (sugerencias.length === 0) {
      setVinculandoError('No hay usuarios que coincidan automáticamente. Probá buscar por email manualmente.')
    }

    setBuscandoUsuarios(false)
  }

  // =========================================================
  // Guardar cambios
  // =========================================================
  // =========================================================
  // Guardar cambios
  // =========================================================
   const guardar = async () => {
    if (!dirigente) return
    setGuardando(true)
    setMensaje(null)

    const { error: err } = await supabase
      .from('dirigentes')
      .update({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim() || null,
        dni: form.dni.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        tipo: form.tipo,
        rol_grupo: form.rol_grupo.trim() || null,
        rama_asignada: form.rama_asignada || null,
        activo: form.activo,
        observaciones: form.observaciones.trim() || null
      })
      .eq('id', dirigente.id)

    if (err) {
      console.error('Error guardando:', err)
      setMensaje({ texto: '❌ ' + err.message, tipo: 'error' })
      setGuardando(false)
      return
    }

    // ✅ Sincronizar nombre y apellido en la tabla usuarios si hay cuenta vinculada
    if (dirigente.usuario_id) {
      const { error: errUsr } = await supabase
        .from('usuarios')
        .update({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim()
        })
        .eq('id', dirigente.usuario_id)

      if (errUsr) {
        // No bloqueamos el guardado principal, pero avisamos
        setMensaje({ texto: '✅ Datos guardados (⚠️ no se pudo sincronizar con la cuenta: ' + errUsr.message + ')', tipo: 'ok' })
        await cargarFicha()
        setGuardando(false)
        return
      }
    }

    setMensaje({ texto: '✅ Datos guardados correctamente', tipo: 'ok' })
    await cargarFicha()
    setGuardando(false)
  }

  // =========================================================
  // Render
  // =========================================================
  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'Oswald, sans-serif', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Cargando ficha...
      </div>
    )
  }

  if (error || !dirigente) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ fontFamily: 'Oswald, sans-serif', color: '#BF4E30', marginBottom: '24px' }}>{error || 'Ficha no encontrada'}</p>
        <button
          onClick={() => navigate('/adultos')}
          style={{ backgroundColor: '#24352A', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          ← Volver a la lista
        </button>
      </div>
    )
  }

  const nombreCompleto = `${dirigente.apellido}${dirigente.apellido && dirigente.nombre ? ', ' : ''}${dirigente.nombre}`
  const iniciales = `${dirigente.nombre?.charAt(0) || ''}${dirigente.apellido?.charAt(0) || ''}`.toUpperCase()

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        flex: '1 1 auto',
        padding: '10px 12px',
        backgroundColor: tab === t ? '#24352A' : 'transparent',
        color: tab === t ? '#F3ECD8' : '#7A7364',
        border: 'none',
        borderBottom: tab === t ? '3px solid #C48A2A' : '3px solid transparent',
        cursor: 'pointer',
        fontFamily: 'Oswald, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontSize: '12px',
        fontWeight: tab === t ? '600' : '400',
        transition: 'all 0.15s ease'
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Botón volver */}
      <button
        onClick={() => navigate('/adultos')}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#24352A',
          cursor: 'pointer',
          fontFamily: 'Oswald, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '12px',
          marginBottom: '12px',
          padding: 0
        }}
      >
        ← Volver a la lista
      </button>

      {/* Header de la ficha */}
      <div style={{
        backgroundColor: '#24352A',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#BF4E30',
            color: '#F3ECD8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: '700',
            fontFamily: 'Oswald, sans-serif',
            overflow: 'hidden'
          }}>
            {dirigente.foto_url ? (
              <img src={dirigente.foto_url} alt={nombreCompleto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              iniciales
            )}
          </div>
          
          {/* Botón de cambiar foto (cámara) */}
          {puedeEditar && (
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
          )}

          {/* Botón de eliminar foto (tachito) */}
          {puedeEditar && dirigente.foto_url && (
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
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'Oswald, sans-serif',
            color: '#F3ECD8',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '20px',
            margin: 0
          }}>
            {nombreCompleto}
          </h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#C48A2A', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
              {dirigente.tipo === 'dirigente' ? '🧑‍🏫 Dirigente' : '🧑 Adulto'}
            </span>
            {dirigente.rama_asignada && (
              <span style={{ fontSize: '11px', color: '#D1C9B4', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                · {dirigente.rama_asignada}
              </span>
            )}
            {dirigente.rol_grupo && (
              <span style={{ fontSize: '11px', color: '#D1C9B4', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                · {dirigente.rol_grupo}
              </span>
            )}
            {!dirigente.activo && (
              <span style={{ fontSize: '11px', color: '#BF4E30', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                · INACTIVO
              </span>
            )}
            {!dirigente.usuario_id && (
              <span style={{
                fontSize: '10px',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                padding: '1px 8px',
                borderRadius: '9999px',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                🔗 Sin cuenta
              </span>
            )}
          </div>
        </div>
        
        {/* Botón de vincular */}
        {(isSuperAdmin || puedeHacer('vincular_adultos')) && !dirigente.usuario_id && (
          <button
            onClick={() => {
              const nuevoEstado = !vinculando
              setVinculando(nuevoEstado)
              if (nuevoEstado) {
                // Al abrir el panel, cargar sugerencias automáticas
                setTimeout(() => buscarSugerencias(), 50)
              } else {
                // Al cerrar, limpiar
                setUsuariosEncontrados([])
                setBusquedaUsuario('')
                setVinculandoError('')
              }
            }}
            style={{
              backgroundColor: vinculando ? '#BF4E30' : '#C48A2A',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '11px',
              fontWeight: '600',
              flexShrink: 0,
              marginLeft: 'auto'
            }}
          >
            {vinculando ? 'Cancelar' : '🔗 Vincular cuenta'}
          </button>
        )}
      </div>

      {/* Panel de vinculación inline */}
      {vinculando && (
        <div style={{
          backgroundColor: '#F3ECD8',
          border: '2px solid #D1C9B4',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontFamily: 'Oswald, sans-serif', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px', margin: '0 0 12px 0' }}>
            🔗 Vincular con cuenta de usuario
          </h3>
          
          {vinculandoError && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#BF4E30', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontFamily: 'Oswald, sans-serif' }}>
              {vinculandoError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Buscar por email, nombre o apellido..."
              value={busquedaUsuario}
              onChange={(e) => setBusquedaUsuario(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarUsuarios()}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '14px',
                border: '2px solid #D1C9B4',
                borderRadius: '8px',
                outline: 'none',
                fontFamily: 'Oswald, sans-serif',
                backgroundColor: 'white'
              }}
            />
            <button
              onClick={() => buscarUsuarios()}
              disabled={buscandoUsuarios || !busquedaUsuario.trim()}
              style={{
                backgroundColor: '#24352A',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: buscandoUsuarios ? 'wait' : 'pointer',
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '12px',
                fontWeight: '600',
                opacity: buscandoUsuarios ? 0.6 : 1
              }}
            >
              {buscandoUsuarios ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {usuariosEncontrados.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {usuariosEncontrados.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'white',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1C9B4'
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: '600', fontSize: '13px', color: '#24352A' }}>
                      {u.nombre} {u.apellido}
                    </div>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '11px', color: '#7A7364' }}>
                      {u.email} · {u.rol}
                    </div>
                  </div>
                  <button
                    onClick={() => vincularCuenta(u.id)}
                    style={{
                      backgroundColor: '#C48A2A',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Oswald, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    Vincular
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {!buscandoUsuarios && busquedaUsuario.trim() && usuariosEncontrados.length === 0 && !vinculandoError && (
             <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', color: '#7A7364', textAlign: 'center', marginTop: '12px' }}>
               No se encontraron usuarios con ese email.
             </div>
          )}
        </div>
      )}
      <div style={{
        display: 'flex',
        backgroundColor: 'white',
        borderRadius: '12px 12px 0 0',
        border: '2px solid #D1C9B4',
        borderBottom: 'none',
        overflow: 'hidden'
      }}>
        {tabBtn('datos', 'Datos')}
        {tabBtn('formacion', 'Formación')}
        {tabBtn('pagos', 'Pagos')}
      </div>

      {/* Contenido */}
      <div style={{
        backgroundColor: 'white',
        border: '2px solid #D1C9B4',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        padding: '20px'
      }}>
        {/* Mensaje */}
        {mensaje && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontFamily: 'Oswald, sans-serif',
            backgroundColor: mensaje.tipo === 'error' ? '#FEE2E2' : '#D1FAE5',
            color: mensaje.tipo === 'error' ? '#BF4E30' : '#5C7A5E',
            border: `1px solid ${mensaje.tipo === 'error' ? '#FECACA' : '#A7F3D0'}`
          }}>
            {mensaje.texto}
          </div>
        )}

        {tab === 'datos' && (
          <>
            <DatosPersonales
              form={form}
              setForm={setForm}
              puedeEditar={puedeEditar}
              guardando={guardando}
              onGuardar={guardar}
            />

            {/* ===================== */}
            {/* MI CUENTA (login)     */}
            {/* ===================== */}
            <div style={{
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '2px dashed #D1C9B4'
            }}>
              <h3 style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '13px',
                color: '#24352A',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '0 0 16px 0',
                fontWeight: '700'
              }}>
                🔐 Mi Cuenta (Login)
              </h3>

              {!dirigente.usuario_id ? (
                <div style={{
                  backgroundColor: '#FEF3C7',
                  border: '2px solid #FDE68A',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: '#92400E',
                  fontFamily: 'Oswald, sans-serif'
                }}>
                  Este dirigente todavía no tiene una cuenta de usuario vinculada. Cuando la vincules, acá vas a ver el email y podrás gestionar la contraseña.
                </div>
              ) : (
                <>
                  {mensajeCuenta && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '12px',
                      fontFamily: 'Oswald, sans-serif',
                      backgroundColor: mensajeCuenta.tipo === 'error' ? '#FEE2E2' : '#D1FAE5',
                      color: mensajeCuenta.tipo === 'error' ? '#BF4E30' : '#5C7A5E',
                      border: `1px solid ${mensajeCuenta.tipo === 'error' ? '#FECACA' : '#A7F3D0'}`
                    }}>
                      {mensajeCuenta.texto}
                    </div>
                  )}

                  <div style={{
                    fontSize: '11px',
                    color: '#7A7364',
                    fontFamily: 'Oswald, sans-serif',
                    marginBottom: '14px',
                    fontStyle: 'italic'
                  }}>
                    El nombre y apellido de la cuenta se sincronizan automáticamente con los datos personales (pestaña Datos, arriba).
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelCuenta}>Email de login (no se puede cambiar)</label>
                    <input
                      type="email"
                      value={cuentaEmail}
                      disabled
                      style={{
                        ...inputCuenta(false),
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelCuenta}>Rol en la app</label>
                    <input
                      type="text"
                      value={getRolLabel(cuentaRol)}
                      disabled
                      style={{
                        ...inputCuenta(false),
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
 
                  {/* ============================================ */}
                  {/* ADMINISTRACIÓN (solo SuperAdmin / Administrador) */}
                  {/* ============================================ */}
                  {(isSuperAdmin || isAdministrador) && (
                    <div style={{
                      marginTop: '24px',
                      paddingTop: '20px',
                      borderTop: '2px dashed #C48A2A'
                    }}>
                      <h4 style={{
                        fontFamily: 'Oswald, sans-serif',
                        fontSize: '13px',
                        color: '#C48A2A',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        margin: '0 0 14px 0',
                        fontWeight: '700'
                      }}>
                        ⚙️ Administración de la cuenta
                      </h4>

                      {/* Cargo en el grupo (rol_grupo) */}
                      <div style={{ marginBottom: '14px', maxWidth: '400px' }}>
                        <label style={labelCuenta}>Cargo en el grupo (texto a mostrar)</label>
                        <input
                          type="text"
                          value={form.rol_grupo}
                          onChange={(e) => setForm({ ...form, rol_grupo: e.target.value })}
                          onBlur={async (e) => {
                            if (form.rol_grupo === (dirigente?.rol_grupo || '')) return
                            setGuardandoCuenta(true)
                            const { error: err } = await supabase
                              .from('dirigentes')
                              .update({ rol_grupo: e.target.value.trim() || null })
                              .eq('id', dirigente.id)
                            if (err) setMensajeCuenta({ texto: '❌ ' + err.message, tipo: 'error' })
                            else setMensajeCuenta({ texto: '✅ Cargo actualizado', tipo: 'ok' })
                            setGuardandoCuenta(false)
                            await cargarFicha()
                          }}
                          placeholder="Ej: Jefe de Unidad, Secretario, etc."
                          style={inputCuenta(true)}
                        />
                        <div style={{ fontSize: '10px', color: '#7A7364', marginTop: '4px', fontStyle: 'italic' }}>
                          Este cargo se actualiza automáticamente al cambiar el "Rol en la app". Editalo solo si querés un texto distinto.
                        </div>
                      </div>
                      
                      {/* Rol en la app */}
                      <div style={{ marginBottom: '14px', maxWidth: '400px' }}>
                        <label style={labelCuenta}>Rol en la app</label>
                        <select
                          value={cuentaRol}
                          onChange={(e) => cambiarRolApp(e.target.value)}
                          disabled={guardandoCuenta}
                          style={{
                            ...inputCuenta(true),
                            cursor: guardandoCuenta ? 'wait' : 'pointer'
                          }}
                        >
                          {ROLES_OPCIONES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Último acceso */}
                      <div style={{ marginBottom: '14px', maxWidth: '400px' }}>
                        <label style={labelCuenta}>Último acceso</label>
                        <div style={{
                          ...inputCuenta(false),
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          {cuentaUltimoAcceso
                            ? formatFechaHora(cuentaUltimoAcceso)
                            : '— Sin registro —'}
                        </div>
                      </div>

                      {/* Activo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <input
                          type="checkbox"
                          id="cuentaActivo"
                          checked={cuentaActivo}
                          onChange={(e) => toggleActivoCuenta(e.target.checked)}
                          disabled={guardandoCuenta}
                          style={{ width: '18px', height: '18px', cursor: guardandoCuenta ? 'wait' : 'pointer', accentColor: '#24352A' }}
                        />
                        <label htmlFor="cuentaActivo" style={{
                          fontFamily: 'Oswald, sans-serif',
                          fontSize: '12px',
                          color: '#24352A',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          cursor: guardandoCuenta ? 'wait' : 'pointer'
                        }}>
                          Cuenta activa (puede loguearse)
                        </label>
                      </div>

                      {/* Desvincular */}
                      <button
                        onClick={desvincularCuenta}
                        disabled={guardandoCuenta}
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#BF4E30',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '2px solid #FECACA',
                          cursor: guardandoCuenta ? 'wait' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'Oswald, sans-serif',
                          opacity: guardandoCuenta ? 0.6 : 1
                        }}
                      >
                        🔓 Desvincular cuenta
                      </button>
                    </div>
                  )}
                  {/* Cambiar contraseña: SOLO si sos el propio usuario */}
                  {profile?.id === dirigente.usuario_id && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #D1C9B4' }}>
                      <h4 style={{
                        fontFamily: 'Oswald, sans-serif',
                        fontSize: '12px',
                        color: '#24352A',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        margin: '0 0 10px 0',
                        fontWeight: '600'
                      }}>
                        🔒 Cambiar contraseña
                      </h4>

                      {!showPasswordForm ? (
                        <button
                          onClick={() => setShowPasswordForm(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#24352A',
                            fontSize: '12px',
                            fontFamily: 'Oswald, sans-serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            padding: 0
                          }}
                        >
                          Cambiar contraseña →
                        </button>
                      ) : (
                        <form onSubmit={cambiarPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                          <div>
                            <label style={labelCuenta}>Nueva contraseña</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              minLength={6}
                              required
                              style={inputCuenta(true)}
                            />
                          </div>
                          <div>
                            <label style={labelCuenta}>Confirmar contraseña</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              style={inputCuenta(true)}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="submit"
                              disabled={guardandoCuenta}
                              style={{
                                backgroundColor: '#24352A',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: guardandoCuenta ? 'wait' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontFamily: 'Oswald, sans-serif',
                                opacity: guardandoCuenta ? 0.6 : 1
                              }}
                            >
                              {guardandoCuenta ? 'Cambiando...' : 'Cambiar'}
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
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: '2px solid #D1C9B4',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontFamily: 'Oswald, sans-serif'
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {tab === 'formacion' && (
          <FormacionDirigente
            dirigenteId={dirigente.id}
            puedeEditar={isSuperAdmin || puedeHacer('editar_formacion_adultos')}
          />
        )}

        {tab === 'pagos' && (
          <PagosDirigente
            dirigenteId={dirigente.id}
            puedeEditar={isSuperAdmin || isAdministrador || puedeHacer('editar_pagos_adultos')}
          />
        )}

      </div>
    </div>
  )
}

// =========================================================
// SUB-COMPONENTE: Datos personales
// =========================================================
function DatosPersonales({
  form,
  setForm,
  puedeEditar,
  guardando,
  onGuardar
}: {
  form: any
  setForm: (f: any) => void
  puedeEditar: boolean
  guardando: boolean
  onGuardar: () => void
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '2px solid #D1C9B4',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'Oswald, sans-serif',
    backgroundColor: puedeEditar ? 'white' : '#F3F4F6',
    color: puedeEditar ? '#24352A' : '#6B7280',
    cursor: puedeEditar ? 'text' : 'not-allowed',
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#7A7364',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: 'Oswald, sans-serif'
  }

  const field = (label: string, key: string, type = 'text', opts?: any) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={form[key] || ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        disabled={!puedeEditar}
        style={inputStyle}
        {...(opts || {})}
      />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {field('Nombre', 'nombre')}
        {field('Apellido', 'apellido')}
        {field('Email', 'email', 'email')}
        {field('DNI', 'dni')}
        {field('Fecha de nacimiento', 'fecha_nacimiento', 'date')}
        {field('Teléfono', 'telefono', 'tel')}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Dirección</label>
        <input
          type="text"
          value={form.direccion || ''}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          disabled={!puedeEditar}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            disabled={!puedeEditar}
            style={inputStyle}
          >
            <option value="dirigente">Dirigente</option>
            <option value="adulto">Adulto</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Rama asignada</label>
          <div style={{
            ...inputStyle,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F9F6EE',
            cursor: 'default',
            color: form.rama_asignada ? '#24352A' : '#7A7364',
            fontStyle: form.rama_asignada ? 'normal' : 'italic'
          }}>
            {form.rama_asignada || '— Sin rama (se asigna según el rol) —'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Observaciones</label>
        <textarea
          value={form.observaciones || ''}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          disabled={!puedeEditar}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <input
          type="checkbox"
          id="activo"
          checked={!!form.activo}
          onChange={(e) => setForm({ ...form, activo: e.target.checked })}
          disabled={!puedeEditar}
          style={{ width: '18px', height: '18px', cursor: puedeEditar ? 'pointer' : 'not-allowed' }}
        />
        <label htmlFor="activo" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#24352A', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: puedeEditar ? 'pointer' : 'not-allowed' }}>
          Activo en el grupo
        </label>
      </div>

      {puedeEditar ? (
        <button
          onClick={onGuardar}
          disabled={guardando}
          style={{
            backgroundColor: '#24352A',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: guardando ? 'wait' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: 'Oswald, sans-serif',
            opacity: guardando ? 0.6 : 1
          }}
        >
          {guardando ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      ) : (
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '12px', color: '#7A7364', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 0' }}>
          🔒 No tenés permisos para editar esta ficha
        </div>
      )}
    </div>
  )
}

// =========================================================
// SUB-COMPONENTE: Placeholder para pestañas futuras
// =========================================================
function PlaceholderTab({ emoji, titulo, descripcion }: { emoji: string; titulo: string; descripcion: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>{emoji}</div>
      <h3 style={{ fontFamily: 'Oswald, sans-serif', color: '#24352A', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '16px', marginBottom: '8px' }}>
        {titulo}
      </h3>
      <p style={{ fontFamily: 'Oswald, sans-serif', color: '#7A7364', fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
        {descripcion}
      </p>
    </div>
  )
}
const labelCuenta: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: '600',
  color: '#7A7364',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'Oswald, sans-serif'
}

const inputCuenta = (editable: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '2px solid #D1C9B4',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'Oswald, sans-serif',
  backgroundColor: editable ? 'white' : '#F3F4F6',
  color: editable ? '#24352A' : '#6B7280',
  cursor: editable ? 'text' : 'not-allowed',
  boxSizing: 'border-box'
})