import React, { useState, useCallback } from 'react';
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
  // ユーザープロフィール取得（キャッシュ5秒に短縮）
  const { data: userProfile, loading, error, reload } = useFirestoreDoc(db, userId ? `users/${userId}` : '', { cacheDuration: 5000 });
  
  // プロフィール編集画面から渡された更新データを処理（削除）
  const [savedCircles, setSavedCircles] = useState([]);
  const [joinedCircles, setJoinedCircles] = useState([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // 画面がフォーカスされたときにデータをリロード
  useFocusEffect(
    React.useCallback(() => {
      setImageError(false); // 画像エラー状態をリセット
      // プロフィール編集画面から戻ってきた場合のみデータをリロード
      // 初回ロード時はリロードしない
      if (!isInitialLoad && userProfile) {
        reload();
      }
    }, [reload, isInitialLoad, userProfile])
  );

  // userProfile取得後にサークル情報を取得
  React.useEffect(() => {
    const fetchCircles = async () => {
      if (!userProfile) return;
      
      // 初回ロード時のみローディング状態を表示
      if (isInitialLoad) {
        setCirclesLoading(true);
      }
      
      try {
        // joinedCircles
        let joined = [];
        if (userProfile.joinedCircleIds && userProfile.joinedCircleIds.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < userProfile.joinedCircleIds.length; i += batchSize) {
            const batch = userProfile.joinedCircleIds.slice(i, i + batchSize);
            const circlesRef = collection(db, 'circles');
            const q = query(circlesRef, where('__name__', 'in', batch));
            const querySnapshot = await getDocs(q);
            joined.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
        setJoinedCircles(joined);
        // savedCircles
        let saved = [];
        if (userProfile.favoriteCircleIds && userProfile.favoriteCircleIds.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < userProfile.favoriteCircleIds.length; i += batchSize) {
            const batch = userProfile.favoriteCircleIds.slice(i, i + batchSize);
            const circlesRef = collection(db, 'circles');
            const q = query(circlesRef, where('__name__', 'in', batch));
            const querySnapshot = await getDocs(q);
            saved.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
        setSavedCircles(saved);

      } catch (e) {
        console.error('Error fetching circles:', e);
        setJoinedCircles([]);
        setSavedCircles([]);
      } finally {
        setCirclesLoading(false);
      }
    };
    
    // userProfileが存在し、必要なIDが変更された場合のみ実行
    if (userProfile && (
      userProfile.joinedCircleIds !== undefined || 
      userProfile.favoriteCircleIds !== undefined
    )) {
      fetchCircles();
    }
  }, [userProfile?.joinedCircleIds?.length, userProfile?.favoriteCircleIds?.length]);

  // 初回ロード完了後はisInitialLoadをfalseに設定
  React.useEffect(() => {
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);
  
  // 初回ロード時のみローディング画面を表示
  if (loading && isInitialLoad) {
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
            <TouchableOpacity onPress={reload} style={{ marginTop: 10 }}>
              <Text style={{ color: '#007bff' }}>再読み込み</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  // ユーザープロフィールが存在しない場合（新規登録直後など）
  if (!userProfile) {
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
                <Image
                  source={{ 
                    uri: userProfile.profileImageUrl,
                    cache: 'default' // デフォルトのキャッシュ設定を使用
                  }}
                  style={styles.profileImage}
                  onError={() => setImageError(true)}
                />
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
                    <TouchableOpacity style={styles.bookmarkButton}>
                      <Ionicons name="chevron-forward" size={20} color="#007bff" />
                    </TouchableOpacity>
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
          <View style={styles.contentArea}>
            <Text style={styles.sectionTitle}>いいね！したサークル</Text>
            {savedCircles.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularCirclesScrollContainer}
                style={styles.popularCirclesScrollView}
              >
                {savedCircles.map((circle, index) => (
                  <TouchableOpacity 
                    key={circle.id} 
                    style={styles.popularCircleCard}
                    onPress={() => navigation.navigate('CircleDetail', { circleId: circle.id })}
                  >
                    {circle.imageUrl ? (
                      <Image source={{ uri: circle.imageUrl }} style={styles.popularCircleImage} />
                    ) : (
                      <View style={[styles.popularCircleImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="people-outline" size={40} color="#aaa" />
                      </View>
                    )}
                    <Text style={styles.popularCircleName}>{circle.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>いいね！したサークルはありません</Text>
                <Text style={styles.emptySubText}>気になるサークルを保存しましょう</Text>
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
  profileImage: { width: 100, height: 100, borderRadius: 50 },
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
});