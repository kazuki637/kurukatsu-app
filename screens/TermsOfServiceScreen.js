import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import CommonHeader from '../components/CommonHeader';

export default function TermsOfServiceScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <CommonHeader 
        title="利用規約" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <SafeAreaView style={styles.contentSafeArea}>
        <WebView
          source={{ uri: 'https://kazuki637.github.io/kurukatsu-docs/terms.html' }}
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
    backgroundColor: '#f2f2f7',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  webview: {
    flex: 1,
  },
});