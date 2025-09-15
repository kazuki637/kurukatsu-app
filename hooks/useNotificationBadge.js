import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// グローバルな通知バッジ状態管理
let globalUnreadCounts = {};
let globalListeners = new Set();

// 通知バッジの更新を通知する関数
const notifyListeners = () => {
  globalListeners.forEach(listener => {
    if (typeof listener === 'function') {
      listener(globalUnreadCounts);
    }
  });
};

// 未読数を更新する関数（リアルタイムリスナーが自動更新するため、この関数は非推奨）
// export const updateUnreadCounts = (circleId, delta) => {
//   globalUnreadCounts[circleId] = Math.max(0, (globalUnreadCounts[circleId] || 0) + delta);
//   notifyListeners();
// };

// 特定のサークルの未読数を設定する関数
export const setUnreadCount = (circleId, count) => {
  globalUnreadCounts[circleId] = Math.max(0, count);
  notifyListeners();
};

// 全未読数を取得する関数
export const getAllUnreadCounts = () => ({ ...globalUnreadCounts });

// 特定のサークルの未読数を取得する関数
export const getUnreadCount = (circleId) => globalUnreadCounts[circleId] || 0;

// 通知バッジフック
export const useNotificationBadge = (circleId = null) => {
  const [unreadCounts, setUnreadCounts] = useState(globalUnreadCounts);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // リスナーを登録
  useEffect(() => {
    const listener = (counts) => {
      setUnreadCounts({ ...counts });
    };
    
    globalListeners.add(listener);
    
    return () => {
      globalListeners.delete(listener);
    };
  }, []);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // ログアウト時は状態をクリア
        globalUnreadCounts = {};
        notifyListeners();
        setIsLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  // 初回データ取得
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        // ユーザーの参加サークルIDを取得
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          setIsLoading(false);
          return;
        }

        const userData = userDoc.data();
        const joinedCircleIds = userData.joinedCircleIds || [];

        if (joinedCircleIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // 未読メッセージ数を取得
        const q = query(
          collection(db, 'users', currentUser.uid, 'circleMessages'),
          where('circleId', 'in', joinedCircleIds),
          where('readAt', '==', null)
        );
        
        const snapshot = await getDocs(q);
        const counts = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const circleId = data.circleId;
          counts[circleId] = (counts[circleId] || 0) + 1;
        });

        // グローバル状態を更新
        Object.keys(counts).forEach(id => {
          globalUnreadCounts[id] = counts[id];
        });
        
        // 参加サークルで未読がないものは0に設定
        joinedCircleIds.forEach(id => {
          if (!(id in globalUnreadCounts)) {
            globalUnreadCounts[id] = 0;
          }
        });

        notifyListeners();
      } catch (error) {
        console.error('Error fetching initial unread counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [currentUser]);

  // リアルタイムリスナーを設定
  useEffect(() => {
    if (!currentUser) {
      // ユーザーがログインしていない場合は状態をクリア
      globalUnreadCounts = {};
      notifyListeners();
      return;
    }

    const q = query(
      collection(db, 'users', currentUser.uid, 'circleMessages'),
      where('readAt', '==', null)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const counts = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const circleId = data.circleId;
          counts[circleId] = (counts[circleId] || 0) + 1;
        });

        // グローバル状態を更新
        globalUnreadCounts = counts;
        notifyListeners();
      },
      (error) => {
        // 権限エラーやその他のエラーをキャッチ
        console.warn('Firestore listener error:', error);
        if (error.code === 'permission-denied') {
          // 権限エラーの場合は状態をクリア
          globalUnreadCounts = {};
          notifyListeners();
        }
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // 特定のサークルの未読数を取得
  const getCircleUnreadCount = useCallback((targetCircleId) => {
    return unreadCounts[targetCircleId] || 0;
  }, [unreadCounts]);

  // 全未読数の合計を取得
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  return {
    unreadCounts,
    isLoading,
    getCircleUnreadCount,
    getTotalUnreadCount,
    // 特定のサークルIDが指定されている場合はそのサークルの未読数を返す
    unreadCount: circleId ? getCircleUnreadCount(circleId) : null
  };
};
