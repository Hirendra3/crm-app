import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { MoreStackParamList } from '../navigation/types';

type R = RouteProp<MoreStackParamList, 'Placeholder'>;

export function PlaceholderScreen() {
  const { params } = useRoute<R>();
  const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  return (
    <View style={styles.pad}>
      <Text style={styles.title}>{params.title}</Text>
      <Text style={styles.sub}>
        Native screen scaffold. Port the matching web flows from{' '}
        <Text style={{ fontFamily: mono }}>crm-web</Text> when this area is prioritized.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { marginTop: 10, color: '#52637c', lineHeight: 22 },
});
