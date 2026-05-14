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

type Member = {
  id: string;
  name: string;
  email: string;
  designation?: string;
};

export function TeamScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [deptLabel, setDeptLabel] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr('');
    try {
      if (user.role === 'LEADER') {
        const mine = await api.get<{ departments: { id: string; name: string }[] }>(
          '/api/departments/mine',
        );
        const first = mine.data.departments?.[0];
        setDeptLabel(first?.name ?? '');
        const params = first?.id ? { params: { departmentId: first.id } } : {};
        const { data } = await api.get<{ users: Member[] }>('/api/team/members', params);
        setMembers(data.users ?? []);
      } else {
        const { data } = await api.get<{ users: Member[] }>('/api/team/members');
        setMembers(data.users ?? []);
      }
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>My Team</Text>
      {user?.role === 'LEADER' && deptLabel ? (
        <Text style={styles.muted}>Department: {deptLabel}</Text>
      ) : (
        <Text style={styles.muted}>Team members (same endpoint as web).</Text>
      )}
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {members.map(m => (
        <TouchableOpacity
          key={m.id}
          style={styles.row}
          onPress={() => navigation.navigate('UserDetail', { userId: m.id })}>
          <Text style={styles.name}>{m.name}</Text>
          <Text style={styles.email}>{m.email}</Text>
          {m.designation ? <Text style={styles.muted}>{m.designation}</Text> : null}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  muted: { color: '#334155', marginBottom: 8 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  name: { fontSize: 16, fontWeight: '600' },
  email: { color: '#334155', fontSize: 14 },
  err: { color: '#c00', marginVertical: 8 },
});
