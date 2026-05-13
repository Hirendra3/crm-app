import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { MoreStackParamList } from '../navigation/types';

type LinkRow =
  | { title: string; go: 'users' }
  | { title: string; go: 'placeholder' };

const LINKS: LinkRow[] = [
  { title: 'Employees', go: 'users' },
  { title: 'Departments', go: 'placeholder' },
  { title: 'Team', go: 'placeholder' },
  { title: 'Chat', go: 'placeholder' },
  { title: 'Broadcast', go: 'placeholder' },
  { title: 'Leave', go: 'placeholder' },
  { title: 'Audit log', go: 'placeholder' },
  { title: 'Sessions', go: 'placeholder' },
];

export function MoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.title}>More</Text>
      <Text style={styles.sub}>Shortcuts to CRM areas.</Text>

      <TouchableOpacity
        style={styles.primary}
        onPress={() => navigation.navigate('AttendanceMe')}>
        <Text style={styles.primaryText}>My attendance</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondary}
        onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.secondaryText}>Profile & settings</Text>
      </TouchableOpacity>

      {LINKS.map(l => (
        <TouchableOpacity
          key={l.title}
          style={styles.row}
          onPress={() =>
            l.go === 'users'
              ? navigation.navigate('Users')
              : navigation.navigate('Placeholder', { title: l.title })
          }>
          <Text style={styles.rowTxt}>{l.title}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700' },
  sub: { color: '#52637c', marginTop: 6, marginBottom: 16 },
  primary: {
    backgroundColor: '#2a3670',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: '#2a3670',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  secondaryText: { color: '#2a3670', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d7e0ee',
  },
  rowTxt: { fontSize: 16, fontWeight: '600' },
  arrow: { fontSize: 20, color: '#8b9cb3' },
});
