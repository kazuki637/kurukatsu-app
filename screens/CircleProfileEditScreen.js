import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import CommonHeader from '../components/CommonHeader';

export default function CircleProfileEditScreen() {
  return (
    <View style={styles.container}>
      <CommonHeader title="プロフィール編集" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.text}>この画面の内容は削除されました</Text>
        </View>
      </SafeAreaView>
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
    fontSize: 18,
    color: '#888',
  },
}); 