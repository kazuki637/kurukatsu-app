import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Alert, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';

const { width } = Dimensions.get('window');

export default function CircleDetailScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [circleData, setCircleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState('top'); // 'top', 'events', 'welcome'

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
      {/* サークル紹介 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>サークル紹介</Text>
        <Text style={styles.description}>{circleData.description}</Text>
      </View>

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

      {/* SNSリンク */}
      {circleData.snsLink && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SNS</Text>
          <TouchableOpacity onPress={() => Linking.openURL(circleData.snsLink)} style={styles.snsButton}>
            <Ionicons name="logo-instagram" size={24} color="#E1306C" />
            <Text style={styles.snsButtonText}>Instagram</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>イベント</Text>
        <Text style={styles.placeholderText}>イベント情報は準備中です</Text>
      </View>
    </View>
  );

  const renderWelcomeTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>新歓情報</Text>
        <Text style={styles.placeholderText}>新歓情報は準備中です</Text>
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
              </View>
              <Text style={styles.universityName}>{circleData.universityName}</Text>
              <Text style={styles.genre}>{circleData.genre}</Text>
            </View>
          </View>
        </View>

        {/* コンテンツ切り替えタブ */}
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
              color={isFavorite ? "#007bff" : "#666"} 
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
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  headerImage: {
    width: '100%',
    height: '100%',
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
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  favoriteButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  favoriteButtonTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  memberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 10,
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
    paddingVertical: 10,
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
    paddingVertical: 10,
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
});
