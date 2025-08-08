import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

const HomeScreen = ({ navigation }) => {
  const [userCircles, setUserCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUniversity, setUserUniversity] = useState('');
  const [popularCircles, setPopularCircles] = useState([]);
  const [searchText, setSearchText] = useState('');

  useFocusEffect(
    React.useCallback(() => {
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

          // すべてのサークルを取得
          const circlesCollectionRef = collection(db, 'circles');
          const querySnapshot = await getDocs(circlesCollectionRef);
          const circles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // ユーザーが所属しているサークルをフィルタリング
          const userCirclesList = [];
          for (const circle of circles) {
            try {
              // 各サークルのmembersサブコレクションをチェック
              const membersRef = collection(db, 'circles', circle.id, 'members');
              const memberDoc = await getDoc(doc(db, 'circles', circle.id, 'members', auth.currentUser.uid));
              if (memberDoc.exists()) {
                userCirclesList.push(circle);
              }
            } catch (error) {
              console.error(`Error checking membership for circle ${circle.id}:`, error);
            }
          }
          
          setUserCircles(userCirclesList);
          
          // 大学別の人気サークルを取得
          if (userData && userData.university) {
            const universityPopularCircles = await fetchPopularCirclesByUniversity(userData.university);
            setPopularCircles(universityPopularCircles);
          }
        } catch (error) {
          console.error("Error fetching user data: ", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }, [])
  );

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

  // 検索機能を実装
  const handleSearch = async () => {
    if (!searchText.trim()) {
      return; // 空の検索は無視
    }

    try {
      // すべてのサークルを取得
      const circlesCollectionRef = collection(db, 'circles');
      const querySnapshot = await getDocs(circlesCollectionRef);
      const allCircles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 検索テキストでフィルタリング
      const searchTextLower = searchText.toLowerCase();
      const filteredCircles = allCircles.filter(circle => 
        circle.name?.toLowerCase().includes(searchTextLower) ||
        circle.description?.toLowerCase().includes(searchTextLower) ||
        circle.activityLocation?.toLowerCase().includes(searchTextLower) ||
        circle.universityName?.toLowerCase().includes(searchTextLower)
      );
      
      // 検索結果画面に遷移
      navigation.navigate('SearchResults', { circles: filteredCircles });
    } catch (error) {
      console.error("Error searching circles: ", error);
    }
  };

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="ホーム" />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 検索バー */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="サークル名、活動内容、キーワード"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          {/* 情報カード（横スクロール） */}
          <View style={styles.infoCardsContainer}>
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
              <TouchableOpacity style={styles.infoCard}>
                <Image 
                  source={{ uri: 'https://picsum.photos/300/200?random=1' }} 
                  style={styles.infoCardImage}
                />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>クルカツ新機能</Text>
                  <Text style={styles.infoCardSubtitle}>サークル管理機能</Text>
                  <Text style={styles.infoCardDate}>2024年12月</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.infoCard}>
                <Image 
                  source={{ uri: 'https://picsum.photos/300/200?random=2' }} 
                  style={styles.infoCardImage}
                />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>学生向けイベント</Text>
                  <Text style={styles.infoCardSubtitle}>キャリア支援セミナー</Text>
                  <Text style={styles.infoCardDate}>2024年12月</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.infoCard}>
                <Image 
                  source={{ uri: 'https://picsum.photos/300/200?random=3' }} 
                  style={styles.infoCardImage}
                />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>サークル紹介</Text>
                  <Text style={styles.infoCardSubtitle}>人気サークル特集</Text>
                  <Text style={styles.infoCardDate}>2024年12月</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.infoCard}>
                <Image 
                  source={{ uri: 'https://picsum.photos/300/200?random=4' }} 
                  style={styles.infoCardImage}
                />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>キャリア支援</Text>
                  <Text style={styles.infoCardSubtitle}>就職活動サポート</Text>
                  <Text style={styles.infoCardDate}>2024年12月</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.infoCard}>
                <Image 
                  source={{ uri: 'https://picsum.photos/300/200?random=5' }} 
                  style={styles.infoCardImage}
                />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>大学イベント</Text>
                  <Text style={styles.infoCardSubtitle}>学園祭情報</Text>
                  <Text style={styles.infoCardDate}>2024年12月</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>



          {/* 所属しているサークル */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>所属しているサークル</Text>
            <View style={styles.favoriteCirclesContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>読み込み中...</Text>
                </View>
              ) : userCircles.length > 0 ? (
                userCircles.map((circle, index) => (
                  <TouchableOpacity 
                    key={circle.id} 
                    style={styles.circleCardContainer}
                    onPress={() => navigation.navigate('CircleMember', { circleId: circle.id })}
                  >
                    <View style={styles.circleCard}>
                      <Image 
                        source={{ uri: circle.imageUrl || 'https://via.placeholder.com/60' }} 
                        style={styles.circleImage}
                      />
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
                  <Image 
                    source={require('../assets/pictures/1.png')} 
                    style={styles.emptyImage}
                  />
                </View>
              )}
            </View>
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
                {popularCircles.map((circle, index) => (
                  <TouchableOpacity 
                    key={circle.id} 
                    style={styles.popularCircleCard}
                    onPress={() => navigation.navigate('CircleDetail', { circleId: circle.id })}
                  >
                    <Image 
                      source={{ uri: circle.imageUrl || 'https://via.placeholder.com/80' }} 
                      style={styles.popularCircleImage}
                    />
                    <Text style={styles.popularCircleName}>{circle.name}</Text>
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
  // 検索バー
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  // 情報カード（横スクロール）
  infoCardsContainer: {
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
  },
  infoCardImage: {
    width: '100%',
    height: 160,
    contentFit: 'cover',
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
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
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
    marginBottom: 10,
  },
});

export default HomeScreen;