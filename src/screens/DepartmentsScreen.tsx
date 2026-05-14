import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { api, extractApiError } from '../api/client';

type Dept = {
  id: string;
  name: string;
  leaderId: string;
  leader: { name: string; email: string };
};

type SimpleUser = { id: string; name: string; email: string; role: string };

const PH = '#64748b';

export function DepartmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [depts, setDepts] = useState<Dept[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [name, setName] = useState('');
  const [leaderUserId, setLeaderUserId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [d, u] = await Promise.all([
        api.get<{ departments: Dept[] }>('/api/departments'),
        api.get<{ users: SimpleUser[] }>('/api/users'),
      ]);
      setDepts(d.data.departments ?? []);
      setUsers(u.data.users ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDept() {
    setErr('');
    setSaving(true);
    try {
      await api.post('/api/departments', { name: name.trim(), leaderUserId });
      setName('');
      setLeaderUserId('');
      await load();
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const leaderOptions = users.filter(u => u.role === 'MEMBER' || u.role === 'LEADER');

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Departments</Text>
      <Text style={styles.muted}>Same API as web: list and create departments.</Text>

      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>New department name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Engineering"
          placeholderTextColor={PH}
          style={styles.input}
        />
        <Text style={[styles.label, { marginTop: 12 }]}>Leader user id</Text>
        <TextInput
          value={leaderUserId}
          onChangeText={setLeaderUserId}
          placeholder="Paste user id from list below"
          placeholderTextColor={PH}
          style={styles.input}
          autoCapitalize="none"
        />
        <Text style={styles.mutedSmall}>MEMBER or LEADER — pick from directory:</Text>
        {leaderOptions.slice(0, 8).map(u => (
          <TouchableOpacity
            key={u.id}
            style={styles.pick}
            onPress={() => setLeaderUserId(u.id)}>
            <Text style={styles.pickTxt}>
              {u.name} — {u.id.slice(0, 8)}…
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.btn, saving && { opacity: 0.7 }]}
          disabled={saving}
          onPress={() => void createDept()}>
          <Text style={styles.btnTxt}>{saving ? 'Saving…' : 'Create department'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.h2, { marginTop: 20 }]}>Existing</Text>
      {depts.map(d => (
        <View key={d.id} style={styles.row}>
          <Text style={styles.rowTitle}>{d.name}</Text>
          <Text style={styles.mutedSmall}>
            {d.leader?.name ?? '—'} · {d.leader?.email ?? ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  h2: { fontSize: 17, fontWeight: '700' },
  muted: { color: '#334155', marginBottom: 12 },
  mutedSmall: { color: '#475569', fontSize: 13, marginTop: 4 },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#172033',
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 14,
    backgroundColor: '#2a3670',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '600' },
  pick: { paddingVertical: 6 },
  pickTxt: { color: '#2a3670', fontSize: 14 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  rowTitle: { fontWeight: '600', fontSize: 16 },
  err: { color: '#c00', marginVertical: 8 },
});
