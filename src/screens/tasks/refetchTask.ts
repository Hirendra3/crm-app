import { api } from '../../api/client';
import type { Task } from '../../types/task';
import type { UserRole } from '../../types/user';

const MAX_PAGES = 20;

function listEndpointAndLimit(role: UserRole | undefined): { endpoint: string; limit: number } | null {
  if (!role) return null;
  if (role === 'ADMIN' || role === 'HR') return { endpoint: '/api/tasks/all', limit: 100 };
  if (role === 'LEADER') return { endpoint: '/api/tasks/team', limit: 100 };
  return { endpoint: '/api/tasks/my', limit: 50 };
}

/** Paginate list APIs until `taskId` is found (no GET-by-id route). */
export async function refetchFullTask(opts: {
  role: UserRole | undefined;
  leaderDeptId: string;
  taskId: string;
}): Promise<Task | null> {
  const spec = listEndpointAndLimit(opts.role);
  if (!spec) return null;
  const params: Record<string, string> = { limit: String(spec.limit) };
  if (opts.role === 'LEADER' && opts.leaderDeptId) params.departmentId = opts.leaderDeptId;

  let before: string | null = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const p = { ...params };
    if (before) p.before = before;
    const res = await api.get<{ tasks: Task[]; nextBefore: string | null }>(spec.endpoint, { params: p });
    const tasks = res.data.tasks ?? [];
    const found = tasks.find(t => String(t._id) === String(opts.taskId));
    if (found) return found as Task;
    before = res.data.nextBefore ?? null;
    if (!before) break;
  }
  return null;
}
