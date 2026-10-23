import { db, DEFAULT_ROLES, type User, type Role, type Invitation } from '../db'

const SESSION_KEY = 'zri.session.token'

function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function ensureRoles(): Promise<void> {
  const count = await db.roles.count()
  if (count === 0) {
    await db.roles.bulkAdd(DEFAULT_ROLES as Role[])
  }
}

export async function getRoleByName(name: string): Promise<Role | undefined> {
  return db.roles.where('name').equals(name).first()
}

export async function registerFirstAdmin(email: string, displayName: string, password: string): Promise<User> {
  await ensureRoles()
  const existing = await db.users.count()
  if (existing > 0) throw new Error('registration closed: users already exist')
  const adminRole = await getRoleByName('admin')
  if (!adminRole?.id) throw new Error('admin role missing')
  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)
  const id = await db.users.add({
    email: email.toLowerCase(),
    displayName,
    passwordHash,
    salt,
    roleId: adminRole.id,
    createdAt: Date.now(),
  })
  const user = await db.users.get(id)
  if (!user) throw new Error('failed to create user')
  return user
}

export async function login(email: string, password: string): Promise<User> {
  await ensureRoles()
  const user = await db.users.where('email').equals(email.toLowerCase()).first()
  if (!user || user.revokedAt) throw new Error('invalid credentials')
  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) throw new Error('invalid credentials')
  const token = randomHex(32)
  await db.sessions.add({
    userId: user.id!,
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  })
  localStorage.setItem(SESSION_KEY, token)
  return user
}

export async function currentUser(): Promise<User | null> {
  const token = localStorage.getItem(SESSION_KEY)
  if (!token) return null
  const session = await db.sessions.where('token').equals(token).first()
  if (!session || session.expiresAt < Date.now()) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  const user = await db.users.get(session.userId)
  if (!user || user.revokedAt) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return user
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem(SESSION_KEY)
  if (token) await db.sessions.where('token').equals(token).delete()
  localStorage.removeItem(SESSION_KEY)
}

export async function createInvitation(createdBy: number, email: string, roleName: string): Promise<Invitation> {
  await ensureRoles()
  const role = await getRoleByName(roleName)
  if (!role?.id) throw new Error('unknown role')
  const code = randomHex(8).toUpperCase()
  const id = await db.invitations.add({
    code,
    email: email.toLowerCase(),
    roleId: role.id,
    createdBy,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  })
  const inv = await db.invitations.get(id)
  if (!inv) throw new Error('failed to create invitation')
  return inv
}

export async function acceptInvitation(code: string, displayName: string, password: string): Promise<User> {
  await ensureRoles()
  const inv = await db.invitations.where('code').equals(code.toUpperCase()).first()
  if (!inv || inv.revokedAt || inv.acceptedBy || inv.expiresAt < Date.now()) {
    throw new Error('invalid or expired invitation')
  }
  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)
  const id = await db.users.add({
    email: inv.email,
    displayName,
    passwordHash,
    salt,
    roleId: inv.roleId,
    createdAt: Date.now(),
  })
  await db.invitations.update(inv.id!, { acceptedBy: id })
  const user = await db.users.get(id)
  if (!user) throw new Error('failed to create user')
  return user
}

export async function revokeUser(userId: number): Promise<void> {
  await db.users.update(userId, { revokedAt: Date.now() })
  await db.sessions.where('userId').equals(userId).delete()
}

export async function revokeInvitation(invitationId: number): Promise<void> {
  await db.invitations.update(invitationId, { revokedAt: Date.now() })
}

export async function hasPermission(user: User | null, permission: string): Promise<boolean> {
  if (!user) return false
  const role = await db.roles.get(user.roleId)
  if (!role) return false
  if (role.permissions.includes('*')) return true
  return role.permissions.includes(permission)
}
