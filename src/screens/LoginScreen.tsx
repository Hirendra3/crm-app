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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation, {type GeolocationError} from '@react-native-community/geolocation';
import { Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types/user';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

const inputExtras = {
  selectionColor: colors.primary,
  cursorColor: colors.primary,
  placeholderTextColor: colors.placeholder,
  underlineColorAndroid: 'transparent',
} as const;

type LoginResponse = {
  requiresMfa?: boolean;
  challengeId?: string;
  mfaMethod?: 'email' | 'totp';
  canSwitchToEmailOtp?: boolean;
  token?: string;
  user?: User;
};

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
  if (Platform.OS === 'ios') {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: 'whenInUse',
    });
    await new Promise<void>((resolve, reject) => {
      Geolocation.requestAuthorization(
        () => resolve(),
        err => reject(new Error(geoErrorMessage(err))),
      );
    });
    return;
  }
  const r = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (r !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error(
      'Location permission is required to sign in. Allow access and try again.',
    );
  }
}

function geoErrorMessage(err: GeolocationError): string {
  switch (err.code) {
    case 1:
      return 'Location permission is required to sign in. Allow access in Settings and try again.';
    case 2:
      return 'Location is unavailable. Turn on Location in device settings (and GPS if prompted), then try again.';
    case 3:
      return 'Location timed out. Go outdoors or wait for a GPS fix, then try again.';
    default:
      return (
        err.message ||
        'Could not read GPS. Ensure location services are enabled and try again.'
      );
  }
}

function getCurrentPositionOnce(
  options: Parameters<typeof Geolocation.getCurrentPosition>[2],
): Promise<{lat: number; lng: number; accuracyM?: number}> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }),
      reject,
      options,
    );
  });
}

async function getGeoOnce(): Promise<{lat: number; lng: number; accuracyM?: number}> {
  const timeout = 20_000;
  const attempts: NonNullable<Parameters<typeof Geolocation.getCurrentPosition>[2]>[] =
    [
      {enableHighAccuracy: false, timeout, maximumAge: 120_000},
      {enableHighAccuracy: true, timeout, maximumAge: 0},
    ];

  let lastErr: GeolocationError | undefined;
  for (const opts of attempts) {
    try {
      return await getCurrentPositionOnce(opts);
    } catch (e) {
      lastErr = e as GeolocationError;
    }
  }

  if (Platform.OS === 'android') {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: true,
      locationProvider: 'android',
    });
    try {
      return await getCurrentPositionOnce({
        enableHighAccuracy: true,
        timeout,
        maximumAge: 0,
      });
    } catch (e) {
      lastErr = e as GeolocationError;
    }
  }

  throw new Error(
    lastErr
      ? geoErrorMessage(lastErr)
      : 'Could not read GPS. Ensure location services are enabled and try again.',
  );
}

export function LoginScreen() {
  const { setAuth } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [mfaMethod, setMfaMethod] = useState<'email' | 'totp' | null>(null);
  const [canSwitchToEmailOtp, setCanSwitchToEmailOtp] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [mfaHint, setMfaHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const mfaPhase = !!challengeId;

  function resetMfa() {
    setChallengeId('');
    setMfaCode('');
    setMfaMethod(null);
    setCanSwitchToEmailOtp(false);
    setMfaHint('');
    setError('');
  }

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await requestLocationPermission();
      const geo = await getGeoOnce();
      const fingerprint = buildFingerprint();
      const { data } = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
        geo,
        fingerprint,
      });

      if (data.requiresMfa && data.challengeId) {
        setChallengeId(data.challengeId);
        setMfaMethod(data.mfaMethod === 'totp' ? 'totp' : 'email');
        setCanSwitchToEmailOtp(data.mfaMethod === 'totp' && !!data.canSwitchToEmailOtp);
        setMfaHint('');
        setError('');
        return;
      }
      if (data.token && data.user) {
        await setAuth(data.token, data.user);
      }
    } catch (e) {
      setError(
        extractApiError(e) ||
          'Login failed. Check email/password and location permission.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestEmailOtpInstead() {
    setError('');
    setMfaHint('');
    setEmailOtpLoading(true);
    try {
      await requestLocationPermission();
      const geo = await getGeoOnce();
      const fingerprint = buildFingerprint();
      const { data } = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
        geo,
        fingerprint,
        preferEmailOtp: true,
      });
      if (data.requiresMfa && data.challengeId && data.mfaMethod === 'email') {
        setChallengeId(data.challengeId);
        setMfaMethod('email');
        setCanSwitchToEmailOtp(false);
        setMfaCode('');
        setMfaHint('A new code was sent to your email.');
        return;
      }
      setError('Could not switch to email code. Try again.');
    } catch (e) {
      setError(extractApiError(e) || 'Could not send email code.');
    } finally {
      setEmailOtpLoading(false);
    }
  }

  async function verifyMfa() {
    setError('');
    const code = mfaCode.trim().replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      await requestLocationPermission();
      const geo = await getGeoOnce();
      const fingerprint = buildFingerprint();
      const { data } = await api.post<{ token: string; user: User }>(
        '/api/auth/login/verify',
        { challengeId, code, email, geo, fingerprint },
      );
      await setAuth(data.token, data.user);
    } catch (e) {
      setError(extractApiError(e) || 'Invalid or expired verification code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          {navigation.canGoBack() ? (
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backLinkTxt}>← Back to intro</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title}>Office CRM</Text>
          <Text style={styles.sub}>
            {mfaPhase
              ? mfaMethod === 'totp'
                ? 'Enter the code from your authenticator app.'
                : 'Enter the 6-digit code sent to your email.'
              : 'Sign in with your work account.'}
          </Text>

          {mfaPhase ? (
            <View style={styles.field}>
              <Text style={styles.label}>Verification code</Text>
              {mfaHint ? <Text style={styles.hint}>{mfaHint}</Text> : null}
              <TextInput
                value={mfaCode}
                onChangeText={t => setMfaCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoComplete="sms-otp"
                style={styles.input}
                {...inputExtras}
              />
              <TouchableOpacity
                style={[styles.btn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => {
                  void verifyMfa();
                }}>
                <Text style={styles.btnText}>Verify and continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSecondary, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => resetMfa()}>
                <Text style={styles.btnSecondaryText}>Back</Text>
              </TouchableOpacity>
              {canSwitchToEmailOtp ? (
                <TouchableOpacity
                  style={[styles.btnSecondary, (busy || emailOtpLoading) && styles.btnDisabled]}
                  disabled={busy || emailOtpLoading}
                  onPress={() => {
                    void requestEmailOtpInstead();
                  }}>
                  <Text style={styles.btnSecondaryText}>
                    {emailOtpLoading ? 'Sending…' : 'Email code instead'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@company.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCorrect={false}
                  spellCheck={false}
                  style={styles.input}
                  {...inputExtras}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry
                  autoComplete="password"
                  autoCorrect={false}
                  spellCheck={false}
                  style={styles.input}
                  {...inputExtras}
                />
              </View>
              <TouchableOpacity
                style={[styles.btn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => {
                  void submit();
                }}>
                <Text style={styles.btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.footnote}>
            Location is used at sign-in to match the web app’s trusted-device checks. Allow
            location when prompted.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    padding: 24,
    paddingTop: 24,
    flexGrow: 1,
  },
  backLink: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4 },
  backLinkTxt: { fontSize: 15, fontWeight: '600', color: colors.primary },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  sub: { marginTop: 8, color: colors.textSecondary, marginBottom: 24 },
  hint: { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
  field: { marginBottom: 16 },
  label: { marginBottom: 6, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 48,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSecondary: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  btnSecondaryText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: colors.error, marginTop: 12, marginBottom: 4 },
  footnote: {
    marginTop: 24,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
