import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { navItemsForRole } from '../navigation/navConfig';
import type { MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/shadows';

const SCREEN_ICONS: Partial<Record<keyof MoreStackParamList, string>> = {
  Departments: '🏢',
  Users: '👥',
  Candidates: '📋',
  Team: '👤',
  BroadcastList: '📣',
  ChatList: '💬',
  Notifications: '🔔',
  AttendanceMark: '✓',
  AttendanceMe: '📅',
  AttendanceReport: '📊',
  Leave: '🏖️',
  Audit: '🔍',
  Sessions: '🔐',
  TeamLocation: '📍',
  Profile: '⚙️',
};

export function MoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { user } = useAuth();
  const links = navItemsForRole(user?.role);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.pad, { paddingBottom: 32 + insets.bottom }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Office CRM</Text>
        <Text style={styles.title}>More</Text>
        <Text style={styles.sub}>Tools and screens for your role — same modules as the web app.</Text>
      </View>

      {links.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No menu yet</Text>
          <Text style={styles.emptyBody}>Sign in again if your account role should include these tools.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {links.map(l => {
            const icon = SCREEN_ICONS[l.screen] ?? '▸';
            return (
              <TouchableOpacity
                key={`${String(l.screen)}-${l.label}`}
                style={styles.card}
                activeOpacity={0.72}
                onPress={() => {
                  if (l.params !== undefined) {
                    (navigation.navigate as (a: keyof MoreStackParamList, b?: unknown) => void)(l.screen, l.params);
                  } else {
                    (navigation.navigate as (a: keyof MoreStackParamList) => void)(l.screen);
                  }
                }}>
                <View style={styles.iconBubble}>
                  <Text style={styles.iconTxt}>{icon}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.rowTitle}>{l.label}</Text>
                  <Text style={styles.rowHint}>Open</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 20, paddingTop: 8 },
  hero: {
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { marginTop: 8, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconTxt: { fontSize: 20 },
  cardBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowHint: { marginTop: 2, fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.border, fontWeight: '300', marginLeft: 8 },
  emptyCard: {
    padding: 24,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyBody: { marginTop: 8, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});
