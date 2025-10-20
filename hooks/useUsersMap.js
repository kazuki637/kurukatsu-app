import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// ユーザーID配列からユーザープロフィールのマップをリアルタイム購読して返す
export default function useUsersMap(userIds) {
  const [userIdToProfile, setUserIdToProfile] = useState({});
  const subscriptionsRef = useRef({});

  const uniqueIds = useMemo(() => {
    if (!Array.isArray(userIds)) return [];
    return Array.from(new Set(userIds.filter(Boolean)));
  }, [userIds]);

  useEffect(() => {
    const currentSubs = subscriptionsRef.current;

    // 購読を追加
    uniqueIds.forEach((uid) => {
      if (currentSubs[uid]) return;
      const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
        setUserIdToProfile((prev) => ({ ...prev, [uid]: snap.exists() ? snap.data() : null }));
      });
      currentSubs[uid] = unsub;
    });

    // 購読を削除（不要なID）
    Object.keys(currentSubs).forEach((uid) => {
      if (!uniqueIds.includes(uid)) {
        currentSubs[uid]();
        delete currentSubs[uid];
        setUserIdToProfile((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }
    });

    return () => {
      // アンマウント時に全購読解除
      Object.values(currentSubs).forEach((unsub) => unsub());
      subscriptionsRef.current = {};
    };
  }, [uniqueIds]);

  return userIdToProfile;
}


