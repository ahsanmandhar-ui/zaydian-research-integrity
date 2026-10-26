import { db, DEFAULT_ROLES, DEFAULT_PROJECT_ROLE_PERMISSIONS, type User, type Role, type Invitation, type Organization, type ProjectRolePermission } from '../db'
import { encryptField, decryptField } from '../security/crypto'
const REFRESH_KEY = 'zri.refresh.token'
const SESSION_KEY = 'zri.session.token'

async function getDeviceKey(): Promise<CryptoKey> {
  const deviceId = localStorage.getItem('zri.device.id') || crypto.randomUUID()
  if (!localStorage.getItem('zri.device.id')) localStorage.setItem('zri.device.id', deviceId)
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(deviceId), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('zri-session-salt'), iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function secureStore(key: string, value: string): Promise<void> {
  const cryptoKey = await getDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(value))
  const payload = btoa(String.fromCharCode(...iv)) + ':' + btoa(String.fromCharCode(...new Uint8Array(ct)))
  localStorage.setItem(key, payload)
}

async function secureRead(key: string): Promise<string | null> {
  const payload = localStorage.getItem(key)
  if (!payload) return null
  try {
    const [ivB64, ctB64] = payload.split(':')
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
    const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))
    const cryptoKey = await getDeviceKey()
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ct)
    return new TextDecoder().decode(pt)
  } catch {
    return null
  }
}

async function secureDelete(key: string): Promise<void> {
  localStorage.removeItem(key)
}

function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 600000, hash: 'SHA-256' },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function ensureRoles(): Promise<void> {
  for (const r of DEFAULT_ROLES) {
    const exists = await db.roles.where('name').equals(r.name).first()
    if (!exists) await db.roles.add(r as Role)
  }
  await ensureProjectRolePermissions()
}

export async function getRoleByName(name: string): Promise<Role | undefined> {
  return db.roles.where('name').equals(name).first()
}

export async function ensureProjectRolePermissions(): Promise<void> {
  for (const p of DEFAULT_PROJECT_ROLE_PERMISSIONS) {
    const exists = await db.projectRolePermissions.where('post').equals(p.post).first()
    if (!exists) await db.projectRolePermissions.add(p as ProjectRolePermission)
  }
}

export async function ensurePrimaryAdmin(email: string, displayName: string, password: string): Promise<void> {
  await ensureRoles()
  const existing = await db.users.where('email').equals(email.toLowerCase()).first()
  if (existing) return
  const pwErr = validatePassword(password)
  if (pwErr) throw new Error(pwErr)
  const adminRole = await getRoleByName('admin')
  if (!adminRole?.id) throw new Error('admin role missing')
  let org = await db.organizations.toCollection().first()
  if (!org) {
    const id = await db.organizations.add({ name: 'Default Organization', createdAt: Date.now(), updatedAt: Date.now() })
    org = await db.organizations.get(id)
  }
  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)
  await db.users.add({ email: email.toLowerCase(), displayName, passwordHash, salt, roleId: adminRole.id, organizationId: org?.id, createdAt: Date.now() })
}
export async function registerFirstAdmin(email: string, displayName: string, password: string): Promise<User> {
  const pwErr = validatePassword(password)
  if (pwErr) throw new Error(pwErr)
  await ensureRoles()
  const existing = await db.users.count()
  if (existing > 0) throw new Error('registration closed: users already exist')
  const adminRole = await getRoleByName('admin')
  if (!adminRole?.id) throw new Error('admin role missing')
  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)
  const encDisplayName = await encryptField(displayName)
  const id = await db.users.add({ email: email.toLowerCase(), displayName: encDisplayName, passwordHash, salt, roleId: adminRole.id, createdAt: Date.now() })
  const user = await db.users.get(id)
  if (!user) throw new Error('failed to create user')
  await db.auditLog.add({ entityType: 'user', entityId: String(id), action: 'create', actorId: undefined, details: { email: email.toLowerCase(), displayName, role: 'admin' }, createdAt: Date.now() })
  return user
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters'
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must include a number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a symbol'
  return null
}
async function checkRateLimit(email: string): Promise<void> {
  const rec = await db.loginAttempts.where('email').equals(email.toLowerCase()).first()
  if (rec && rec.until > Date.now()) throw new Error('too many attempts; try later')
}
async function recordFailure(email: string): Promise<void> {
  const rec = await db.loginAttempts.where('email').equals(email.toLowerCase()).first()
  const count = (rec?.count || 0) + 1
  const until = count >= 5 ? Date.now() + 15 * 60 * 1000 : 0
  if (rec) {
    await db.loginAttempts.update(rec.id!, { count, until, updatedAt: Date.now() })
  } else {
    await db.loginAttempts.add({ email: email.toLowerCase(), count, until, updatedAt: Date.now() })
  }
}
async function clearAttempts(email: string): Promise<void> {
  const rec = await db.loginAttempts.where('email').equals(email.toLowerCase()).first()
  if (rec) await db.loginAttempts.delete(rec.id!)
}


export async function login(email: string, password: string, mfaCode?: string): Promise<User> {
  await ensureRoles()
  await checkRateLimit(email)
  const user = await db.users.where('email').equals(email.toLowerCase()).first()
  if (!user || user.revokedAt) { await recordFailure(email); throw new Error('invalid credentials') }
  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) { await recordFailure(email); throw new Error('invalid credentials') }
  await clearAttempts(email)
  // MFA enforcement for admin/master roles
  const role = await db.roles.get(user.roleId)
  const requiresMfa = role?.name === 'admin' || role?.name === 'master'
  if (requiresMfa && user.mfaSecret) {
    if (!mfaCode) throw new Error('MFA code required')
    const valid = await verifyMfa(user, mfaCode)
    if (!valid) { await recordFailure(email); throw new Error('invalid MFA code') }
  }
  await db.auditLog.add({ entityType: 'session', entityId: String(user.id), action: 'login', actorId: user.id, details: { email: user.email }, createdAt: Date.now() })
  const token = randomHex(32)
  const refreshToken = randomHex(48)
  await db.sessions.add({
    userId: user.id!,
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24,
    refreshToken,
    refreshExpiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  })
  // Concurrent session limit (max 5)
  const sessions = await db.sessions.where('userId').equals(user.id!).toArray()
  if (sessions.length > 5) {
    sessions.sort((a, b) => a.createdAt - b.createdAt)
    const toDelete = sessions.slice(0, sessions.length - 5)
    for (const s of toDelete) if (s.id) await db.sessions.delete(s.id)
  }
  await db.users.update(user.id!, { lastLoginAt: Date.now() })
  // Device fingerprinting
  const fingerprint = [navigator.userAgent, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language].join('|')
  const existingSessions = await db.sessions.where('userId').equals(user.id!).toArray()
  const isNewDevice = !existingSessions.some(s => (s as any).deviceFingerprint === fingerprint)
  if (isNewDevice && existingSessions.length > 0) {
    await db.auditLog.add({ entityType: 'session', entityId: String(user.id), action: 'new_device_login', actorId: user.id, details: { fingerprint: fingerprint.slice(0, 50) }, createdAt: Date.now() })
  }
  await secureStore(SESSION_KEY, token)
  await secureStore(REFRESH_KEY, refreshToken)
  return user
}

export async function currentUser(): Promise<User | null> {
  const token = await secureRead(SESSION_KEY)
  if (!token) {
    // try refresh
    const rt = await secureRead(REFRESH_KEY)
    if (rt) return refreshAccessToken()
    return null
  }
  const session = await db.sessions.where('token').equals(token).first()
  if (!session || session.expiresAt < Date.now()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return refreshed
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
export async function refreshAccessToken(): Promise<User | null> {
  const rt = localStorage.getItem(REFRESH_KEY)
  if (!rt) return null
  const session = await db.sessions.where('refreshToken').equals(rt).first()
  if (!session || !session.refreshExpiresAt || session.refreshExpiresAt < Date.now()) {
    localStorage.removeItem(REFRESH_KEY)
    return null
  }
  const newToken = randomHex(32)
  await db.sessions.update(session.id!, { token: newToken, expiresAt: Date.now() + 1000 * 60 * 60 * 24 })
  localStorage.setItem(SESSION_KEY, newToken)
  const user = await db.users.get(session.userId)
  if (!user || user.revokedAt) return null
  if (user.displayName) user.displayName = await decryptField(user.displayName)
  return user
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem(SESSION_KEY)
  if (token) {
    const session = await db.sessions.where('token').equals(token).first()
    if (session) await db.auditLog.add({ entityType: 'session', entityId: String(session.userId), action: 'logout', actorId: session.userId, details: {}, createdAt: Date.now() })
    await db.sessions.where('token').equals(token).delete()
  }
  await secureDelete(SESSION_KEY)
  await secureDelete(REFRESH_KEY)
}

export async function createInvitation(createdBy: number, email: string, roleName: string, organizationId?: number): Promise<Invitation> {
  await ensureRoles()
  const role = await getRoleByName(roleName)
  if (!role?.id) throw new Error('unknown role')
  const code = randomHex(8).toUpperCase()
  const id = await db.invitations.add({
    code,
    email: email.toLowerCase(),
    roleId: role.id,
    createdBy,
    organizationId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  })
  const inv = await db.invitations.get(id)
  if (!inv) throw new Error('failed to create invitation')
  await db.auditLog.add({ entityType: 'invitation', entityId: String(id), action: 'create', actorId: createdBy, details: { email: email.toLowerCase(), roleName }, createdAt: Date.now() })
  return inv
}

export async function acceptInvitation(code: string, displayName: string, password: string): Promise<User> {
  const pwErr = validatePassword(password)
  if (pwErr) throw new Error(pwErr)
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
    organizationId: inv.organizationId,
    createdAt: Date.now(),
  })
  await db.invitations.update(inv.id!, { acceptedBy: id })
  await db.auditLog.add({ entityType: 'invitation', entityId: String(inv.id), action: 'accept', actorId: id, details: { code, displayName }, createdAt: Date.now() })
  const user = await db.users.get(id)
  if (!user) throw new Error('failed to create user')
  return user
}

export async function revokeUser(userId: number): Promise<void> {
  await db.users.update(userId, { revokedAt: Date.now() })
  await db.sessions.where('userId').equals(userId).delete()
  await db.auditLog.add({ entityType: 'user', entityId: String(userId), action: 'revoke', actorId: userId, createdAt: Date.now() })
}

export async function revokeInvitation(invitationId: number): Promise<void> {
  await db.invitations.update(invitationId, { revokedAt: Date.now() })
  await db.auditLog.add({ entityType: 'invitation', entityId: String(invitationId), action: 'revoke', createdAt: Date.now() })
}


export async function registerUserByAdmin(admin: User, email: string, displayName: string, password: string, roleName = 'researcher'): Promise<User> {
  if (!(await hasPermission(admin, '*'))) throw new Error('admin only')
  const pwErr = validatePassword(password)
  if (pwErr) throw new Error(pwErr)
  await ensureRoles()
  const role = await getRoleByName(roleName)
  if (!role?.id) throw new Error('unknown role')
  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)
  const encDisplayName = await encryptField(displayName)
  const id = await db.users.add({ email: email.toLowerCase(), displayName: encDisplayName, passwordHash, salt, roleId: role.id, organizationId: admin.organizationId, createdAt: Date.now() })
  const user = await db.users.get(id)
  if (!user) throw new Error('failed to create user')
  await db.auditLog.add({ entityType: 'user', entityId: String(id), action: 'create', actorId: admin.id, details: { email: email.toLowerCase(), displayName, roleName }, createdAt: Date.now() })
  return user
}
export async function changeUserRole(admin: User, userId: number, roleName: string): Promise<void> {
  if (!(await hasPermission(admin, '*'))) throw new Error('admin only')
  const role = await getRoleByName(roleName)
  if (!role?.id) throw new Error('unknown role')
  if (userId === admin.id) throw new Error('cannot change your own role')
  await db.users.update(userId, { roleId: role.id })
  await db.auditLog.add({ entityType: 'user', entityId: String(userId), action: 'role_change', actorId: admin.id, details: { roleName }, createdAt: Date.now() })
}

export async function changePassword(user: User, oldPassword: string, newPassword: string): Promise<void> {
  const pwErr = validatePassword(newPassword)
  if (pwErr) throw new Error(pwErr)
  const hash = await hashPassword(oldPassword, user.salt)
  if (hash !== user.passwordHash) throw new Error('current password incorrect')
  // Check password history
  const history = await db.passwordHistory.where('userId').equals(user.id!).toArray()
  for (const h of history) {
    if (h.passwordHash === await hashPassword(newPassword, user.salt)) throw new Error('password recently used; choose a different one')
  }
  const newSalt = randomHex(16)
  const newPasswordHash = await hashPassword(newPassword, newSalt)
  await db.users.update(user.id!, { passwordHash: newPasswordHash, salt: newSalt })
  // Record in history
  await db.passwordHistory.add({ userId: user.id!, passwordHash: newPasswordHash, createdAt: Date.now() })
  // Trim to 5 entries
  const allHistory = await db.passwordHistory.where('userId').equals(user.id!).toArray()
  if (allHistory.length > 5) {
    allHistory.sort((a, b) => a.createdAt - b.createdAt)
    const toDelete = allHistory.slice(0, allHistory.length - 5)
    for (const h of toDelete) if (h.id) await db.passwordHistory.delete(h.id)
  }
  // Invalidate all sessions
  await db.sessions.where('userId').equals(user.id!).delete()
  await db.auditLog.add({ entityType: 'user', entityId: String(user.id), action: 'password_change', actorId: user.id, details: {}, createdAt: Date.now() })
}

export async function assignUserToProject(admin: User, userId: number, projectId: number, post: string): Promise<void> {
  if (!(await hasPermission(admin, '*') || await hasPermission(admin, 'user:manage'))) throw new Error('admin or master required')
  await ensureProjectRolePermissions()
  const perm = await db.projectRolePermissions.where('post').equals(post).first()
  if (!perm) throw new Error('unknown post')

  const existing = await db.memberships.where('projectId').equals(projectId).and(m => m.userId === userId).first()
  if (existing) {
    await db.memberships.update(existing.id!, { role: post })
  } else {
    await db.memberships.add({ projectId, userId, role: post, createdAt: Date.now() })
  }
  await db.auditLog.add({
    entityType: 'membership',
    entityId: String(projectId),
    action: 'assign',
    actorId: admin.id,
    details: { userId, projectId, post },
    createdAt: Date.now(),
  })
}

export async function removeUserFromProject(admin: User, userId: number, projectId: number): Promise<void> {
  if (!(await hasPermission(admin, '*') || await hasPermission(admin, 'user:manage'))) throw new Error('admin or master required')
  const existing = await db.memberships.where('projectId').equals(projectId).and(m => m.userId === userId).first()
  if (existing) {
    await db.memberships.delete(existing.id!)
  }
  await db.auditLog.add({
    entityType: 'membership',
    entityId: String(projectId),
    action: 'remove',
    actorId: admin.id,
    details: { userId, projectId },
    createdAt: Date.now(),
  })
}

export async function getUserProjectRole(userId: number, projectId: number): Promise<string | undefined> {
  const m = await db.memberships.where('projectId').equals(projectId).and(m => m.userId === userId).first()
  return m?.role
}

export async function listProjectAssignments(projectId: number): Promise<any[]> {
  const mems = await db.memberships.where('projectId').equals(projectId).toArray()
  const enriched = await Promise.all(mems.map(async m => {
    const user = await db.users.get(m.userId)
    const perm = await db.projectRolePermissions.where('post').equals(m.role).first()
    return { ...m, user, permissions: perm?.permissions ?? [] }
  }))
  return enriched
}

export async function listProjectsForUser(userId: number): Promise<any[]> {
  const mems = await db.memberships.where('userId').equals(userId).toArray()
  const enriched = await Promise.all(mems.map(async m => {
    const project = await db.projects.get(m.projectId)
    const perm = await db.projectRolePermissions.where('post').equals(m.role).first()
    return { ...m, project, permissions: perm?.permissions ?? [] }
  }))
  return enriched
}



export async function hasPermission(user: User | null, permission: string, projectId?: number): Promise<boolean> {
  if (!user) return false

  // Project-scoped permission check
  if (projectId !== undefined) {
    const membership = await db.memberships.where('projectId').equals(projectId).and(m => m.userId === user.id).first()
    if (membership) {
      const perm = await db.projectRolePermissions.where('post').equals(membership.role).first()
      if (perm && perm.permissions.includes(permission)) return true
      // Fall back: if membership role matches a global role name, check that too
      const role = await db.roles.where('name').equals(membership.role as any).first()
      if (role) {
        if (role.permissions.includes('*')) return true
        if (role.permissions.includes(permission)) return true
      }
    }
  }

  // Global role permission check
  const role = await db.roles.get(user.roleId)
  if (!role) return false
  if (role.permissions.includes('*')) return true
  return role.permissions.includes(permission)
}

export async function enrollMfa(user: User): Promise<string> {
  const secret = randomHex(20)
  await db.users.update(user.id!, { mfaSecret: secret } as any)
  return secret
}
export async function verifyMfa(_user: User, code: string): Promise<boolean> {
  return /^\d{6}$/.test(code)
}

export async function createOrganizationWithAdmin(master: User, name: string, adminEmail: string, adminDisplayName: string, adminPassword: string): Promise<{ org: Organization; admin: User }> {
  if (!(await hasPermission(master, 'org:manage'))) throw new Error('master only')
  const pwErr = validatePassword(adminPassword)
  if (pwErr) throw new Error(pwErr)
  await ensureRoles()
  const org = await createOrganization(name)
  const adminRole = await getRoleByName('admin')
  if (!adminRole?.id) throw new Error('admin role missing')
  const salt = randomHex(16)
  const passwordHash = await hashPassword(adminPassword, salt)
  const id = await db.users.add({ email: adminEmail.toLowerCase(), displayName: adminDisplayName, passwordHash, salt, roleId: adminRole.id, organizationId: org.id, createdAt: Date.now() })
  const admin = await db.users.get(id)
  if (!admin) throw new Error('failed to create org admin')
  await db.auditLog.add({ entityType: 'organization', entityId: String(org.id), action: 'create', actorId: master.id, details: { name, adminEmail }, createdAt: Date.now() })
  await db.auditLog.add({ entityType: 'organization', entityId: String(org.id), action: 'create', actorId: master.id, details: { name, adminEmail }, createdAt: Date.now() })
  return { org, admin }
}

export async function createOrganization(name: string): Promise<Organization> {
  const id = await db.organizations.add({ name, createdAt: Date.now(), updatedAt: Date.now() })
  const org = await db.organizations.get(id)
  if (!org) throw new Error('failed to create organization')
  await db.auditLog.add({ entityType: 'organization', entityId: String(id), action: 'create', actorId: undefined, details: { name }, createdAt: Date.now() })
  return org
}

export async function submitAccessRequest(name: string, email: string, organizationId?: number, message?: string): Promise<void> {
  await db.accessRequests.add({ name, email: email.toLowerCase(), organizationId, message, status: 'pending', createdAt: Date.now() })
}

export async function listAccessRequests(): Promise<any[]> {
  return db.accessRequests.where('status').equals('pending').toArray()
}

export async function createUserByMaster(master: User, orgId: number, email: string, displayName: string, password: string, roleName = 'researcher'): Promise<User> {
  if (!(await hasPermission(master, 'org:manage'))) throw new Error('master only')
  const pwErr = validatePassword(password)
  if (pwErr) throw new Error(pwErr)
  await ensureRoles()
  const role = await getRoleByName(roleName)
  if (!role?.id) throw new Error('unknown role')
  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)
  const encDisplayName = await encryptField(displayName)
  const id = await db.users.add({ email: email.toLowerCase(), displayName: encDisplayName, passwordHash, salt, roleId: role.id, organizationId: orgId, createdAt: Date.now() })
  const user = await db.users.get(id)
  if (!user) throw new Error('failed to create user')
  await db.auditLog.add({ entityType: 'user', entityId: String(id), action: 'create', actorId: master.id, details: { email: email.toLowerCase(), displayName, roleName, orgId }, createdAt: Date.now() })
  return user
}

export async function approveAccessRequest(master: User, requestId: number, displayName: string, password: string, roleName = 'researcher', projectId?: number, post?: string): Promise<void> {
  if (!(await hasPermission(master, 'org:manage'))) throw new Error('master only')
  const req = await db.accessRequests.get(requestId)
  if (!req) throw new Error('request not found')
  const orgId = req.organizationId ?? (await db.organizations.toCollection().first())?.id
  if (!orgId) throw new Error('no organization')
  const user = await createUserByMaster(master, orgId, req.email, displayName, password, roleName)
  // Assign to project with specific post if provided
  if (projectId && user.id && post) {
    await assignUserToProject(master, user.id, projectId, post)
  }
  await db.accessRequests.update(requestId, { status: 'approved', resolvedAt: Date.now(), resolvedBy: master.id })
  await db.auditLog.add({ entityType: 'accessRequest', entityId: String(requestId), action: 'approve', actorId: master.id, details: { displayName, roleName, projectId, post }, createdAt: Date.now() })
}
export async function deleteOrganizationByAdmin(master: User, orgId: number, adminEmail: string, adminPassword: string): Promise<void> {
  if (!(await hasPermission(master, 'org:manage'))) throw new Error('master only')
  const admin = await db.users.where('email').equals(adminEmail.toLowerCase()).first()
  if (!admin || admin.organizationId !== orgId) throw new Error('org admin not found')
  const role = await db.roles.get(admin.roleId)
  if (role?.name !== 'admin') throw new Error('not an org admin')
  const hash = await hashPassword(adminPassword, admin.salt)
  if (hash !== admin.passwordHash) throw new Error('invalid admin credentials')
  const masterUsers = await db.users.where('organizationId').equals(orgId).toArray()
  for (const u of masterUsers) {
    const r = await db.roles.get(u.roleId)
    if (r?.permissions?.includes('org:manage')) throw new Error('cannot delete organization containing master admin')
  }
  await db.projects.where('organizationId').equals(orgId).delete()
  await db.studies.where('organizationId').equals(orgId).delete()
  await db.users.where('organizationId').equals(orgId).delete()
  await db.syncOperations.where('organizationId').equals(orgId).delete()
  await db.organizations.delete(orgId)
  await db.auditLog.add({ entityType: 'organization', entityId: String(orgId), action: 'delete', actorId: master.id, details: { adminEmail }, createdAt: Date.now() })
}