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

type LeaveRow = {
  _id: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType?: string;
};

const PH = '#64748b';

export function LeaveScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState<'CL' | 'SL' | 'PL'>('CL');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get<{ leaves: LeaveRow[]; readOnly?: boolean }>('/api/leave');
      setLeaves(data.leaves ?? []);
      setReadOnly(!!data.readOnly);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setErr('');
    setSaving(true);
    try {
      await api.post('/api/leave', {
        startDate: start,
        endDate: end,
        reason,
        leaveType,
      });
      setStart('');
      setEnd('');
      setReason('');
      await load();
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Leave</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      {!readOnly ? (
        <View style={styles.card}>
          <Text style={styles.h2}>New request</Text>
          <Text style={styles.label}>Start (YYYY-MM-DD)</Text>
          <TextInput
            value={start}
            onChangeText={setStart}
            placeholder="2026-05-01"
            placeholderTextColor={PH}
            style={styles.input}
            autoCapitalize="none"
          />
          <Text style={styles.label}>End (YYYY-MM-DD)</Text>
          <TextInput
            value={end}
            onChangeText={setEnd}
            placeholder="2026-05-02"
            placeholderTextColor={PH}
            style={styles.input}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Type</Text>
          <View style={styles.row}>
            {(['CL', 'SL', 'PL'] as const).map((t, i) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, leaveType === t && styles.chipOn, i > 0 && { marginLeft: 8 }]}
                onPress={() => setLeaveType(t)}>
                <Text style={[styles.chipTxt, leaveType === t && styles.chipTxtOn]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason"
            placeholderTextColor={PH}
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            style={[styles.btn, saving && { opacity: 0.7 }]}
            disabled={saving}
            onPress={() => void submit()}>
            <Text style={styles.btnTxt}>{saving ? 'Submitting…' : 'Submit request'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.muted}>Requests are read-only for your role.</Text>
      )}

      <Text style={[styles.h2, { marginTop: 20 }]}>Requests</Text>
      {leaves.map(l => (
        <View key={l._id} style={styles.card}>
          <Text style={styles.name}>
            {l.startDate?.slice(0, 10)} → {l.endDate?.slice(0, 10)} · {l.status}
          </Text>
          <Text style={styles.muted}>{l.leaveType ?? ''}</Text>
          <Text style={styles.body}>{l.reason}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  muted: { color: '#334155' },
  card: {
    padding: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  label: { fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: '#172033',
  },
  row: { flexDirection: 'row', marginVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  chipOn: { backgroundColor: '#2a3670', borderColor: '#2a3670' },
  chipTxt: { color: '#172033' },
  chipTxtOn: { color: '#fff', fontWeight: '600' },
  btn: {
    marginTop: 14,
    backgroundColor: '#2a3670',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '600' },
  name: { fontWeight: '600' },
  body: { marginTop: 6, color: '#172033' },
  err: { color: '#c00', marginVertical: 8 },
});
