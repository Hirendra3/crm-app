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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { api, extractApiError } from '../api/client';
import type { MoreStackParamList } from '../navigation/types';

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  updatedAt?: string;
};

const PH = '#64748b';

export function CandidatesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<CandidateRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const path = `/api/candidates${params.toString() ? `?${params}` : ''}`;
      const { data } = await api.get<{ candidates: CandidateRow[] }>(path);
      setRows(data.candidates ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.headRow}>
        <Text style={styles.h1}>Hiring</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CandidateDetail', { candidateId: 'new' })}>
          <Text style={styles.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search name, email…"
        placeholderTextColor={PH}
        style={styles.input}
        autoCapitalize="none"
      />
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {rows.map(c => (
        <TouchableOpacity
          key={c.id}
          style={styles.row}
          onPress={() => navigation.navigate('CandidateDetail', { candidateId: c.id })}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.email}>{c.email}</Text>
          <Text style={styles.status}>{c.status}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  h1: { fontSize: 22, fontWeight: '700' },
  addBtn: {
    backgroundColor: '#2a3670',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnTxt: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#172033',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  name: { fontSize: 16, fontWeight: '600' },
  email: { color: '#334155', fontSize: 14 },
  status: { color: '#2a3670', marginTop: 4, fontWeight: '600' },
  err: { color: '#c00', marginVertical: 8 },
});
