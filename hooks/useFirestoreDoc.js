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
    // docPathが空文字列の場合は処理をスキップ
    if (!docPath || docPath.trim() === '') {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

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
        // ドキュメントが存在しない場合はnullを設定（エラーではない）
        setData(null);
        cacheRef.current[docPath] = { data: null, timestamp: now };
      }
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // docPathが有効な場合のみfetchDocを実行
    if (docPath && docPath.trim() !== '') {
      fetchDoc();
    } else {
      setLoading(false);
      setData(null);
      setError(null);
    }
  }, [docPath]);

  const reload = () => {
    if (docPath && docPath.trim() !== '') {
      cacheRef.current[docPath] = undefined;
      fetchDoc();
    }
  };

  return { data, loading, error, reload };
} 