import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Image } from 'expo-image';
import CommonHeader from '../components/CommonHeader';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getArticles } from '../services/notionService';
import useFirestoreDoc from '../hooks/useFirestoreDoc';
import { useNotificationBadge } from '../hooks/useNotificationBadge';

// import { useNotificationNavigation } from '../hooks/useNotificationNavigation';

// 日付をフォーマットする関数
const formatDate = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    let date;
    
    // Dateオブジェクトの場合
    if (dateValue instanceof Date) {
      date = dateValue;
    }
    // 文字列の場合
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }
    // 数値（タイムスタンプ）の場合
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    }
    else {
      return dateValue; // フォーマットできない場合はそのまま返す
    }
    
    // 日付が有効かチェック
    if (isNaN(date.getTime())) {
      return dateValue;
    }
    
    // 日本語の曜日配列
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日（${weekday}）`;
    
  } catch (error) {
    console.error('日付のフォーマットに失敗:', error);
    return dateValue; // エラーの場合は元の値を返す
  }
};

const HomeScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const userId = user ? user.uid : null;
  
  // ユーザープロフィール取得
  const { data: userProfile, loading: userProfileLoading, error: userProfileError } = useFirestoreDoc('users', userId);
  
  // 通知バッジフックを使用
  const { unreadCounts, isLoading: notificationLoading } = useNotificationBadge();

  const [loading, setLoading] = useState(true);
  const [userUniversity, setUserUniversity] = useState('');
  const [popularCircles, setPopularCircles] = useState([]);
  const [newCircles, setNewCircles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesInitialized, setArticlesInitialized] = useState(false);
  
  // ブロック機能の状態管理
  const [userBlockedCircleIds, setUserBlockedCircleIds] = useState([]);
  
  // 所属サークルの状態管理
  const [joinedCircles, setJoinedCircles] = useState([]);


  // 通知ナビゲーションフックを使用（削除：直接遷移に変更）
  // useNotificationNavigation();




  
  // ブロック状態をスナップショットリスナーで監視
  useEffect(() => {
    if (!auth.currentUser?.uid) {
      setUserBlockedCircleIds([]);
      return;
    }
    
    const unsubscribe = onSnapshot(
      collection(db, 'users', auth.currentUser.uid, 'blocks'),
      (snapshot) => {
        const blockedIds = snapshot.docs.map(doc => doc.id);
        setUserBlockedCircleIds(blockedIds);
        
        // ブロック状態が変更された時にサークルデータを再取得
        if (userUniversity) {
          fetchPopularCirclesByUniversity(userUniversity).then(setPopularCircles);
          fetchNewCircles().then(setNewCircles);
        }
      },
      (error) => {
        console.error('Error listening to blocks:', error);
        setUserBlockedCircleIds([]);
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [auth.currentUser?.uid, userUniversity]);

  // 初回ロード時のみデータ取得
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // ユーザーの大学情報を取得
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        let userData = null;
        if (userDoc.exists()) {
          userData = userDoc.data();
          setUserUniversity(userData.university || '');
        }

        // 初回ロード時のみブロック状態を取得
        let blockedIds = [];
        try {
          const blocksRef = collection(db, 'users', auth.currentUser.uid, 'blocks');
          const blocksSnapshot = await getDocs(blocksRef);
          blockedIds = blocksSnapshot.docs.map(doc => doc.id);
          setUserBlockedCircleIds(blockedIds);
        } catch (error) {
          console.error('Error fetching user blocks:', error);
          setUserBlockedCircleIds([]);
        }

        // すべてのサークルを取得
        const circlesCollectionRef = collection(db, 'circles');
        const querySnapshot = await getDocs(circlesCollectionRef);
        const circles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 大学別の人気サークルを取得
        if (userData && userData.university) {
          const universityPopularCircles = await fetchPopularCirclesByUniversity(userData.university);
          // ブロックしたサークルを除外（ローカル変数を使用）
          const filteredPopularCircles = universityPopularCircles.filter(circle => 
            !blockedIds.includes(circle.id)
          );
          setPopularCircles(filteredPopularCircles);
        }

        // 新着のサークルを取得
        const newCirclesList = await fetchNewCircles();
        // ブロックしたサークルを除外（ローカル変数を使用）
        const filteredNewCircles = newCirclesList.filter(circle => 
          !blockedIds.includes(circle.id)
        );
        setNewCircles(filteredNewCircles);
      } catch (error) {
        console.error("Error fetching user data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []); // 初回マウント時のみ実行



  // 所属サークル情報を取得（MyPageScreenと同じロジック）
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

  // 記事データを取得する共通関数（Notion API使用）
  const fetchArticlesData = async () => {
    try {
      setArticlesLoading(true);
      
      // Notion APIから記事データを取得
      const articlesData = await getArticles();
      
      setArticles(articlesData);
      setArticlesInitialized(true);
    } catch (error) {
      console.error("Error fetching articles from Notion: ", error);
      // エラー時は空配列を設定
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  };

  // 記事データを初回ロード時のみ取得
  useEffect(() => {
    // 既に記事が読み込まれている場合は再読み込みしない
    if (articlesInitialized && articles.length > 0) {
      setArticlesLoading(false);
      return;
    }

    fetchArticlesData();
  }, []); // 初回マウント時のみ実行

  // 大学別の人気サークルを取得する関数
  const fetchPopularCirclesByUniversity = async (university) => {
    try {
      const circlesCollectionRef = collection(db, 'circles');
      const querySnapshot = await getDocs(circlesCollectionRef);
      const circles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 指定された大学のサークルをフィルタリング
      const universityCircles = circles.filter(circle => circle.universityName === university);
      
      // likes数でソート（上位20つ）
      return universityCircles
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 20);
    } catch (error) {
      console.error("Error fetching popular circles: ", error);
      return [];
    }
  };

  // 新着のサークルを取得する関数
  const fetchNewCircles = async () => {
    try {
      const circlesCollectionRef = collection(db, 'circles');
      const querySnapshot = await getDocs(circlesCollectionRef);
      const circles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 作成日時でソート（新しい順、上位10件）
      return circles
        .filter(circle => circle.createdAt) // createdAtが存在するサークルのみ
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 10);
    } catch (error) {
      console.error("Error fetching new circles: ", error);
      return [];
    }
  };


  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader 
        customTitle={
          <Image 
            source={require('../assets/HOME-Header-Title.png')} 
            style={styles.headerTitleImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        }
      />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* クイックアクセスボタン */}
          <View style={styles.quickAccessCard}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickAccessContainer}
            >
              <TouchableOpacity 
                style={styles.quickAccessButton}
                onPress={() => navigation.navigate('ThreadList')}
                activeOpacity={0.7}
              >
                <View style={styles.quickAccessIconContainer}>
                  <Ionicons name="chatbubbles-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.quickAccessText}>掲示板</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickAccessButton}
                onPress={() => Alert.alert('準備中', 'インターン機能は準備中です')}
                activeOpacity={0.7}
              >
                <View style={styles.quickAccessIconContainer}>
                  <Ionicons name="briefcase-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.quickAccessText}>インターン</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickAccessButton}
                onPress={() => navigation.navigate('ArticleList')}
                activeOpacity={0.7}
              >
                <View style={styles.quickAccessIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.quickAccessText}>記事</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickAccessButton}
                onPress={() => navigation.navigate('Campaign')}
                activeOpacity={0.7}
              >
                <View style={styles.quickAccessIconContainer}>
                  <Ionicons name="megaphone-outline" size={20} color="#0284C7" />
                </View>
                <Text style={styles.quickAccessText}>キャンペーン</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 所属しているサークル */}
          {joinedCircles.length > 0 && (
            <View style={styles.joinedCirclesSection}>
              <Text style={styles.sectionTitle}>所属しているサークル</Text>
              {joinedCircles.map((circle) => (
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
                          source={{ uri: circle.imageUrl }} 
                          style={styles.circleImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
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
              ))}
            </View>
          )}
          {/* 記事カード（横スクロール） */}
          <View style={styles.articleSectionContainer}>
            {/* 記事セクションヘッダー */}
            <View style={styles.articleSectionHeader}>
              <Text style={styles.articleSectionTitle}>クルカツ記事</Text>
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => navigation.navigate('ArticleList')}
                activeOpacity={1}
              >
                <Text style={styles.moreButtonText}>もっと見る</Text>
                <Ionicons name="chevron-forward" size={14} color="#007bff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoCardsContainer}>
              {articlesLoading && articles.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#999" />
                </View>
              ) : articles.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.infoCardsScrollContainer}
                  pagingEnabled={true}
                  snapToInterval={295}
                  decelerationRate={0}
                  snapToAlignment="center"
                  scrollEventThrottle={16}
                >
                  {articles.map((article) => (
                    <TouchableOpacity 
                      key={article.id}
                      style={styles.infoCard}
                      onPress={() => navigation.navigate('ArticleWebView', { 
                        url: article.url, 
                        title: article.title 
                      })}
                      activeOpacity={1}
                    >
                      {article.thumbnailUrl ? (
                        <Image 
                          source={{ uri: article.thumbnailUrl }} 
                          style={styles.infoCardImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={[styles.infoCardImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="document-text-outline" size={40} color="#ccc" />
                        </View>
                      )}
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoCardTitle} numberOfLines={2}>{article.title}</Text>
                        <View style={styles.infoCardFooter}>
                          {article.author && (
                            <Text style={styles.infoCardSubtitle} numberOfLines={1}>{article.author}</Text>
                          )}
                          {article.createdAt && (
                            <Text style={styles.infoCardDate}>{formatDate(article.createdAt)}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>記事がありません</Text>
                </View>
              )}
            </View>
          </View>

          {/* 人気のサークル */}
          {popularCircles.length > 0 && (
            <View style={styles.popularSectionContainer}>
              <Text style={styles.sectionTitle}>
                {userUniversity ? `${userUniversity}の人気サークル` : '人気のサークル'}
              </Text>
              <FlatList
                data={popularCircles.filter(circle => {
                  const hasHeaderImage = circle.headerImageUrl;
                  const isBlocked = userBlockedCircleIds.includes(circle.id);
                  const shouldShow = hasHeaderImage && !isBlocked;
                  return shouldShow;
                })}
                renderItem={({ item: circle }) => (
                  <TouchableOpacity 
                    style={styles.popularCircleWrapper}
                    onPress={() => navigation.navigate('共通', { screen: 'CircleDetail', params: { circleId: circle.id } })}
                    activeOpacity={1}
                  >
                    {/* ヘッダー画像 */}
                    {circle.headerImageUrl && (
                      <Image source={{ uri: circle.headerImageUrl }} style={styles.circleHeaderImage} cachePolicy="memory-disk" />
                    )}
                    
                    <View style={[styles.popularCircleCard, !circle.headerImageUrl && styles.popularCircleCardWithoutHeader]}>
                      {/* サークルアイコンと基本情報 */}
                      <View style={styles.circleHeaderContainer}>
                        {circle.imageUrl ? (
                          <Image source={{ uri: circle.imageUrl }} style={styles.circleIcon} cachePolicy="memory-disk" />
                        ) : (
                          <View style={[styles.circleIcon, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
                            <Ionicons name="people-outline" size={30} color="#aaa" />
                          </View>
                        )}
                        <View style={styles.circleHeaderTextContainer}>
                          <Text style={styles.circleTitle} numberOfLines={2}>{circle.name}</Text>
                          <Text style={styles.circleDetail}>{circle.universityName} - {circle.genre}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularCirclesScrollContainer}
                style={styles.popularCirclesScrollView}
                snapToInterval={365} // カード幅 + マージン
                snapToAlignment="start"
                decelerationRate="fast"
                pagingEnabled={false}
              />
            </View>
          )}

          {/* 新着のサークル */}
          {newCircles.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>新着のサークル</Text>
              <FlatList
                data={newCircles.filter(circle => {
                  const hasHeaderImage = circle.headerImageUrl;
                  const isBlocked = userBlockedCircleIds.includes(circle.id);
                  const shouldShow = hasHeaderImage && !isBlocked;
                  return shouldShow;
                })}
                renderItem={({ item: circle }) => (
                  <TouchableOpacity 
                    style={styles.popularCircleWrapper}
                    onPress={() => navigation.navigate('共通', { screen: 'CircleDetail', params: { circleId: circle.id } })}
                    activeOpacity={1}
                  >
                    {/* ヘッダー画像 */}
                    {circle.headerImageUrl && (
                      <Image source={{ uri: circle.headerImageUrl }} style={styles.circleHeaderImage} cachePolicy="memory-disk" />
                    )}
                    
                    <View style={[styles.popularCircleCard, !circle.headerImageUrl && styles.popularCircleCardWithoutHeader]}>
                      {/* サークルアイコンと基本情報 */}
                      <View style={styles.circleHeaderContainer}>
                        {circle.imageUrl ? (
                          <Image source={{ uri: circle.imageUrl }} style={styles.circleIcon} cachePolicy="memory-disk" />
                        ) : (
                          <View style={[styles.circleIcon, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
                            <Ionicons name="people-outline" size={30} color="#aaa" />
                          </View>
                        )}
                        <View style={styles.circleHeaderTextContainer}>
                          <Text style={styles.circleTitle} numberOfLines={2}>{circle.name}</Text>
                          <Text style={styles.circleDetail}>{circle.universityName} - {circle.genre}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularCirclesScrollContainer}
                style={styles.popularCirclesScrollView}
                snapToInterval={365} // カード幅 + マージン
                snapToAlignment="start"
                decelerationRate="fast"
                pagingEnabled={false}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  // 記事セクション
  articleSectionContainer: {
    marginBottom: 20,
  },
  articleSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    marginBottom: 10,
  },
  articleSectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moreButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
    marginRight: 4,
  },
  // 情報カード（横スクロール）
  infoCardsContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  infoCardsScrollContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  infoCard: {
    width: 280,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    height: 250,
  },
  infoCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  infoCardContent: {
    flex: 1,
    padding: 15,
    position: 'relative',
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
    paddingBottom: 20,
  },
  infoCardSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  infoCardDate: {
    fontSize: 12,
    color: '#999',
  },
  infoCardFooter: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // 機能アイコン行
  functionIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  functionIcon: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  // セクション
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  // 人気サークルセクション専用（新着サークルとの間隔を狭める）
  popularSectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  // お気に入りサークル
  favoriteCirclesContainer: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  circleCardContainer: {
    marginBottom: 12,
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
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
  circleRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  bookmarkButton: {
    alignItems: 'center',
  },
  bookmarkCount: {
    fontSize: 10,
    color: '#007bff',
    marginTop: 2,
  },
  // 人気のサークル
  popularCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  popularCirclesScrollView: {
    marginHorizontal: -20,
  },
  popularCirclesScrollContainer: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  popularCircleWrapper: {
    width: 350,
    marginRight: 15,
    marginBottom: 10,
  },
  popularCircleCard: {
    backgroundColor: '#fff',
    padding: 15,
    paddingBottom: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderTopWidth: 0,
  },
  popularCircleCardWithoutHeader: {
    borderTopWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },


  emptyPopularContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyPopularText: {
    fontSize: 14,
    color: '#666',
  },
  // ローディングと空状態
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 200,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 0,
  },
  emptyImage: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    resizeMode: 'contain',
    marginTop: -5,
    marginBottom: 0,
  },
  // 人気サークルの新しいスタイル（検索結果画面と完全に同じ）
  circleHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  circleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  circleHeaderTextContainer: {
    flex: 1,
  },
  circleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  circleDetail: {
    fontSize: 14,
    color: '#666',
  },
  circleHeaderImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  circleDescriptionContainer: {
    marginBottom: 5,
  },
  circleDescriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  circleInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginTop: 8,
  },
  circleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  // 未読通知バッジ（MyPageScreenと同じスタイル）
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
  // ヘッダータイトル画像
  headerTitleImage: {
    height: 35,
    width: 125,
  },
  
  
  // 所属サークルセクション（MyPageScreenから移植）
  joinedCirclesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 8,
  },
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
  
  // クイックアクセスボタンセクション
  quickAccessCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
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
  quickAccessContainer: {
    paddingRight: 0,
  },
  quickAccessButton: {
    alignItems: 'center',
    marginRight: 24,
    width: 70,
  },
  quickAccessIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default HomeScreen;

