/** Mirrors crm-web/src/types.ts Task model for API payloads. */

import type { UserRole } from './user';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'REOPENED';

export type TaskComment = {
  userId: string | { _id?: string; name?: string; email?: string };
  text: string;
  createdAt: string;
};

export type TaskMailHistoryEntry = {
  _id: string;
  kind: 'sent_user' | 'sent_system';
  fromUserId?: string;
  fromLabel?: string;
  toEmails: string[];
  subject: string;
  preview: string;
  at: string;
};

export type Task = {
  _id: string;
  title: string;
  description: string;
  assignedBy: unknown;
  assignedTo?: unknown;
  assignees?: unknown[];
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  completionNote?: string;
  rejectionReason?: string;
  comments?: TaskComment[];
  mailHistory?: TaskMailHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
};

export function assigneeUsersOf(task: Task): unknown[] {
  if (Array.isArray(task.assignees) && task.assignees.length > 0) return task.assignees;
  if (task.assignedTo) return [task.assignedTo];
  return [];
}

export function userIdOf(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const u = value as { _id?: string; id?: string };
  return String(u.id ?? u._id ?? '');
}

export function userName(value: unknown): string {
  if (!value) return 'Unknown user';
  if (typeof value === 'string') return value;
  const u = value as { name?: string; email?: string; id?: string; _id?: string };
  return u.name ?? u.email ?? u.id ?? u._id ?? 'Unknown user';
}

export function assigneeLabel(task: Task): string {
  const users = assigneeUsersOf(task);
  if (users.length === 0) return '—';
  return users.map(userName).join(', ');
}

export function isMine(task: Task, userId: string | undefined): boolean {
  if (!userId) return false;
  return assigneeUsersOf(task).some(u => userIdOf(u) === userId);
}

export function isAssigner(task: Task, userId: string | undefined): boolean {
  if (!userId) return false;
  return userIdOf(task.assignedBy) === userId;
}

export function canAssign(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'HR' || role === 'LEADER';
}

export function canManageLifecycle(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'HR' || role === 'LEADER';
}

/** Match web TasksPage line ~810: !HR && (ADMIN || LEADER || mine). API may allow assigner; UI matches web. */
export function canCommentOnTask(task: Task, role: UserRole | undefined, userId: string | undefined): boolean {
  if (role === 'HR') return false;
  if (role === 'ADMIN' || role === 'LEADER') return true;
  return isMine(task, userId);
}

/** Web ties task email visibility to the same gate as comments (line ~819). */
export function canSendTaskEmail(task: Task, role: UserRole | undefined, userId: string | undefined): boolean {
  return canCommentOnTask(task, role, userId);
}

export function canMemberUpdateStatus(
  task: Task,
  role: UserRole | undefined,
  userId: string | undefined,
): boolean {
  if (role === 'HR') return false;
  return isMine(task, userId);
}
