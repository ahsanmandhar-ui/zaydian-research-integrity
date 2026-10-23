export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'password must include an uppercase letter'
  if (!/[0-9]/.test(password)) return 'password must include a number'
  return null
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>"'`]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c] || c))
}

export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt
}
