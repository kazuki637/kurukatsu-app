import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { auth, db, storage } from '../firebaseConfig';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import imagePreloader from '../utils/imagePreloader';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import CommonHeader from '../components/CommonHeader';
import useFirestoreDoc from '../hooks/useFirestoreDoc';
import { useNotificationBadge } from '../hooks/useNotificationBadge';

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
  const [imageError, setImageError] = useState(false);
  // 通知バッジフックを使用
  const { unreadCounts, isLoading: notificationLoading } = useNotificationBadge();

  
  // グローバル関数は削除（useNotificationBadgeフックで管理）
  
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



  // サークル情報を取得（CircleManagementScreenと同じシンプルなアプローチ）
  useEffect(() => {
    if (!userProfile) {
      setJoinedCircles([]);
      return;
    }

    const fetchCircles = async () => {
      try {
        if (userProfile.joinedCircleIds && Array.isArray(userProfile.joinedCircleIds) && userProfile.joinedCircleIds.length > 0) {
          const circlesRef = collection(db, 'circles');
          const q = query(circlesRef, where('__name__', 'in', userProfile.joinedCircleIds));
          const circlesSnapshot = await getDocs(q);
          const joined = circlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setJoinedCircles(joined);
        } else {
          setJoinedCircles([]);
        }
      } catch (error) {
        console.error('Error fetching circles:', error);
        setJoinedCircles([]);
      }
    };

    fetchCircles();
  }, [userProfile]);
  
  // 統合ローディング条件：CircleManagementScreenと同じシンプルなロジック
  const isInitialLoading = loading || notificationLoading;
  
  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="マイページ" 
          rightButton={
            <TouchableOpacity 
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
              activeOpacity={1}
            >
              <Ionicons name="settings-outline" size={24} color="#374151" />
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      </View>
    );
  }
  
  // エラーが発生した場合
  if (error) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="マイページ" 
          rightButton={
            <TouchableOpacity 
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
              activeOpacity={1}
            >
              <Ionicons name="settings-outline" size={24} color="#374151" />
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>ユーザーデータの取得に失敗しました</Text>
          <TouchableOpacity 
            onPress={() => {
              // 画面を再マウントして再読み込みを実現
              setImageError(false);
            }} 
            style={styles.retryButton}
            activeOpacity={1}
          >
            <Text style={styles.retryButtonText}>再読み込み</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="マイページ" 
        rightButton={
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        }
      />
      <View style={styles.mainContent}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <View style={styles.profileContent}>
              <View style={styles.profileImageContainer}>
                <View style={styles.profileImageWrapper}>
                  {userProfile?.profileImageUrl && !imageError ? (
                    <Image
                      source={{ 
                        uri: userProfile.profileImageUrl,
                        cache: 'force-cache'
                      }}
                      style={styles.profileImage}
                      onError={() => setImageError(true)}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.profileImage, {backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                      <Ionicons name="person-outline" size={50} color="#9ca3af" />
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userProfile?.name || 'ユーザー名'}</Text>
                {(userProfile?.university || userProfile?.grade) && (
                  <View style={styles.universityInfo}>
                    <Ionicons name="school-outline" size={16} color="#666" />
                    <Text style={styles.userUniversity}>
                      {userProfile?.university || ''}
                      {userProfile?.university && userProfile?.grade ? '・' : ''}
                      {userProfile?.grade || ''}
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('共通', { screen: 'ProfileEdit' })} activeOpacity={1}>
                  <Text style={styles.editProfileButtonText}>プロフィールを編集</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.contentArea}>
            <Text style={styles.sectionTitle}>所属しているサークル</Text>
            {joinedCircles.length > 0 ? (
              joinedCircles.map((circle, index) => (
                <TouchableOpacity 
                  key={circle.id} 
                  style={styles.circleCardContainer}
                  onPress={() => navigation.navigate('共通', { screen: 'CircleMember', params: { circleId: circle.id } })}
                  activeOpacity={1}
                >
                  <View style={styles.circleCard}>
                    <View style={styles.circleImageContainer}>
                      {circle.imageUrl ? (
                        <Image 
                          source={{ 
                            uri: circle.imageUrl,
                            cache: 'force-cache' // プリロード済みキャッシュを強制使用
                          }} 
                          style={styles.circleImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.circleImage, { backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' }]}> 
                          <Ionicons name="people-outline" size={32} color="#6c757d" />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.circleInfo}>
                      <View style={styles.circleCategoryContainer}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.circleCategory}>{circle.genre || 'その他'}</Text>
                        </View>
                      </View>
                      <Text style={styles.circleName}>{circle.name}</Text>
                      <View style={styles.circleUniversityContainer}>
                        <Ionicons name="school-outline" size={14} color="#6c757d" />
                        <Text style={styles.circleEvent}>{circle.universityName || '大学名未設定'}</Text>
                      </View>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainContent: { flex: 1 },
  
  
  // プロフィールセクションのスタイル
  profileSection: { 
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 0,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImageWrapper: { 
    position: 'relative',
    alignItems: 'center',
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e0e0e0',
  },
  profileImageBorder: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 68,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1f2937', 
    marginBottom: 8,
    textAlign: 'left',
  },
  universityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  userUniversity: { 
    fontSize: 16, 
    color: '#6b7280', 
    marginLeft: 6,
  },
  editProfileButton: { 
    backgroundColor: '#ffffff',
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  editProfileButtonText: { 
    color: '#2563eb', 
    fontWeight: 'bold', 
    fontSize: 14,
  },
  settingsButton: {
    padding: 0,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentArea: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 20,
    backgroundColor: '#f0f2f5',
  },
  contentTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 15,
    color: '#2c3e50',
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '500', 
    color: '#1f2937', 
    marginBottom: 16,
    marginLeft: 4,
  },
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

  // サークルカードスタイル（設定項目と統一）
  circleCardContainer: {
    marginBottom: 12,
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  circleImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  circleImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  circleInfo: {
    flex: 1,
  },
  circleCategoryContainer: {
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  circleCategory: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  circleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
    lineHeight: 22,
  },
  circleUniversityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleEvent: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  bookmarkButton: {
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  // 未読通知バッジ（改良版）
  unreadBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // 設定セクションのスタイル
  settingsSection: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  infoSection: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  integratedSettingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  integratedInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  integratedSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  integratedSettingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '400',
  },

  // ログアウトセクションのスタイル
  logoutSection: {
    marginTop: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff3b30',
    marginLeft: 12,
    fontWeight: '400',
  },
});