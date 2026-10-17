import { Bookmark, Download, FolderOpen, Library } from 'lucide-react';

/**
 * Indica si el usuario puede subir libros (`uploader` o `admin`).
 *
 * @param {{tipo_usuario?: string, rol?: string}|null} user
 * @returns {boolean}
 */
export function canUploadBooks(user) {
  return Boolean(user) && ['uploader', 'admin'].includes(user.tipo_usuario || user.rol);
}

/**
 * Accesos de navegación (además de Inicio) según el usuario.
 *
 * @param {{tipo_usuario?: string, rol?: string}|null} user Usuario en sesión, o `null`.
 * @returns {Array<{to: string, label: string, icon: React.ComponentType<{size: number}>}>}
 */
export function getNavLinks(user) {
  const links = [
    { to: '/guardados', label: 'Guardados', icon: Bookmark },
    { to: '/carpetas', label: 'Carpetas', icon: FolderOpen },
    { to: '/descargas', label: 'Descargados', icon: Download },
  ];
  if (canUploadBooks(user)) links.push({ to: '/mis-libros', label: 'Mis libros', icon: Library });
  return links;
}
