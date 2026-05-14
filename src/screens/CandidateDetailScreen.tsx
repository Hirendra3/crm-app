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
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, extractApiError } from '../api/client';
import type { MoreStackParamList } from '../navigation/types';

type CandidateDto = {
  id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  status: string;
  roleAppliedFor?: string;
  departmentId?: string | null;
  source?: string;
  notes?: string;
};

type R = RouteProp<MoreStackParamList, 'CandidateDetail'>;

const PH = '#64748b';
const STATUSES = ['NEW', 'SCREENING', 'IN_PROGRESS', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'];

export function CandidateDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const {
    params: { candidateId },
  } = useRoute<R>();
  const isNew = candidateId === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [c, setC] = useState<CandidateDto | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [roleFor, setRoleFor] = useState('');
  const [deptId, setDeptId] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('NEW');
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);

  const loadDepts = useCallback(async () => {
    const { data } = await api.get<{ departments: { id: string; name: string }[] }>(
      '/api/departments',
    );
    setDepts(data.departments ?? []);
  }, []);

  const load = useCallback(async () => {
    if (isNew) {
      await loadDepts();
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const [{ data }, d2] = await Promise.all([
        api.get<{ candidate: CandidateDto }>(`/api/candidates/${candidateId}`),
        api.get<{ departments: { id: string; name: string }[] }>('/api/departments'),
      ]);
      setC(data.candidate);
      const cand = data.candidate;
      setName(cand.name);
      setEmail(cand.email);
      setMobile(cand.mobileNumber ?? '');
      setRoleFor(cand.roleAppliedFor ?? '');
      setDeptId(cand.departmentId ?? '');
      setSource(cand.source ?? '');
      setNotes(cand.notes ?? '');
      setStatus(cand.status);
      setDepts(d2.data.departments ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [candidateId, isNew, loadDepts]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setErr('');
    setSaving(true);
    try {
      const { data } = await api.post<{ candidate: CandidateDto }>('/api/candidates', {
        name: name.trim(),
        email: email.trim(),
        mobileNumber: mobile.trim(),
        roleAppliedFor: roleFor.trim(),
        departmentId: deptId || null,
        source: source.trim(),
        notes: notes.trim(),
      });
      navigation.replace('CandidateDetail', { candidateId: data.candidate.id });
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function savePatch() {
    if (isNew || !candidateId) return;
    setErr('');
    setSaving(true);
    try {
      await api.patch(`/api/candidates/${candidateId}`, {
        name: name.trim(),
        email: email.trim(),
        mobileNumber: mobile.trim(),
        status,
        roleAppliedFor: roleFor.trim(),
        departmentId: deptId || null,
        source: source.trim(),
        notes: notes.trim(),
      });
      setErr('Saved.');
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{isNew ? 'New candidate' : 'Candidate'}</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={PH} />
      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={PH}
      />
      <Text style={styles.label}>Mobile</Text>
      <TextInput value={mobile} onChangeText={setMobile} style={styles.input} placeholderTextColor={PH} />
      <Text style={styles.label}>Role applied for</Text>
      <TextInput value={roleFor} onChangeText={setRoleFor} style={styles.input} placeholderTextColor={PH} />

      {!isNew ? (
        <>
          <Text style={styles.label}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, status === s && styles.chipOn]}
                onPress={() => setStatus(s)}>
                <Text style={[styles.chipTxt, status === s && styles.chipTxtOn]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.label}>Department</Text>
      {depts.map(d => (
        <TouchableOpacity
          key={d.id}
          style={[styles.pick, deptId === d.id && styles.pickOn]}
          onPress={() => setDeptId(d.id)}>
          <Text>{d.name}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.pick} onPress={() => setDeptId('')}>
        <Text>None</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Source</Text>
      <TextInput value={source} onChangeText={setSource} style={styles.input} placeholderTextColor={PH} />
      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, { minHeight: 80 }]}
        multiline
        placeholderTextColor={PH}
      />

      {isNew ? (
        <TouchableOpacity
          style={[styles.btn, saving && { opacity: 0.7 }]}
          disabled={saving}
          onPress={() => void create()}>
          <Text style={styles.btnTxt}>{saving ? 'Creating…' : 'Create candidate'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.btn, saving && { opacity: 0.7 }]}
          disabled={saving}
          onPress={() => void savePatch()}>
          <Text style={styles.btnTxt}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </TouchableOpacity>
      )}

      {c?.id ? <Text style={styles.muted}>ID: {c.id}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: '#172033',
  },
  statusScroll: { flexGrow: 0, marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  chipOn: { backgroundColor: '#2a3670', borderColor: '#2a3670' },
  chipTxt: { fontSize: 12, color: '#172033' },
  chipTxtOn: { color: '#fff', fontWeight: '600' },
  pick: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  pickOn: { backgroundColor: '#e8edf5' },
  btn: {
    marginTop: 20,
    backgroundColor: '#2a3670',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '600' },
  muted: { marginTop: 12, color: '#334155' },
  err: { color: '#c00', marginBottom: 8 },
});
