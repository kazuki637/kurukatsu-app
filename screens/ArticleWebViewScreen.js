import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import CommonHeader from '../components/CommonHeader';

const ArticleWebViewScreen = ({ route, navigation }) => {
  const { url, title } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // URLが提供されていない場合のエラーハンドリング
  if (!url) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="記事詳細" 
          showBackButton={true}
          onBack={() => navigation.goBack()}
        />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>記事のURLが指定されていません</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // WebViewの読み込み完了時の処理
  const handleLoadEnd = () => {
    setLoading(false);
    setError(null);
  };

  // WebViewのエラー処理
  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError('記事の読み込みに失敗しました');
    setLoading(false);
  };

  // ネットワークエラーの処理
  const handleHttpError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView HTTP error:', nativeEvent);
    setError('ネットワークエラーが発生しました');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="記事詳細" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <SafeAreaView style={styles.contentSafeArea}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <WebView
            source={{ uri: url }}
            style={styles.webview}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={handleHttpError}
            // セキュリティ設定
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            // パフォーマンス設定
            cacheEnabled={true}
            cacheMode="LOAD_DEFAULT"
            // ユーザーエージェント設定
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentSafeArea: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ArticleWebViewScreen;
