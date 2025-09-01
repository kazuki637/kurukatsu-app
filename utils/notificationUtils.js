import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Platform } from 'react-native';

// 通知権限の取得とトークンの登録
export const registerForPushNotifications = async (userId) => {
  try {
    // 既存の権限を確認
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // 権限がない場合は要求
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // 権限が拒否された場合
    if (finalStatus !== 'granted') {
      Alert.alert('プッシュ通知の許可が必要です');
      return null;
    }

    // 開発ビルドでの通知設定を強化
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Expo Push Tokenを取得
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'f94b703e-f3c4-4f9f-8bb5-8b53bf7ac727', // EASプロジェクトID
    });
    
    console.log('通知トークン取得成功:', token.data);
    console.log('ユーザーID:', userId);
    
    // トークンをFirestoreに保存
    await saveTokenToFirestore(userId, token.data);
    
    return token.data;
  } catch (error) {
    console.error('通知トークンの取得に失敗:', error);
    return null;
  }
};

// トークンをFirestoreに保存
const saveTokenToFirestore = async (userId, token) => {
  try {
    const tokenRef = doc(db, 'users', userId, 'notificationTokens', token);
    await setDoc(tokenRef, {
      token,
      createdAt: new Date(),
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('トークンの保存に失敗:', error);
  }
};

// ユーザーの通知設定をチェック
export const checkUserNotificationSettings = async (userId, notificationType) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const notificationSettings = userData.notificationSettings || {};
      
      // 通知設定が明示的にfalseでない場合は通知を送信（デフォルトはtrue）
      return notificationSettings[notificationType] !== false;
    }
    return true; // ユーザーデータが存在しない場合はデフォルトで通知を送信
  } catch (error) {
    console.error('通知設定の確認に失敗:', error);
    return true; // エラーの場合はデフォルトで通知を送信
  }
};

// ユーザーの通知トークンを取得（通知設定をチェック）
export const getUserNotificationTokens = async (userId, notificationType = null) => {
  try {
    // 通知タイプが指定されている場合は設定をチェック
    if (notificationType) {
      const isNotificationEnabled = await checkUserNotificationSettings(userId, notificationType);
      if (!isNotificationEnabled) {
        console.log(`ユーザー ${userId} の ${notificationType} 通知は無効化されています`);
        return [];
      }
    }
    
    const tokensRef = collection(db, 'users', userId, 'notificationTokens');
    const tokensSnapshot = await getDocs(tokensRef);
    return tokensSnapshot.docs.map(doc => doc.data().token);
  } catch (error) {
    console.error('通知トークンの取得に失敗:', error);
    return [];
  }
};

// 通知を送信
export const sendPushNotification = async (tokens, title, body, data = {}) => {
  try {
    console.log('通知送信開始');
    console.log('送信先トークン数:', tokens.length);
    console.log('通知タイトル:', title);
    console.log('通知本文:', body);
    console.log('通知データ:', data);

    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    // EAS Push Serviceに送信
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    console.log('通知送信レスポンス:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('通知送信エラーレスポンス:', errorText);
      throw new Error(`通知送信に失敗: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('通知送信成功:', responseData);
    return true;
  } catch (error) {
    console.error('通知送信エラー:', error);
    return false;
  }
};
