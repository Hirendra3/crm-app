import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { api, extractApiError } from '../api/client';
import type { User } from '../types/user';
import type { MoreStackParamList } from '../navigation/types';

type R = RouteProp<MoreStackParamList, 'UserDetail'>;

export function UserDetailScreen() {
  const {
    params: { userId },
  } = useRoute<R>();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<{ user: User }>(`/api/users/${userId}`);
      setUser(data.user);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.pad}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.title}>{user?.name ?? 'Employee'}</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {!user ? null : (
        <View style={styles.card}>
          <Text style={styles.line}>Email: {user.email}</Text>
          <Text style={styles.line}>Role: {user.role}</Text>
          {user.designation ? (
            <Text style={styles.line}>Designation: {user.designation}</Text>
          ) : null}
          {user.status ? (
            <Text style={styles.line}>Status: {user.status}</Text>
          ) : null}
        </View>
      )}
      <Text style={styles.note}>
        Extend with payroll/actions from EmployeeDetailPage as needed.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  line: { marginBottom: 8 },
  err: { color: '#d00', marginVertical: 8 },
  note: { marginTop: 16, color: '#334155' },
});
