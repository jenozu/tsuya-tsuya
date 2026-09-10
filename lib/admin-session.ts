export function hasAdminSession(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || ''
  return cookieHeader.split(';').some((part) => {
    const [name, ...rest] = part.trim().split('=')
    if (name !== 'admin_session') return false
    try {
      return decodeURIComponent(rest.join('=')) === 'authenticated'
    } catch {
      return false
    }
  })
}
