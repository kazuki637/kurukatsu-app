import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import CommonHeader from '../components/CommonHeader';

export default function CircleMemberScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <CommonHeader title="メンバー" />
        <View style={styles.content}>
          <Text style={styles.text}>CircleMemberScreen</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
}); 