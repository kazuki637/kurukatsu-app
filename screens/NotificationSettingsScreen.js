import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CommonHeader from '../components/CommonHeader';

export default function NotificationSettingsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <CommonHeader title="通知設定" />
      <View style={styles.container}>
        <Text style={styles.text}>NotificationSettingsScreen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});