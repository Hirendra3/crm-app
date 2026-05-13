/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { View, Text } from 'react-native';

test('smoke: React Native renders', () => {
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <View>
        <Text>Office CRM Mobile</Text>
      </View>,
    );
  });
});
