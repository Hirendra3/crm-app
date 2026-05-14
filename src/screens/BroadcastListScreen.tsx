import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { MoreStackParamList } from '../navigation/types';

type Summary = {
  departmentId: string;
  unreadCount: number;
  lastMessageAt: string | null;
  lastSnippet: string;
};

export function BroadcastListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [deptNames, setDeptNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const inb = await api.get<{ summaries: Summary[] }>('/api/messages/group/inbox-summary');
      setSummaries(inb.data.summaries ?? []);
      const map: Record<string, string> = {};
      try {
        const depts =
          user?.role === 'ADMIN' || user?.role === 'HR'
            ? await api.get<{ departments: { id: string; name: string }[] }>('/api/departments')
            : await api.get<{ departments: { id: string; name: string }[] }>(
                '/api/departments/mine',
              );
        for (const d of depts.data.departments ?? []) map[d.id] = d.name;
      } catch {
        /* names optional */
      }
      setDeptNames(map);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Team Broadcast</Text>
      <Text style={styles.muted}>Channels from inbox summary (same as web).</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {summaries.map(s => (
        <TouchableOpacity
          key={s.departmentId}
          style={styles.row}
          onPress={() =>
            navigation.navigate('BroadcastThread', {
              departmentId: s.departmentId,
              title: deptNames[s.departmentId] ?? s.departmentId,
            })
          }>
          <Text style={styles.name}>{deptNames[s.departmentId] ?? s.departmentId}</Text>
          <Text style={styles.snip} numberOfLines={2}>
            {s.lastSnippet || '—'}
          </Text>
          {s.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{s.unreadCount > 99 ? '99+' : s.unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  muted: { color: '#334155', marginBottom: 12 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  name: { fontSize: 16, fontWeight: '600' },
  snip: { color: '#334155', fontSize: 14, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#2a3670',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  err: { color: '#c00', marginVertical: 8 },
});
