import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { Dimensions } from 'react-native';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types/user';

function buildFingerprint() {
  const { width, height } = Dimensions.get('window');
  const osName = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const key = `${Platform.Version}|RN|${osName}|${width}x${height}|${tz}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const deviceFingerprint = `fp-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  return { deviceFingerprint, browserName: 'ReactNative', osName };
}

async function requestLocationPermission(): Promise<void> {
  if (Platform.OS === 'android') {
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (r !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error(
        'Location permission is required to sign in. Allow access and try again.',
      );
    }
  }
}

function getGeoOnce(): Promise<{ lat: number; lng: number; accuracyM?: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }),
      () =>
        reject(
          new Error(
            'Could not read GPS. Ensure location services are enabled and try again.',
          ),
        ),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60_000,
      },
    );
  });
}

export function LoginScreen() {
  const { setAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await requestLocationPermission();
      const geo = await getGeoOnce();
      const fingerprint = buildFingerprint();
      const { data } = await api.post<{
        token?: string;
        user?: User;
        requiresMfa?: boolean;
        challengeId?: string;
      }>('/api/auth/login', {
        email,
        password,
        geo,
        fingerprint,
      });

      if (data.requiresMfa && data.challengeId) {
        setChallengeId(data.challengeId);
        return;
      }
      if (data.token && data.user) {
        await setAuth(data.token, data.user);
      }
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa() {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post<{ token: string; user: User }>(
        '/api/auth/login/verify',
        { challengeId, code: mfaCode, email },
      );
      await setAuth(data.token, data.user);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Office CRM</Text>
        <Text style={styles.sub}>Sign in with your work account.</Text>

        {challengeId ? (
          <View style={styles.field}>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              value={mfaCode}
              onChangeText={setMfaCode}
              placeholder="6-digit code"
              keyboardType="number-pad"
              autoCapitalize="none"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.btn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => void verifyMfa()}>
              <Text style={styles.btnText}>Verify code</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!challengeId ? (
          <TouchableOpacity
            style={[styles.btn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => void submit()}>
            <Text style={styles.btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
    paddingTop: 80,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#172033' },
  sub: { marginTop: 8, color: '#52637c', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { marginBottom: 6, fontWeight: '600', color: '#172033' },
  input: {
    borderWidth: 1,
    borderColor: '#d7e0ee',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#2a3670',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#ff5c5c', marginBottom: 12 },
});
