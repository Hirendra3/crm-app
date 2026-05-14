import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { api, extractApiError } from '../api/client';
import type { MoreStackParamList } from '../navigation/types';

type Message = {
  _id: string;
  content: string;
  createdAt: string;
  senderId: unknown;
};

function senderLabel(m: Message): string {
  const s = m.senderId as { name?: string; email?: string } | string;
  if (typeof s === 'string') return s;
  return s?.name ?? s?.email ?? 'User';
}

type R = RouteProp<MoreStackParamList, 'BroadcastThread'>;

const PH = '#64748b';

export function BroadcastThreadScreen() {
  const {
    params: { departmentId, title },
  } = useRoute<R>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get<{ messages: Message[] }>(
        `/api/messages/group/${departmentId}`,
      );
      setMessages(data.messages ?? []);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setErr('');
    try {
      await api.post('/api/messages/group', { departmentId, content: text });
      setDraft('');
      await load();
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      <Text style={styles.header}>{title ?? 'Broadcast'}</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <ScrollView contentContainerStyle={styles.thread}>
        {messages.map(m => (
          <View key={m._id} style={styles.bubble}>
            <Text style={styles.meta}>{senderLabel(m)}</Text>
            <Text style={styles.txt}>{m.content}</Text>
            <Text style={styles.time}>
              {new Date(m.createdAt).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.compose}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Broadcast message"
          placeholderTextColor={PH}
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          style={[styles.send, sending && { opacity: 0.6 }]}
          disabled={sending}
          onPress={() => void send()}>
          <Text style={styles.sendTxt}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  thread: { padding: 16 },
  bubble: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#e8edf5',
  },
  meta: { fontWeight: '600', marginBottom: 4, color: '#2a3670' },
  txt: { fontSize: 16, color: '#172033' },
  time: { fontSize: 11, color: '#475569', marginTop: 4 },
  compose: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cbd5e1',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    padding: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#172033',
    marginRight: 8,
  },
  send: {
    backgroundColor: '#2a3670',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendTxt: { color: '#fff', fontWeight: '600' },
  err: { color: '#c00', paddingHorizontal: 16 },
});
