import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import CommonHeader from '../components/CommonHeader';

const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="ホーム" />
      <SafeAreaView style={styles.contentSafeArea}>
        <View style={styles.emptyContentContainer}>
          <Text style={styles.emptyContentText}>ホーム画面</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#eef2f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#eef2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContentText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;