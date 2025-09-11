import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, ScrollView, Image, Linking } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  
  // 同意フローの強化: 個別同意状態の管理
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false);

  // パスワード検証関数
  const validatePassword = (password) => {
    const errors = [];
    // 8文字以上
    if (password.length < 8) {
      errors.push("・8文字以上で入力してください。");
    }
    // アルファベットを含む
    if (!/[a-zA-Z]/.test(password)) {
      errors.push("・アルファベットを1文字以上含めてください。");
    }
    // 数字を含む
    if (!/[0-9]/.test(password)) {
      errors.push("・数字を1文字以上含めてください。");
    }
    return errors;
  };

  // パスワード入力時のリアルタイムバリデーション
  const handlePasswordChange = (text) => {
    setPassword(text);
    const errors = validatePassword(text);
    setPasswordErrors(errors);
  };

  const handleSignup = async () => {
    // パスワード確認チェック
    if (password !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません。');
      return;
    }

    // パスワード条件チェック
    if (passwordErrors.length > 0) {
      Alert.alert('エラー', 'パスワードの条件を満たしていません。');
      return;
    }

    // 同意フローの強化: 同意チェック
    if (!agreedToTerms) {
      Alert.alert('エラー', '利用規約に同意してください。');
      return;
    }

    if (!agreedToPrivacyPolicy) {
      Alert.alert('エラー', 'プライバシーポリシーに同意してください。');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // メール認証を送信
      console.log('メール認証送信開始:', user.email);
      try {
        await sendEmailVerification(user);
        console.log('メール認証送信成功');
      } catch (emailError) {
        console.error('メール認証送信エラー:', emailError);
        Alert.alert('メール送信エラー', '確認メールの送信に失敗しました。しばらく時間をおいてから再度お試しください。');
        return;
      }
      
      // ユーザープロフィールドキュメントを作成（認証待ち状態で）
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        emailVerified: false, // 認証待ち状態
        createdAt: new Date(),
        // 初期値として空の配列を設定
        joinedCircleIds: [],
        favoriteCircleIds: [],
        // プロフィール情報は後で設定
        name: '',
        university: '',
        grade: '',
        gender: '',
        birthday: '',
        profileImageUrl: '',
        isUniversityPublic: true,
        isGradePublic: true
      });
      
      // メール認証待ち画面に遷移
      navigation.navigate('EmailVerification', { 
        email: email,
        userId: user.uid,
        fromSignup: true
      });
    } catch (error) {
      Alert.alert('登録エラー', error.message);
    } finally {
      setLoading(false);
    }
  };

  const openTermsOfService = () => {
    Linking.openURL('https://kazuki637.github.io/kurukatsu-docs/terms.html');
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://kazuki637.github.io/kurukatsu-docs/privacy.html');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.appIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          blurOnSubmit={false}
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          returnKeyType="next"
          blurOnSubmit={false}
        />
        {passwordErrors.length > 0 && (
          <View style={styles.errorContainer}>
            {passwordErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>{error}</Text>
            ))}
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="パスワード（確認）"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        {/* 同意フローの強化: 個別同意チェックボックス */}
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

        <TouchableOpacity
          style={[
            styles.registerButton,
            (!email || !password || !confirmPassword || passwordErrors.length > 0 || !agreedToTerms || !agreedToPrivacyPolicy) && styles.registerButtonDisabled
          ]}
          onPress={handleSignup}
          disabled={loading || !email || !password || !confirmPassword || passwordErrors.length > 0 || !agreedToTerms || !agreedToPrivacyPolicy}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>登録</Text>
          )}
        </TouchableOpacity>

        {/* 旧来の曖昧な同意テキストを削除 */}
        {/* <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            続行することでクルカツの
            <Text style={styles.linkText} onPress={openTermsOfService}>利用規約</Text>
            に同意し、クルカツの{'\n'}
            <Text style={styles.linkText} onPress={openPrivacyPolicy}>プライバシーポリシー</Text>
            を読んだものとみなされます。
          </Text>
        </View> */}
        <TouchableOpacity
          style={styles.loginLinkButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.loginLinkButtonText}>ログイン画面へ戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '90%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  registerButton: {
    width: '90%',
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLinkButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  loginLinkButtonText: {
    color: '#007bff',
    fontSize: 18,
  },
  appIcon: {
    width: 100,
    height: 100,
    marginBottom: 40,
    marginTop: 20,
    borderRadius: 20,
  },
  termsText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  linkText: {
    color: '#007bff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  errorContainer: {
    width: '90%',
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  errorText: {
    color: '#ef5350',
    fontSize: 12,
    marginBottom: 2,
  },
  agreementContainer: {
    width: '90%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#495057',
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
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxUnchecked: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  agreementText: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
    lineHeight: 20,
  },
});

export default SignupScreen;
