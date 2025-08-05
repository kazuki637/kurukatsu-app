import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, ScrollView, Image } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // パスワード確認チェック
    if (password !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません。');
      return;
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください。');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // ユーザープロフィールドキュメントを作成
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
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
      
      Alert.alert(
        '登録完了', 
        'アカウントが作成されました。',
        [
          {
            text: '次へ',
            onPress: () => {
              // プロフィール編集画面に遷移
              navigation.navigate('ProfileEdit', { fromSignup: true });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('登録エラー', error.message);
    } finally {
      setLoading(false);
    }
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
          returnKeyType="next"
          blurOnSubmit={false}
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード（確認）"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        <TouchableOpacity
          style={[
            styles.registerButton,
            (!email || !password || !confirmPassword) && styles.registerButtonDisabled
          ]}
          onPress={handleSignup}
          disabled={loading || !email || !password || !confirmPassword}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>登録</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          続行することでクルカツの利用規約に同意し、クルカツのプライバシーポリシーを読んだものとみなされます。
        </Text>
        <TouchableOpacity
          style={styles.loginLinkButton}
          onPress={() => navigation.navigate('Login')}
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
    marginBottom: 20,
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
});

export default SignupScreen;
