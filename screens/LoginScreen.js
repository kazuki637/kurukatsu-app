import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, TouchableWithoutFeedback, Keyboard, ScrollView, Linking } from 'react-native';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import KurukatsuButton from '../components/KurukatsuButton';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // ログイン成功時、App.jsのonAuthStateChangedが自動的に適切な画面に遷移する
      
    } catch (error) {
      let errorMessage = 'ログインに失敗しました。';
      
      // Firebaseのエラーコードに基づいて日本語メッセージを設定
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません。';
          break;
        case 'auth/user-disabled':
          errorMessage = 'このアカウントは無効化されています。';
          break;
        case 'auth/user-not-found':
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
          break;
        case 'auth/wrong-password':
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'ログイン試行回数が多すぎます。しばらく時間をおいてから再度お試しください。';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          break;
        default:
          errorMessage = 'ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。';
      }
      
      Alert.alert('ログインエラー', errorMessage);
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

  const handleSignupNavigation = () => {
    if (navigating) return; // 既に遷移中の場合は何もしない
    
    setNavigating(true);
    navigation.navigate('Signup');
    
    // 遷移完了後にstateをリセット（フォーカス時にリセット）
    const unsubscribe = navigation.addListener('focus', () => {
      setNavigating(false);
      unsubscribe();
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.appIcon}
          />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.welcomeTitle}>ようこそ</Text>
          <Text style={styles.welcomeSubtitle}>アカウントにログインしてください</Text>
          <View style={styles.inputContainer}>
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
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>
          
          {/* パスワードリセットリンク */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('PasswordReset')}
          >
            <Text style={styles.forgotPasswordText}>パスワードをお忘れですか？</Text>
          </TouchableOpacity>
          
          <KurukatsuButton
            title={loading ? '' : 'ログイン'}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            size="medium"
            variant="primary"
            hapticFeedback={true}
            style={styles.loginButtonContainer}
          >
            {loading && (
              <ActivityIndicator size="small" color="#fff" />
            )}
          </KurukatsuButton>
          
          
          <KurukatsuButton
            title="新しいアカウントを作成"
            onPress={handleSignupNavigation}
            size="medium"
            variant="secondary"
            hapticFeedback={true}
            disabled={navigating}
            style={styles.signupButtonContainer}
          />
        </View>
        
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            続行することで
            <Text style={styles.linkText} onPress={openTermsOfService}>利用規約</Text>
            と
            <Text style={styles.linkText} onPress={openPrivacyPolicy}>プライバシーポリシー</Text>
            に{'\n'}同意したことになります。
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    color: '#1f2937',
  },
  loginButtonContainer: {
    marginTop: 8,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -16,
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  signupButtonContainer: {
    marginTop: 16,
  },
  termsContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  termsText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 12,
    textDecorationLine: 'underline',
  },

});

export default LoginScreen;
