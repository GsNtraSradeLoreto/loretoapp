// ============================================
// LABELS DE ROLES (para mostrar en UI)
// Los "value" internos NO cambian (son los que usa la app).
// Solo cambia lo que ve el usuario en pantalla.
// ============================================

export const ROLES_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  Jefatura: 'Jefatura',
  Administrador: 'Administrador',
  Tesorero: 'Tesorero',
  viewer: 'Viewer',
  JefeManada: 'Jefe de Manada',
  JefeUnidad: 'Jefe de Unidad',
  JefeCaminantes: 'Jefe de Caminantes',
  JefeRovers: 'Jefe de Rovers',
  SubJefeManada: 'Subjefe de Manada',
  SubJefeUnidad: 'Subjefe de Unidad',
  SubJefeCaminantes: 'Subjefe de Caminantes',
  SubJefeRovers: 'Subjefe de Rovers',
  AyudanteManada: 'Ayudante de Manada',
  AyudanteUnidad: 'Ayudante de Unidad',
  AyudanteCaminantes: 'Ayudante de Caminantes',
  AyudanteRovers: 'Ayudante de Rovers',
}

/**
 * Devuelve el nombre "lindo" de un rol.
 * Si el rol no está en el diccionario, devuelve el valor tal cual.
 */
export function getRolLabel(rol: string | null | undefined): string {
  if (!rol) return '—'
  return ROLES_LABELS[rol] || rol
}

/**
 * Lista de roles disponibles como { value, label }, ordenados
 * para usar en <select> y tablas.
 */
export const ROLES_OPCIONES: { value: string; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'Jefatura', label: 'Jefatura' },
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Tesorero', label: 'Tesorero' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'JefeManada', label: 'Jefe de Manada' },
  { value: 'JefeUnidad', label: 'Jefe de Unidad' },
  { value: 'JefeCaminantes', label: 'Jefe de Caminantes' },
  { value: 'JefeRovers', label: 'Jefe de Rovers' },
  { value: 'SubJefeManada', label: 'Subjefe de Manada' },
  { value: 'SubJefeUnidad', label: 'Subjefe de Unidad' },
  { value: 'SubJefeCaminantes', label: 'Subjefe de Caminantes' },
  { value: 'SubJefeRovers', label: 'Subjefe de Rovers' },
  { value: 'AyudanteManada', label: 'Ayudante de Manada' },
  { value: 'AyudanteUnidad', label: 'Ayudante de Unidad' },
  { value: 'AyudanteCaminantes', label: 'Ayudante de Caminantes' },
  { value: 'AyudanteRovers', label: 'Ayudante de Rovers' },
]