import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, extractApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';
import type { TaskPriority } from '../../types/task';
import type { UserRole } from '../../types/user';

type SimpleUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  leaderIds?: string[];
  departmentId?: string | null;
  departmentIds?: string[];
};

type DeptOpt = { id: string; name: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  leaderDeptId: string;
  leaderDepts: DeptOpt[];
};

export function TaskCreateModal({ visible, onClose, onCreated, leaderDeptId, leaderDepts }: Props) {
  const { user } = useAuth();
  const role = user?.role;

  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [leaderPick, setLeaderPick] = useState('');
  const [adminDepartmentId, setAdminDepartmentId] = useState('');
  const [adminLeaderId, setAdminLeaderId] = useState('');
  const [adminDepts, setAdminDepts] = useState<DeptOpt[]>([]);
  const [adminLeaders, setAdminLeaders] = useState<{ id: string; name: string; departmentId?: string | null }[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    if (role === 'LEADER' && leaderDeptId) setLeaderPick(leaderDeptId);
    else if (role === 'LEADER' && leaderDepts[0]?.id) setLeaderPick(leaderDepts[0].id);
  }, [visible, role, leaderDeptId, leaderDepts]);

  useEffect(() => {
    if (!visible || !(role === 'ADMIN' || role === 'HR')) return;
    void (async () => {
      try {
        const [dRes, lRes] = await Promise.all([
          api.get<{ departments: DeptOpt[] }>('/api/departments'),
          api.get<{ users: { id: string; name: string; departmentId?: string | null }[] }>('/api/users/leaders'),
        ]);
        setAdminDepts(dRes.data.departments ?? []);
        setAdminLeaders(lRes.data.users ?? []);
      } catch {
        setAdminDepts([]);
        setAdminLeaders([]);
      }
    })();
  }, [visible, role]);

  const loadAssignable = useCallback(async () => {
    if (!role || !(role === 'ADMIN' || role === 'HR' || role === 'LEADER')) return;
    setLoadingUsers(true);
    setError('');
    try {
      if (role === 'ADMIN' || role === 'HR') {
        const { data } = await api.get<{ users: SimpleUser[] }>('/api/users');
        setUsers((data.users ?? []).filter(u => u.id !== user?.id));
      } else {
        const { data } = await api.get<{ users: SimpleUser[] }>('/api/team/members');
        setUsers(data.users ?? []);
      }
    } catch (e) {
      setError(extractApiError(e));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [role, user?.id]);

  useEffect(() => {
    if (visible && (role === 'ADMIN' || role === 'HR' || role === 'LEADER')) void loadAssignable();
  }, [visible, role, loadAssignable]);

  useEffect(() => {
    if (!visible || (role !== 'ADMIN' && role !== 'HR') || !adminLeaderId) return;
    const selected = adminLeaders.find(l => l.id === adminLeaderId);
    const deptId = String(selected?.departmentId ?? '');
    if (deptId && deptId !== adminDepartmentId) setAdminDepartmentId(deptId);
  }, [visible, role, adminLeaderId, adminLeaders, adminDepartmentId]);

  const visibleAssignable = useMemo(() => {
    let list = users;
    if (role === 'ADMIN' || role === 'HR') {
      list = list.filter(u => String(u.role ?? '').toUpperCase() === 'MEMBER');
      if (adminDepartmentId) {
        list = list.filter(u => {
          const deptIds = [u.departmentId, ...(u.departmentIds ?? [])].filter(Boolean) as string[];
          return deptIds.includes(adminDepartmentId);
        });
      }
      if (adminLeaderId) {
        list = list.filter(u => (u.leaderIds ?? []).includes(adminLeaderId));
      }
    }
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [users, role, adminDepartmentId, adminLeaderId, assigneeSearch]);

  const effectiveLeaderDept = role === 'LEADER' ? leaderPick || leaderDeptId : '';

  const submit = useCallback(async () => {
    setError('');
    if (!title.trim() || !description.trim() || !deadline.trim()) {
      setError('Title, description, and deadline are required.');
      return;
    }
    const d = new Date(deadline.trim());
    if (Number.isNaN(d.getTime())) {
      setError('Invalid deadline — use a date/time your device can parse (e.g. ISO).');
      return;
    }
    if (assignedTo.length === 0) {
      setError('Select at least one assignee.');
      return;
    }
    if (role === 'LEADER' && !effectiveLeaderDept) {
      setError('Select a team department.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/tasks', {
        assignedTo,
        title: title.trim(),
        description: description.trim(),
        deadline: d.toISOString(),
        priority,
        departmentId: role === 'LEADER' ? effectiveLeaderDept : undefined,
      });
      setAssignedTo([]);
      setAssigneeSearch('');
      setTitle('');
      setDescription('');
      setDeadline('');
      setPriority('MEDIUM');
      setAdminDepartmentId('');
      setAdminLeaderId('');
      onCreated();
      onClose();
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    deadline,
    priority,
    assignedTo,
    role,
    effectiveLeaderDept,
    onCreated,
    onClose,
  ]);

  const toggleAssignee = (id: string) => {
    setAssignedTo(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  if (!role || !canCreate(role)) {
    return <Modal visible={false} />;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Assign new task</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.closeLink}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
          {error ? <Text style={styles.err}>{error}</Text> : null}

          {role === 'LEADER' && leaderDepts.length > 0 ? (
            <View style={styles.field}>
              <Text style={styles.label}>Team department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {leaderDepts.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.chip, effectiveLeaderDept === d.id && styles.chipOn]}
                    onPress={() => setLeaderPick(d.id)}>
                    <Text style={[styles.chipTxt, effectiveLeaderDept === d.id && styles.chipTxtOn]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {(role === 'ADMIN' || role === 'HR') && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Department (filter)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.chip, !adminDepartmentId && styles.chipOn]}
                    onPress={() => {
                      setAdminDepartmentId('');
                      setAdminLeaderId('');
                      setAssignedTo([]);
                    }}>
                    <Text style={[styles.chipTxt, !adminDepartmentId && styles.chipTxtOn]}>All</Text>
                  </TouchableOpacity>
                  {adminDepts.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, adminDepartmentId === d.id && styles.chipOn]}
                      onPress={() => {
                        setAdminDepartmentId(d.id);
                        setAdminLeaderId('');
                        setAssignedTo([]);
                      }}>
                      <Text style={[styles.chipTxt, adminDepartmentId === d.id && styles.chipTxtOn]}>{d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Leader (filter)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.chip, !adminLeaderId && styles.chipOn]}
                    onPress={() => {
                      setAdminLeaderId('');
                      setAssignedTo([]);
                    }}>
                    <Text style={[styles.chipTxt, !adminLeaderId && styles.chipTxtOn]}>Any</Text>
                  </TouchableOpacity>
                  {adminLeaders.map(l => (
                    <TouchableOpacity
                      key={l.id}
                      style={[styles.chip, adminLeaderId === l.id && styles.chipOn]}
                      onPress={() => {
                        setAdminLeaderId(l.id);
                        setAssignedTo([]);
                      }}>
                      <Text style={[styles.chipTxt, adminLeaderId === l.id && styles.chipTxtOn]} numberOfLines={1}>
                        {l.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Task title" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Details"
              multiline
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Deadline (text / ISO)</Text>
            <TextInput
              style={styles.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="e.g. 2026-12-31T18:00"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.rowChips}>
              {(['LOW', 'MEDIUM', 'HIGH'] as TaskPriority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, priority === p && styles.chipOn]}
                  onPress={() => setPriority(p)}>
                  <Text style={[styles.chipTxt, priority === p && styles.chipTxtOn]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Assignees</Text>
            <TextInput
              style={styles.input}
              value={assigneeSearch}
              onChangeText={setAssigneeSearch}
              placeholder="Search name or email"
            />
            {loadingUsers ? <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} /> : null}
            <FlatList
              scrollEnabled={false}
              data={visibleAssignable}
              keyExtractor={it => it.id}
              style={{ marginTop: 8, maxHeight: 220 }}
              renderItem={({ item }) => {
                const on = assignedTo.includes(item.id);
                return (
                  <TouchableOpacity style={styles.userRow} onPress={() => toggleAssignee(item.id)}>
                    <View style={[styles.check, on && styles.checkOn]} />
                    <Text style={styles.userRowTxt}>
                      {item.name} ({item.email})
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                loadingUsers ? null : <Text style={styles.muted}>No matching users.</Text>
              }
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => void submit()} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnTxt}>Create task</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function canCreate(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'HR' || role === 'LEADER';
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeLink: { fontSize: 16, fontWeight: '600', color: colors.primary },
  sheetBody: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTxtOn: { color: colors.primary, fontWeight: '700' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  userRowTxt: { flex: 1, fontSize: 14, color: colors.text },
  muted: { color: colors.textSecondary, marginTop: 8 },
  err: { color: colors.error, marginBottom: 10 },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
