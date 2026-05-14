import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api, extractApiError } from '../api/client';

type Notification = {
  _id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

function describeNotification(n: Notification): string {
  if (n.type === 'attendance') return 'Attendance updated';
  if (n.type === 'leave')
    return n.payload.action === 'new'
      ? 'New leave request'
      : 'Leave request updated';
  if (n.type === 'task_assigned') return 'New task assigned';
  if (n.type === 'task_updated') return 'Task updated';
  if (n.type === 'task_overdue') return 'Task overdue';
  return n.type;
}

export function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<{ notifications: Notification[] }>(
        '/api/notifications',
      );
      setItems(data.notifications);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = useMemo(
    () => items.filter(i => !i.readAt).length,
    [items],
  );

  async function markAll() {
    setBusy(true);
    try {
      await api.put('/api/notifications/read-all');
      await load();
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function tapRow(id: string, readAt: string | null) {
    try {
      if (!readAt) {
        await api.put(`/api/notifications/${id}/read`, { read: true });
        setItems(curr =>
          curr.map(n =>
            n._id === id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
      }
    } catch (e) {
      setError(extractApiError(e));
    }
  }

  const header = (
    <View style={styles.hdr}>
      <View>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.meta}>Unread: {unread}</Text>
      </View>
      <TouchableOpacity
        style={[styles.smallBtn, (busy || unread === 0) && styles.btnOff]}
        disabled={busy || unread === 0}
        onPress={() => void markAll()}>
        <Text style={styles.smallBtnTxt}>Mark all read</Text>
      </TouchableOpacity>
    </View>
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
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {header}
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>
      }
      data={items}
      keyExtractor={n => n._id}
      contentContainerStyle={{ paddingBottom: 32 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => void tapRow(item._id, item.readAt)}>
          <Text style={styles.rowTitle}>{describeNotification(item)}</Text>
          <Text style={styles.rowMeta}>
            {new Date(item.createdAt).toLocaleString()}{' '}
            {!item.readAt ? '· unread' : ''}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={[styles.pad, styles.meta]}>No notifications.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { color: '#334155', marginTop: 4 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  rowTitle: { fontWeight: '600' },
  rowMeta: { fontSize: 13, color: '#334155', marginTop: 4 },
  err: { color: '#d00', marginVertical: 8 },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a3670',
  },
  smallBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnOff: { opacity: 0.45 },
});
