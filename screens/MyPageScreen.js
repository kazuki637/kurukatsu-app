import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking, // Import Linking
  SafeAreaView, // Import SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { auth, db, storage } from '../firebaseConfig';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import CommonHeader from '../components/CommonHeader';
import useFirestoreDoc from '../hooks/useFirestoreDoc';

const { width } = Dimensions.get('window');
const gridItemSize = (width - 20 * 3) / 2;

// グローバルキャッシュ
// let userProfileCache = null;
// let circlesCache = { joined: [], saved: [] };
// let lastFetchTime = 0;
// const CACHE_DURATION = 30000; // 30秒間キャッシュ

export default function MyPageScreen({ navigation, route }) {
  const user = auth.currentUser;
  const userId = user ? user.uid : null;
  // ユーザープロフィール取得
  const { data: userProfile, loading, error } = useFirestoreDoc('users', userId);
  
  // プロフィール編集画面から渡された更新データを処理（削除）

  const [joinedCircles, setJoinedCircles] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({}); // 未読通知数を管理
  
  // 統合ローディング状態：初回ロード時は全てのデータが揃うまでローディング表示
  const [isDataReady, setIsDataReady] = useState(false);

  // 画像のプリロード
  useEffect(() => {
    if (userProfile?.profileImageUrl && userProfile.profileImageUrl.trim() !== '') {
      // 画像エラー状態をリセット
      setImageError(false);
      setImageLoading(true);
      
      // 画像をプリロードしてキャッシュに保存
      Image.prefetch(userProfile.profileImageUrl).catch(() => {
        // プリロードに失敗した場合は無視（通常の読み込みにフォールバック）
      });
    }
  }, [userProfile?.profileImageUrl]);
  
  // リアルタイム未読数更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateMyPageUnreadCounts = (circleId, delta) => {
      setUnreadCounts(prev => ({
        ...prev,
        [circleId]: Math.max(0, (prev[circleId] || 0) + delta)
      }));
    };


    
    return () => {
      delete global.updateMyPageUnreadCounts;
    };
  }, []);
  
  // プロフィール編集完了時のイベントベース更新
  React.useEffect(() => {
    global.onProfileUpdated = () => {
      setImageError(false); // 画像エラー状態をリセット
      // リロード機能は useFirestoreDoc のリアルタイム更新で自動的に行われる
    };
    
    return () => {
      delete global.onProfileUpdated;
    };
  }, []);



  // userProfile取得後にサークル情報と未読通知数を一括取得
  React.useEffect(() => {
    const fetchCirclesAndUnreadCounts = async () => {
      if (!userProfile) return;
      
      try {
        // 並列でサークル情報と未読通知数を取得
        const promises = [];
        
        // joinedCircles取得のPromise
        if (userProfile.joinedCircleIds && Array.isArray(userProfile.joinedCircleIds) && userProfile.joinedCircleIds.length > 0) {
          const circlesRef = collection(db, 'circles');
          const q = query(circlesRef, where('__name__', 'in', userProfile.joinedCircleIds));
          promises.push(getDocs(q));
        } else {
          promises.push(Promise.resolve({ docs: [] }));
        }
        
        // 未読通知数取得のPromise
        if (userProfile.joinedCircleIds && Array.isArray(userProfile.joinedCircleIds) && userProfile.joinedCircleIds.length > 0) {
          const q = query(
            collection(db, 'users', userId, 'circleMessages'),
            where('circleId', 'in', userProfile.joinedCircleIds),
            where('readAt', '==', null)
          );
          promises.push(getDocs(q));
        } else {
          promises.push(Promise.resolve({ docs: [] }));
        }
        

        
        // 並列実行
        const [circlesSnapshot, unreadSnapshot] = await Promise.all(promises);
        
        // joinedCircles処理
        const joined = circlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJoinedCircles(joined);
        
        // 未読通知数処理
        if (unreadSnapshot.docs.length > 0) {
          const unreadCountsData = {};
          unreadSnapshot.docs.forEach(doc => {
            const circleId = doc.data().circleId;
            unreadCountsData[circleId] = (unreadCountsData[circleId] || 0) + 1;
          });
          setUnreadCounts(unreadCountsData);
        }
        


        // 初回ロード時は全てのデータが揃ったことを示す
        if (isInitialLoad) {
          setIsDataReady(true);
        }

      } catch (e) {
        console.error('Error fetching circles and unread counts:', e);
        setJoinedCircles([]);
        setUnreadCounts({});
        
        // エラー時もデータ準備完了として扱う
        if (isInitialLoad) {
          setIsDataReady(true);
        }
      }
    };
    
    // userProfileが存在し、必要なIDが変更された場合のみ実行
    if (userProfile && userProfile.joinedCircleIds !== undefined && Array.isArray(userProfile.joinedCircleIds)) {
      fetchCirclesAndUnreadCounts();
    } else if (userProfile && isInitialLoad) {
      // userProfileは存在するが、joinedCircleIdsが未定義の場合
      // 初回ロード時はデータ準備完了として扱う
      setIsDataReady(true);
    } else if (!userProfile && !loading && isInitialLoad) {
      // userProfileが存在せず、ローディングも完了している場合
      // 初回ロード時はデータ準備完了として扱う
      setIsDataReady(true);
    }
  }, [userProfile, isInitialLoad, loading]);

  // 初回ロード完了後はisInitialLoadをfalseに設定
  // 全てのデータが揃った後にisInitialLoadをfalseに設定
  React.useEffect(() => {
    if (isDataReady && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isDataReady, isInitialLoad]);
  
  // 統合ローディング条件：初回ロード時は全てのデータが揃うまでローディング表示
  const isInitialLoading = (loading && isInitialLoad) || (isInitialLoad && !isDataReady);
  
  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <CommonHeader title="マイページ" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#999" style={{ marginTop: 10 }} />
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  // エラーが発生した場合
  if (error) {
    return (
      <View style={styles.container}>
        <CommonHeader title="マイページ" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <Text>ユーザーデータの取得に失敗しました</Text>
            <TouchableOpacity onPress={() => {
              // 画面を再マウントして再読み込みを実現
              setImageError(false);
              setIsInitialLoad(true);
              setIsDataReady(false);
            }} style={{ marginTop: 10 }}>
              <Text style={{ color: '#007bff' }}>再読み込み</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  // ユーザープロフィールが存在しない場合（新規登録直後など）
  // 初回ロード完了後でプロフィールが存在しない場合のみ表示
  if (!userProfile && !isInitialLoad) {
    return (
      <View style={styles.container}>
        <CommonHeader title="マイページ" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <Text>プロフィール情報を読み込み中...</Text>
            <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 10 }} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader title="マイページ" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainerSimple}>
              {userProfile?.profileImageUrl && userProfile.profileImageUrl.trim() !== '' && !imageError ? (
                <View style={styles.profileImageWrapper}>
                  <Image
                    source={{ 
                      uri: userProfile.profileImageUrl,
                      cache: 'force-cache' // 強制キャッシュを使用
                    }}
                    style={styles.profileImage}
                    onLoadStart={() => setImageLoading(true)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageError(true);
                      setImageLoading(false);
                    }}
                    resizeMode="cover"
                  />
                  {imageLoading && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="small" color="#007bff" />
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.profileImage, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                  <Ionicons name="person-outline" size={48} color="#aaa" />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{userProfile?.name || 'ユーザー名'}</Text>
            {(userProfile?.university || userProfile?.grade) && (
              <Text style={styles.userUniversity}>
                {userProfile?.university || ''}
                {userProfile?.university && userProfile?.grade ? '・' : ''}
                {userProfile?.grade || ''}
              </Text>
            )}
            <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('ProfileEdit')}>
              <Text style={styles.editProfileButtonText}>プロフィールを編集</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.contentArea}>
            <Text style={styles.sectionTitle}>所属しているサークル</Text>
            {joinedCircles.length > 0 ? (
              joinedCircles.map((circle, index) => (
                <TouchableOpacity 
                  key={circle.id} 
                  style={styles.circleCardContainer}
                  onPress={() => navigation.navigate('CircleMember', { circleId: circle.id })}
                >
                  <View style={styles.circleCard}>
                    {circle.imageUrl ? (
                      <Image source={{ uri: circle.imageUrl }} style={styles.circleImage} />
                    ) : (
                      <View style={[styles.circleImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="people-outline" size={40} color="#aaa" />
                      </View>
                    )}
                    <View style={styles.circleInfo}>
                      <Text style={styles.circleCategory}>サークル | {circle.genre || 'その他'}</Text>
                      <Text style={styles.circleName}>{circle.name}</Text>
                      <Text style={styles.circleEvent}>{circle.universityName || '大学名未設定'}</Text>
                    </View>
                    
                    {/* 未読通知バッジ */}
                    {unreadCounts[circle.id] > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unreadCounts[circle.id]}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>所属しているサークルはありません</Text>
                <Text style={styles.emptySubText}>サークルに参加して活動を始めましょう</Text>
              </View>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  profileImageContainerSimple: { alignItems: 'center', marginBottom: 12 },
  profileImageWrapper: { position: 'relative' },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },
  userUniversity: { fontSize: 16, color: '#666', marginTop: 4 },
  editProfileButton: { marginTop: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 8, alignItems: 'center', paddingHorizontal: 24 },
  editProfileButtonText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  contentArea: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  contentTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: (Dimensions.get('window').width - 20 * 3) / 2, marginBottom: 20 },
  gridImage: { width: '100%', height: (Dimensions.get('window').width - 20 * 3) / 2, borderRadius: 12, backgroundColor: '#e0e0e0' },
  gridItemText: { marginTop: 8, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  emptyMessage: { textAlign: 'center', color: '#666', marginTop: 20 },
  // 人気のサークル（横スクロール）
  popularCirclesScrollView: {
    marginHorizontal: -20,
  },
  popularCirclesScrollContainer: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  popularCircleCard: {
    alignItems: 'center',
    width: 100,
    marginRight: 15,
  },
  popularCircleImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  popularCircleName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },

  // サークルカードスタイル（ホーム画面と同じ）
  circleCardContainer: {
    marginBottom: 12,
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  circleImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  circleInfo: {
    flex: 1,
  },
  circleCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  circleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  circleEvent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookmarkButton: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
  // 未読通知バッジ（CircleMemberScreenと同じスタイル）
  unreadBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});