import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ホーム</Text>
      </View>
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
  header: {
    width: '100%',
    height: 115, // ヘッダーの縦幅を調整
    paddingTop: StatusBar.currentHeight, // ステータスバーの高さ分を確保
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    position: 'absolute',
    bottom: 10, // ヘッダー下部からの距離を調整
    left: 0,
    right: 0,
    textAlign: 'center',
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