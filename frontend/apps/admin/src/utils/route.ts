/** 判断路径是否为无需登录的公开页面（取件页、登录页）。 */
export function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/mail/')) return true;
  if (pathname === '/login' || pathname.startsWith('/login/') || pathname === '/login-out') return true;
  return false;
}
