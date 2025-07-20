import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CommonHeader from '../components/CommonHeader';

export default function HelpScreen() {
  return (
    <View style={{ flex: 1 }}>
      <CommonHeader title="ヘルプ" />
      <View style={styles.container}>
        <Text style={styles.text}>HelpScreen</Text>
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