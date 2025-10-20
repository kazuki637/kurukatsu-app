import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking, // Import Linking
  SafeAreaView, // Import SafeAreaView
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { auth, db, storage } from '../firebaseConfig';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import imagePreloader from '../utils/imagePreloader';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';
import useFirestoreDoc from '../hooks/useFirestoreDoc';

const { width } = Dimensions.get('window');
const gridItemSize = (width - 20 * 3) / 2;

export default function ProfileScreen({ navigation, route }) {
  const { userId } = route.params;
  const currentUser = auth.currentUser;
  
  // ユーザープロフィール取得
  const { data: userProfile, loading, error } = useFirestoreDoc('users', userId);
  
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [selfIntroduction, setSelfIntroduction] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  const [joinedCircles, setJoinedCircles] = useState([]);
  const [favoriteCircles, setFavoriteCircles] = useState([]);
  const [circlesLoading, setCirclesLoading] = useState(false);

  // 所属サークルといいね！したサークルのデータを取得
  useEffect(() => {
    if (!userId) return;

    const fetchCirclesData = async () => {
      setCirclesLoading(true);
      try {
        // 所属サークルの取得
        if (userProfile?.joinedCircleIds && userProfile.joinedCircleIds.length > 0) {
          const joinedCirclesPromises = userProfile.joinedCircleIds.map(async (circleId) => {
            try {
              const circleDoc = await getDoc(doc(db, 'circles', circleId));
              if (circleDoc.exists()) {
                return { id: circleId, ...circleDoc.data() };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching circle ${circleId}:`, error);
              return null;
            }
          });
          
          const joinedCirclesData = await Promise.all(joinedCirclesPromises);
          const validJoinedCircles = joinedCirclesData.filter(circle => circle !== null);
          setJoinedCircles(validJoinedCircles);
        } else {
          setJoinedCircles([]);
        }

        // いいね！したサークルの取得（新しい順にソート）
        if (userProfile?.favoriteCircleIds && userProfile.favoriteCircleIds.length > 0) {
          // 配列を反転させて新しいものが上に来るようにする
          const reversedFavoriteCircleIds = [...userProfile.favoriteCircleIds].reverse();
          const favoriteCirclesPromises = reversedFavoriteCircleIds.map(async (circleId) => {
            try {
              const circleDoc = await getDoc(doc(db, 'circles', circleId));
              if (circleDoc.exists()) {
                return { id: circleId, ...circleDoc.data() };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching favorite circle ${circleId}:`, error);
              return null;
            }
          });
          
          const favoriteCirclesData = await Promise.all(favoriteCirclesPromises);
          const validFavoriteCircles = favoriteCirclesData.filter(circle => circle !== null);
          setFavoriteCircles(validFavoriteCircles);
        } else {
          setFavoriteCircles([]);
        }
      } catch (error) {
        console.error('Error fetching circles data:', error);
      } finally {
        setCirclesLoading(false);
      }
    };

    fetchCirclesData();
  }, [userId, userProfile?.joinedCircleIds, userProfile?.favoriteCircleIds]);

  // ローディング条件
  const isInitialLoading = loading;
  
  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="プロフィール" 
          showBackButton={true}
          onBack={() => navigation.goBack()}
          rightButton={
            <TouchableOpacity 
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
          title="プロフィール" 
          showBackButton={true}
          onBack={() => navigation.goBack()}
          rightButton={
            <TouchableOpacity 
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      {/* 透明ヘッダー */}
      <View style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
              activeOpacity={1}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* プロフィールセクション */}
        <View style={styles.profileSection}>
          {/* プロフィール画像とユーザー情報（横並び） */}
          <View style={styles.profileContentContainer}>
            {/* プロフィール画像（左側） */}
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImageWrapper}>
                {userProfile?.profileImageUrl && !imageError ? (
                  <Image
                    source={{ uri: userProfile.profileImageUrl }}
                    style={styles.profileImage}
                    onError={() => setImageError(true)}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.profileImage, {backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                    <Ionicons name="person-outline" size={60} color="#9ca3af" />
                  </View>
                )}
              </View>
            </View>

            {/* ユーザー情報（右側、縦並び左寄せ） */}
            <View style={styles.userInfoContainer}>
              <Text style={styles.displayName}>{userProfile?.name || 'ユーザー名'}</Text>
              
              {userProfile?.grade && (
                <Text style={styles.infoText}>{userProfile.grade}</Text>
              )}
              
              {userProfile?.university && (
                <Text style={styles.infoText}>{userProfile.university}</Text>
              )}
            </View>
          </View>
        </View>

         {/* 統計セクション */}
         <View style={styles.statsSection}>
           <View style={styles.statCard}>
             <Ionicons name="people-outline" size={24} color="#22c55e" />
             {circlesLoading ? (
               <ActivityIndicator size="small" color="#22c55e" style={styles.statLoading} />
             ) : (
               <Text style={styles.statNumber}>{joinedCircles.length}</Text>
             )}
             <Text style={styles.statLabel}>所属サークル</Text>
           </View>
           
           <View style={styles.statDivider} />
           
           <View style={styles.statCard}>
             <Ionicons name="heart-outline" size={24} color="#ef4444" />
             {circlesLoading ? (
               <ActivityIndicator size="small" color="#ef4444" style={styles.statLoading} />
             ) : (
               <Text style={styles.statNumber}>{favoriteCircles.length}</Text>
             )}
             <Text style={styles.statLabel}>いいね！したサークル</Text>
           </View>
         </View>

         {/* タブナビゲーション */}
         <ScrollView 
           horizontal 
           showsHorizontalScrollIndicator={false}
           style={styles.tabScrollView}
           contentContainerStyle={styles.tabContainer}
         >
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
             onPress={() => setActiveTab('profile')}
             activeOpacity={1}
           >
             <Ionicons 
               name="person-outline" 
               size={20} 
               color={activeTab === 'profile' ? '#fff' : '#6b7280'} 
             />
             <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]} numberOfLines={1}>
               プロフィール
             </Text>
           </TouchableOpacity>
           
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'circles' && styles.activeTab]}
             onPress={() => setActiveTab('circles')}
             activeOpacity={1}
           >
             <Ionicons 
               name="people-outline" 
               size={20} 
               color={activeTab === 'circles' ? '#fff' : '#6b7280'} 
             />
             <Text style={[styles.tabText, activeTab === 'circles' && styles.activeTabText]} numberOfLines={1}>
               所属しているサークル
             </Text>
           </TouchableOpacity>
           
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
             onPress={() => setActiveTab('favorites')}
             activeOpacity={1}
           >
             <Ionicons 
               name="heart-outline" 
               size={20} 
               color={activeTab === 'favorites' ? '#fff' : '#6b7280'} 
             />
             <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]} numberOfLines={1}>
               いいね！したサークル
             </Text>
           </TouchableOpacity>
         </ScrollView>

         {/* タブコンテンツ */}
         {activeTab === 'profile' && (
           <>
             {/* 自己紹介セクション */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>自己紹介</Text>
               <Text style={styles.selfIntroductionText}>
                 {userProfile?.selfIntroduction || '自己紹介が設定されていません'}
               </Text>
             </View>

             {/* SNSリンクセクション */}
             {(userProfile?.snsLink || userProfile?.xLink) && (
               <View style={styles.section}>
                 <Text style={styles.sectionTitle}>SNSリンク</Text>
                 <View style={styles.snsLinksContainer}>
                   {userProfile?.snsLink && (
                     <TouchableOpacity 
                       style={styles.snsLinkItem}
                       onPress={() => Linking.openURL(userProfile.snsLink)}
                       activeOpacity={1}
                     >
                       <Image 
                         source={require('../assets/SNS-icons/Instagram_Glyph_Gradient.png')} 
                         style={styles.snsLinkIcon}
                         cachePolicy="memory-disk"
                       />
                       <Text style={styles.snsLinkText}>Instagram</Text>
                       <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                     </TouchableOpacity>
                   )}
                   
                   {userProfile?.xLink && (
                     <TouchableOpacity 
                       style={styles.snsLinkItem}
                       onPress={() => Linking.openURL(userProfile.xLink)}
                       activeOpacity={1}
                     >
                       <Image 
                         source={require('../assets/SNS-icons/X_logo-black.png')} 
                         style={styles.snsLinkIcon}
                         cachePolicy="memory-disk"
                       />
                       <Text style={styles.snsLinkText}>X（旧Twitter）</Text>
                       <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                     </TouchableOpacity>
                   )}
                 </View>
               </View>
             )}
           </>
         )}

         {activeTab === 'circles' && (
           <View style={styles.section}>
             <Text style={styles.sectionTitle}>所属しているサークル</Text>
             {circlesLoading ? (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator size="small" color="#2563eb" />
               </View>
             ) : joinedCircles.length > 0 ? (
               <View style={styles.circlesList}>
                 {joinedCircles.map((circle) => (
                   <TouchableOpacity
                     key={circle.id}
                     style={styles.circleItem}
                     onPress={() => navigation.navigate('共通', { screen: 'CircleDetail', params: { circleId: circle.id } })}
                     activeOpacity={1}
                   >
                     {circle.imageUrl && circle.imageUrl.trim() !== '' && !imageErrors[circle.id] ? (
                       <Image
                         source={{ uri: circle.imageUrl }}
                         style={styles.circleImage}
                         onError={(error) => {
                           console.log(`Image load error for circle ${circle.id}:`, error);
                           console.log(`Failed URL: ${circle.imageUrl}`);
                           setImageErrors(prev => ({ ...prev, [circle.id]: true }));
                         }}
                         onLoad={() => {
                           console.log(`Image loaded successfully for circle ${circle.id}: ${circle.imageUrl}`);
                         }}
                         cachePolicy="memory-disk"
                       />
                     ) : (
                       <View style={[styles.circleImage, styles.defaultCircleImage]}>
                         <Ionicons name="people-outline" size={24} color="#9ca3af" />
                       </View>
                     )}
                     <View style={styles.circleInfo}>
                       <Text style={styles.circleName}>{circle.name}</Text>
                       <Text style={styles.circleUniversity}>{circle.universityName}</Text>
                       <Text style={styles.circleGenre}>{circle.genre}</Text>
                     </View>
                     <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                   </TouchableOpacity>
                 ))}
               </View>
             ) : (
               <Text style={styles.emptyText}>所属しているサークルはありません</Text>
             )}
           </View>
         )}

         {activeTab === 'favorites' && (
           <View style={styles.section}>
             <Text style={styles.sectionTitle}>いいね！したサークル</Text>
             {circlesLoading ? (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator size="small" color="#2563eb" />
               </View>
             ) : favoriteCircles.length > 0 ? (
               <View style={styles.circlesList}>
                 {favoriteCircles.map((circle) => (
                   <TouchableOpacity
                     key={circle.id}
                     style={styles.circleItem}
                     onPress={() => navigation.navigate('共通', { screen: 'CircleDetail', params: { circleId: circle.id } })}
                     activeOpacity={1}
                   >
                     {circle.imageUrl && circle.imageUrl.trim() !== '' && !imageErrors[circle.id] ? (
                       <Image
                         source={{ uri: circle.imageUrl }}
                         style={styles.circleImage}
                         onError={(error) => {
                           console.log(`Image load error for circle ${circle.id}:`, error);
                           console.log(`Failed URL: ${circle.imageUrl}`);
                           setImageErrors(prev => ({ ...prev, [circle.id]: true }));
                         }}
                         onLoad={() => {
                           console.log(`Image loaded successfully for circle ${circle.id}: ${circle.imageUrl}`);
                         }}
                         cachePolicy="memory-disk"
                       />
                     ) : (
                       <View style={[styles.circleImage, styles.defaultCircleImage]}>
                         <Ionicons name="people-outline" size={24} color="#9ca3af" />
                       </View>
                     )}
                     <View style={styles.circleInfo}>
                       <Text style={styles.circleName}>{circle.name}</Text>
                       <Text style={styles.circleUniversity}>{circle.universityName}</Text>
                       <Text style={styles.circleGenre}>{circle.genre}</Text>
                     </View>
                     <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                   </TouchableOpacity>
                 ))}
               </View>
             ) : (
               <Text style={styles.emptyText}>いいね！したサークルはありません</Text>
             )}
           </View>
         )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  loadingContainer: { 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  // ヘッダースタイル
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // スクロールビュー
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100, // ヘッダーの高さ分のパディング
  },
  
  // プロフィールセクション
  profileSection: { 
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  profileContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageWrapper: { 
    position: 'relative',
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  
   // ユーザー情報コンテナ
   userInfoContainer: {
     flex: 1,
     alignItems: 'flex-start',
     justifyContent: 'center',
     minHeight: 120, // プロフィール画像の高さと合わせる
   },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'left',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'left',
  },
  
   // 統計セクション
   statsSection: {
     flexDirection: 'row',
     paddingHorizontal: 20,
     paddingVertical: 4,
     backgroundColor: '#ffffff',
     gap: 12,
   },
   statCard: {
     flex: 1,
     alignItems: 'center',
     paddingVertical: 12,
     backgroundColor: '#ffffff',
   },
   statDivider: {
     width: 1,
     backgroundColor: '#e5e7eb',
     marginVertical: 8,
   },
   statNumber: {
     fontSize: 18,
     fontWeight: 'bold',
     color: '#1f2937',
     marginTop: 4,
     marginBottom: 2,
     minHeight: 24,
   },
   statLoading: {
     marginTop: 4,
     marginBottom: 2,
     minHeight: 24,
   },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  kpIcon: {
    width: 24,
    height: 24,
  },
  
  // タブナビゲーション
  tabScrollView: {
    backgroundColor: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    gap: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  activeTab: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    flexShrink: 1,
  },
  activeTabText: {
    color: '#ffffff',
  },
  
  // セクション
  section: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selfIntroductionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    paddingVertical: 8,
  },
  snsLinksContainer: {
    gap: 12,
  },
  snsLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  snsLinkIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  snsLinkText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  noSnsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  circlesList: {
    gap: 12,
  },
  circleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  circleImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultCircleImage: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  circleUniversity: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  circleGenre: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  
  // ボトムスペーサー
  bottomSpacer: {
    height: 20,
  },
  
  // エラーハンドリング
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
  settingsButton: {
    padding: 0,
  },
});
