import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, extractApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import {
  assigneeLabel,
  assigneeUsersOf,
  canAssign,
  canCommentOnTask,
  canManageLifecycle,
  canSendTaskEmail,
  isMine,
  type Task,
  type TaskPriority,
  type TaskStatus,
  userIdOf,
  userName,
} from '../../types/task';
import { refetchFullTask } from './refetchTask';

type SimpleUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  leaderIds?: string[];
  departmentId?: string | null;
  departmentIds?: string[];
};

type TaskDetailNav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type TaskDetailRoute = RouteProp<RootStackParamList, 'TaskDetail'>;

function commentAuthorLabel(meId: string | undefined, value: unknown): string {
  if (!value) return 'Unknown user';
  if (typeof value === 'string') return value === meId ? 'You' : value;
  const u = value as { _id?: string; id?: string; name?: string; email?: string };
  const id = u._id ?? u.id ?? '';
  const label = u.name ?? u.email ?? (id ? String(id) : 'Unknown user');
  return id && meId && String(id) === String(meId) ? 'You' : label;
}

function sortedMailHistory(task: Task): NonNullable<Task['mailHistory']> {
  const entries = task.mailHistory ?? [];
  return [...entries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function parseInitial(json: string): Task | null {
  try {
    const t = JSON.parse(json) as Task;
    if (t && typeof t === 'object' && t._id) return t;
  } catch {
    /* ignore */
  }
  return null;
}

export function TaskDetailScreen() {
  const navigation = useNavigation<TaskDetailNav>();
  const route = useRoute<TaskDetailRoute>();
  const { user } = useAuth();
  const role = user?.role;
  const meId = user?.id;

  const { taskId, taskJson, leaderDeptId } = route.params;

  const [task, setTask] = useState<Task | null>(() => parseInitial(taskJson));
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);

  const [commentDraft, setCommentDraft] = useState('');
  const [actionErr, setActionErr] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM');
  const [editAssignedTo, setEditAssignedTo] = useState<string[]>([]);
  const [editUsers, setEditUsers] = useState<SimpleUser[]>([]);
  const [editUsersLoading, setEditUsersLoading] = useState(false);

  const visibleEditUsers = useMemo(() => {
    let list = editUsers;
    if (role === 'ADMIN' || role === 'HR') {
      list = list.filter(u => String(u.role ?? '').toUpperCase() === 'MEMBER');
    }
    return list;
  }, [editUsers, role]);

  const [mailTo, setMailTo] = useState<'assignees' | 'assigner' | 'all'>('assignees');
  const [mailMessage, setMailMessage] = useState('');

  const mine = useMemo(() => (task && meId ? isMine(task, meId) : false), [task, meId]);
  const isHr = role === 'HR';
  const canComment = task ? canCommentOnTask(task, role, meId) : false;
  const canEmail = task ? canSendTaskEmail(task, role, meId) : false;
  const showMemberStatus = mine && !isHr && !!task;
  const showLifecycle = task && canManageLifecycle(role) && task.status === 'COMPLETED';
  const showEditDelete = task && canManageLifecycle(role);

  useLayoutEffect(() => {
    navigation.setOptions({ title: task?.title ? task.title.slice(0, 40) : 'Task' });
  }, [navigation, task?.title]);

  const syncFromServer = useCallback(async () => {
    setLoadErr('');
    try {
      const fresh = await refetchFullTask({ role, leaderDeptId: leaderDeptId ?? '', taskId });
      if (fresh) setTask(fresh);
    } catch (e) {
      setLoadErr(extractApiError(e));
    }
  }, [role, leaderDeptId, taskId]);

  useFocusEffect(
    useCallback(() => {
      void syncFromServer();
    }, [syncFromServer]),
  );

  const openEdit = useCallback(async () => {
    if (!task) return;
    setActionErr('');
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    const d = new Date(task.deadline);
    setEditDeadline(Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16));
    setEditPriority((task.priority as TaskPriority) ?? 'MEDIUM');
    setEditAssignedTo(assigneeUsersOf(task).map(userIdOf).filter(Boolean));
    setEditOpen(true);
    if (!canAssign(role)) return;
    setEditUsersLoading(true);
    try {
      if (role === 'ADMIN' || role === 'HR') {
        const { data } = await api.get<{ users: SimpleUser[] }>('/api/users');
        setEditUsers((data.users ?? []).filter(u => u.id !== meId));
      } else if (role === 'LEADER') {
        const { data } = await api.get<{ users: SimpleUser[] }>('/api/team/members');
        setEditUsers(data.users ?? []);
      }
    } catch {
      setEditUsers([]);
    } finally {
      setEditUsersLoading(false);
    }
  }, [task, role, meId]);

  const putStatus = async (status: TaskStatus, completionNote?: string) => {
    if (!task) return;
    setBusy(true);
    setActionErr('');
    try {
      const body: { status: TaskStatus; completionNote?: string } = { status };
      if (completionNote?.trim()) body.completionNote = completionNote.trim();
      const { data } = await api.put<{ task: Task }>(`/api/tasks/${task._id}/status`, body);
      if (data.task) setTask(data.task as Task);
      setCompleteOpen(false);
      setCompleteNote('');
    } catch (e) {
      setActionErr(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const postComment = async () => {
    if (!task || !commentDraft.trim()) return;
    setBusy(true);
    setActionErr('');
    try {
      const { data } = await api.post<{ task: Task }>(`/api/tasks/${task._id}/comments`, {
        text: commentDraft.trim(),
      });
      if (data.task) setTask(data.task as Task);
      setCommentDraft('');
    } catch (e) {
      setActionErr(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!task) return;
    if (!editTitle.trim() || !editDescription.trim() || !editDeadline.trim() || editAssignedTo.length === 0) {
      setActionErr('Fill title, description, deadline, and at least one assignee.');
      return;
    }
    const d = new Date(editDeadline);
    if (Number.isNaN(d.getTime())) {
      setActionErr('Invalid deadline.');
      return;
    }
    setBusy(true);
    setActionErr('');
    try {
      const { data } = await api.put<{ task: Task }>(`/api/tasks/${task._id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        deadline: d.toISOString(),
        priority: editPriority,
        assignedTo: editAssignedTo,
      });
      if (data.task) setTask(data.task as Task);
      setEditOpen(false);
    } catch (e) {
      setActionErr(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!task) return;
    setBusy(true);
    setActionErr('');
    try {
      await api.delete(`/api/tasks/${task._id}`);
      setDeleteOpen(false);
      navigation.goBack();
    } catch (e) {
      setActionErr(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const sendMail = async () => {
    if (!task) return;
    setBusy(true);
    setActionErr('');
    try {
      await api.post(`/api/tasks/${task._id}/email`, {
        to: mailTo,
        ...(mailMessage.trim() ? { message: mailMessage.trim() } : {}),
      });
      setMailOpen(false);
      setMailMessage('');
      const fresh = await refetchFullTask({ role, leaderDeptId: leaderDeptId ?? '', taskId: task._id });
      if (fresh) setTask(fresh);
    } catch (e) {
      setActionErr(extractApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleEditAssignee = (id: string) => {
    setEditAssignedTo(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Could not open this task.</Text>
        {loadErr ? <Text style={styles.err}>{loadErr}</Text> : null}
      </View>
    );
  }

  const mailRows = sortedMailHistory(task);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      {loadErr ? <Text style={styles.err}>{loadErr}</Text> : null}
      {actionErr ? <Text style={styles.err}>{actionErr}</Text> : null}

      <View style={styles.row}>
        <View style={[styles.pill, pillForStatus(task.status)]}>
          <Text style={styles.pillTxt}>{task.status}</Text>
        </View>
        <View style={[styles.pill, styles.pillPri]}>
          <Text style={styles.pillTxt}>{task.priority ?? '—'}</Text>
        </View>
      </View>

      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.meta}>
        Assigned by {userName(task.assignedBy)} to {assigneeLabel(task)}
      </Text>
      <Text style={styles.meta}>Deadline: {new Date(task.deadline).toLocaleString()}</Text>

      {showEditDelete ? (
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => void openEdit()}>
            <Text style={styles.toolBtnTxt}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, styles.dangerOutline]} onPress={() => setDeleteOpen(true)}>
            <Text style={[styles.toolBtnTxt, styles.dangerTxt]}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {canEmail ? (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMailOpen(true)}>
          <Text style={styles.secondaryBtnTxt}>Send email</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.bodyTxt}>{task.description || '—'}</Text>
      {task.completionNote ? (
        <Text style={styles.note}>
          <Text style={styles.bold}>Completion note: </Text>
          {task.completionNote}
        </Text>
      ) : null}

      {showMemberStatus ? (
        <View style={styles.actions}>
          {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              disabled={busy}
              onPress={() => void putStatus('IN_PROGRESS')}>
              <Text style={styles.secondaryBtnTxt}>{busy ? '…' : 'Mark in progress'}</Text>
            </TouchableOpacity>
          ) : null}
          {task.status !== 'COMPLETED' ? (
            <TouchableOpacity style={styles.primaryBtn} disabled={busy} onPress={() => setCompleteOpen(true)}>
              <Text style={styles.primaryBtnTxt}>Mark completed</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showLifecycle ? (
        <TouchableOpacity
          style={[styles.secondaryBtn, styles.dangerOutline]}
          disabled={busy}
          onPress={() => void putStatus('REOPENED')}>
          <Text style={[styles.secondaryBtnTxt, styles.dangerTxt]}>{busy ? '…' : 'Reject completed (reopen)'}</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionTitle}>Comments</Text>
      {(task.comments ?? []).length === 0 ? (
        <Text style={styles.muted}>No comments yet.</Text>
      ) : (
        (task.comments ?? []).map((c, idx) => (
          <View key={`${task._id}-c-${idx}`} style={styles.commentBlock}>
            <Text style={styles.commentMeta}>
              {commentAuthorLabel(meId, c.userId)} · {new Date(c.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.bodyTxt}>{c.text}</Text>
          </View>
        ))
      )}
      {canComment ? (
        <View style={styles.commentComposer}>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={commentDraft}
            onChangeText={setCommentDraft}
            placeholder="Add comment…"
            multiline
          />
          <TouchableOpacity
            style={styles.secondaryBtn}
            disabled={busy || !commentDraft.trim()}
            onPress={() => void postComment()}>
            <Text style={styles.secondaryBtnTxt}>{busy ? '…' : 'Post'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Mail history ({mailRows.length})</Text>
      {mailRows.length === 0 ? (
        <Text style={styles.muted}>No mail sent for this task yet.</Text>
      ) : (
        mailRows.map(row => (
          <View key={row._id} style={styles.mailCard}>
            <Text style={styles.mailSubj}>{row.subject}</Text>
            <Text style={styles.mailPreview} numberOfLines={3}>
              {row.preview}
            </Text>
            <Text style={styles.mailMeta}>
              To: {(row.toEmails ?? []).join(', ')} · {new Date(row.at).toLocaleString()}
            </Text>
          </View>
        ))
      )}

      <Modal visible={completeOpen} transparent animationType="fade" onRequestClose={() => setCompleteOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCompleteOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Mark completed</Text>
            <Text style={styles.muted}>Optional note for the assigner.</Text>
            <TextInput
              style={[styles.input, styles.multiline, { marginTop: 10 }]}
              value={completeNote}
              onChangeText={setCompleteNote}
              placeholder="Completion note"
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCompleteOpen(false)}>
                <Text style={styles.secondaryBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} disabled={busy} onPress={() => void putStatus('COMPLETED', completeNote)}>
                <Text style={styles.primaryBtnTxt}>{busy ? '…' : 'Complete'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDeleteOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Delete task?</Text>
            <Text style={styles.muted}>This cannot be undone.</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setDeleteOpen(false)}>
                <Text style={styles.secondaryBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, styles.dangerFill]} disabled={busy} onPress={() => void confirmDelete()}>
                <Text style={styles.primaryBtnTxt}>{busy ? '…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={mailOpen} transparent animationType="fade" onRequestClose={() => setMailOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMailOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Send task email</Text>
            <Text style={styles.label}>To</Text>
            <View style={styles.row}>
              {(['assignees', 'assigner', 'all'] as const).map(k => (
                <TouchableOpacity key={k} style={[styles.chip, mailTo === k && styles.chipOn]} onPress={() => setMailTo(k)}>
                  <Text style={[styles.chipTxt, mailTo === k && styles.chipTxtOn]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 10 }]}>Message (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={mailMessage}
              onChangeText={setMailMessage}
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMailOpen(false)}>
                <Text style={styles.secondaryBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} disabled={busy} onPress={() => void sendMail()}>
                <Text style={styles.primaryBtnTxt}>{busy ? '…' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit task</Text>
            <TouchableOpacity onPress={() => setEditOpen(false)}>
              <Text style={styles.link}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.multiline]} value={editDescription} onChangeText={setEditDescription} multiline />
            <Text style={styles.label}>Deadline (local ISO slice)</Text>
            <TextInput style={styles.input} value={editDeadline} onChangeText={setEditDeadline} placeholder="2026-12-31T18:00" />
            <Text style={styles.label}>Priority</Text>
            <View style={styles.row}>
              {(['LOW', 'MEDIUM', 'HIGH'] as TaskPriority[]).map(p => (
                <TouchableOpacity key={p} style={[styles.chip, editPriority === p && styles.chipOn]} onPress={() => setEditPriority(p)}>
                  <Text style={[styles.chipTxt, editPriority === p && styles.chipTxtOn]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Assignees</Text>
            {editUsersLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {visibleEditUsers.map(u => {
              const on = editAssignedTo.includes(u.id);
              return (
                <TouchableOpacity key={u.id} style={styles.userRow} onPress={() => toggleEditAssignee(u.id)}>
                  <View style={[styles.check, on && styles.checkOn]} />
                  <Text style={styles.userRowTxt}>
                    {u.name} ({u.email})
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} disabled={busy} onPress={() => void saveEdit()}>
              <Text style={styles.primaryBtnTxt}>{busy ? '…' : 'Save'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function pillForStatus(status: string) {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return styles.pillDone;
  if (s === 'OVERDUE') return styles.pillOverdue;
  if (s === 'IN_PROGRESS') return styles.pillProgress;
  if (s === 'REOPENED') return styles.pillReopened;
  return styles.pillPending;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8 },
  meta: { marginTop: 6, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  muted: { color: colors.textSecondary, fontSize: 14 },
  err: { color: colors.error, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillPri: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  pillTxt: { fontSize: 11, fontWeight: '700', color: colors.text },
  pillPending: { backgroundColor: '#f1f5f9' },
  pillProgress: { backgroundColor: '#dbeafe' },
  pillDone: { backgroundColor: '#dcfce7' },
  pillOverdue: { backgroundColor: '#fee2e2' },
  pillReopened: { backgroundColor: '#fef3c7' },
  toolbar: { flexDirection: 'row', gap: 10, marginTop: 14 },
  toolBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolBtnTxt: { fontWeight: '700', color: colors.primary },
  dangerOutline: { borderColor: colors.error },
  dangerTxt: { color: colors.error },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryBtnTxt: { fontWeight: '700', color: colors.text },
  primaryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: '#fff', fontWeight: '800' },
  dangerFill: { backgroundColor: colors.error },
  sectionTitle: { marginTop: 20, fontSize: 16, fontWeight: '800', color: colors.text },
  bodyTxt: { marginTop: 6, fontSize: 15, color: colors.text, lineHeight: 22 },
  note: { marginTop: 10, fontSize: 14, color: colors.textSecondary },
  bold: { fontWeight: '800', color: colors.text },
  actions: { marginTop: 12, gap: 8 },
  commentBlock: { marginTop: 10, padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  commentMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  commentComposer: { marginTop: 12, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  mailCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mailSubj: { fontWeight: '700', color: colors.text },
  mailPreview: { marginTop: 4, fontSize: 14, color: colors.textSecondary },
  mailMeta: { marginTop: 6, fontSize: 12, color: colors.textMuted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetBody: { padding: 16, paddingBottom: 40 },
  label: { marginTop: 12, fontWeight: '700', fontSize: 13, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTxtOn: { color: colors.primary, fontWeight: '700' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  check: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.border },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  userRowTxt: { flex: 1, fontSize: 14, color: colors.text },
});
