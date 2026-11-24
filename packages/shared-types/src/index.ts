// ==========================================
// User Roles & Organization Membership
// ==========================================
export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  ORG_OWNER = 'ORG_OWNER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  AUDITOR = 'AUDITOR',
}

export enum OrgMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

// ==========================================
// Project & Milestone Statuses
// ==========================================
export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum MilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

// ==========================================
// Task & Subtask Enums
// ==========================================
export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ==========================================
// Audit & Activity Logging
// ==========================================
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
}

export enum EntityType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  TEAM = 'TEAM',
  PROJECT = 'PROJECT',
  MILESTONE = 'MILESTONE',
  TASK = 'TASK',
  SUBTASK = 'SUBTASK',
  COMMENT = 'COMMENT',
  ATTACHMENT = 'ATTACHMENT',
  WORKFLOW = 'WORKFLOW',
}

// ==========================================
// Workflow Automation
// ==========================================
export enum WorkflowTrigger {
  TASK_CREATED = 'TASK_CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DUE_DATE_APPROACHING = 'DUE_DATE_APPROACHING',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
}

export enum WorkflowActionType {
  AUTO_ASSIGN = 'AUTO_ASSIGN',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  UPDATE_STATUS = 'UPDATE_STATUS',
  ADD_TAG = 'ADD_TAG',
}

// ==========================================
// Notification Channel & Types
// ==========================================
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_STATUS_UPDATED = 'TASK_STATUS_UPDATED',
  TASK_CONFLICT = 'TASK_CONFLICT',
  COMMENT_ADDED = 'COMMENT_ADDED',
  INVITATION_RECEIVED = 'INVITATION_RECEIVED',
  DUE_DATE_REMINDER = 'DUE_DATE_REMINDER',
}

// ==========================================
// Core Entities & DTOs
// ==========================================
export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDTO {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export interface ProjectDTO {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  targetDate?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneDTO {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: MilestoneStatus;
  dueDate?: string | null;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  organizationId: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  reporterId: string;
  version: number; // For Optimistic Concurrency Control
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubtaskDTO {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface CommentDTO {
  id: string;
  organizationId: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AuditLogDTO {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  timestamp: string;
}

// ==========================================
// API Response Wrapper
// ==========================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  requestId?: string;
}

// ==========================================
// Authentication Payload & Tokens
// ==========================================
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  organizationSlug?: string | null;
}
