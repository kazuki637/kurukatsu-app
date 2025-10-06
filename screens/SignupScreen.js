import React, { useState, useRef } from 'react';
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
  Linking,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import KurukatsuButton from '../components/KurukatsuButton';
import universities from '../universities.json';

const { width: screenWidth } = Dimensions.get('window');

// 学年選択肢
const GRADES = ['大学1年', '大学2年', '大学3年', '大学4年', '大学院1年', '大学院2年', 'その他'];
const GENDERS = ['男性', '女性', 'その他', '回答しない'];

// 新規登録ステップ定義
const signupSteps = [
  { key: 1, title: 'メールアドレスを入力してください', type: 'email' },
  { key: 2, title: 'パスワードを入力してください', type: 'password' },
  { key: 3, title: '氏名を入力してください', type: 'name' },
  { key: 4, title: '大学名を入力してください', type: 'university' },
  { key: 5, title: '学年を選択してください', type: 'grade' },
  { key: 6, title: '性別を選択してください', type: 'gender' },
  { key: 7, title: '生年月日を入力してください', type: 'birthday' },
  { key: 8, title: '利用規約を確認してください', type: 'terms' },
  { key: 9, title: '完了', type: 'complete' }
];

const SignupScreen = ({ navigation }) => {
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
  const progressAnim = useRef(new Animated.Value(1 / signupSteps.length * 100)).current;

  // フォームデータ
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');  // 姓
  const [firstName, setFirstName] = useState(''); // 名
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 同意状態
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false);
  
  // UI状態
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [emailError, setEmailError] = useState('');
  
  // 大学オートコンプリート
  const [universitySuggestions, setUniversitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // メールアドレス検証関数
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // パスワード検証関数
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("・8文字以上で入力してください。");
    }
    if (!/[a-zA-Z]/.test(password)) {
      errors.push("・アルファベットを1文字以上含めてください。");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("・数字を1文字以上含めてください。");
    }
    return errors;
  };

  // メールアドレス入力時のリアルタイムバリデーション
  const handleEmailChange = (text) => {
    setEmail(text);
    if (text.trim() === '') {
      setEmailError('');
    } else if (!validateEmail(text)) {
      setEmailError('メールアドレスの形式が正しくありません。');
    } else {
      setEmailError('');
    }
  };

  // パスワード入力時のリアルタイムバリデーション
  const handlePasswordChange = (text) => {
    setPassword(text);
    const errors = validatePassword(text);
    setPasswordErrors(errors);
  };

  // 大学名検索
  const handleUniversityChange = (text) => {
    setUniversity(text);
    if (text.length > 0) {
      // universitiesが配列として存在する場合のみフィルタリング
      if (universities && Array.isArray(universities)) {
        const filtered = universities
          .filter(uni => uni.includes(text))
          .slice(0, 5);
        setUniversitySuggestions(filtered);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // 大学選択
  const selectUniversity = (universityName) => {
    setUniversity(universityName);
    setShowSuggestions(false);
  };

  // 次へボタンの処理
  const handleNext = () => {
    if (activeStep < signupSteps.length - 1) {
      const nextStep = activeStep + 1;
      setIsTransitioning(true);
      
      // プログレスバーアニメーション
      Animated.timing(progressAnim, {
        toValue: ((nextStep + 1) / signupSteps.length) * 100,
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
      
      // プログレスバーアニメーション
      Animated.timing(progressAnim, {
        toValue: ((prevStep + 1) / signupSteps.length) * 100,
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
    const currentStepData = signupSteps[activeStep];
    switch (currentStepData.type) {
      case 'email':
        return email.trim() !== '' && validateEmail(email);
      case 'password':
        return password !== '' && confirmPassword !== '' && 
               password === confirmPassword && passwordErrors.length === 0;
      case 'name':
        return lastName.trim() !== '' && firstName.trim() !== '';
      case 'university':
        return university.trim() !== '';
      case 'grade':
        return grade !== '';
      case 'gender':
        return gender !== '';
      case 'birthday':
        return true; // 生年月日は必須ではない
      case 'terms':
        return agreedToTerms && agreedToPrivacyPolicy;
      default:
        return true;
    }
  };

  // アカウント作成処理
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      // Firebase Authでユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Firestoreにユーザープロフィール作成
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        name: lastName.trim() + firstName.trim(), // 姓＋名で保存
        university: university.trim(),
        grade,
        gender,
        birthday: birthday.getFullYear() + '-' + 
                 String(birthday.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(birthday.getDate()).padStart(2, '0'),
        profileImageUrl: '',
        createdAt: new Date(),
        joinedCircleIds: [],
        favoriteCircleIds: [],
        isUniversityPublic: true,
        isGradePublic: true
      });
      
      // 完了画面に進む
      handleNext();
    } catch (error) {
      console.error('アカウント作成エラー:', error);
      let errorMessage = 'アカウント作成に失敗しました。';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'このメールアドレスは既に使用されています。';
          break;
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません。';
          break;
        case 'auth/weak-password':
          errorMessage = 'パスワードが弱すぎます。';
          break;
        default:
          errorMessage = 'アカウント作成に失敗しました。もう一度お試しください。';
      }
      
      Alert.alert('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 利用規約・プライバシーポリシーを開く
  const openTermsOfService = () => {
    Linking.openURL('https://kazuki637.github.io/kurukatsu-docs/terms.html');
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://kazuki637.github.io/kurukatsu-docs/privacy.html');
  };

  // 各ステップのコンテンツをレンダリング
  const renderStepContent = (step, index) => {
    const stepData = signupSteps[index];

  return (
      <View key={step.key} style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{stepData.title}</Text>
        </View>
        
        <View style={styles.stepContent}>
          {stepData.type === 'email' && (
            <>
              <TextInput
                style={[
                  styles.input,
                  emailError !== '' && styles.inputError
                ]}
                placeholder="メールアドレス"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              {emailError !== '' && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{emailError}</Text>
                </View>
              )}
            </>
          )}

          {stepData.type === 'password' && (
            <>
            <TextInput
              style={styles.input}
              placeholder="パスワード"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              returnKeyType="next"
              />
            <TextInput
              style={styles.input}
              placeholder="パスワード（確認）"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              />
              {passwordErrors.length > 0 && (
                <View style={styles.errorContainer}>
                  {passwordErrors.map((error, idx) => (
                    <Text key={idx} style={styles.errorText}>{error}</Text>
                  ))}
                </View>
              )}
              {password !== confirmPassword && confirmPassword !== '' && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>・パスワードが一致しません。</Text>
                </View>
              )}
            </>
          )}

          {stepData.type === 'name' && (
            <>
              <TextInput
                style={styles.nameInputTop}
                placeholder="姓"
                value={lastName}
                onChangeText={setLastName}
                returnKeyType="next"
              />
              <TextInput
                style={styles.nameInputBottom}
                placeholder="名"
                value={firstName}
                onChangeText={setFirstName}
                returnKeyType="next"
              />
            </>
          )}

          {stepData.type === 'university' && (
            <View>
              <TextInput
                style={styles.input}
                placeholder="大学名を入力してください"
                value={university}
                onChangeText={handleUniversityChange}
                returnKeyType="next"
              />
              {showSuggestions && universitySuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {universitySuggestions.map((uni, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.suggestionItem,
                        idx === universitySuggestions.length - 1 && styles.suggestionItemLast
                      ]}
                      onPress={() => selectUniversity(uni)}
                    >
                      <Text style={styles.suggestionText}>{uni}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {stepData.type === 'grade' && (
            <View style={styles.optionsContainer}>
              {GRADES.map((gradeOption) => (
                <TouchableOpacity
                  key={gradeOption}
                  style={[
                    styles.optionButton,
                    grade === gradeOption && styles.optionButtonSelected
                  ]}
                  onPress={() => setGrade(gradeOption)}
                >
                  <Text style={[
                    styles.optionText,
                    grade === gradeOption && styles.optionTextSelected
                  ]}>
                    {gradeOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'gender' && (
            <View style={styles.optionsContainer}>
              {GENDERS.map((genderOption) => (
                <TouchableOpacity
                  key={genderOption}
                  style={[
                    styles.optionButton,
                    gender === genderOption && styles.optionButtonSelected
                  ]}
                  onPress={() => setGender(genderOption)}
                >
                  <Text style={[
                    styles.optionText,
                    gender === genderOption && styles.optionTextSelected
                  ]}>
                    {genderOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {stepData.type === 'birthday' && (
            <View style={styles.birthdayContainer}>
              <TouchableOpacity
                style={styles.birthdayButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={styles.birthdayText}>
                  {birthday.toLocaleDateString('ja-JP')}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={birthday}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale="ja-JP"
                  onChange={(event, selectedDate) => {
                    // Androidの場合のみ自動で閉じる、iOSは開いたまま
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setBirthday(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}
            </View>
          )}

          {stepData.type === 'terms' && (
          <View style={styles.agreementContainer}>
          <Text style={styles.agreementTitle}>以下の内容に同意してください</Text>
          
          <View style={styles.agreementItem}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              {agreedToTerms ? (
                <Text style={styles.checkboxChecked}>✓</Text>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </TouchableOpacity>
            <Text style={styles.agreementText}>
              <Text style={styles.linkText} onPress={openTermsOfService}>利用規約</Text>
              に同意します
            </Text>
          </View>

          <View style={styles.agreementItem}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAgreedToPrivacyPolicy(!agreedToPrivacyPolicy)}
            >
              {agreedToPrivacyPolicy ? (
                <Text style={styles.checkboxChecked}>✓</Text>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </TouchableOpacity>
            <Text style={styles.agreementText}>
              <Text style={styles.linkText} onPress={openPrivacyPolicy}>プライバシーポリシー</Text>
              に同意します
            </Text>
          </View>
          </View>
          )}

          {stepData.type === 'complete' && (
            <View style={styles.completeContainer}>
              <Image 
                source={require('../assets/icon.png')} 
                style={styles.completeIcon}
              />
              <Text style={styles.completeMessage}>
                アカウントが正常に作成されました！{'\n'}
                サークル活動を楽しみましょう！
              </Text>
              <KurukatsuButton
                title="ホームへ"
                onPress={() => {
                  // App.jsの認証状態変更によりホーム画面に自動遷移される
                }}
            size="medium"
            variant="primary"
            hapticFeedback={true}
                style={styles.completeButton}
              />
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
          {signupSteps.map((step, index) => renderStepContent(step, index))}
        </ScrollView>

        {/* ナビゲーションボタン */}
        {signupSteps[activeStep].type !== 'complete' && (
          <View style={styles.bottomContainer}>
            <KurukatsuButton
              title={
                signupSteps[activeStep].type === 'terms' 
                  ? (loading ? '' : 'アカウント作成') 
                  : '次へ'
              }
              onPress={
                signupSteps[activeStep].type === 'terms' 
                  ? handleCreateAccount 
                  : handleNext
              }
              disabled={!isStepValid() || loading || isTransitioning}
              loading={!isStepValid() || loading || isTransitioning}
              size="medium"
              variant="primary"
              hapticFeedback={true}
              style={styles.nextButtonFull}
            >
              {loading && signupSteps[activeStep].type === 'terms' && (
                <ActivityIndicator size="small" color="#fff" />
              )}
            </KurukatsuButton>
          </View>
        )}

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
    backgroundColor: '#3A82F7',
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
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  nameInputTop: {
    width: '100%',
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    fontSize: 16,
    color: '#374151',
    marginBottom: 0,
  },
  nameInputBottom: {
    width: '100%',
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginBottom: 2,
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 16,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    fontSize: 16,
    color: '#1f2937',
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
  },
  optionButtonSelected: {
    borderColor: '#3A82F7',
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    color: '#6b7280',
  },
  optionTextSelected: {
    color: '#3A82F7',
    fontWeight: 'bold',
  },
  birthdayContainer: {
    alignItems: 'center',
  },
  birthdayButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  birthdayText: {
    fontSize: 16,
    color: '#374151',
  },
  agreementContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#374151',
  },
  agreementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#ffffff',
  },
  checkboxUnchecked: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  agreementText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 24,
  },
  completeMessage: {
    fontSize: 18,
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  completeButton: {
    width: '80%',
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

export default SignupScreen;