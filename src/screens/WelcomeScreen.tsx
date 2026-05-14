import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const BULLETS = [
  { icon: '👥', text: 'Employees, teams, attendance, and leave in one place.' },
  { icon: '💬', text: 'Chat, broadcast, and task updates aligned with the web app.' },
  { icon: '🔒', text: 'Secure sign-in with location check and optional email verification.' },
  { icon: '📱', text: 'Take Office CRM with you — same API as crm-web.' },
];

export function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>Office CRM</Text>
        </View>
        <Text style={styles.title}>Your workplace, in your pocket</Text>
        <Text style={styles.lead}>
          Sign in with your work account to access dashboard, tasks, mail from chat, alerts, and
          everything else your role allows — powered by the same backend as the browser app.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you can do</Text>
          {BULLETS.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>{b.icon}</Text>
              <Text style={styles.bulletText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnTxt}>Log in</Text>
        </TouchableOpacity>

        <Text style={styles.foot}>
          By continuing you agree to your organization’s use of this app. Location may be used at
          sign-in for trusted-device checks, as on the web.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
  },
  badgeTxt: { color: colors.primary, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
    marginBottom: 12,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  bulletRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  bulletIcon: { fontSize: 22, marginRight: 12, lineHeight: 26 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  foot: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
