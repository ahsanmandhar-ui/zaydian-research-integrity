import Dexie, { type Table } from 'dexie'

export interface AccessRequest { id?: number; name: string; email: string; organizationId?: number; message?: string; status: 'pending' | 'approved' | 'rejected'; createdAt: number; resolvedAt?: number; resolvedBy?: number }
export interface Organization { id?: number; name: string; createdAt: number; updatedAt: number }
export type RoleName = 'master' | 'admin' | 'researcher' | 'reviewer' | 'viewer' | 'team_lead'

export interface Role { id?: number; name: RoleName; permissions: string[] }
export interface User { id?: number; organizationId?: number; email: string; displayName: string; passwordHash: string; salt: string; roleId: number; createdAt: number; revokedAt?: number; lastLoginAt?: number; mfaSecret?: string; lastSeenAt?: number }
export interface Invitation { id?: number; organizationId?: number; code: string; email: string; roleId: number; createdBy: number; createdAt: number; expiresAt: number; acceptedBy?: number; revokedAt?: number }
export interface Session { id?: number; userId: number; token: string; createdAt: number; expiresAt: number; refreshToken?: string; refreshExpiresAt?: number }
export interface Project { id?: number; organizationId?: number; name: string; description?: string; ownerId: number; trackingId?: string; targetSampleSize?: number; documents?: Record<string,string>; locked?: boolean; createdAt: number; updatedAt: number }
export interface CompletedDataset { id?: number; projectId: number; organizationId: number; completedBy: number; completedAt: number; cryptoKey: string; topicName: string; participants: string; authors: { name: string; role: string; email: string }[]; conflictOfInterest: string; sponsors: string; studyLocation: string; editCount: number; editHistory: { editedAt: number; editedBy: number; changedFields: string[] }[]; version: number; supersededBy?: number; locked: boolean }
export interface CompletionKey { id?: number; cryptoKey: string; completedDatasetId: number; createdAt: number; supersededBy?: number; supersededAt?: number }
export interface Membership { id?: number; projectId: number; userId: number; role: string; createdAt: number }
export interface ProjectRolePermission { id?: number; post: string; permissions: string[] }
export interface LoginAttempt { id?: number; email: string; count: number; until: number; updatedAt: number }
export interface PasswordHistory { id?: number; userId: number; passwordHash: string; createdAt: number }
export interface ProjectLink { id?: number; projectId: number; label: string; url: string; createdBy: number; createdAt: number }
export interface Variable { id?: number; projectId: number; name: string; type: 'numeric' | 'string' | 'date' | 'boolean'; label?: string; missingValues?: string[]; order: number; createdAt: number; updatedAt: number }
export interface DataRecord { id?: number; projectId: number; rowIndex: number; values: Record<string, unknown>; cellMeta?: Record<string, { createdBy: number; createdAt: number; history: { userId: number; at: number; value: unknown }[] }>; createdAt: number; updatedAt: number }
export interface Version { id?: number; projectId: number; versionNumber: number; snapshot: unknown; createdBy: number; createdAt: number; event: 'save' | 'submit' | 'publish' }
export interface Submission { id?: number; projectId: number; versionId: number; submittedBy: number; submittedAt: number; status: 'submitted' | 'accepted' | 'rejected' }
export interface Vote { id?: number; projectId: number; userId: number; decision: 'approve' | 'reject' | 'abstain'; comment?: string; createdAt: number; supersedes?: number }
export interface SyncOperation { id?: number; organizationId?: number; deviceId: string; entityType: string; entityId: string; op: 'create' | 'update' | 'delete'; payload: unknown; createdAt: number; appliedAt?: number }
export interface Peer { id?: number; deviceId: string; publicKey: string; pairedAt: number; revokedAt?: number }
export interface ConflictRecord { id?: number; entityType: string; entityId: string; field: string; localValue: unknown; remoteValue: unknown; status: 'open' | 'resolved'; createdAt: number; resolvedAt?: number }
export interface Study { id?: number; organizationId?: number; studyId: string; trackingId?: string; publicationType?: 'meta-analysis'|'narrative-review'|'systematic-review'|'rct'|'cohort'|'case-report'|'other'; title: string; primaryDepartment: string; collaboratingDepartments?: string; firstAuthor: string; currentPhase: string; synopsisStatus: string; manuscriptStructure: string; submissionStatus: string; abstractSubmissionDate?: string; fullTextSubmissionDate?: string; targetVenue?: string; presentationType?: string; ethicsApproval?: boolean; coiDeclared?: boolean; authorContributions?: boolean; dataAvailability?: boolean; consentObtained?: boolean; consentDate?: string; withdrawn?: boolean; withdrawalDate?: string; createdBy?: number; updatedBy?: number; createdAt: number; updatedAt: number }
export interface PublishedItem { id?: number; projectId: number; versionId: number; publishedBy: number; publishedAt: number }
export interface Department { id?: number; name: string; createdAt: number }
export interface DepartmentDashboard { id?: number; department: string; config: unknown; createdAt: number; updatedAt: number }

export interface PublishedRecord { id?: number; studyId?: string; trackingId?: string; title: string; firstAuthor: string; authors?: {name:string; email:string; institution?:string}[]; primaryDepartment: string; collaboratingDepartments?: string; journal: string; publicationDate: string; doi?: string; takeaway?: string; createdBy?: number; updatedBy?: number; createdAt: number; updatedAt: number }
export interface StudyComment { id?: number; studyId: string; text: string; author?: string; parentId?: number; mentions?: string[]; editedAt?: number; editedBy?: string; deleted?: boolean; createdAt: number }
export interface CourierEnvelope { id?: number; envId: string; ttl: number; seen: string[]; payload: string; createdAt: number }
export interface ChatMessage { id?: number; projectId: string; authorId: string; text: string; createdAt: number; deletedAt?: number; deletedBy?: string; mentions?: number[]; deliveredTo?: number[]; seenBy?: number[] }
export interface ActivityEntry { id?: number; type: string; entityType: string; entityId: string; userId?: number; payload?: unknown; createdAt: number }
export interface AuditEntry { id?: number; entityType: string; entityId: string; action: string; actorId?: number; details?: unknown; createdAt: number; previousHash?: string; hash?: string }

export class ZriDatabase extends Dexie {
  organizations!: Table<Organization, number>
  accessRequests!: Table<AccessRequest, number>
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
  studies!: Table<Study, number>
  publishedRecords!: Table<PublishedRecord, number>
  departments!: Table<Department, number>
  departmentDashboards!: Table<DepartmentDashboard, number>
  auditLog!: Table<AuditEntry, number>
  studyComments!: Table<StudyComment, number>
  activity!: Table<ActivityEntry, number>
  chatMessages!: Table<ChatMessage, number>
  courierCache!: Table<CourierEnvelope, number>
  projectRolePermissions!: Table<ProjectRolePermission, number>
  loginAttempts!: Table<LoginAttempt, number>
  passwordHistory!: Table<PasswordHistory, number>
  completedDatasets!: Table<CompletedDataset, number>
  completionKeys!: Table<CompletionKey, number>


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
    this.version(5).stores({
      studies: '++id, studyId, primaryDepartment, firstAuthor, submissionStatus, createdAt',
    })
    this.version(6).stores({
      publishedRecords: '++id, studyId, primaryDepartment, firstAuthor, publicationDate, createdAt',
    })
    this.version(7).stores({
      records: '++id, projectId, rowIndex, createdAt, updatedAt',
    })
    this.version(8).stores({
      departments: '++id, &name',
    })
    this.version(10).stores({
      studyComments: '++id, studyId, parentId, createdAt',
      activity: '++id, entityType, entityId, createdAt',
    })
    this.version(11).stores({
      sessions: '++id, &token, refreshToken, userId, expiresAt',
    })
    this.version(12).stores({
      projects: '++id, name, ownerId, trackingId, createdAt, updatedAt',
    })
    this.version(13).stores({
      courierCache: '++id, envId, createdAt',
    })

    this.version(14).stores({
      chatMessages: '++id, projectId, createdAt',
    })
    this.version(15).stores({
      chatMessages: '++id, projectId, createdAt',
      users: '++id, &email, roleId, revokedAt, lastSeenAt',
    })
    this.version(16).stores({
      chatMessages: '++id, projectId, createdAt',
    })
    this.version(17).stores({
      organizations: '++id, name, createdAt, updatedAt',
      users: '++id, &email, roleId, organizationId, revokedAt, lastSeenAt',
      projects: '++id, name, ownerId, trackingId, organizationId, createdAt, updatedAt',
      studies: '++id, studyId, organizationId, primaryDepartment, firstAuthor, submissionStatus, createdAt',
    })
    this.version(18).stores({
      syncOperations: '++id, deviceId, organizationId, entityType, entityId, createdAt, appliedAt',
    })
    this.version(19).stores({
      accessRequests: '++id, email, organizationId, status, createdAt',
    })

    this.version(20).stores({
      projectRolePermissions: '++id, &post',
    })

    this.version(21).stores({
      loginAttempts: '++id, &email, until',
    })

    this.version(22).stores({
      passwordHistory: '++id, userId, createdAt',
    })

    this.version(23).stores({
      completedDatasets: '++id, projectId, organizationId, cryptoKey, locked',
      completionKeys: '++id, &cryptoKey, completedDatasetId',
    })

  }
}

export const DEFAULT_PROJECT_ROLE_PERMISSIONS: Omit<ProjectRolePermission, 'id'>[] = [
  { post: 'data_collector', permissions: ['dataset:read', 'dataset:write:own'] },
  { post: 'analyst', permissions: ['dataset:read', 'dataset:analyze', 'export:pdf'] },
  { post: 'supervisor', permissions: ['dataset:read', 'dataset:review', 'vote:write'] },
  { post: 'manuscript_writer', permissions: ['dataset:read', 'manuscript:write'] },
  { post: 'research_head', permissions: ['dataset:read', 'dataset:write', 'published:read', 'published:write'] },
]

export const db = new ZriDatabase()

// Data-at-rest encryption: implemented at service layer (see auth.ts, Dataset.tsx)
// Dexie hooks not compatible with this Dexie version in test environment
// TODO: Implement full data-at-rest encryption using service-layer encryption


export const DEFAULT_ROLES: Omit<Role, 'id'>[] = [
  { name: 'master', permissions: ['org:manage', 'user:manage'] },
  { name: 'admin', permissions: ['*'] },
  { name: 'researcher', permissions: ['project:read', 'project:write', 'dataset:write'] },
  { name: 'reviewer', permissions: ['project:read', 'vote:write'] },
  { name: 'viewer', permissions: ['project:read'] },
  { name: 'team_lead', permissions: ['project:read', 'project:write', 'dataset:write', 'team:manage'] },
]

