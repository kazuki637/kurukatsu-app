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






  const handleNext = async () => {
    // 3ページ目（onboarding3.png）で通知権限を要求
    if (page === 2) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          Alert.alert(
            '通知の許可が必要です',
            'サークルからの連絡を逃さないために、通知の許可をお願いします。設定から後で変更することもできます。',
            [
              { text: '設定を開く', onPress: () => Linking.openSettings() },
              { text: '後で', onPress: () => setPage(page + 1) }
            ]
          );
          return;
        }
        
        // 権限が許可されたら次のページに進む
        setPage(page + 1);
      } catch (error) {
        console.error('通知権限の取得に失敗:', error);
        // エラーが発生しても次のページに進む
        setPage(page + 1);
      }
    } else if (page < 3) {
      setPage(page + 1);
    } else if (onFinish) {
      onFinish();
    } else {
      navigation.replace('LoginScreen');
    }
  };

  const handleSkip = async () => {
    // スキップ時にも通知権限を要求
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          '通知の許可が必要です',
          'サークルからの連絡を逃さないために、通知の許可をお願いします。設定から後で変更することもできます。',
          [
            { text: '設定を開く', onPress: () => Linking.openSettings() },
            { text: '後で', onPress: () => {
              if (onFinish) onFinish();
              else navigation.replace('LoginScreen');
            }}
          ]
        );
        return;
      }
      
      // 権限が許可された場合、または既に許可されている場合は完了処理
      if (onFinish) onFinish();
      else navigation.replace('LoginScreen');
    } catch (error) {
      console.error('通知権限の取得に失敗:', error);
      // エラーが発生しても完了処理を実行
      if (onFinish) onFinish();
      else navigation.replace('LoginScreen');
    }
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