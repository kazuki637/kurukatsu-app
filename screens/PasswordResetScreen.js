import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import KurukatsuButton from '../components/KurukatsuButton';

const PasswordResetScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください。');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        'パスワードリセットメール送信完了',
        '入力されたメールアドレスにパスワードリセット用のリンクを送信しました。メールをご確認の上、リンクをクリックしてパスワードを再設定してください。',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'パスワードリセットメールの送信に失敗しました。';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'このメールアドレスは登録されていません。';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '正しいメールアドレスを入力してください。';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'リクエストが多すぎます。しばらく時間をおいてから再度お試しください。';
      }
      
      Alert.alert('エラー', errorMessage);
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
        
        <View style={styles.cardContainer}>
          <Text style={styles.welcomeTitle}>パスワードをリセット</Text>
          <Text style={styles.welcomeSubtitle}>
            登録済みのメールアドレスを入力してください
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="メールアドレス"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handlePasswordReset}
            />
          </View>
          
          <KurukatsuButton
            title={loading ? '' : 'リセットメールを送信'}
            onPress={handlePasswordReset}
            disabled={loading}
            loading={loading}
            size="medium"
            variant="primary"
            hapticFeedback={true}
            style={styles.resetButtonContainer}
          >
            {loading && (
              <ActivityIndicator size="small" color="#fff" />
            )}
          </KurukatsuButton>
          
          <KurukatsuButton
            title="ログイン画面に戻る"
            onPress={() => navigation.goBack()}
            size="medium"
            variant="secondary"
            hapticFeedback={true}
            style={styles.backButtonContainer}
          />
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    color: '#1f2937',
  },
  resetButtonContainer: {
    marginBottom: 24,
  },
  backButtonContainer: {
    width: '100%',
  },
});

export default PasswordResetScreen;
