import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // dbをインポート

/**
 * Firestoreドキュメントリアルタイム取得用カスタムフック
 * @param {string} collectionPath - コレクションパス（例: 'users'）
 * @param {string} documentId - ドキュメントID（例: 'xxxx'）
 * @returns {{ data: object | null, loading: boolean, error: Error | null }}
 */
export default function useFirestoreDoc(collectionPath, documentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // collectionPathまたはdocumentIdがない場合は何もしない
    if (!collectionPath || !documentId || documentId.trim() === '') {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, collectionPath, documentId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() });
        } else {
          // ドキュメントが存在しない場合
          setData(null);
        }
        setLoading(false);
      },
      (e) => {
        // ログアウト時や権限エラーの処理
        if (e.code === 'permission-denied') {
          console.log('Permission denied, likely due to user logout');
          setData(null);
          setError(null);
          setLoading(false);
          return;
        }
        console.error("Error fetching document: ", e);
        setError(e);
        setLoading(false);
      }
    );

    // コンポーネントがアンマウントされた時にリスナーを解除
    return () => unsubscribe();
  }, [collectionPath, documentId]);

  return { data, loading, error };
}