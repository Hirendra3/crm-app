import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type TaskRow = {
  _id: string;
  title: string;
  status: string;
  deadline: string;
  priority?: string;
};

export function TasksScreen() {
  const { user } = useAuth();
  const role = user?.role;
  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loader = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    setError('');
    try {
      const res =
        role === 'ADMIN'
          ? await api.get<{ tasks: TaskRow[] }>('/api/tasks/all')
          : role === 'LEADER'
            ? await api.get<{ tasks: TaskRow[] }>('/api/tasks/team')
            : await api.get<{ tasks: TaskRow[] }>('/api/tasks/my');
      setItems(res.data.tasks ?? []);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void loader();
  }, [loader]);

  const header = useMemo(
    () => (
      <>
        <Text style={styles.title}>Tasks</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </>
    ),
    [error],
  );

  if (loading) {
    return (
      <View style={styles.pad}>
        {header}
        <ActivityIndicator style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <FlatList
      ListHeaderComponent={
        <View style={styles.padTop}>{header}</View>
      }
      data={items}
      keyExtractor={it => it._id}
      contentContainerStyle={{ paddingBottom: 32 }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowMeta}>
            {item.status} · {item.priority ?? '—'} · due{' '}
            {new Date(item.deadline).toLocaleString()}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={[styles.pad, styles.meta]}>No tasks.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  padTop: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { color: '#52637c' },
  err: { color: '#d00', marginTop: 8 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d7e0ee',
    backgroundColor: '#fff',
  },
  rowTitle: { fontWeight: '600' },
  rowMeta: { color: '#52637c', fontSize: 13, marginTop: 4 },
});
