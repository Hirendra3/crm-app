import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types/user';
import type { MoreStackParamList } from '../navigation/types';

export function UsersScreen() {
  const { user } = useAuth();
  const role = user?.role;
  const navigation =
    useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    setError('');
    try {
      const res =
        role === 'ADMIN' || role === 'HR'
          ? await api.get<{ users: User[] }>('/api/users')
          : role === 'LEADER'
            ? await api.get<{ users: User[] }>('/api/team/members')
            : null;
      setItems(res?.data.users ?? []);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.pad}>
        <Text style={styles.title}>Employees</Text>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (role === 'MEMBER') {
    return (
      <View style={styles.pad}>
        <Text style={styles.title}>Employees</Text>
        <Text style={styles.meta}>Not available for your role.</Text>
      </View>
    );
  }

  return (
    <FlatList
      ListHeaderComponent={
        <View style={styles.pad}>
          <Text style={styles.title}>Employees</Text>
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>
      }
      data={items}
      keyExtractor={u => u.id}
      contentContainerStyle={{ paddingBottom: 32 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            navigation.navigate('UserDetail', { userId: item.id })
          }>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>
            {item.email} · {item.role}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        error ? null : (
          <Text style={[styles.pad, styles.meta]}>No employees found.</Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { color: '#334155', marginTop: 8 },
  err: { color: '#d00', marginTop: 8 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  rowTitle: { fontWeight: '700' },
  rowMeta: { fontSize: 13, color: '#334155', marginTop: 4 },
});
