import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import CommonHeader from '../components/CommonHeader';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <CommonHeader 
        title="プライバシーポリシー" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <SafeAreaView style={styles.contentSafeArea}>
        <WebView
          source={{ uri: 'https://kazuki637.github.io/kurukatsu-docs/privacy.html' }}
          style={styles.webview}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // 背景色を追加
  },
  contentSafeArea: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});