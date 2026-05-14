import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { api, extractApiError } from '../api/client';
import { colors } from '../theme/colors';
import { cardShadow, headerShadow } from '../theme/shadows';

export type MailSourceFilter = 'all' | 'chat' | 'task' | 'broadcast' | 'leave';

type UnifiedMailRow = {
  id: string;
  source: 'chat' | 'task' | 'broadcast' | 'leave';
  direction: 'sent' | 'received' | 'observer';
  at: string;
  emailSubject: string;
  body: string;
  preview: string;
  senderName?: string;
  receiverName?: string;
  recipientEmail?: string;
  status?: 'sent' | 'failed';
  error?: string;
  counterpartyName?: string;
  counterpartyEmail?: string;
  taskId?: string;
  taskTitle?: string;
  broadcastTopic?: string;
  departmentId?: string;
  leaveId?: string;
  leaveStatus?: string;
};

const FILTER_CHIPS: { key: MailSourceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chat', label: 'Chat' },
  { key: 'task', label: 'Task' },
  { key: 'broadcast', label: 'Broadcast' },
  { key: 'leave', label: 'Leave' },
];

function directionLabel(d: UnifiedMailRow['direction']): string {
  if (d === 'observer') return 'Invite';
  return d === 'sent' ? 'Sent' : 'Received';
}

function contextLine(item: UnifiedMailRow): string {
  if (item.source === 'task') {
    const t = item.taskTitle?.trim();
    return t ? `Task: ${t}` : 'Task email';
  }
  if (item.source === 'broadcast') {
    const top = item.broadcastTopic?.trim();
    return top ? `Broadcast: ${top}` : 'Broadcast invite';
  }
  if (item.source === 'leave') {
    const st = item.leaveStatus?.trim();
    const who = item.counterpartyName?.trim() || item.counterpartyEmail?.trim();
    if (item.direction === 'sent') return st ? `Your request · ${st}` : 'Your leave request';
    return who ? `Applicant: ${who}` : 'Leave request';
  }
  const n = item.counterpartyName?.trim();
  const e = item.counterpartyEmail?.trim();
  if (n && e) return `${n} · ${e}`;
  return n || e || '—';
}

export function MailScreen() {
  const [source, setSource] = useState<MailSourceFilter>('all');
  const [items, setItems] = useState<UnifiedMailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get<{ items: UnifiedMailRow[]; source?: string }>('/api/messages/mail-unified', {
        params: { limit: 120, source },
      });
      setItems(data.items ?? []);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [source]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const onSelectFilter = useCallback((next: MailSourceFilter) => {
    setOpenId(null);
    setItems([]);
    setSource(next);
    setLoading(true);
  }, []);

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.hint}>Loading mail…</Text>
        </View>
      </View>
    );
  }

  const emptyCopy =
    source === 'all'
      ? 'No mail yet. Chat, task, broadcast, and leave activity will appear here when available.'
      : `No ${FILTER_CHIPS.find(c => c.key === source)?.label ?? source} mail.`;

  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        <Text style={styles.bannerEyebrow}>Unified inbox</Text>
        <Text style={styles.bannerTitle}>Mail</Text>
        <Text style={styles.bannerSub}>
          Chat, task, broadcast, and leave messages in one place. Use the chips to narrow the list.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled">
          {FILTER_CHIPS.map(chip => {
            const active = source === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => onSelectFilter(chip.key)}
                activeOpacity={0.85}>
                <Text style={[styles.filterChipTxt, active && styles.filterChipTxtActive]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {loading && items.length > 0 ? (
        <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} />
      ) : null}
      <FlatList
        data={items}
        keyExtractor={r => r.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={<Text style={styles.empty}>{emptyCopy}</Text>}
        renderItem={({ item }) => {
          const expanded = openId === item.id;
          const dir = item.direction;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setOpenId(expanded ? null : item.id)}>
              <View style={styles.rowTop}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.badge,
                      dir === 'sent'
                        ? styles.badgeSent
                        : dir === 'received'
                          ? styles.badgeRecv
                          : styles.badgeObs,
                    ]}>
                    <Text
                      style={[
                        styles.badgeTxt,
                        dir === 'received' && styles.badgeTxtRecv,
                        dir === 'observer' && styles.badgeTxtObs,
                      ]}>
                      {directionLabel(dir)}
                    </Text>
                  </View>
                  <View style={[styles.srcBadge, sourceStyle(item.source)]}>
                    <Text style={styles.srcBadgeTxt}>{sourceLabel(item.source)}</Text>
                  </View>
                </View>
                <Text style={styles.date}>{new Date(item.at).toLocaleString()}</Text>
              </View>
              <Text style={styles.subject} numberOfLines={2}>
                {item.emailSubject || '(No subject)'}
              </Text>
              <View style={styles.fromToRow}>
                <Text style={styles.fromToLabel}>From</Text>
                <Text style={styles.fromToVal} numberOfLines={1}>
                  {item.senderName?.trim() || '—'}
                </Text>
              </View>
              <View style={styles.fromToRow}>
                <Text style={styles.fromToLabel}>To</Text>
                <Text style={styles.fromToVal} numberOfLines={2}>
                  {item.receiverName?.trim() || item.recipientEmail?.trim() || '—'}
                </Text>
              </View>
              <Text style={styles.cp} numberOfLines={2}>
                {contextLine(item)}
              </Text>
              {item.status === 'failed' ? (
                <Text style={styles.failed}>Failed{item.error ? `: ${item.error}` : ''}</Text>
              ) : null}
              {expanded ? (
                <View style={styles.bodyBox}>
                  <Text style={styles.bodyLabel}>From</Text>
                  <Text style={styles.body}>{item.senderName?.trim() || '—'}</Text>
                  <Text style={[styles.bodyLabel, { marginTop: 10 }]}>To</Text>
                  <Text style={styles.body}>
                    {item.receiverName?.trim() || item.recipientEmail?.trim() || '—'}
                  </Text>
                  <Text style={[styles.bodyLabel, { marginTop: 10 }]}>Message</Text>
                  <Text style={styles.body}>{item.body || item.preview || '—'}</Text>
                </View>
              ) : (
                <Text style={styles.tapHint} numberOfLines={2}>
                  {item.preview || 'Tap for details'}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function sourceLabel(s: UnifiedMailRow['source']): string {
  if (s === 'chat') return 'Chat';
  if (s === 'task') return 'Task';
  if (s === 'broadcast') return 'Broadcast';
  return 'Leave';
}

function sourceStyle(s: UnifiedMailRow['source']) {
  if (s === 'task') return { backgroundColor: '#e0e7ff' };
  if (s === 'broadcast') return { backgroundColor: '#fae8ff' };
  if (s === 'leave') return { backgroundColor: '#ffedd5' };
  return { backgroundColor: colors.primarySoft };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 24 },
  loaderCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 32,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  hint: { marginTop: 14, fontSize: 14, fontWeight: '600', color: colors.textMuted },
  banner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...headerShadow,
  },
  bannerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  bannerSub: { marginTop: 8, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipTxt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterChipTxtActive: { color: colors.primary, fontWeight: '700' },
  err: { color: colors.error, paddingHorizontal: 16, paddingVertical: 8 },
  listPad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32, fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeSent: { backgroundColor: colors.primarySoft },
  badgeRecv: { backgroundColor: '#ecfdf5' },
  badgeObs: { backgroundColor: '#f3f4f6' },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: colors.primary },
  badgeTxtRecv: { color: '#047857' },
  badgeTxtObs: { color: colors.textSecondary },
  srcBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  srcBadgeTxt: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  date: { fontSize: 12, color: colors.textMuted },
  subject: { marginTop: 10, fontSize: 16, fontWeight: '700', color: colors.text },
  fromToRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, gap: 8 },
  fromToLabel: { width: 44, fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  fromToVal: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  cp: { marginTop: 6, fontSize: 14, color: colors.textSecondary },
  failed: { marginTop: 6, color: colors.error, fontSize: 13 },
  tapHint: { marginTop: 8, fontSize: 12, color: colors.textMuted },
  bodyBox: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bodyLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  body: { marginTop: 4, fontSize: 14, color: colors.text, lineHeight: 20 },
});
