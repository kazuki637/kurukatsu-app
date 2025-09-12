import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, getDoc, doc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getArticles } from '../services/notionService';

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

  const [loading, setLoading] = useState(true);
  const [userUniversity, setUserUniversity] = useState('');
  const [popularCircles, setPopularCircles] = useState([]);
  const [newCircles, setNewCircles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesInitialized, setArticlesInitialized] = useState(false);
  
  // ブロック機能の状態管理
  const [userBlockedCircleIds, setUserBlockedCircleIds] = useState([]);


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
            resizeMode="contain"
          />
        }
        rightButton={
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={26} color="#333" />
          </TouchableOpacity>
        }
      />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 記事カード（横スクロール） */}
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
                  >
                    {article.thumbnailUrl ? (
                      <Image 
                        source={{ uri: article.thumbnailUrl }} 
                        style={styles.infoCardImage}
                        resizeMode="cover"
                        fadeDuration={300}
                      />
                    ) : (
                      <View style={[styles.infoCardImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="document-text-outline" size={40} color="#ccc" />
                      </View>
                    )}
                    <View style={styles.infoCardContent}>
                      <Text style={styles.infoCardTitle} numberOfLines={2}>{article.title}</Text>
                      {article.author && (
                        <Text style={styles.infoCardSubtitle} numberOfLines={1}>{article.author}</Text>
                      )}
                      {article.createdAt && (
                        <Text style={styles.infoCardDate}>{formatDate(article.createdAt)}</Text>
                      )}
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



          {/* 人気のサークル */}
          {popularCircles.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                {userUniversity ? `${userUniversity}の人気サークル` : '人気のサークル'}
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularCirclesScrollContainer}
                style={styles.popularCirclesScrollView}
              >
                {popularCircles
                  .filter(circle => {
                    const hasHeaderImage = circle.headerImageUrl;
                    const isBlocked = userBlockedCircleIds.includes(circle.id);
                    const shouldShow = hasHeaderImage && !isBlocked;
                    return shouldShow;
                  }) // ヘッダー画像があるサークルかつブロックしていないサークルのみ表示
                  .map((circle, index) => (
                  <TouchableOpacity 
                    key={circle.id} 
                    style={styles.popularCircleCard}
                    onPress={() => navigation.navigate('CircleDetail', { circleId: circle.id })}
                  >
                    {/* サークルアイコンと基本情報 */}
                    <View style={styles.circleHeaderContainer}>
                      {circle.imageUrl ? (
                        <Image source={{ uri: circle.imageUrl }} style={styles.circleIcon} />
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

                    {/* ヘッダー画像 */}
                    {circle.headerImageUrl && (
                      <Image source={{ uri: circle.headerImageUrl }} style={styles.circleHeaderImage} />
                    )}

                    {/* 説明文 */}
                    {circle.description && (
                      <View style={styles.circleDescriptionContainer}>
                        <Text style={styles.circleDescriptionText} numberOfLines={2}>{circle.description}</Text>
                      </View>
                    )}

                    {/* 募集中表示 */}
                    {circle.welcome?.isRecruiting === true && (
                      <View style={styles.circleInfoContainer}>
                        <View style={styles.circleInfoItem}>
                          <Ionicons name="time" size={14} color="#666" />
                          <Text style={styles.circleInfoText}>募集中</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 新着のサークル */}
          {newCircles.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>新着のサークル</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularCirclesScrollContainer}
                style={styles.popularCirclesScrollView}
              >
                {newCircles
                  .filter(circle => {
                    const hasHeaderImage = circle.headerImageUrl;
                    const isBlocked = userBlockedCircleIds.includes(circle.id);
                    const shouldShow = hasHeaderImage && !isBlocked;
                    return shouldShow;
                  }) // ヘッダー画像があるサークルかつブロックしていないサークルのみ表示
                  .map((circle, index) => (
                  <TouchableOpacity 
                    key={circle.id} 
                    style={styles.popularCircleCard}
                    onPress={() => navigation.navigate('CircleDetail', { circleId: circle.id })}
                  >
                    {/* サークルアイコンと基本情報 */}
                    <View style={styles.circleHeaderContainer}>
                      {circle.imageUrl ? (
                        <Image source={{ uri: circle.imageUrl }} style={styles.circleIcon} />
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

                    {/* ヘッダー画像 */}
                    {circle.headerImageUrl && (
                      <Image source={{ uri: circle.headerImageUrl }} style={styles.circleHeaderImage} />
                    )}

                    {/* 説明文 */}
                    {circle.description && (
                      <View style={styles.circleDescriptionContainer}>
                        <Text style={styles.circleDescriptionText} numberOfLines={2}>{circle.description}</Text>
                      </View>
                    )}

                    {/* 募集中表示 */}
                    {circle.welcome?.isRecruiting === true && (
                      <View style={styles.circleInfoContainer}>
                        <View style={styles.circleInfoItem}>
                          <Ionicons name="time" size={14} color="#666" />
                          <Text style={styles.circleInfoText}>募集中</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  // 情報カード（横スクロール）
  infoCardsContainer: {
    marginTop: 20,
    marginBottom: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    minHeight: 200,
  },
  infoCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  infoCardContent: {
    padding: 15,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  infoCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  infoCardDate: {
    fontSize: 12,
    color: '#999',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
  popularCircleCard: {
    width: 350,
    marginRight: 15,
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
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
    borderRadius: 8,
    marginBottom: 10,
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
  // 設定ボタン
  settingsButton: {
    padding: 2,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  // ヘッダータイトル画像
  headerTitleImage: {
    height: 35,
    width: 125,
  },
});

export default HomeScreen;