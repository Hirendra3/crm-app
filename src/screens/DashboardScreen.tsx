import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types/user';

type Task = {
  _id: string;
  title: string;
  status: string;
  deadline: string;
};

export function DashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usersSummary, setUsersSummary] = useState<string[]>([]);
  const [tasksPreview, setTasksPreview] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<{
    attendanceEntriesThisMonth: number;
    pendingLeaveRequests: number;
    openTasks: number;
  } | null>(null);

  const role = user?.role;

  const load = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    setError('');
    setUsersSummary([]);
    try {
      let tasksSlice: Task[] = [];
      if (role === 'ADMIN') {
        const r = await api.get<{ tasks: Task[] }>('/api/tasks/all', {
          params: { limit: 10 },
        });
        tasksSlice = r.data.tasks ?? [];
      } else if (role === 'LEADER') {
        const r = await api.get<{ tasks: Task[] }>('/api/tasks/team');
        tasksSlice = (r.data.tasks ?? []).slice(0, 10);
      } else if (role === 'MEMBER') {
        const r = await api.get<{ tasks: Task[] }>('/api/tasks/my', {
          params: { limit: 10 },
        });
        tasksSlice = r.data.tasks ?? [];
      }

      const [uRes, kRes] = await Promise.all([
        role === 'ADMIN' || role === 'HR'
          ? api.get<{ users: User[] }>('/api/users')
          : role === 'LEADER'
            ? api.get<{ users: User[] }>('/api/team/members')
            : Promise.resolve(null),
        role === 'ADMIN' || role === 'LEADER' || role === 'HR'
          ? api.get<{
              kpis: {
                attendanceEntriesThisMonth: number;
                pendingLeaveRequests: number;
                openTasks: number;
              };
            }>('/api/reports/kpis')
          : Promise.resolve(null),
      ]);

      setTasksPreview(tasksSlice);

      if (uRes && 'data' in uRes) {
        setUsersSummary(
          uRes.data.users.slice(0, 6).map(x => `${x.name} (${x.role})`),
        );
      }

      if (kRes && 'data' in kRes) {
        setKpis(kRes.data.kpis);
      }
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.meta}>
        {user.name} · {user.role}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <>
          {kpis ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>KPIs</Text>
              <Text style={styles.line}>
                Attendance rows (month): {kpis.attendanceEntriesThisMonth}
              </Text>
              <Text style={styles.line}>Pending leave: {kpis.pendingLeaveRequests}</Text>
              <Text style={styles.line}>Open tasks: {kpis.openTasks}</Text>
            </View>
          ) : null}

          {usersSummary.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>People</Text>
              {usersSummary.map(line => (
                <Text key={line} style={styles.line}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent tasks</Text>
            {tasksPreview.length === 0 ? (
              <Text style={styles.line}>No tasks to show.</Text>
            ) : (
              tasksPreview.map(t => (
                <Text key={t._id} style={styles.line}>
                  {t.title} — {t.status} (due {new Date(t.deadline).toLocaleDateString()})
                </Text>
              ))
            )}
          </View>

          {!kpis &&
          usersSummary.length === 0 &&
          role === 'MEMBER' &&
          tasksPreview.length === 0 ? (
            <Text style={styles.meta}>Signed in.</Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { color: '#52637c', marginTop: 4, marginBottom: 16 },
  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d7e0ee',
  },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  line: { color: '#172033', marginBottom: 4 },
  err: { color: '#d00', marginTop: 16 },
});
