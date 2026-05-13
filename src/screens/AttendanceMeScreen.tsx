import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api, extractApiError } from '../api/client';

type Row = {
  date: string;
  status?: string;
  note?: string;
  markedAt?: string;
};

export function AttendanceMeScreen() {
  const month = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<{ records: Row[] }>('/api/attendance/me', {
        params: { month },
      });
      setRows(data.records);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.pad}>
        <Text style={styles.title}>My attendance ({month})</Text>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <FlatList
      ListHeaderComponent={
        <View style={[styles.pad, { paddingBottom: 0 }]}>
          <Text style={styles.title}>My attendance ({month})</Text>
          {error ? <Text style={styles.err}>{error}</Text> : null}
          {!error ? (
            <Text style={styles.meta}>
              Self‑mark flows with camera/geo will mirror web{' '}
              <Text style={{ fontWeight: '600' }}>AttendanceMePage</Text> later.
            </Text>
          ) : null}
        </View>
      }
      data={rows}
      keyExtractor={(r, i) => `${r.date}-${i}`}
      contentContainerStyle={{ paddingBottom: 32 }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rowDay}>{item.date}</Text>
          <Text style={styles.rowStat}>{item.status ?? '—'}</Text>
          {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
        </View>
      )}
      ListEmptyComponent={
        !error ? (
          <Text style={[styles.pad, styles.meta]}>No attendance rows.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { color: '#52637c', marginTop: 8 },
  err: { color: '#d00', marginTop: 8 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d7e0ee',
    backgroundColor: '#fff',
  },
  rowDay: { fontWeight: '700' },
  rowStat: { marginTop: 4, color: '#172033' },
  note: { marginTop: 4, color: '#52637c', fontSize: 13 },
});
