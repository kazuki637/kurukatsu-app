import React, { useEffect, useRef, useState } from 'react';
import { 
    View, 
    TouchableOpacity, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    Alert, 
    Linking, 
    Animated,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import KurukatsuButton from '../components/KurukatsuButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
            {/* テキストとアイコンセクション */}
            <View style={styles.topSection}>
              {/* クルカツアイコンを角丸で表示 */}
              <View style={styles.iconContainer}>
                <Image 
                  source={require('../assets/icon.png')}
                  style={styles.kurukatsuIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
              
              {/* テキスト部分 */}
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
            
            {/* アニメーションセクション */}
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
            
            {/* ボタン用のスペーサー */}
            <View style={styles.bottomSpacer} />
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
// 利用可能な画面高さを計算（SafeAreaとボタン領域を除く）
const BUTTON_CONTAINER_HEIGHT = Platform.OS === 'ios' ? 140 : 130; // ボタン領域の高さ
const AVAILABLE_HEIGHT = screenHeight - BUTTON_CONTAINER_HEIGHT;

// 各セクションの高さを計算（画面サイズに応じて動的に調整）
const TOP_SECTION_HEIGHT = Math.min(AVAILABLE_HEIGHT * 0.35, 280); // 上部セクション：35%（最大280px）
const ANIMATION_HEIGHT = AVAILABLE_HEIGHT - TOP_SECTION_HEIGHT - 20; // アニメーション：残りのスペース（マージン20pxを引く）

// アニメーションのサイズを計算（画面幅または利用可能な高さの小さい方）
const ANIMATION_SIZE = Math.min(screenWidth * 0.85, ANIMATION_HEIGHT * 0.9);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width: screenWidth,
    height: '100%',
    flexDirection: 'column', // 縦方向のflexレイアウト
  },
  topSection: {
    height: TOP_SECTION_HEIGHT,
    paddingHorizontal: 30,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  kurukatsuIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  textContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    minHeight: 100, // 最小高さを確保
  },
  animationContainer: {
    flex: 1, // 残りのスペースを使用
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenWidth * 0.075, // 左右のマージン
    paddingVertical: 10,
    maxHeight: ANIMATION_HEIGHT, // 最大高さを制限
  },
  lottieAnimation: {
    width: ANIMATION_SIZE,
    height: ANIMATION_SIZE,
  },
  bellAnimation: {
    width: ANIMATION_SIZE,
    height: ANIMATION_SIZE,
  },
  bottomSpacer: {
    height: BUTTON_CONTAINER_HEIGHT, // ボタン領域分のスペースを確保
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
    height: BUTTON_CONTAINER_HEIGHT,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // 背景色を設定して要素との重なりを防ぐ
  },
}); 