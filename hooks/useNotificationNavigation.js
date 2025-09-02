import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

export const useNotificationNavigation = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // 通知からの遷移をチェック（フォールバック用）
    const checkPendingNotification = () => {
      if (global.pendingNotification) {
        const { data, timestamp } = global.pendingNotification;
        
        // 古い通知は無視（5分以内）
        if (Date.now() - timestamp > 5 * 60 * 1000) {
          delete global.pendingNotification;
          return;
        }

        console.log('フォールバック通知遷移を実行:', data);
        
        if (data.type === 'joinRequest') {
          // 入会申請通知の場合
          // サークル管理タブのCircleMemberManagement画面に遷移
          navigation.navigate('サークル管理', {
            screen: 'CircleMemberManagement',
            params: {
              circleId: data.circleId,
              initialTab: 'requests'
            }
          });
        } else if (data.type === 'contact') {
          // サークル連絡通知の場合
          // サークルメンバー画面の連絡タブに遷移
          navigation.navigate('CircleMember', {
            circleId: data.circleId,
            initialTab: 1 // 連絡タブのインデックス
          });
        }
        
        // 処理完了後、グローバル変数をクリア
        delete global.pendingNotification;
      }
    };

    // 画面フォーカス時に通知チェック
    const unsubscribe = navigation.addListener('focus', () => {
      // 少し遅延させてからチェック（画面遷移の完了を待つ）
      setTimeout(checkPendingNotification, 500);
    });

    return unsubscribe;
  }, [navigation]);

  return null;
};
