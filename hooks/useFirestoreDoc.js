import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Firestoreドキュメント取得用カスタムフック
 * @param {object} db - Firestoreインスタンス
 * @param {string} docPath - ドキュメントパス（例: 'users/xxxx'）
 * @param {object} [options] - { cacheDuration: number(ms) }
 * @returns { data, loading, error, reload }
 */
export default function useFirestoreDoc(db, docPath, options = {}) {
  const cacheDuration = options.cacheDuration || 30000;
  const cacheRef = useRef({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoc = async () => {
    setLoading(true);
    setError(null);
    try {
      // キャッシュ有効ならキャッシュ返す
      const now = Date.now();
      if (
        cacheRef.current[docPath] &&
        now - cacheRef.current[docPath].timestamp < cacheDuration
      ) {
        setData(cacheRef.current[docPath].data);
        setLoading(false);
        return;
      }
      const docRef = doc(db, ...docPath.split('/'));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const docData = { id: docSnap.id, ...docSnap.data() };
        setData(docData);
        cacheRef.current[docPath] = { data: docData, timestamp: now };
      } else {
        setData(null);
      }
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPath]);

  const reload = () => {
    cacheRef.current[docPath] = undefined;
    fetchDoc();
  };

  return { data, loading, error, reload };
} 