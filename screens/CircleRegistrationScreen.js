import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  TouchableWithoutFeedback, 
  Keyboard, 
  ScrollView, 
  Image, 
  Dimensions,
  Animated,
  Platform,
  SafeAreaView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { db, storage, auth } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion, setDoc, runTransaction } from 'firebase/firestore';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressCircleImage } from '../utils/imageCompression';
import KurukatsuButton from '../components/KurukatsuButton';

const { width: screenWidth } = Dimensions.get('window');

// 選択肢の定義
const FREQUENCIES = ['週１回', '週２回', '週３回', '月１回', '不定期'];
const ACTIVITY_WEEKDAYS = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日', '不定期'];
const GENDER_RATIO_OPTIONS = ['男性多め', '女性多め', '半々'];
const MEMBERS_OPTIONS = ['1-10人', '11-30人', '31-50人', '51-100人', '100人以上'];
const GENRES = [
  'スポーツ（球技）', 'スポーツ（球技以外）', 'アウトドア・旅行', '文化・教養', '芸術・芸能', 
  '音楽', '学問・研究', '趣味・娯楽', '国際交流', 'ボランティア', 'イベント', 'オールラウンド', 'その他'
];
const FEATURES = [
  'イベント充実', '友達作り重視', '初心者歓迎', 'ゆるめ', '真剣', 
  '体育会系', 'フラット', '和やか', '賑やか'
];

// サークル登録ステップ定義
const circleRegistrationSteps = [
  { key: 1, title: 'サークルアイコンを選択してください', type: 'image' },
  { key: 2, title: 'サークル種別を選択してください', type: 'circleType' },
  { key: 3, title: 'サークル名を入力してください', type: 'circleName' },
  { key: 4, title: 'ジャンルを選択してください', type: 'genre' },
  { key: 5, title: '特色を選択してください', type: 'features' },
  { key: 6, title: '活動頻度を選択してください', type: 'frequency' },
  { key: 7, title: '活動曜日を選択してください', type: 'activityDays' },
  { key: 8, title: '人数を選択してください', type: 'members' },
  { key: 9, title: '男女比を選択してください', type: 'genderRatio' },
  { key: 10, title: '入会募集状況を設定してください', type: 'recruiting' }
];

const CircleRegistrationScreen = ({ navigation }) => {
  // 横スワイプによる戻る機能を無効化
  React.useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
    });
  }, [navigation]);

  // ステップ管理
  const [activeStep, setActiveStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollViewRef = useRef(null);
  
  // プログレスバーアニメーション
  const progressAnim = useRef(new Animated.Value(1 / circleRegistrationSteps.length * 100)).current;

  // フォームデータ
  const [circleImage, setCircleImage] = useState(null);
  const [circleType, setCircleType] = useState('学内サークル');
  const [circleName, setCircleName] = useState('');
  const [genre, setGenre] = useState('');
  const [features, setFeatures] = useState([]);
  const [frequency, setFrequency] = useState('');
  const [activityDays, setActivityDays] = useState([]);
  const [members, setMembers] = useState('');
  const [genderRatio, setGenderRatio] = useState('');
  const [isRecruiting, setIsRecruiting] = useState(false);
  
  // 自動取得データ
  const [universityName, setUniversityName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  
  // UI状態
  const [uploading, setUploading] = useState(false);

  // ユーザーデータの取得
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserProfile(userData);
          setUniversityName(userData.university || '');
          setContactInfo(user.email || '');
          setRepresentativeName(userData.name || '');
        }
      }
    };
    fetchUserData();
  }, []);

  // 画像選択
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      navigation.navigate('ImageCrop', {
        imageType: 'circle',
        selectedImageUri: result.assets[0].uri,
        circleName: circleName,
        onCropComplete: (croppedUri) => {
          setCircleImage(croppedUri);
          console.log('サークル画像切り抜き完了');
        }
      });
    }
  };

  // 次へボタンの処理
  const handleNext = () => {
    if (activeStep < circleRegistrationSteps.length - 1) {
      const nextStep = activeStep + 1;
      setIsTransitioning(true);
      
      // データ保存は一切行わない（最終ステップ以外）
      console.log(`ステップ ${activeStep + 1} → ${nextStep + 1} に遷移（データ保存なし）`);
      
      // プログレスバーアニメーション
      Animated.timing(progressAnim, {
        toValue: ((nextStep + 1) / circleRegistrationSteps.length) * 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      scrollViewRef.current?.scrollTo({
        x: screenWidth * nextStep,
        animated: true,
      });
      
      setTimeout(() => {
        setActiveStep(nextStep);
        setIsTransitioning(false);
      }, 300);
    }
  };

  // 戻るボタンの処理
  const handlePrevious = () => {
    if (activeStep > 0) {
      const prevStep = activeStep - 1;
      setIsTransitioning(true);
      
      // データ保存は一切行わない（戻る操作）
      console.log(`ステップ ${activeStep + 1} → ${prevStep + 1} に戻る（データ保存なし）`);
      
      // プログレスバーアニメーション
      Animated.timing(progressAnim, {
        toValue: ((prevStep + 1) / circleRegistrationSteps.length) * 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      scrollViewRef.current?.scrollTo({
        x: screenWidth * prevStep,
        animated: true,
      });
      
      setTimeout(() => {
        setActiveStep(prevStep);
        setIsTransitioning(false);
      }, 300);
    }
  };

  // 各ステップの入力検証
  const isStepValid = () => {
    const currentStepData = circleRegistrationSteps[activeStep];
    switch (currentStepData.type) {
      case 'image':
        return circleImage !== null;
      case 'circleType':
        return circleType !== '';
      case 'circleName':
        return circleName.trim() !== '';
      case 'genre':
        return genre !== '';
      case 'features':
        return features.length > 0;
      case 'frequency':
        return frequency !== '';
      case 'activityDays':
        return activityDays.length > 0;
      case 'members':
        return members !== '';
      case 'genderRatio':
        return genderRatio !== '';
      case 'recruiting':
        return true; // 入会募集状況は必須ではない
      default:
        return true;
    }
  };

  // 全項目の入力完了をチェックする関数
  const isAllDataComplete = () => {
    return (
      circleImage !== null &&
      circleType !== '' &&
      circleName.trim() !== '' &&
      genre !== '' &&
      features.length > 0 &&
      frequency !== '' &&
      activityDays.length > 0 &&
      members !== '' &&
      genderRatio !== ''
    );
  };

  // サークル登録処理
  const handleRegister = async () => {
    console.log('=== サークル登録開始 ===');
    console.log('ユーザーID:', auth.currentUser?.uid);
    console.log('ユーザー名:', auth.currentUser?.email);
    
    // 全項目の入力完了を確認
    if (!isAllDataComplete()) {
      console.log('❌ 入力不完了で終了');
      Alert.alert('入力不完了', 'すべての項目を入力してください。');
      return;
    }

    // ユーザー情報の確認
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ ユーザー情報なしで終了');
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした。');
      return;
    }

    if (!userProfile) {
      console.log('❌ ユーザープロフィール情報なしで終了');
      Alert.alert('エラー', 'ユーザープロフィール情報が取得できませんでした。');
      return;
    }

    console.log('✅ 入力データ検証完了');
    console.log('サークル名:', circleName);
    console.log('大学名:', universityName);
    console.log('代表者名:', representativeName);

    setUploading(true);
    
    try {
      console.log('サークル登録開始 - トランザクション処理');
      
      // 先に画像をアップロード（Firestore操作より前に）
      let imageUrl = null;
      if (circleImage) {
        try {
          console.log('=== 画像アップロード開始 ===');
          
          // 画像を圧縮
          console.log('サークル画像圧縮開始...');
          const compressedUri = await compressCircleImage(circleImage);
          console.log('サークル画像圧縮完了');
          
          // 圧縮された画像をアップロード
          const response = await fetch(compressedUri);
          const blob = await response.blob();
          const timestamp = Date.now();
          const storagePath = `circle_images/temp/${user.uid}_${timestamp}`;
          console.log('Storage Path:', storagePath);
          
          const storageRef = ref(storage, storagePath);
          console.log('アップロード開始...');
          const uploadTask = uploadBytes(storageRef, blob);
          await uploadTask;
          console.log('アップロード完了、URL取得中...');
          imageUrl = await getDownloadURL(storageRef);
          
          console.log('サークル画像アップロード完了:', imageUrl);
          console.log('=== 画像アップロード完全終了 ===');
        } catch (error) {
          console.error("Error uploading image:", error);
          Alert.alert('画像アップロードエラー', 'サークルアイコンのアップロード中にエラーが発生しました。');
          setUploading(false);
          return;
        }
      }

      // トランザクションですべてのFirestore操作を実行
      console.log('🔄 Firestoreトランザクション開始');
      const result = await runTransaction(db, async (transaction) => {
        console.log('📝 1. サークルメインドキュメント作成開始');
        // 1. サークルメインドキュメントを作成
        const circleDocRef = doc(collection(db, 'circles'));
        const circleData = {
          name: circleName,
          universityName,
          features,
          frequency,
          activityDays,
          genderratio: genderRatio,
          genre,
          members,
          contactInfo,
          imageUrl: imageUrl, // 事前にアップロードした画像URL
          circleType,
          welcome: {
            isRecruiting,
          },
          createdAt: new Date(),
          leaderId: user.uid,
          leaderName: representativeName,
          createdBy: user.uid,
        };
        console.log('📝 サークルデータ:', JSON.stringify(circleData, null, 2));
        transaction.set(circleDocRef, circleData);
        console.log('📝 サークルドキュメントID:', circleDocRef.id);

        console.log('👥 2. membersサブコレクション作成開始');
        // 2. membersサブコレクションに代表者を追加
        const memberDocRef = doc(circleDocRef, 'members', user.uid);
        const memberData = {
          joinedAt: new Date(),
          role: 'leader',
          assignedAt: new Date(),
          assignedBy: user.uid,
          gender: userProfile.gender || '',
          university: userProfile.university || '',
          name: userProfile.name || '氏名未設定',
          grade: userProfile.grade || '',
          profileImageUrl: userProfile.profileImageUrl || null
        };
        console.log('👥 メンバーデータ:', JSON.stringify(memberData, null, 2));
        transaction.set(memberDocRef, memberData);

        console.log('👤 3. ユーザードキュメント更新開始');
        // 3. ユーザードキュメントを更新
        const userDocRef = doc(db, 'users', user.uid);
        const userUpdateData = {
          joinedCircleIds: arrayUnion(circleDocRef.id),
          adminCircleIds: arrayUnion(circleDocRef.id)
        };
        console.log('👤 ユーザー更新データ:', JSON.stringify(userUpdateData, null, 2));
        transaction.update(userDocRef, userUpdateData);

        console.log('✅ トランザクション内の処理完了');
        return circleDocRef.id;
      });

      console.log('🎉 サークル登録完了 - トランザクション成功:', result);

      // サークル登録完了後、検索画面のキャッシュを無効化
      if (global.invalidateCirclesCache) {
        global.invalidateCirclesCache();
      }

      // サークル運営画面に直接遷移
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ 
            name: 'Main',
            params: {
              screen: 'サークル運営',
              params: {
                screen: 'CircleManagementScreen'
              }
            }
          }],
        })
      );
    } catch (error) {
      console.error('❌ サークル登録エラー:', error);
      console.error('❌ エラー詳細:', JSON.stringify(error, null, 2));
      console.error('❌ エラーメッセージ:', error.message);
      console.error('❌ エラーコード:', error.code);
      Alert.alert('登録エラー', 'サークル情報の登録中にエラーが発生しました。');
    } finally {
      console.log('=== サークル登録処理終了 ===');
      setUploading(false);
    }
  };

  // 各ステップのコンテンツをレンダリング
  const renderStepContent = (step, index) => {
    const stepData = circleRegistrationSteps[index];

    return (
      <View key={step.key} style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{stepData.title}</Text>
        </View>
        
        <View style={styles.stepContent}>
          {stepData.type === 'image' && (
            <View style={styles.imageStepContainer}>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {circleImage ? (
                  <Image source={{ uri: circleImage }} style={styles.circleImage} />
                ) : (
                  <View style={[styles.circleImage, styles.circleImagePlaceholder]}>
                    <Ionicons name="people-outline" size={60} color="#aaa" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.imageHelperText}>
                タップしてアイコンを選択
              </Text>
            </View>
          )}

          {stepData.type === 'circleType' && (
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={[styles.optionButton, circleType === '学内サークル' && styles.optionButtonSelected]}
                onPress={() => setCircleType('学内サークル')}
              >
                <View style={styles.radioButton}>
                  {circleType === '学内サークル' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.optionText, circleType === '学内サークル' && styles.optionTextSelected]}>
                  学内サークル
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.optionButton, circleType === 'インカレサークル' && styles.optionButtonSelected]}
                onPress={() => setCircleType('インカレサークル')}
              >
                <View style={styles.radioButton}>
                  {circleType === 'インカレサークル' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.optionText, circleType === 'インカレサークル' && styles.optionTextSelected]}>
                  インカレサークル
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {stepData.type === 'circleName' && (
            <TextInput
              style={styles.input}
              placeholder="サークル名を入力してください"
              value={circleName}
              onChangeText={setCircleName}
              returnKeyType="next"
            />
          )}

          {stepData.type === 'genre' && (
            <View style={styles.optionsContainer}>
              {GENRES.map((genreOption) => (
                <TouchableOpacity
                  key={genreOption}
                  style={[
                    styles.optionButton,
                    genre === genreOption && styles.optionButtonSelected
                  ]}
                  onPress={() => setGenre(genreOption)}
                >
                  <Text style={[
                    styles.optionText,
                    genre === genreOption && styles.optionTextSelected
                  ]}>
                    {genreOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'features' && (
            <View style={styles.optionsContainer}>
              {FEATURES.map((feature) => (
                <TouchableOpacity
                  key={feature}
                  style={[
                    styles.optionButton,
                    features.includes(feature) && styles.optionButtonSelected
                  ]}
                  onPress={() => {
                    setFeatures((prev) =>
                      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
                    );
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    features.includes(feature) && styles.optionTextSelected
                  ]}>
                    {feature}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'frequency' && (
            <View style={styles.optionsContainer}>
              {FREQUENCIES.map((frequencyOption) => (
                <TouchableOpacity
                  key={frequencyOption}
                  style={[
                    styles.optionButton,
                    frequency === frequencyOption && styles.optionButtonSelected
                  ]}
                  onPress={() => setFrequency(frequencyOption)}
                >
                  <Text style={[
                    styles.optionText,
                    frequency === frequencyOption && styles.optionTextSelected
                  ]}>
                    {frequencyOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'activityDays' && (
            <View style={styles.optionsContainer}>
              {ACTIVITY_WEEKDAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.optionButton,
                    activityDays.includes(day) && styles.optionButtonSelected
                  ]}
                  onPress={() => {
                    setActivityDays((prev) =>
                      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                    );
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    activityDays.includes(day) && styles.optionTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'members' && (
            <View style={styles.optionsContainer}>
              {MEMBERS_OPTIONS.map((memberOption) => (
                <TouchableOpacity
                  key={memberOption}
                  style={[
                    styles.optionButton,
                    members === memberOption && styles.optionButtonSelected
                  ]}
                  onPress={() => setMembers(memberOption)}
                >
                  <Text style={[
                    styles.optionText,
                    members === memberOption && styles.optionTextSelected
                  ]}>
                    {memberOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'genderRatio' && (
            <View style={styles.optionsContainer}>
              {GENDER_RATIO_OPTIONS.map((ratioOption) => (
                <TouchableOpacity
                  key={ratioOption}
                  style={[
                    styles.optionButton,
                    genderRatio === ratioOption && styles.optionButtonSelected
                  ]}
                  onPress={() => setGenderRatio(ratioOption)}
                >
                  <Text style={[
                    styles.optionText,
                    genderRatio === ratioOption && styles.optionTextSelected
                  ]}>
                    {ratioOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'recruiting' && (
            <View style={styles.recruitingContainer}>
              <View style={styles.recruitingItemContent}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isRecruiting ? "#d1fae5" : "#fee2e2" }
                ]}>
                  <Ionicons 
                    name={isRecruiting ? "checkmark" : "close"} 
                    size={24} 
                    color={isRecruiting ? "#10b981" : "#ef4444"} 
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.recruitingLabel}>
                    {isRecruiting ? "入会募集中" : "現在入会の募集はありません"}
                  </Text>
                </View>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={isRecruiting}
                  onValueChange={setIsRecruiting}
                  trackColor={{ false: '#e0e0e0', true: '#1380ec' }}
                  thumbColor={isRecruiting ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          )}

        </View>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          {/* 戻るボタン / 閉じるボタン */}
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={activeStep === 0 ? () => navigation.goBack() : handlePrevious}
            disabled={isTransitioning}
          >
            {activeStep === 0 ? (
              <Ionicons 
                name="close" 
                size={32} 
                color={isTransitioning ? "#9CA3AF" : "#2563eb"} 
              />
            ) : (
              <Ionicons 
                name="chevron-back" 
                size={32} 
                color={isTransitioning ? "#9CA3AF" : "#2563eb"} 
              />
            )}
          </TouchableOpacity>
          
          {/* プログレスバー */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    })
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* スライドコンテンツ */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.scrollView}
        >
          {circleRegistrationSteps.map((step, index) => renderStepContent(step, index))}
        </ScrollView>

        {/* ナビゲーションボタン */}
        <View style={styles.bottomContainer}>
            <KurukatsuButton
              title={
                circleRegistrationSteps[activeStep].type === 'recruiting' 
                  ? (uploading ? '' : 'サークルを登録') 
                  : '次へ'
              }
              onPress={
                circleRegistrationSteps[activeStep].type === 'recruiting' 
                  ? handleRegister 
                  : handleNext
              }
              disabled={!isStepValid() || uploading || isTransitioning}
              loading={!isStepValid() || uploading || isTransitioning}
              size="medium"
              variant="primary"
              hapticFeedback={true}
              style={styles.nextButtonFull}
            >
              {uploading && circleRegistrationSteps[activeStep].type === 'recruiting' && (
                <ActivityIndicator size="small" color="#fff" />
              )}
            </KurukatsuButton>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    position: 'relative',
    height: 80,
  },
  headerBackButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    left: 50,
    right: 0,
    top: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1380ec',
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width: screenWidth,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  stepHeader: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  stepContent: {
    flex: 1,
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    fontSize: 16,
    color: '#374151',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '48%',
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
  },
  optionButtonSelected: {
    borderColor: '#1380ec',
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#1380ec',
    fontWeight: 'bold',
  },
  // 画像選択関連
  imageStepContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
  },
  imagePicker: {
    marginBottom: 20,
  },
  circleImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  circleImagePlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageHelperText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  // ラジオボタン関連
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1380ec',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1380ec',
  },
  // 入会募集状況関連
  recruitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 72,
  },
  recruitingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 40,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  recruitingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  switchContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  nextButtonFull: {
    width: '100%',
  },
});

export default CircleRegistrationScreen;