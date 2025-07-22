import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions, SafeAreaView } from 'react-native';

const onboardingImages = [
  require('../assets/onboarding/onboarding1.jpg'),
  require('../assets/onboarding/onboarding2.jpg'),
  require('../assets/onboarding/onboarding3.jpg'),
  require('../assets/onboarding/onboarding4.jpg'),
];

export default function OnboardingScreen({ navigation, route, onFinish }) {
  const [page, setPage] = useState(0);

  const handleNext = () => {
    if (page < 3) setPage(page + 1);
    else if (onFinish) onFinish();
    else navigation.replace('LoginScreen');
  };

  const handleSkip = () => {
    if (onFinish) onFinish();
    else navigation.replace('LoginScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image source={onboardingImages[page]} style={styles.bgImage} resizeMode="cover" />
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