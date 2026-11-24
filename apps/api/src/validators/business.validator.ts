import { z } from 'zod';
import { ProjectStatus, TaskStatus, TaskPriority, MilestoneStatus, OrgMemberRole } from '@worksphere/shared-types';

// ==========================================
// Organization & Team Validators
// ==========================================
export const updateOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    role: z.nativeEnum(OrgMemberRole).default(OrgMemberRole.MEMBER),
  }),
});

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Team name is required').trim(),
    description: z.string().optional(),
  }),
});

// ==========================================
// Project & Milestone Validators
// ==========================================
export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name is required').trim(),
    key: z.string().min(2).max(10).toUpperCase().trim(),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).default(ProjectStatus.ACTIVE),
    startDate: z.string().datetime().optional(),
    targetDate: z.string().datetime().optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: z.string().datetime().nullable().optional(),
    targetDate: z.string().datetime().nullable().optional(),
  }),
});

export const createMilestoneSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    title: z.string().min(2, 'Milestone title is required').trim(),
    description: z.string().optional(),
    status: z.nativeEnum(MilestoneStatus).default(MilestoneStatus.NOT_STARTED),
    dueDate: z.string().datetime().optional(),
  }),
});

// ==========================================
// Task Validators (OCC Capstone)
// ==========================================
export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    milestoneId: z.string().uuid().optional(),
    title: z.string().min(2, 'Task title is required').trim(),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
    priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
    assigneeId: z.string().uuid().optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    milestoneId: z.string().uuid().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    // REQUIRED FOR OPTIMISTIC CONCURRENCY CONTROL:
    version: z.number().int().positive({ message: 'Version is required for concurrency control' }),
  }),
});

export const queryTasksSchema = z.object({
  query: z.object({
    projectId: z.string().uuid().optional(),
    milestoneId: z.string().uuid().optional(),
    assigneeId: z.string().uuid().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// ==========================================
// Comment & Subtask Validators
// ==========================================
export const addCommentSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    content: z.string().min(1, 'Comment cannot be empty').trim(),
  }),
});

export const addSubtaskSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Subtask title is required').trim(),
  }),
});
