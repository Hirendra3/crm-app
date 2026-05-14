import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';
import { cardShadow, headerShadow } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import {
  assigneeLabel,
  assigneeUsersOf,
  canAssign,
  type Task,
  type TaskPriority,
  userIdOf,
  userName,
} from '../types/task';
import { TaskCreateModal } from './tasks/TaskCreateModal';

type DeptOpt = { id: string; name: string };

const LIMIT = { MY: 50, TEAM: 100, ALL: 100 } as const;

type StatusFilter = 'ALL' | Task['status'];
type PriorityFilter = 'ALL' | TaskPriority;
type AssigneeFilter = 'ALL' | 'MINE' | 'OTHERS';
type SortBy = 'deadline_asc' | 'deadline_desc' | 'updated_desc';

function statusPillStyle(status: string) {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return styles.pillDone;
  if (s === 'OVERDUE') return styles.pillOverdue;
  if (s === 'IN_PROGRESS') return styles.pillProgress;
  if (s === 'REOPENED') return styles.pillReopened;
  return styles.pillPending;
}

function computeStats(tasks: Task[]) {
  return {
    total: tasks.length,
    overdue: tasks.filter(t => t.status === 'OVERDUE').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    reopened: tasks.filter(t => t.status === 'REOPENED').length,
  };
}

export function TasksScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role;
  const [items, setItems] = useState<Task[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [leaderDepts, setLeaderDepts] = useState<DeptOpt[]>([]);
  const [leaderDeptId, setLeaderDeptId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('deadline_asc');
  const [taskSearch, setTaskSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const itemsHadContentRef = useRef(false);

  const isLeader = role === 'LEADER';

  useEffect(() => {
    itemsHadContentRef.current = items.length > 0;
  }, [items.length]);

  useEffect(() => {
    if (!isLeader) return;
    void (async () => {
      try {
        const { data } = await api.get<{ departments: DeptOpt[] }>('/api/departments/mine');
        const d = data.departments ?? [];
        setLeaderDepts(d);
        if (d[0]?.id) setLeaderDeptId(d[0].id);
      } catch {
        setLeaderDepts([]);
      }
    })();
  }, [isLeader]);

  const taskEndpoint = useMemo(() => {
    if (!role) return null;
    if (role === 'ADMIN' || role === 'HR') return '/api/tasks/all' as const;
    if (role === 'LEADER') return '/api/tasks/team' as const;
    return '/api/tasks/my' as const;
  }, [role]);

  const pageLimit = useMemo(() => {
    if (role === 'MEMBER') return LIMIT.MY;
    if (role === 'LEADER') return LIMIT.TEAM;
    return LIMIT.ALL;
  }, [role]);

  const loadPage = useCallback(
    async (opts: { append: boolean; before?: string | null }) => {
      if (!role || !taskEndpoint) return;
      setError('');
      try {
        const params: Record<string, string> = { limit: String(pageLimit) };
        if (isLeader && leaderDeptId) params.departmentId = leaderDeptId;
        if (opts.before) params.before = opts.before;

        const res = await api.get<{ tasks: Task[]; nextBefore: string | null }>(taskEndpoint, { params });
        const batch = res.data.tasks ?? [];
        setNextBefore(res.data.nextBefore ?? null);
        if (opts.append) {
          setItems(prev => {
            const seen = new Set(prev.map(t => String(t._id)));
            const merged = [...prev];
            for (const t of batch) {
              const id = String(t._id);
              if (!seen.has(id)) {
                seen.add(id);
                merged.push(t);
              }
            }
            return merged;
          });
        } else {
          setItems(batch);
        }
      } catch (e) {
        setError(extractApiError(e));
        if (!opts.append) setItems([]);
      }
    },
    [role, taskEndpoint, pageLimit, isLeader, leaderDeptId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    await loadPage({ append: false, before: null });
    setLoading(false);
    setRefreshing(false);
  }, [loadPage]);

  /**
   * Refetch when this tab is focused (e.g. returning from Task detail). No task SSE on mobile — this is the
   * lightweight substitute from the plan (“poll on focus”); pull-to-refresh still forces a full reload.
   */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (!role || !taskEndpoint) return;
        const showFullSpinner = !itemsHadContentRef.current;
        if (showFullSpinner) setLoading(true);
        setError('');
        try {
          await loadPage({ append: false, before: null });
        } finally {
          if (!cancelled) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadPage, role, taskEndpoint]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void reload();
  }, [reload]);

  const onLoadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    await loadPage({ append: true, before: nextBefore });
    setLoadingMore(false);
  }, [nextBefore, loadingMore, loadPage]);

  const visibleTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    const filtered = items.filter(task => {
      if (statusFilter !== 'ALL' && String(task.status).toUpperCase() !== String(statusFilter).toUpperCase()) {
        return false;
      }
      if (priorityFilter !== 'ALL' && String(task.priority ?? '').toUpperCase() !== priorityFilter) return false;

      const assigneeIds = assigneeUsersOf(task).map(userIdOf);
      const mine = !!(user?.id && assigneeIds.some(id => String(id) === String(user.id)));
      if (assigneeFilter === 'MINE' && !mine) return false;
      if (assigneeFilter === 'OTHERS' && mine) return false;

      if (!q) return true;
      const hay =
        `${task.title} ${task.description ?? ''} ${assigneeLabel(task)} ${userName(task.assignedBy)} ${task.status} ${task.priority ?? ''}`.toLowerCase();
      return hay.includes(q);
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'updated_desc') {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return String(b._id).localeCompare(String(a._id));
      }
      if (sortBy === 'deadline_desc') return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [items, statusFilter, priorityFilter, assigneeFilter, taskSearch, user?.id, sortBy]);

  const loadedStats = useMemo(() => computeStats(items), [items]);
  const filteredStats = useMemo(() => computeStats(visibleTasks), [visibleTasks]);

  const goTask = useCallback(
    (task: Task) => {
      const root = navigation.getParent() as NativeStackNavigationProp<RootStackParamList> | null;
      root?.navigate('TaskDetail', {
        taskId: String(task._id),
        taskJson: JSON.stringify(task),
        leaderDeptId: role === 'LEADER' ? leaderDeptId : undefined,
      });
    },
    [navigation, role, leaderDeptId],
  );

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Office CRM</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Tasks</Text>
            {canAssign(role) ? (
              <TouchableOpacity style={styles.assignBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.85}>
                <Text style={styles.assignBtnTxt}>+ New</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.sub}>
            {role === 'MEMBER'
              ? 'Your assigned tasks (same list as web “My tasks”).'
              : role === 'LEADER'
                ? 'Tasks for your team members (same API as web “Team tasks”).'
                : 'Organization tasks (same as web “All tasks”).'}
          </Text>

          <View style={styles.statsWrap}>
            <Text style={styles.statsLine}>
              Loaded {loadedStats.total} · Filtered {filteredStats.total}
            </Text>
            <Text style={styles.statsLineMuted}>
              Overdue {filteredStats.overdue} · In progress {filteredStats.inProgress} · Done {filteredStats.completed}{' '}
              · Reopened {filteredStats.reopened}
            </Text>
          </View>

          <TextInput
            style={styles.search}
            value={taskSearch}
            onChangeText={setTaskSearch}
            placeholder="Search title, description, people…"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {isLeader && leaderDepts.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
            {leaderDepts.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.deptChip, leaderDeptId === d.id && styles.deptChipOn]}
                onPress={() => setLeaderDeptId(d.id)}>
                <Text style={[styles.deptChipTxt, leaderDeptId === d.id && styles.deptChipTxtOn]} numberOfLines={1}>
                  {d.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'REOPENED'] as StatusFilter[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, statusFilter === s && styles.filterChipOn]}
              onPress={() => setStatusFilter(s)}>
              <Text style={[styles.filterChipTxt, statusFilter === s && styles.filterChipTxtOn]}>
                {s === 'ALL' ? 'All status' : s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Priority</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as PriorityFilter[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, priorityFilter === s && styles.filterChipOn]}
              onPress={() => setPriorityFilter(s)}>
              <Text style={[styles.filterChipTxt, priorityFilter === s && styles.filterChipTxtOn]}>
                {s === 'ALL' ? 'All priority' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Assignee</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['ALL', 'MINE', 'OTHERS'] as AssigneeFilter[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, assigneeFilter === s && styles.filterChipOn]}
              onPress={() => setAssigneeFilter(s)}>
              <Text style={[styles.filterChipTxt, assigneeFilter === s && styles.filterChipTxtOn]}>
                {s === 'ALL' ? 'Everyone' : s === 'MINE' ? 'Mine' : "Others'"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Sort</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(
            [
              ['deadline_asc', 'Due ↑'],
              ['deadline_desc', 'Due ↓'],
              ['updated_desc', 'Updated'],
            ] as [SortBy, string][]
          ).map(([k, label]) => (
            <TouchableOpacity
              key={k}
              style={[styles.filterChip, sortBy === k && styles.filterChipOn]}
              onPress={() => setSortBy(k)}>
              <Text style={[styles.filterChipTxt, sortBy === k && styles.filterChipTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? <Text style={styles.err}>{error}</Text> : null}
      </View>
    ),
    [
      error,
      role,
      isLeader,
      leaderDepts,
      leaderDeptId,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      sortBy,
      taskSearch,
      loadedStats,
      filteredStats,
    ],
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.pad}>
        {header}
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        <TaskCreateModal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => void reload()}
          leaderDeptId={leaderDeptId}
          leaderDepts={leaderDepts}
        />
      </View>
    );
  }

  return (
    <>
      <FlatList
        ListHeaderComponent={header}
        data={visibleTasks}
        keyExtractor={it => String(it._id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => goTask(item)}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={[styles.pill, statusPillStyle(item.status)]}>
                <Text style={styles.pillTxt}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.rowMeta}>
              {item.priority ?? '—'} · Due {new Date(item.deadline).toLocaleString()}
            </Text>
            <Text style={styles.assignLine} numberOfLines={2}>
              <Text style={styles.assignLabel}>Assigner: </Text>
              {userName(item.assignedBy)}
            </Text>
            <Text style={styles.assignLine} numberOfLines={2}>
              <Text style={styles.assignLabel}>Assignees: </Text>
              {assigneeLabel(item)}
            </Text>
            {item.description ? (
              <Text style={styles.descPreview} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.tapHint}>Tap for details</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[styles.pad, styles.meta]}>No tasks match this filter.</Text>}
        ListFooterComponent={
          nextBefore ? (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => void onLoadMore()} disabled={loadingMore}>
                <Text style={styles.loadMoreTxt}>{loadingMore ? 'Loading…' : 'Load more'}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      <TaskCreateModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void reload()}
        leaderDeptId={leaderDeptId}
        leaderDepts={leaderDepts}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  headerBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  heroCard: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...headerShadow,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, flex: 1, letterSpacing: -0.5 },
  assignBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  assignBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  sub: { marginTop: 8, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  statsWrap: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statsLine: { fontSize: 13, fontWeight: '700', color: colors.text },
  statsLineMuted: { marginTop: 4, fontSize: 12, fontWeight: '600', color: colors.textMuted, lineHeight: 17 },
  search: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  filterLabel: { marginTop: 14, marginBottom: 4, fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  deptScroll: { marginTop: 12 },
  deptChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
    maxWidth: 200,
  },
  deptChipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  deptChipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  deptChipTxtOn: { color: colors.primary, fontWeight: '700' },
  filterScroll: { marginTop: 4 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
  },
  filterChipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterChipTxt: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterChipTxtOn: { color: colors.primary, fontWeight: '700' },
  err: { color: colors.error, marginTop: 10 },
  row: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  rowTitle: { flex: 1, fontWeight: '700', fontSize: 16, color: colors.text },
  rowMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 6 },
  assignLine: { fontSize: 13, color: colors.text, marginTop: 4 },
  assignLabel: { fontWeight: '700', color: colors.textMuted },
  descPreview: { marginTop: 8, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  tapHint: { fontSize: 12, color: colors.primary, marginTop: 10, fontWeight: '600' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillTxt: { fontSize: 11, fontWeight: '700', color: colors.text },
  pillPending: { backgroundColor: '#f1f5f9' },
  pillProgress: { backgroundColor: '#dbeafe' },
  pillDone: { backgroundColor: '#dcfce7' },
  pillOverdue: { backgroundColor: '#fee2e2' },
  pillReopened: { backgroundColor: '#fef3c7' },
  meta: { color: colors.textSecondary },
  footer: { padding: 16, alignItems: 'center' },
  loadMoreBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  loadMoreTxt: { fontWeight: '700', color: colors.primary },
});
