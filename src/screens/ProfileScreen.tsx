import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.title}>Profile</Text>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.row}>Name: {user.name}</Text>
          <Text style={styles.row}>Email: {user.email}</Text>
          <Text style={styles.row}>Role: {user.role}</Text>
          {user.designation ? (
            <Text style={styles.row}>Designation: {user.designation}</Text>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.logout}
        onPress={() => void logout()}>
        <Text style={styles.logoutTxt}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: colors.text },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { marginBottom: 8, color: colors.text, fontSize: 16 },
  logout: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#d00',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutTxt: { color: '#d00', fontWeight: '700' },
});
