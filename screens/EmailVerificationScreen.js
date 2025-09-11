import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, AppState } from 'react-native';
import { auth } from '../firebaseConfig';
import { sendEmailVerification, signOut, onAuthStateChanged } from 'firebase/auth';

const EmailVerificationScreen = ({ route, navigation, email: propEmail, userId: propUserId, fromSignup: propFromSignup }) => {
  // デバッグ用ログ
  console.log('EmailVerificationScreen - route.params:', route?.params);
  console.log('EmailVerificationScreen - propEmail:', propEmail);
  console.log('EmailVerificationScreen - propUserId:', propUserId);
  console.log('EmailVerificationScreen - propFromSignup:', propFromSignup);
  
  // プロパティから直接受け取った値またはroute.paramsから取得
  const email = propEmail || route?.params?.email;
  const userId = propUserId || route?.params?.userId;
  const fromSignup = propFromSignup !== undefined ? propFromSignup : route?.params?.fromSignup;
  
  console.log('EmailVerificationScreen - final email:', email);
  console.log('EmailVerificationScreen - final userId:', userId);
  console.log('EmailVerificationScreen - final fromSignup:', fromSignup);
  
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 認証状態をチェックする関数（アプリフォアグラウンド復帰時用）
  const checkEmailVerification = async () => {
    try {
      console.log('EmailVerificationScreen - 認証状態チェック開始');
      await auth.currentUser?.reload();
      const user = auth.currentUser;
      console.log('EmailVerificationScreen - チェック結果:', user ? {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      } : 'null');
      
      if (user && user.emailVerified) {
        console.log('EmailVerificationScreen - 認証完了を検知');
        Alert.alert(
          '認証完了',
          'メールアドレスの認証が完了しました。ログイン画面に移動します。',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('EmailVerificationScreen - ログイン画面に遷移開始');
                // ログアウトして認証状態をリセットし、App.jsで自動的にAuth画面を表示
                signOut(auth).then(() => {
                  console.log('EmailVerificationScreen - ログアウト完了、Auth画面に遷移');
                }).catch((error) => {
                  console.error('EmailVerificationScreen - ログアウトエラー:', error);
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('EmailVerificationScreen - 認証状態チェックエラー:', error);
    }
  };

  // 認証状態の監視
  useEffect(() => {
    console.log('EmailVerificationScreen - onAuthStateChanged リスナーを設定');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('EmailVerificationScreen - 認証状態変化:', user ? {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      } : 'null');
      
      if (user && user.emailVerified) {
        console.log('EmailVerificationScreen - 認証完了を検知');
        // 認証完了を検知
        Alert.alert(
          '認証完了',
          'メールアドレスの認証が完了しました。ログイン画面に移動します。',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('EmailVerificationScreen - ログイン画面に遷移開始');
                // ログアウトして認証状態をリセットし、App.jsで自動的にAuth画面を表示
                signOut(auth).then(() => {
                  console.log('EmailVerificationScreen - ログアウト完了、Auth画面に遷移');
                }).catch((error) => {
                  console.error('EmailVerificationScreen - ログアウトエラー:', error);
                });
              }
            }
          ]
        );
      }
    });

    return unsubscribe;
  }, [fromSignup, navigation]);

  // 画面表示時の自動メール送信
  useEffect(() => {
    const sendInitialEmail = async () => {
      try {
        console.log('EmailVerificationScreen - 画面表示時の自動メール送信開始');
        await sendEmailVerification(auth.currentUser);
        console.log('EmailVerificationScreen - 自動メール送信成功');
      } catch (error) {
        console.error('EmailVerificationScreen - 自動メール送信エラー:', error);
        
        // 送信頻度制限エラーの場合
        if (error.code === 'auth/too-many-requests') {
          console.log('EmailVerificationScreen - 送信頻度制限により送信をスキップ');
          // エラーを表示せずにスキップ
        } else {
          // その他のエラーは表示
          Alert.alert('エラー', 'メールの送信に失敗しました。');
        }
      }
    };

    // 認証画面に遷移した時に必ずメールを送信
    sendInitialEmail();
  }, []);

  // アプリのフォアグラウンド復帰時の認証状態チェック
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('EmailVerificationScreen - アプリがフォアグラウンドに復帰、認証状態をチェック');
        checkEmailVerification();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);


  // 再送信機能
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    try {
      console.log('再送信開始:', auth.currentUser?.email);
      await sendEmailVerification(auth.currentUser);
      console.log('再送信成功');
      setResendCooldown(60); // 60秒のクールダウン
      Alert.alert('送信完了', '確認メールを再送信しました。');
    } catch (error) {
      console.error('再送信エラー:', error);
      
      // 送信頻度制限エラーの場合
      if (error.code === 'auth/too-many-requests') {
        Alert.alert('送信制限', '送信頻度が高すぎます。しばらく時間をおいてから再度お試しください。');
        setResendCooldown(300); // 5分のクールダウン
      } else {
        Alert.alert('エラー', 'メールの再送信に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  // ログアウト機能
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // ログアウト後は認証状態が変更されるため、App.jsで自動的にAuth画面が表示される
    } catch (error) {
      Alert.alert('エラー', 'ログアウトに失敗しました。');
    }
  };

  // Firebaseの認証状態からメールアドレスを取得
  const currentUser = auth.currentUser;
  const finalEmail = email || currentUser?.email;
  
  console.log('EmailVerificationScreen - currentUser:', currentUser);
  console.log('EmailVerificationScreen - finalEmail:', finalEmail);
  
  // emailが取得できない場合はログイン画面に戻る
  if (!finalEmail) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>エラー</Text>
        <Text style={styles.message}>
          メールアドレス情報が取得できませんでした。
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => {
          // ログアウトして認証状態をリセット
          signOut(auth).catch(console.error);
        }}>
          <Text style={styles.buttonText}>ログイン画面に戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>メールアドレスの確認</Text>
      <Text style={styles.message}>
        {finalEmail} に確認メールを送信しました。
        メール内のリンクをクリックして認証を完了してください。
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, resendCooldown > 0 && styles.buttonDisabled]}
        onPress={handleResendEmail}
        disabled={loading || resendCooldown > 0}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {resendCooldown > 0 ? `${resendCooldown}秒後に再送信可能` : '再送信'}
          </Text>
        )}
      </TouchableOpacity>
      
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>ログイン画面に戻る</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default EmailVerificationScreen;
