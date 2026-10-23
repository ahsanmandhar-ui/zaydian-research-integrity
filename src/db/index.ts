import Dexie, { type Table } from 'dexie'

export type RoleName = 'admin' | 'researcher' | 'reviewer' | 'viewer'

export interface Role { id?: number; name: RoleName; permissions: string[] }
export interface User { id?: number; email: string; displayName: string; passwordHash: string; salt: string; roleId: number; createdAt: number; revokedAt?: number }
export interface Invitation { id?: number; code: string; email: string; roleId: number; createdBy: number; createdAt: number; expiresAt: number; acceptedBy?: number; revokedAt?: number }
export interface Session { id?: number; userId: number; token: string; createdAt: number; expiresAt: number }
export interface Project { id?: number; name: string; description?: string; ownerId: number; createdAt: number; updatedAt: number }
export interface Membership { id?: number; projectId: number; userId: number; role: string; createdAt: number }
export interface ProjectLink { id?: number; projectId: number; label: string; url: string; createdBy: number; createdAt: number }
export interface Variable { id?: number; projectId: number; name: string; type: 'numeric' | 'string' | 'date' | 'boolean'; label?: string; missingValues?: string[]; order: number; createdAt: number; updatedAt: number }
export interface DataRecord { id?: number; projectId: number; rowIndex: number; values: Record<string, unknown>; createdAt: number; updatedAt: number }
export interface Version { id?: number; projectId: number; versionNumber: number; snapshot: unknown; createdBy: number; createdAt: number; event: 'save' | 'submit' | 'publish' }
export interface Submission { id?: number; projectId: number; versionId: number; submittedBy: number; submittedAt: number; status: 'submitted' | 'accepted' | 'rejected' }
export interface Vote { id?: number; projectId: number; userId: number; decision: 'approve' | 'reject' | 'abstain'; comment?: string; createdAt: number; supersedes?: number }
export interface SyncOperation { id?: number; deviceId: string; entityType: string; entityId: string; op: 'create' | 'update' | 'delete'; payload: unknown; createdAt: number; appliedAt?: number }
export interface Peer { id?: number; deviceId: string; publicKey: string; pairedAt: number; revokedAt?: number }
export interface ConflictRecord { id?: number; entityType: string; entityId: string; field: string; localValue: unknown; remoteValue: unknown; status: 'open' | 'resolved'; createdAt: number; resolvedAt?: number }
export interface PublishedItem { id?: number; projectId: number; versionId: number; publishedBy: number; publishedAt: number }
export interface DepartmentDashboard { id?: number; department: string; config: unknown; createdAt: number; updatedAt: number }

export interface AuditEntry { id?: number; entityType: string; entityId: string; action: string; actorId?: number; details?: unknown; createdAt: number }

export class ZriDatabase extends Dexie {
  projects!: Table<Project, number>
  memberships!: Table<Membership, number>
  projectLinks!: Table<ProjectLink, number>
  roles!: Table<Role, number>
  users!: Table<User, number>
  invitations!: Table<Invitation, number>
  sessions!: Table<Session, number>
  variables!: Table<Variable, number>
  records!: Table<DataRecord, number>
  versions!: Table<Version, number>
  submissions!: Table<Submission, number>
  votes!: Table<Vote, number>
  syncOperations!: Table<SyncOperation, number>
  peers!: Table<Peer, number>
  conflicts!: Table<ConflictRecord, number>
  publishedItems!: Table<PublishedItem, number>
  departmentDashboards!: Table<DepartmentDashboard, number>
  auditLog!: Table<AuditEntry, number>

  constructor() {
    super('zri')
    this.version(1).stores({ projects: '++id, name, createdAt' })
    this.version(2).stores({
      projects: '++id, name, createdAt',
      roles: '++id, &name',
      users: '++id, &email, roleId, revokedAt',
      invitations: '++id, &code, email, roleId, createdBy, acceptedBy, revokedAt',
      sessions: '++id, &token, userId, expiresAt',
    })
    this.version(3).stores({
      projects: '++id, name, ownerId, createdAt, updatedAt',
      memberships: '++id, projectId, userId, role',
      projectLinks: '++id, projectId, createdBy, createdAt',
      roles: '++id, &name',
      users: '++id, &email, roleId, revokedAt',
      invitations: '++id, &code, email, roleId, createdBy, acceptedBy, revokedAt',
      sessions: '++id, &token, userId, expiresAt',
      variables: '++id, projectId, name, order, createdAt, updatedAt',
      records: '++id, projectId, rowIndex, createdAt, updatedAt',
      versions: '++id, projectId, versionNumber, createdBy, createdAt',
      submissions: '++id, projectId, versionId, submittedBy, submittedAt, status',
      votes: '++id, projectId, userId, createdAt',
      syncOperations: '++id, deviceId, entityType, entityId, createdAt, appliedAt',
      peers: '++id, deviceId, pairedAt, revokedAt',
      conflicts: '++id, entityType, entityId, status, createdAt',
      publishedItems: '++id, projectId, versionId, publishedBy, publishedAt',
      departmentDashboards: '++id, department, createdAt, updatedAt',
    })
    this.version(4).stores({
      auditLog: '++id, entityType, entityId, actorId, createdAt',
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
