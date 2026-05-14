import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { api, extractApiError } from '../api/client';

type EmployeeRow = { id: string; name: string; email: string };

type LocationEntry = {
  lat: number;
  lng: number;
  recordedAt: string;
  accuracyM: number | null;
};

type LocationHistoryDoc = {
  date: string;
  locations: LocationEntry[];
};

export function TeamLocationScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [users, setUsers] = useState<EmployeeRow[]>([]);
  const [userId, setUserId] = useState('');
  const [history, setHistory] = useState<LocationHistoryDoc[]>([]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get<{ users: EmployeeRow[] }>('/api/users');
      setUsers(data.users ?? []);
      setUserId(prev => prev || data.users?.[0]?.id || '');
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const loadLocs = useCallback(async () => {
    if (!userId) return;
    setErr('');
    try {
      const { data } = await api.get<{ locations: LocationHistoryDoc[] }>(
        `/api/locations/user/${userId}`,
      );
      setHistory(data.locations ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    }
  }, [userId]);

  useEffect(() => {
    void loadLocs();
  }, [loadLocs]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Team locations</Text>
      <Text style={styles.muted}>Same `/api/locations/user/:id` as web (list view).</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Text style={styles.h2}>Employee</Text>
      {users.map(u => (
        <TouchableOpacity
          key={u.id}
          style={[styles.pick, userId === u.id && styles.pickOn]}
          onPress={() => setUserId(u.id)}>
          <Text style={styles.name}>{u.name}</Text>
          <Text style={styles.email}>{u.email}</Text>
        </TouchableOpacity>
      ))}
      {history.map(day => (
        <View key={day.date} style={styles.card}>
          <Text style={styles.dayTitle}>{day.date}</Text>
          {(day.locations ?? []).slice(0, 20).map((loc, i) => (
            <TouchableOpacity
              key={`${day.date}-${i}`}
              style={styles.locRow}
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps?q=${encodeURIComponent(`${loc.lat},${loc.lng}`)}`,
                )
              }>
              <Text style={styles.locTxt}>
                {new Date(loc.recordedAt).toLocaleString()} — {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  h2: { fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  muted: { color: '#334155', marginBottom: 8 },
  pick: { paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#cbd5e1' },
  pickOn: { backgroundColor: '#e8edf5' },
  name: { fontWeight: '600' },
  email: { color: '#334155', fontSize: 13 },
  card: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  dayTitle: { fontWeight: '700', marginBottom: 8 },
  locRow: { paddingVertical: 6 },
  locTxt: { color: '#2a3670', fontSize: 14 },
  err: { color: '#c00', marginVertical: 8 },
});
