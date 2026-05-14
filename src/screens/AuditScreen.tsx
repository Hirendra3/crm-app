import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api, extractApiError } from '../api/client';

export function AuditScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get<{ messages: Record<string, unknown>[] }>(
        '/api/messages/audit',
        { params: { from: from || undefined, to: to || undefined } },
      );
      setRows(data.messages ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Chat audit</Text>
      <Text style={styles.muted}>GET /api/messages/audit (same as web). CSV export is web-only.</Text>
      <Text style={styles.label}>From (YYYY-MM-DD)</Text>
      <TextInput value={from} onChangeText={setFrom} style={styles.input} autoCapitalize="none" />
      <Text style={styles.label}>To (YYYY-MM-DD)</Text>
      <TextInput value={to} onChangeText={setTo} style={styles.input} autoCapitalize="none" />
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {rows.map(m => (
        <View key={String(m._id)} style={styles.card}>
          <Text style={styles.small}>
            {m.createdAt ? new Date(String(m.createdAt)).toLocaleString() : ''}
          </Text>
          <Text style={styles.body}>{String(m.content ?? '')}</Text>
          <Text style={styles.small}>{m.isGroup ? 'group' : 'direct'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  muted: { color: '#334155', marginBottom: 12 },
  label: { fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    fontSize: 16,
    color: '#172033',
  },
  card: {
    padding: 10,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#f4f7fb',
  },
  small: { fontSize: 12, color: '#334155' },
  body: { marginTop: 4, fontSize: 15, color: '#172033' },
  err: { color: '#c00', marginVertical: 8 },
});
