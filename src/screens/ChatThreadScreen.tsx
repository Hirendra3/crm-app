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

function senderId(m: Message): string {
  const s = m.senderId as { _id?: string } | string;
  if (typeof s === 'string') return s;
  return s?._id ?? '';
}

type R = RouteProp<MoreStackParamList, 'ChatThread'>;

const PH = '#64748b';

export function ChatThreadScreen() {
  const {
    params: { peerId, peerName },
  } = useRoute<R>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [hist, me] = await Promise.all([
        api.get<{ messages: Message[] }>('/api/messages/direct', {
          params: { withUserId: peerId, limit: 200 },
        }),
        api.get<{ user: { id: string } }>('/api/auth/me'),
      ]);
      setMessages(hist.data.messages ?? []);
      setMyId(me.data.user.id);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [peerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setErr('');
    try {
      const { data } = await api.post<{ message: Message }>('/api/messages/direct', {
        toUserId: peerId,
        content: text,
      });
      setDraft('');
      setMessages(prev => [...prev, data.message]);
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
      <Text style={styles.header}>{peerName ?? 'Chat'}</Text>
      {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <ScrollView contentContainerStyle={styles.thread}>
        {messages.map(m => {
          const mine = senderId(m) === myId;
          return (
            <View
              key={m._id}
              style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={mine ? styles.bubbleTxtMine : styles.bubbleTxt}>{m.content}</Text>
              <Text style={styles.time}>
                {new Date(m.createdAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.compose}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
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
  thread: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '88%',
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#2a3670' },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#e8edf5' },
  bubbleTxt: { color: '#172033', fontSize: 16 },
  bubbleTxtMine: { color: '#fff', fontSize: 16 },
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
