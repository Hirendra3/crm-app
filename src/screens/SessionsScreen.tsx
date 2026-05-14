import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../auth/AuthContext';

type SessionRow = {
  id: string;
  deviceName: string;
  deviceFingerprint: string;
  browserName: string;
  osName: string;
  ip: string;
  geoLat?: number | null;
  geoLng?: number | null;
  geoAccuracyM?: number | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

type SimpleUser = { id: string; name: string; email: string };

function sessionIdFromJwt(token: string | null): string {
  if (!token) return '';
  try {
    const p = token.split('.')[1];
    if (!p) return '';
    let b64 = p.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const atobFn = (globalThis as unknown as { atob?: (s: string) => string }).atob;
    if (typeof atobFn !== 'function') return '';
    const json = JSON.parse(atobFn(b64)) as { sessionId?: string };
    return typeof json.sessionId === 'string' ? json.sessionId : '';
  } catch {
    return '';
  }
}

export function SessionsScreen() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [adminRows, setAdminRows] = useState<SessionRow[]>([]);

  const currentSessionId = useMemo(() => sessionIdFromJwt(token), [token]);

  const loadMine = useCallback(async () => {
    const { data } = await api.get<{ sessions: SessionRow[] }>('/api/sessions/me');
    setRows(data.sessions ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      await loadMine();
      if (user?.role === 'ADMIN') {
        const { data } = await api.get<{ users: SimpleUser[] }>('/api/users');
        setAllUsers(data.users ?? []);
      }
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [loadMine, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadAdmin = useCallback(async () => {
    if (!targetUserId || user?.role !== 'ADMIN') return;
    setErr('');
    try {
      const { data } = await api.get<{ sessions: SessionRow[] }>(
        `/api/sessions/user/${targetUserId}`,
      );
      setAdminRows(data.sessions ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    }
  }, [targetUserId, user?.role]);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  async function revoke(id: string) {
    setErr('');
    try {
      await api.post(`/api/sessions/${id}/revoke`, {});
      await load();
      if (user?.role === 'ADMIN') await loadAdmin();
    } catch (e) {
      setErr(extractApiError(e));
    }
  }

  function renderSession(s: SessionRow) {
    const isCurrent = s.id === currentSessionId;
    const maps =
      s.geoLat != null && s.geoLng != null
        ? `https://www.google.com/maps?q=${encodeURIComponent(`${s.geoLat},${s.geoLng}`)}`
        : null;
    return (
      <View key={s.id} style={styles.card}>
        <Text style={styles.title}>
          {s.deviceName || 'Device'} {isCurrent ? '(this device)' : ''}
        </Text>
        <Text style={styles.small}>
          {s.browserName} / {s.osName} · {s.ip}
        </Text>
        <Text style={styles.small}>Last seen: {new Date(s.lastSeenAt).toLocaleString()}</Text>
        {maps ? (
          <TouchableOpacity onPress={() => void Linking.openURL(maps)}>
            <Text style={styles.link}>Open location</Text>
          </TouchableOpacity>
        ) : null}
        {!s.revokedAt && !isCurrent ? (
          <TouchableOpacity style={styles.revoke} onPress={() => void revoke(s.id)}>
            <Text style={styles.revokeTxt}>Revoke</Text>
          </TouchableOpacity>
        ) : s.revokedAt ? (
          <Text style={styles.revoked}>Revoked</Text>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Sessions</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Text style={styles.h2}>Your sessions</Text>
      {rows.map(renderSession)}

      {user?.role === 'ADMIN' ? (
        <>
          <Text style={[styles.h2, { marginTop: 24 }]}>Admin: user sessions</Text>
          {allUsers.map(u => (
            <TouchableOpacity
              key={u.id}
              style={[styles.pick, targetUserId === u.id && styles.pickOn]}
              onPress={() => setTargetUserId(u.id)}>
              <Text>{u.name}</Text>
            </TouchableOpacity>
          ))}
          {adminRows.map(renderSession)}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  card: {
    padding: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  title: { fontWeight: '700', fontSize: 16 },
  small: { color: '#334155', fontSize: 13, marginTop: 4 },
  link: { color: '#2a3670', marginTop: 8, fontWeight: '600' },
  revoke: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c00',
  },
  revokeTxt: { color: '#c00', fontWeight: '600' },
  revoked: { marginTop: 8, color: '#475569' },
  pick: { paddingVertical: 8, paddingHorizontal: 10 },
  pickOn: { backgroundColor: '#e8edf5' },
  err: { color: '#c00', marginVertical: 8 },
});
