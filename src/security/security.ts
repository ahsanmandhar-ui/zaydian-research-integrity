import DOMPurify from 'dompurify'

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'password must include an uppercase letter'
  if (!/[0-9]/.test(password)) return 'password must include a number'
  return null
}

export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt
}

