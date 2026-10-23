import Dexie, { type Table } from 'dexie'

export type RoleName = 'admin' | 'researcher' | 'reviewer' | 'viewer'

export interface Role {
  id?: number
  name: RoleName
  permissions: string[]
}

export interface User {
  id?: number
  email: string
  displayName: string
  passwordHash: string
  salt: string
  roleId: number
  createdAt: number
  revokedAt?: number
}

export interface Invitation {
  id?: number
  code: string
  email: string
  roleId: number
  createdBy: number
  createdAt: number
  expiresAt: number
  acceptedBy?: number
  revokedAt?: number
}

export interface Session {
  id?: number
  userId: number
  token: string
  createdAt: number
  expiresAt: number
}

export interface Project {
  id?: number
  name: string
  createdAt: number
}

export class ZriDatabase extends Dexie {
  projects!: Table<Project, number>
  roles!: Table<Role, number>
  users!: Table<User, number>
  invitations!: Table<Invitation, number>
  sessions!: Table<Session, number>

  constructor() {
    super('zri')
    this.version(1).stores({
      projects: '++id, name, createdAt',
    })
    this.version(2).stores({
      projects: '++id, name, createdAt',
      roles: '++id, &name',
      users: '++id, &email, roleId, revokedAt',
      invitations: '++id, &code, email, roleId, createdBy, acceptedBy, revokedAt',
      sessions: '++id, &token, userId, expiresAt',
    })
  }
}

export const db = new ZriDatabase()

export const DEFAULT_ROLES: Omit<Role, 'id'>[] = [
  { name: 'admin', permissions: ['*'] },
  { name: 'researcher', permissions: ['project:read', 'project:write', 'dataset:write'] },
  { name: 'reviewer', permissions: ['project:read', 'vote:write'] },
  { name: 'viewer', permissions: ['project:read'] },
]
