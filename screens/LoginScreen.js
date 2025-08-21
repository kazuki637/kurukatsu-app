import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, TouchableWithoutFeedback, Keyboard, ScrollView, Linking } from 'react-native';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
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
          errorMessage = 'ログインに失敗しました。しばらく時間をおいてから再度お試しください。';
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
        <Text style={styles.title}>クルカツへようこそ！</Text>
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
          onSubmitEditing={Keyboard.dismiss}
        />
        
        {/* パスワードリセットリンク */}
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={() => navigation.navigate('PasswordReset')}
        >
          <Text style={styles.forgotPasswordText}>パスワードをお忘れですか？</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>ログイン</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            続行することでクルカツの
            <Text style={styles.linkText} onPress={openTermsOfService}>利用規約</Text>
            に同意し、クルカツの{'\n'}
            <Text style={styles.linkText} onPress={openPrivacyPolicy}>プライバシーポリシー</Text>
            を読んだものとみなされます。
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signupButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupButtonText}>新規登録はこちら</Text>
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
  appIcon: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20,
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
  loginButton: {
    width: '90%',
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    marginBottom: 15,
    alignSelf: 'flex-start',
    marginLeft: '5%',
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 16,
  },
  signupButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  signupButtonText: {
    color: '#007bff',
    fontSize: 18,
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
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
