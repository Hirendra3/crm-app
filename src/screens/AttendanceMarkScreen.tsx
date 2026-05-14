import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'UNPAID_LEAVE', 'OFF'] as const;
type Status = (typeof STATUSES)[number];

type ReportUser = { id: string; name: string; email: string };

function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PH = '#64748b';

export function AttendanceMarkScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [month, setMonth] = useState(ymNow());
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [userId, setUserId] = useState('');
  const [day, setDay] = useState('');
  const [status, setStatus] = useState<Status>('PRESENT');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get<{ users: ReportUser[] }>('/api/attendance/report', {
        params: { month },
      });
      const list = data.users ?? [];
      setUsers(list);
      setUserId(prev =>
        prev && list.some(u => u.id === prev) ? prev : list[0]?.id ?? '',
      );
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayNum = useMemo(() => Math.min(31, Math.max(1, parseInt(day, 10) || 1)), [day]);

  async function saveMark() {
    if (!userId) {
      setErr('Select a user');
      return;
    }
    setErr('');
    setSaving(true);
    try {
      await api.post('/api/attendance/bulk', {
        month,
        updates: [{ userId, day: dayNum, status }],
      });
      setErr('');
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Mark attendance</Text>
      <Text style={styles.muted}>
        Quick mark: same `/api/attendance/bulk` as web (one cell at a time here).
      </Text>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Text style={styles.label}>Month (YYYY-MM)</Text>
      <TextInput
        value={month}
        onChangeText={setMonth}
        placeholder="2026-05"
        placeholderTextColor={PH}
        style={styles.input}
        autoCapitalize="none"
      />

      <Text style={[styles.label, { marginTop: 12 }]}>Employee</Text>
      {users.map(u => (
        <TouchableOpacity
          key={u.id}
          style={[styles.pick, userId === u.id && styles.pickOn]}
          onPress={() => setUserId(u.id)}>
          <Text style={styles.pickTxt}>{u.name}</Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.label, { marginTop: 12 }]}>Day of month (1–31)</Text>
      <TextInput
        value={day}
        onChangeText={setDay}
        placeholder="15"
        placeholderTextColor={PH}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={[styles.label, { marginTop: 12 }]}>Status</Text>
      <View style={styles.statusRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, status === s && styles.chipOn, { margin: 4 }]}
            onPress={() => setStatus(s)}>
            <Text style={[styles.chipTxt, status === s && styles.chipTxtOn]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, saving && { opacity: 0.7 }]}
        disabled={saving}
        onPress={() => void saveMark()}>
        <Text style={styles.btnTxt}>{saving ? 'Saving…' : 'Save mark'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  muted: { color: '#334155', marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#172033',
  },
  pick: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  pickOn: { backgroundColor: '#e8edf5' },
  pickTxt: { fontSize: 15 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  chipOn: { backgroundColor: '#2a3670', borderColor: '#2a3670' },
  chipTxt: { fontSize: 12, color: '#172033' },
  chipTxtOn: { color: '#fff' },
  btn: {
    marginTop: 20,
    backgroundColor: '#2a3670',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '600' },
  err: { color: '#c00', marginVertical: 8 },
});
