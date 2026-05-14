import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { api, extractApiError } from '../api/client';
import type { MoreStackParamList } from '../navigation/types';

type Summary = {
  peerUserId: string;
  unreadCount: number;
  lastMessageAt: string | null;
  lastSnippet: string;
};

type Contact = { id: string; name: string; email: string };

export function ChatListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [inb, list] = await Promise.all([
        api.get<{ summaries: Summary[] }>('/api/messages/direct/inbox-summary'),
        api.get<{ users: Contact[] }>('/api/users/chat-list'),
      ]);
      setSummaries(inb.data.summaries ?? []);
      setContacts(list.data.users ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nameById = new Map(contacts.map(c => [c.id, c.name]));

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Chat</Text>
      <Text style={styles.muted}>Open a thread (same inbox + contacts as web).</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Text style={styles.h2}>Recent</Text>
      {summaries.map(s => (
        <TouchableOpacity
          key={s.peerUserId}
          style={styles.row}
          onPress={() =>
            navigation.navigate('ChatThread', {
              peerId: s.peerUserId,
              peerName: nameById.get(s.peerUserId),
            })
          }>
          <Text style={styles.name}>{nameById.get(s.peerUserId) ?? s.peerUserId}</Text>
          <Text style={styles.snip} numberOfLines={2}>
            {s.lastSnippet || '—'}
          </Text>
          {s.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{s.unreadCount > 99 ? '99+' : s.unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ))}

      <Text style={[styles.h2, { marginTop: 20 }]}>Contacts</Text>
      {contacts.map(c => (
        <TouchableOpacity
          key={c.id}
          style={styles.row}
          onPress={() =>
            navigation.navigate('ChatThread', { peerId: c.id, peerName: c.name })
          }>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.email}>{c.email}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  h2: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  muted: { color: '#334155', marginBottom: 12 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  name: { fontSize: 16, fontWeight: '600' },
  email: { color: '#334155', fontSize: 14 },
  snip: { color: '#334155', fontSize: 14, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#2a3670',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  err: { color: '#c00', marginVertical: 8 },
});
