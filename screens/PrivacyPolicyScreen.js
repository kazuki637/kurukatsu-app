import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CommonHeader from '../components/CommonHeader';

export default function PrivacyPolicyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <CommonHeader title="プライバシーポリシー" />
      <View style={styles.container}>
        <Text style={styles.text}>PrivacyPolicyScreen</Text>
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