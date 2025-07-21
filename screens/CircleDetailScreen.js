import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Alert, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as RNImage } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';
// import { TabView } from 'react-native-tab-view'; // 削除
// import { Animated } from 'react-native'; // 削除

const { width } = Dimensions.get('window');

// const tabRoutes = [ // 削除
//   { key: 'top', title: 'トップ' },
//   { key: 'events', title: 'イベント' },
//   { key: 'welcome', title: '新歓情報' },
// ];

// XロゴSVGコンポーネント
const XLogo = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 1200 1227" fill="none">
    <Path d="M1199.97 0H1067.6L600.01 529.09L132.4 0H0L494.18 587.29L0 1227H132.4L600.01 697.91L1067.6 1227H1200L705.82 639.71L1199.97 0ZM655.09 567.29L1067.6 70.59V0.59H1067.6L600.01 529.09L132.4 0.59H132.4V70.59L544.91 567.29L132.4 1156.41V1226.41H132.4L600.01 697.91L1067.6 1226.41H1067.6V1156.41L655.09 567.29Z" fill="#000"/>
  </Svg>
);

export default function CircleDetailScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [circleData, setCircleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  // const [tabIndex, setTabIndex] = useState(0); // 削除
  // const [routes] = useState(tabRoutes); // 削除
  const [activeTab, setActiveTab] = useState('top'); // 追加

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const favorites = userData.favoriteCircleIds || [];
          const joinedCircles = userData.joinedCircleIds || [];
          setIsFavorite(favorites.includes(circleId));
          setIsMember(joinedCircles.includes(circleId));
        } else {
          setIsFavorite(false);
          setIsMember(false);
        }
      });
      return unsubscribeSnapshot;
    } else {
      setIsFavorite(false);
      setIsMember(false);
    }
  }, [user, circleId]);

  useEffect(() => {
    if (user && circleId) {
      const checkRequest = async () => {
        try {
          const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
          const q = query(requestsRef, where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          setHasRequested(!snapshot.empty);
        } catch (e) {
          setHasRequested(false);
        }
      };
      checkRequest();
    }
  }, [user, circleId]);

  const handleJoinRequest = async () => {
    if (!user) {
      Alert.alert('ログインが必要です', '入会申請にはログインが必要です。');
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
      await addDoc(requestsRef, {
        userId: user.uid,
        name: userData.name || '',
        university: userData.university || '',
        grade: userData.grade || '',
        email: user.email || '',
        requestedAt: new Date(),
      });
      setHasRequested(true);
      Alert.alert('申請完了', '入会申請を送信しました。');
    } catch (e) {
      Alert.alert('エラー', '申請の送信に失敗しました');
    }
  };

  useEffect(() => {
    const fetchCircleDetail = async () => {
      try {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCircleData({ id: docSnap.id, ...data });
        } else {
          Alert.alert("エラー", "サークルが見つかりませんでした。");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error fetching circle detail: ", error);
        Alert.alert("エラー", "サークル情報の取得に失敗しました。");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchCircleDetail();
  }, [circleId]);

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert("ログインが必要です", "お気に入り機能を利用するにはログインしてください。");
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const circleDocRef = doc(db, 'circles', circleId);

    try {
      if (isFavorite) {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayRemove(circleId) });
        await updateDoc(circleDocRef, { likes: increment(-1) });
        Alert.alert("お気に入り解除", "サークルをお気に入りから削除しました。");
      } else {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayUnion(circleId) });
        await updateDoc(circleDocRef, { likes: increment(1) });
        Alert.alert("お気に入り登録", "サークルをお気に入りに追加しました！");
      }
    } catch (error) {
      console.error("Error toggling favorite: ", error);
      Alert.alert("エラー", "お気に入り操作に失敗しました。");
    }
  };

  const renderTopTab = () => (
    <View style={styles.tabContent}>
      {/* サークル活動画像（1枚のみ、スクロール不可） */}
      {circleData.activityImages && circleData.activityImages.length > 0 && (
        <Image
          source={{ uri: circleData.activityImages[0] }}
          style={styles.activityImage}
          resizeMode="cover"
        />
      )}
      {/* 基本情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>活動頻度</Text>
            <Text style={styles.infoValue}>{circleData.frequency}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>人数</Text>
            <Text style={styles.infoValue}>{circleData.members}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>男女比</Text>
            <Text style={styles.infoValue}>{circleData.genderratio}</Text>
          </View>
        </View>
        {circleData.features && circleData.features.length > 0 && (
          <View style={styles.featuresContainer}>
            <Text style={styles.infoLabel}>特色</Text>
            <View style={styles.featuresList}>
              {circleData.features.map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* サークル紹介 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>サークル紹介</Text>
        <Text style={styles.description}>{circleData.description}</Text>
      </View>

      {/* こんな人におすすめ */}
      {circleData.recommendations && circleData.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>こんな人におすすめ</Text>
          <View style={styles.recommendList}>
            {circleData.recommendations.map((rec, idx) => (
              <View key={idx} style={styles.recommendItem}>
                <Text style={styles.recommendText}>・{rec}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 代表者紹介 */}
      {(circleData.leaderImageUrl || circleData.leaderMessage) && (
        <View style={[styles.section, styles.leaderSection]}>
          <Text style={styles.sectionTitle}>代表者からのメッセージ</Text>
          <View style={styles.leaderRow}>
            {circleData.leaderImageUrl ? (
              <Image source={{ uri: circleData.leaderImageUrl }} style={styles.leaderImage} />
            ) : (
              <View style={styles.leaderImagePlaceholder}>
                <Ionicons name="person-circle-outline" size={56} color="#ccc" />
              </View>
            )}
            <View style={styles.leaderBalloon}>
              <Text style={styles.leaderMessage}>{circleData.leaderMessage || 'メッセージは未登録です'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* SNSリンク */}
      {(circleData.snsLink || circleData.xLink) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SNS</Text>
          <View style={styles.snsLargeRow}>
            {circleData.snsLink && (
              <TouchableOpacity onPress={() => Linking.openURL(circleData.snsLink)} style={styles.snsLargeButton}>
                <RNImage source={require('../assets/Instagram_Glyph_Gradient.png')} style={styles.snsLargeLogo} />
              </TouchableOpacity>
            )}
            {circleData.xLink && (
              <TouchableOpacity onPress={() => Linking.openURL(circleData.xLink)} style={styles.snsLargeButton}>
                <RNImage source={require('../assets/X_logo-black.png')} style={styles.snsLargeLogo} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* LINEグループ */}
      {circleData.lineGroupLink && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LINEグループ</Text>
          <TouchableOpacity style={styles.lineButton} onPress={() => Linking.openURL(circleData.lineGroupLink)}>
            <Ionicons name="logo-whatsapp" size={24} color="#06C755" />
            <Text style={styles.lineButtonText}>LINEグループを開く</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyButton} onPress={() => {
            // Clipboard.setString(circleData.lineGroupLink);
            Alert.alert('コピーしました', 'LINEグループリンクをコピーしました');
          }}>
            <Ionicons name="copy-outline" size={18} color="#333" />
            <Text style={styles.copyButtonText}>リンクをコピー</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 新歓スケジュール */}
      {circleData.schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新歓スケジュール</Text>
          <Text style={styles.scheduleText}>{circleData.schedule}</Text>
        </View>
      )}
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>恒例イベント</Text>
        {circleData.events && circleData.events.length > 0 ? (
          circleData.events.slice(0, 4).map((event, idx) => (
            <View key={idx} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.image && (
                <Image source={{ uri: event.image }} style={styles.eventImage} resizeMode="cover" />
              )}
              <Text style={styles.eventDetail}>{event.detail}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.placeholderText}>イベント情報は準備中です</Text>
        )}
      </View>
    </View>
  );

  const renderWelcomeTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>入会条件</Text>
        <Text style={styles.description}>{circleData.welcome?.conditions || '入会条件は未設定です'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>新歓スケジュール</Text>
        {circleData.welcome?.schedule && circleData.welcome.schedule.length > 0 ? (
          <View style={styles.calendarList}>
            {circleData.welcome.schedule.map((item, idx) => (
              <View key={idx} style={styles.calendarItem}>
                <Text style={styles.calendarDate}>{item.date}</Text>
                <Text style={styles.calendarEvent}>{item.event}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderText}>新歓スケジュールは未設定です</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>参加予約</Text>
        <TouchableOpacity style={styles.reserveButton} onPress={() => Alert.alert('予約', '参加予約機能は今後実装予定です。')}>
          <Text style={styles.reserveButtonText}>参加を予約する</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // タブバー部分を元のactiveTab/setActiveTab方式に戻す
  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'top' && styles.activeTabItem]}
          onPress={() => setActiveTab('top')}
        >
          <Text style={[styles.tabLabel, activeTab === 'top' && styles.activeTabLabel]}>
            トップ
          </Text>
          {activeTab === 'top' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'events' && styles.activeTabItem]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabLabel, activeTab === 'events' && styles.activeTabLabel]}>
            イベント
          </Text>
          {activeTab === 'events' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'welcome' && styles.activeTabItem]}
          onPress={() => setActiveTab('welcome')}
        >
          <Text style={[styles.tabLabel, activeTab === 'welcome' && styles.activeTabLabel]}>
            新歓情報
          </Text>
          {activeTab === 'welcome' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>サークル情報を読み込み中...</Text>
      </View>
    );
  }

  if (!circleData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>サークル情報がありません。</Text>
      </View>
    );
  }

  if (circleData) {
    circleData.leaderImageUrl = 'https://randomuser.me/api/portraits/men/1.jpg';
    circleData.leaderMessage = 'みなさんの参加をお待ちしています！\nサークル活動の魅力をぜひ体験してください。';
    circleData.activityImages = [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
    ];
    circleData.recommendations = [
      '大学生活を充実させたい人',
      '新しい友達を作りたい人',
      'イベントや活動が好きな人',
    ];
    circleData.headerImageUrl = 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=800&q=80';
    circleData.events = [
      {
        title: '新歓合宿',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
        detail: '毎年春に開催される新入生歓迎合宿です。みんなで親睦を深めます。',
      },
      {
        title: '夏のBBQ大会',
        image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
        detail: '夏恒例のBBQイベント。自然の中で楽しく交流！',
      },
      {
        title: '秋のスポーツ大会',
        image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
        detail: '秋はみんなでスポーツ！初心者も大歓迎です。',
      },
      {
        title: 'クリスマスパーティー',
        image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=400&q=80',
        detail: '年末の一大イベント。プレゼント交換もあります。',
      },
    ];
    circleData.welcome = {
      conditions: '大学1年生以上・サークル活動に積極的に参加できる方',
      schedule: [
        { date: '2024-04-10', event: '新歓説明会' },
        { date: '2024-04-15', event: '体験参加日' },
        { date: '2024-04-20', event: '新歓BBQ' },
      ],
    };
  }

  return (
    <View style={styles.container}>
      <CommonHeader title="サークル詳細" showBackButton onBack={() => navigation.goBack()} />
      
      <ScrollView 
        style={styles.scrollView}
        stickyHeaderIndices={[2]} // タブバーをスティッキーヘッダーに設定
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダー画像エリア */}
        <View style={styles.headerImageContainer}>
          {circleData.headerImageUrl ? (
            <Image source={{ uri: circleData.headerImageUrl }} style={styles.headerImage} />
          ) : (
            <View style={styles.headerImagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#ccc" />
            </View>
          )}
        </View>

        {/* サークル基本情報 */}
        <View style={styles.circleInfoSection}>
          <View style={styles.circleInfo}>
            <View style={styles.logoContainer}>
              {circleData.imageUrl ? (
                <Image source={{ uri: circleData.imageUrl }} style={styles.circleLogo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="people-outline" size={32} color="#ccc" />
                </View>
              )}
            </View>
            <View style={styles.circleTextInfo}>
              <View style={styles.circleNameRow}>
                <Text style={styles.circleName}>{circleData.name}</Text>
                {circleData.isOfficial && (
                  <View style={styles.officialBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.officialText}>公式</Text>
                  </View>
                )}
                {/* SNSボタン（X, Instagram） */}
                {(circleData.xLink || circleData.snsLink) && (
                  <View style={styles.snsIconRow}>
                    {circleData.snsLink && (
                      <TouchableOpacity onPress={() => Linking.openURL(circleData.snsLink)} style={styles.snsIconButton}>
                        <RNImage source={require('../assets/Instagram_Glyph_Gradient.png')} style={styles.snsLogoImage} />
                      </TouchableOpacity>
                    )}
                    {circleData.xLink && (
                      <TouchableOpacity onPress={() => Linking.openURL(circleData.xLink)} style={styles.snsIconButton}>
                        <RNImage source={require('../assets/X_logo-black.png')} style={styles.snsLogoImage} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.universityName}>{circleData.universityName}</Text>
              <Text style={styles.genre}>{circleData.genre}</Text>
            </View>
          </View>
        </View>

        {/* タブバー */}
        {renderTabBar()}

        {/* タブコンテンツ */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'top' && renderTopTab()}
          {activeTab === 'events' && renderEventsTab()}
          {activeTab === 'welcome' && renderWelcomeTab()}
        </View>
      </ScrollView>

      {/* アクションボタン */}
      <SafeAreaView style={styles.actionBar}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
            <Ionicons 
              name={isFavorite ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isFavorite ? "gold" : "#666"} 
            />
            <Text style={[styles.favoriteButtonText, isFavorite && styles.favoriteButtonTextActive]}>
              {isFavorite ? "保存済み" : "保存"}
            </Text>
          </TouchableOpacity>
          
          {isMember ? (
            <View style={styles.memberButton}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.memberButtonText}>入会済み</Text>
            </View>
          ) : hasRequested ? (
            <View style={styles.requestedButton}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.requestedButtonText}>申請済み</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinRequest}>
              <Text style={styles.joinButtonText}>入会申請</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  headerImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f0f0f0',
  },
  headerImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  circleInfoSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  circleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  circleTextInfo: {
    marginLeft: 15,
    flex: 1,
  },
  circleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  circleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f7',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  officialText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: 'bold',
  },
  universityName: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  genre: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tabBarContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTabItem: {
    // アクティブインジケーターは別途表示
  },
  tabLabel: {
    fontSize: 16,
    color: '#666',
  },
  activeTabLabel: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007bff',
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    color: '#666',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    width: '30%', // Adjust as needed
    alignItems: 'center',
    backgroundColor: '#f8fafd',
    borderWidth: 1,
    borderColor: '#cce5ed',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  featuresContainer: {
    marginTop: 10,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#e0f2f7',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#cce5ed',
  },
  featureText: {
    fontSize: 13,
    color: '#333',
  },
  snsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  snsButtonText: {
    color: '#E1306C',
    fontSize: 15,
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  lineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6ffe6',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  lineButtonText: {
    color: '#06C755',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: '#333',
    fontSize: 13,
    marginLeft: 8,
  },
  scheduleText: {
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    color: '#666',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionBar: {
    backgroundColor: '#fff',
    paddingVertical: 18, // 以前は22
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    paddingVertical: 18, // 以前は22
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  favoriteButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  favoriteButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  memberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  memberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  requestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  requestedButtonText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  leaderSection: {
    alignItems: 'flex-start',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    marginRight: 16,
  },
  leaderImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderBalloon: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cce5ed',
    minHeight: 56,
    justifyContent: 'center',
  },
  leaderMessage: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  activityImagesScroll: {
    marginBottom: 20,
  },
  activityImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 0,
    backgroundColor: '#eee',
    marginBottom: 20,
  },
  recommendList: {
    marginTop: 4,
  },
  recommendItem: {
    marginBottom: 4,
  },
  recommendText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  snsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 4,
  },
  snsIconButton: {
    marginLeft: 4,
    padding: 2,
  },
  snsLogoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  snsLargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
    marginTop: 8,
  },
  snsLargeButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  snsLargeLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  eventImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#eee',
  },
  eventDetail: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  calendarList: {
    marginTop: 8,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarDate: {
    fontSize: 15,
    color: '#007bff',
    width: 100,
    fontWeight: 'bold',
  },
  calendarEvent: {
    fontSize: 15,
    color: '#333',
  },
  reserveButton: {
    backgroundColor: '#007bff',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
