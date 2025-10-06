import React, { useEffect, useRef, useState } from 'react';
import { 
    View, 
    TouchableOpacity, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    Alert, 
    Linking, 
    Image, 
    Animated,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import KurukatsuButton from '../components/KurukatsuButton';

const { width: screenWidth } = Dimensions.get('window');

// --- AnimatedIcon Component ---
const AnimatedIcon = ({ source, style }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 浮遊アニメーション
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // スケールアニメーション（登場時）
    const scaleAnimation = Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    });

    // 微細な回転アニメーション
    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    scaleAnimation.start();
    floatingAnimation.start();
    rotateAnimation.start();

    return () => {
      floatingAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-3deg', '3deg'],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [
            { translateY: floatAnim },
            { scale: scaleAnim },
            { rotate: rotate },
          ],
        },
      ]}
    >
      <Image source={source} style={style} resizeMode="contain" />
    </Animated.View>
  );
};

// --- Animated Text Component ---
const AnimatedText = ({ text, style, delay = 0 }) => {
  const animatedValues = useRef(
    text.split('').map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Reset animations when text changes
    animatedValues.forEach(val => val.setValue(0));

    const animations = animatedValues.map((animValue, index) =>
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300, // アニメーション時間を大幅短縮
        delay: delay + index * 20, // 文字ごとのディレイをさらに短縮
        useNativeDriver: true,
      })
    );

    Animated.stagger(15, animations).start(); // ステガー間隔も短縮
  }, [text]); // textが変更されたらアニメーションを再実行

  return (
    <View style={styles.animatedTextContainer}>
      {text.split('').map((char, index) => (
        <Animated.Text
          key={`${char}-${index}`}
          style={[
            style,
            {
              opacity: animatedValues[index],
              transform: [
                {
                  translateY: animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0], // 移動距離を調整
                  }),
                },
              ],
            },
          ]}
        >
          {char === ' ' ? '\u00A0' : char}
        </Animated.Text>
      ))}
    </View>
  );
};

// --- Onboarding Data ---
const onboardingSlides = [
  {
    key: '1',
    title: 'ようこそ！',
    description: 'サークル活動をもっと楽しくもっと便利に',
  },
  {
    key: '2',
    title: 'サークル検索',
    description: '自分に合ったサークルが見つかる',
  },
  {
    key: '3',
    title: '連絡を見逃さない',
    description: '通知をオンにしておこう',
  },
];

// --- Main Onboarding Screen Component ---
export default function OnboardingScreen({ navigation, onFinish }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollViewRef = useRef(null);


  const handleNext = () => {
      if (activeIndex < onboardingSlides.length - 1) {
          const nextIndex = activeIndex + 1;
          setIsTransitioning(true); // 遷移開始フラグ
          
          // スライド遷移を実行
          scrollViewRef.current?.scrollTo({
              x: screenWidth * nextIndex,
              animated: true,
          });
          
          // 遷移完了後にactiveIndexを更新し、遷移フラグをリセット
          setTimeout(() => {
              setActiveIndex(nextIndex);
              setIsTransitioning(false);
          }, 300); // スライドアニメーション時間に合わせて調整
      } else {
          handleComplete();
      }
  }







  // --- Notification Permission Logic ---
  const handleComplete = async () => {
    setIsTransitioning(true); // 完了処理開始時にローディング状態にする
    
    // 通知権限を要求
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          '通知の許可をお願いします',
          'サークルからの大切な連絡を見逃さないために、通知をオンにすることをおすすめします。設定は後からいつでも変更できます。',
          [
            { text: '設定を開く', onPress: () => Linking.openSettings() },
            { text: '後で', style: 'cancel', onPress: () => {
              if (onFinish) onFinish();
              else navigation.replace('LoginScreen');
            }}
          ]
        );
        setIsTransitioning(false); // アラート表示時はローディング解除
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
    // 遷移が完了するため、setIsTransitioning(false)は不要
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      >
        {onboardingSlides.map((slide) => (
          <View style={styles.slide} key={slide.key}>
            {/* テキストを画面上部に配置（全画面共通の高さ維持） */}
            <View style={styles.topTextContainer}>
              {/* クルカツアイコンを角丸で表示（絶対位置固定） */}
              <View style={styles.iconContainer}>
                <Image 
                  source={require('../assets/icon.png')}
                  style={styles.kurukatsuIcon}
                  resizeMode="contain"
                />
              </View>
              
              {/* テキスト部分も絶対位置で固定 */}
              <View style={styles.textContentContainer}>
                {/* アクティブなスライドのテキストのみ表示 */}
                {activeIndex === parseInt(slide.key, 10) - 1 && (
                  <>
                    {/* 遷移中はアニメーションなしで表示 */}
                    {!isTransitioning ? (
                      <>
                        <AnimatedText 
                           text={slide.title}
                           style={styles.slideTitle}
                           delay={50}
                       />
                        <AnimatedText 
                           text={slide.description}
                           style={styles.slideDescription}
                           delay={150}
                       />
                      </>
                    ) : (
                      <>
                        <Text style={styles.slideTitle}>{slide.title}</Text>
                        <Text style={styles.slideDescription}>{slide.description}</Text>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
            
            {/* 全画面共通のアニメーションコンテナ（高さ統一） */}
            <View style={styles.animationContainer}>
              {/* 1画面目のアニメーション */}
              {slide.key === '1' && (
                <LottieView
                  source={require('../assets/animations/SocialMediaMarketing.json')}
                  autoPlay
                  loop
                  style={styles.lottieAnimation}
                />
              )}
              
              {/* 2画面目のアニメーション */}
              {slide.key === '2' && (
                <LottieView
                  source={require('../assets/animations/search.json')}
                  autoPlay
                  loop
                  style={styles.lottieAnimation}
                />
              )}
              
              {/* 3画面目のアニメーション */}
              {slide.key === '3' && (
                <LottieView
                  source={require('../assets/animations/Notification bell.json')}
                  autoPlay
                  loop
                  style={styles.bellAnimation}
                />
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <KurukatsuButton
          title={activeIndex === 0 ? 'はじめる' : '次へ'}
          onPress={handleNext}
          size="medium"
          variant="primary"
          hapticFeedback={true}
          disabled={isTransitioning}
          loading={isTransitioning}
        />
      </View>
    </SafeAreaView>
  );
}

// --- Upgraded Styles ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width: screenWidth,
    height: '100%', // 高さを固定
    position: 'relative', // 絶対位置の基準
  },
  topTextContainer: {
    position: 'absolute',
    top: 120, // 絶対位置で固定
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200, // 固定高さ
  },
  iconContainer: {
    position: 'absolute',
    top: 0, // topTextContainer内での位置
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80, // アイコンの高さ
  },
  kurukatsuIcon: {
    width: 80,
    height: 80,
    borderRadius: 20, // 角丸にする
    backgroundColor: '#fff', // 背景色（必要に応じて）
  },
  textContentContainer: {
    position: 'absolute',
    top: 100, // アイコンの下に配置
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100, // テキスト領域の固定高さ
  },
  animationContainer: {
    position: 'absolute',
    top: 350, // 絶対位置で固定
    left: screenWidth * 0.05, // 中央配置のための左マージン
    width: screenWidth * 0.9, // 画面幅の90%
    height: screenWidth * 0.9, // 正方形
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieAnimation: {
    width: screenWidth * 0.9, // コンテナと同じサイズ
    height: screenWidth * 0.9, // コンテナと同じサイズ
  },
  bellAnimation: {
    width: screenWidth * 0.9, // コンテナと同じサイズ
    height: screenWidth * 0.9, // コンテナと同じサイズ
    alignSelf: 'center', // 中央配置を強制
    marginLeft: 20, // 左寄りを補正
    marginRight: 0, // 右寄りを補正
  },
  textPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // アニメーションとの間隔
  },
  animatedTextContainer: {
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center',
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1D2A3F',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 18, // フォントサイズを16から20に拡大
    color: '#697488',
    textAlign: 'center',
    lineHeight: 24, // ラインハイトも調整
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 汎用性を考慮した3Dボタンスタイル
  kurukatsuButtonContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 5,
  },
  kurukatsuButtonShadow: {
    position: 'absolute',
    bottom: -5,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#2E6BC7', // デフォルトの影色（カスタマイズ可能）
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kurukatsuButtonMain: {
    width: '100%', 
    backgroundColor: '#3A82F7', // デフォルトの背景色（カスタマイズ可能）
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    minHeight: 48, // 最小高さを保証
  },
  kurukatsuButtonText: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '600',
    textAlign: 'center',
  },
  // 後方互換性のためのエイリアス
  buttonContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 5,
  },
  shadowLayer: {
    position: 'absolute',
    bottom: -5,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#2E6BC7',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: '100%', 
    backgroundColor: '#3A82F7', 
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '600',
  },
}); 