import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { api, extractApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types/user';
import type { MainTabParamList, MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Task = {
  _id: string;
  title: string;
  status: string;
  deadline: string;
};

type DashNav = BottomTabNavigationProp<MainTabParamList>;

function QuickTile({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.88}>
      <Text style={styles.tileEmoji}>{emoji}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatPill({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<DashNav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [people, setPeople] = useState<{ id: string; name: string; role: string }[]>([]);
  const [tasksPreview, setTasksPreview] = useState<Task[]>([]);
  const [kpis, setKpis] = useState<{
    attendanceEntriesThisMonth: number;
    pendingLeaveRequests: number;
    openTasks: number;
  } | null>(null);

  const role = user?.role;

  const goMore = useCallback(
    (
      screen: keyof MoreStackParamList,
      params?: MoreStackParamList[keyof MoreStackParamList],
    ) => {
      if (params !== undefined) {
        navigation.navigate('MoreFlow', { screen, params } as never);
      } else {
        navigation.navigate('MoreFlow', { screen } as never);
      }
    },
    [navigation],
  );

  const load = useCallback(async () => {
    if (!role) return;
    setError('');
    try {
      let tasksSlice: Task[] = [];
      if (role === 'ADMIN' || role === 'HR') {
        const r = await api.get<{ tasks: Task[] }>('/api/tasks/all', { params: { limit: 8 } });
        tasksSlice = r.data.tasks ?? [];
      } else if (role === 'LEADER') {
        const r = await api.get<{ tasks: Task[] }>('/api/tasks/team');
        tasksSlice = (r.data.tasks ?? []).slice(0, 8);
      } else if (role === 'MEMBER') {
        const r = await api.get<{ tasks: Task[] }>('/api/tasks/my', { params: { limit: 8 } });
        tasksSlice = r.data.tasks ?? [];
      }

      const [uRes, kRes] = await Promise.all([
        role === 'ADMIN' || role === 'HR'
          ? api.get<{ users: User[] }>('/api/users')
          : role === 'LEADER'
            ? api.get<{ users: User[] }>('/api/team/members')
            : Promise.resolve(null),
        role === 'ADMIN' || role === 'LEADER' || role === 'HR'
          ? api.get<{
              kpis: {
                attendanceEntriesThisMonth: number;
                pendingLeaveRequests: number;
                openTasks: number;
              };
            }>('/api/reports/kpis')
          : Promise.resolve(null),
      ]);

      setTasksPreview(tasksSlice);

      if (uRes && 'data' in uRes) {
        setPeople(
          (uRes.data.users ?? []).slice(0, 8).map(x => ({
            id: x.id,
            name: x.name,
            role: x.role,
          })),
        );
      } else {
        setPeople([]);
      }

      if (kRes && 'data' in kRes) {
        setKpis(kRes.data.kpis);
      } else {
        setKpis(null);
      }
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (!user) return null;

  const avatarUri = user.avatarUrl?.trim();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroEyebrow}>Office CRM</Text>
            <Text style={styles.heroTitle}>Hello, {user.name.split(' ')[0]}</Text>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipTxt}>{user.role}</Text>
            </View>
            <Text style={styles.heroSub}>{user.email}</Text>
          </View>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.heroAvatar} accessibilityLabel="Profile photo" />
          ) : (
            <View style={styles.heroAvatarPlaceholder} accessibilityLabel="Profile placeholder">
              <Text style={styles.heroAvatarInitial}>{user.name.trim().charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shortcuts</Text>
      <View style={styles.tileGrid}>
        <QuickTile emoji="💬" label="Chat" onPress={() => goMore('ChatList')} />
        <QuickTile emoji="📣" label="Broadcast" onPress={() => goMore('BroadcastList')} />
        <QuickTile emoji="🏖️" label="Leave" onPress={() => goMore('Leave')} />
        <QuickTile emoji="🔔" label="Alerts" onPress={() => goMore('Notifications')} />
      </View>

      <TouchableOpacity style={styles.primaryRow} onPress={() => navigation.navigate('Tasks')}>
        <Text style={styles.primaryRowEmoji}>📋</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.primaryRowTitle}>Tasks</Text>
          <Text style={styles.primaryRowSub}>Open your task list</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryRow} onPress={() => navigation.navigate('Mail')}>
        <Text style={styles.primaryRowEmoji}>✉️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.primaryRowTitle}>Mail</Text>
          <Text style={styles.primaryRowSub}>Sent & received chat emails</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <>
          {kpis ? (
            <>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsRow}>
                <StatPill icon="📅" value={kpis.attendanceEntriesThisMonth} label="Attendance rows" />
                <StatPill icon="⏳" value={kpis.pendingLeaveRequests} label="Pending leave" />
                <StatPill icon="✅" value={kpis.openTasks} label="Open tasks" />
              </View>
            </>
          ) : null}

          {people.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>People</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {people.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.personChip}
                    onPress={() => goMore('UserDetail', { userId: p.id })}>
                    <Text style={styles.personChipName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.personChipRole}>{p.role}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Recent tasks</Text>
          <View style={styles.card}>
            {tasksPreview.length === 0 ? (
              <Text style={styles.muted}>No tasks to show.</Text>
            ) : (
              tasksPreview.map(t => (
                <View key={t._id} style={styles.taskRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {t.title}
                    </Text>
                    <Text style={styles.taskMeta}>
                      Due {new Date(t.deadline).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillTxt}>{t.status}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroTextCol: { flex: 1, minWidth: 0 },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroAvatarInitial: { fontSize: 28, fontWeight: '800', color: '#fff' },
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 14, marginTop: 10 },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  roleChipTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  tile: {
    width: '47%',
    minWidth: '46%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tileEmoji: { fontSize: 28, marginBottom: 8 },
  tileLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryRowEmoji: { fontSize: 26, marginRight: 12 },
  primaryRowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  primaryRowSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  chev: { fontSize: 22, color: colors.textMuted, marginLeft: 8 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  statPill: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  chipScroll: { paddingLeft: 16, marginBottom: 4 },
  personChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 160,
  },
  personChipName: { fontWeight: '700', color: colors.text, fontSize: 14 },
  personChipRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  card: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  taskMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statusPill: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  statusPillTxt: { fontSize: 11, fontWeight: '700', color: colors.primary },
  muted: { color: colors.textSecondary },
  err: { color: colors.error, marginHorizontal: 16, marginTop: 16 },
});
