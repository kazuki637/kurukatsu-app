import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, SafeAreaView, Alert, Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

const onboardingImages = [
  require('../assets/onboarding/onboarding1.png'),
  require('../assets/onboarding/onboarding2.png'),
  require('../assets/onboarding/onboarding3.png'),
  require('../assets/onboarding/onboarding4.png'),
];

export default function OnboardingScreen({ navigation, route, onFinish }) {
  const [page, setPage] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState(null);

  // 設定画面を開く関数
  const openSettings = async () => {
    try {
      // プラットフォーム固有の設定画面への移動
      if (Platform.OS === 'ios') {
        // iOS: 設定アプリを開く
        await Linking.openURL('App-Prefs:root=NOTIFICATIONS_ID');
      } else if (Platform.OS === 'android') {
        // Android: アプリ設定画面を開く
        await Linking.openURL('package:com.kurukatsu.app');
      }
    } catch (error) {
      console.log('設定画面を開けませんでした:', error);
      // エラーが発生した場合は手動設定の案内
      Alert.alert(
        '設定画面を開く',
        Platform.OS === 'ios' 
          ? '設定 > 通知 > KurukatsuApp から通知を有効にしてください。'
          : '設定 > アプリ > KurukatsuApp > 通知 から通知を有効にしてください。',
        [{ text: 'OK' }]
      );
    }
  };

  // 通知権限を要求する関数
  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // まだ権限が要求されていない場合のみ要求
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // 権限の状態を保存
      setNotificationPermission(finalStatus);
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          '通知権限が必要です',
          'サークルの活動に関する重要な情報をお見逃しなく。設定から通知を有効にしてください。',
          [
            { text: '後で設定', style: 'cancel' },
            { 
              text: '設定を開く', 
              onPress: openSettings
            }
          ]
        );
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('通知権限の要求中にエラーが発生しました:', error);
      setNotificationPermission('error');
      return false;
    }
  };

  const handleNext = async () => {
    if (page === 2) {
      // オンボーディング3画面で「次へ」ボタンを押したとき
      console.log('通知権限を要求しています...');
      const permissionGranted = await requestNotificationPermission();
      console.log('通知権限の結果:', permissionGranted ? '許可' : '拒否/エラー');
      // 権限の結果に関係なく次の画面に進む
      setPage(page + 1);
    } else if (page < 3) {
      setPage(page + 1);
    } else if (onFinish) {
      onFinish();
    } else {
      navigation.replace('LoginScreen');
    }
  };

  const handleSkip = async () => {
    // スキップ時にも通知権限要求を実行
    console.log('スキップ時に通知権限を要求しています...');
    await requestNotificationPermission();
    
    if (onFinish) onFinish();
    else navigation.replace('LoginScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
              <Image source={onboardingImages[page]} style={styles.bgImage} contentFit="cover" />
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.mainButton} onPress={handleNext}>
          <Text style={styles.buttonText}>{page < 3 ? '次へ' : '新規登録・ログイン'}</Text>
        </TouchableOpacity>
        <View style={{ height: 48, justifyContent: 'center', alignItems: 'center' }}>
          {page === 0 && (
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>スキップ</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  bgImage: { position: 'absolute', width, height },
  bottomBar: {
    position: 'absolute', bottom: 30, width: '100%',
    alignItems: 'center', padding: 24, backgroundColor: 'rgba(255,255,255,0.0)'
  },
  mainButton: {
    width: '100%', backgroundColor: '#007bff', borderRadius: 24,
    paddingVertical: 18, alignItems: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  skipText: { color: '#007bff', fontSize: 16, marginTop: 20},
}); 