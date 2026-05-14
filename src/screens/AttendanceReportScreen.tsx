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

function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PH = '#64748b';

export function AttendanceReportScreen() {
  const [month, setMonth] = useState(ymNow());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [totals, setTotals] = useState<
    {
      userId: string;
      name: string;
      present: number;
      absent: number;
      late: number;
      halfDay: number;
      leave: number;
      payableDays: number;
    }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get<{
        totals: {
          userId: string;
          name: string;
          present: number;
          absent: number;
          late: number;
          halfDay: number;
          leave: number;
          payableDays: number;
        }[];
      }>('/api/attendance/report/totals', { params: { month } });
      setTotals(data.totals ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Attendance report</Text>
      <Text style={styles.label}>Month (YYYY-MM)</Text>
      <TextInput
        value={month}
        onChangeText={setMonth}
        placeholder="2026-05"
        placeholderTextColor={PH}
        style={styles.input}
        autoCapitalize="none"
      />
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {totals.map(t => (
        <View key={t.userId} style={styles.card}>
          <Text style={styles.name}>{t.name}</Text>
          <Text style={styles.line}>Present: {t.present}</Text>
          <Text style={styles.line}>Absent: {t.absent}</Text>
          <Text style={styles.line}>Late: {t.late}</Text>
          <Text style={styles.line}>Half day: {t.halfDay}</Text>
          <Text style={styles.line}>Leave: {t.leave}</Text>
          <Text style={styles.line}>Payable days: {t.payableDays}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#172033',
    marginBottom: 12,
  },
  card: {
    padding: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  name: { fontWeight: '700', marginBottom: 6, fontSize: 16 },
  line: { color: '#334155', marginTop: 2 },
  err: { color: '#c00', marginVertical: 8 },
});
