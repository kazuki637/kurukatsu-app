import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, Modal, ScrollView, ActivityIndicator, Image, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';

// グローバルキャッシュ
let userCirclesCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30秒間キャッシュ
const BUTTON_SIZE = (Dimensions.get('window').width - 40) / 2.5; // 2列+等間隔
const GRID_WIDTH = BUTTON_SIZE * 2 + 10; // ボタン2個＋間隔
const GRID_COLUMNS = 3;
const GRID_ROWS = 2;
const BUTTON_GRID_MARGIN = 32;
const BUTTON_GRID_GAP = 16;
const BUTTON_SIZE_3COL = (Dimensions.get('window').width - BUTTON_GRID_GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;

export default function CircleManagementScreen({ navigation }) {
  const [isModalVisible, setModalVisible] = useState(false);
  const [userCircles, setUserCircles] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (isInitialLoad) {
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, [isInitialLoad]);

  useEffect(() => {
    
    if (user) {
      const now = Date.now();
      const isCacheValid = (now - lastFetchTime) < CACHE_DURATION;
      
      // キャッシュが有効な場合はキャッシュから表示
      if (isCacheValid && userCirclesCache !== null) {
        setUserCircles(userCirclesCache);
        setLoading(false);
        setInitialLoadComplete(true);
        setIsInitialLoad(false);
        return;
      }
      
      setLoading(true);
      setInitialLoadComplete(false);
      const q = query(collection(db, 'circles'), where('contactInfo', '==', user.email));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const circles = [];
        snapshot.forEach(doc => {
          circles.push({ id: doc.id, ...doc.data() });
        });
        
        // キャッシュに保存
        userCirclesCache = circles;
        lastFetchTime = Date.now();
        
        setUserCircles(circles);
        setLoading(false);
        setInitialLoadComplete(true);
        setIsInitialLoad(false);
      }, (error) => {
        console.error("Error fetching user circles: ", error);
        setUserCircles(undefined);
        setLoading(false);
        setInitialLoadComplete(true);
        setIsInitialLoad(false);
        userCirclesCache = [];
      });
      return unsubscribeSnapshot;
    } else {
      setUserCircles(undefined);
      setLoading(false);
      setInitialLoadComplete(true);
      setIsInitialLoad(false);
      userCirclesCache = [];
    }
  }, [user, isInitialLoad]);

  const handleRegisterCirclePress = () => {
    setModalVisible(true);
  };

  const handleAgree = () => {
    setModalVisible(false);
    navigation.navigate('CircleRegistration');
  };

  const handleDisagree = () => {
    setModalVisible(false);
  };

  // 初回ローディング時のみローディング画面を表示
  if (isInitialLoad && (!user || loading || !initialLoadComplete)) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>サークル管理</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text>サークル情報を読み込み中...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Firestore取得中やuserCirclesがnullの間はローディング画面を表示
  if (loading || userCircles === undefined) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>サークル管理</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text>サークル情報を読み込み中...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ここから先は user が必ず存在する
  // 管理ボタンのリストを6セル分に（5個＋1空セル）
  const managementButtonsGrid = [
    {
      label: 'プロフィール編集',
      icon: 'create-outline',
      onPress: () => navigation.navigate('CircleProfileEdit', { circleId: userCircles[0].id })
    },
    {
      label: 'メンバー管理',
      icon: 'people-outline',
      onPress: () => navigation.navigate('CircleMemberManagement', { circleId: userCircles[0].id })
    },
    {
      label: 'スケジュール管理',
      icon: 'calendar-outline',
      onPress: () => navigation.navigate('CircleScheduleManagement', { circleId: userCircles[0].id })
    },
    {
      label: '連絡',
      icon: 'mail-outline',
      onPress: () => navigation.navigate('CircleContact', { circleId: userCircles[0].id })
    },
    {
      label: 'アナリティクス',
      icon: 'stats-chart-outline',
      onPress: () => Alert.alert('アナリティクス', '今後実装予定の機能です')
    },
    {
      label: 'サークル設定',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('CircleSettings', { circleId: userCircles[0].id })
    },
  ];

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="サークル管理" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        {userCircles && userCircles.length > 0 ? (
          <ScrollView style={styles.circleDetailContainer}>
            {/* サークル情報：アイコン＋サークル名・ジャンル（横並び） */}
            <View style={styles.circleInfoRow}>
              <View style={styles.circleImageLargeContainer}>
                {userCircles[0].imageUrl ? (
                  <Image source={{ uri: userCircles[0].imageUrl }} style={styles.circleImageLarge} />
                ) : (
                  <Ionicons name="image-outline" size={64} color="#ccc" />
                )}
              </View>
              <View style={styles.circleInfoTextCol}>
                <Text style={styles.circleInfoName}>{userCircles[0].name}</Text>
                <Text style={styles.circleInfoSub}>
                  {userCircles[0].universityName}
                  {userCircles[0].genre ? `・${userCircles[0].genre}` : ''}
                </Text>
              </View>
            </View>
            {/* サブスクリプション提案カード */}
            <LinearGradient
              colors={["#f0fcfd", "#b2ebf2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscriptionCard}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="crown-outline" size={24} color="#ffb300" style={{ marginRight: 8 }} />
                <Text style={styles.subscriptionTitle}>プレミアム</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.subscriptionButton}><Text style={styles.subscriptionButtonText}>無料で体験する</Text></TouchableOpacity>
              </View>
              <Text style={styles.subscriptionDesc}>¥0で7日間プレミアムを楽しみましょう</Text>
              <View style={styles.subscriptionFeatureRow}>
                <View style={styles.subscriptionFeature}><Ionicons name="remove-circle-outline" size={20} color="#333" /><Text style={styles.subscriptionFeatureText}>広告削除</Text></View>
                <View style={styles.subscriptionFeature}><Ionicons name="stats-chart-outline" size={20} color="#333" /><Text style={styles.subscriptionFeatureText}>アナリティクス</Text></View>
                <View style={styles.subscriptionFeature}><Ionicons name="star-outline" size={20} color="#333" /><Text style={styles.subscriptionFeatureText}>おすすめ掲載</Text></View>
              </View>
            </LinearGradient>
            {/* 管理ボタン（グリッド） */}
            <View style={styles.managementGridSection}>
              {Array.from({ length: GRID_ROWS }).map((_, rowIdx) => (
                <View style={styles.managementRow3col} key={rowIdx}>
                  {managementButtonsGrid.slice(rowIdx * GRID_COLUMNS, rowIdx * GRID_COLUMNS + GRID_COLUMNS).map((btn, colIdx) => (
                    btn ? (
                      <TouchableOpacity
                        key={btn.label}
                        style={styles.managementGridItem3col}
                        onPress={btn.onPress}
                      >
                        <Ionicons name={btn.icon} size={28} color="#007bff" />
                        <Text style={styles.managementGridItemText}>{btn.label}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View key={`empty-${colIdx}`} style={styles.managementGridItem3col} />
                    )
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.mainContentWrapper}> 
            <View style={styles.cardContainer}> 
              <View style={styles.card}>
                <Text style={styles.cardTitle}>サークルの管理ができる！</Text>
                <Text style={styles.cardSubtitle}>
                  {`メンバーの管理やイベントの企画など\nあなたのサークル活動をサポートします。`}
                </Text>
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>[ここにイラストや写真]</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleRegisterCirclePress}
            >
              <Ionicons name="add-circle-outline" size={32} color="#fff" />
              <Text style={styles.createButtonText}>新しいサークルを登録する</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>サークル登録に関する同意事項</Text>
            <ScrollView style={styles.modalContentScroll}>
              <Text style={styles.modalText}>
                {`サークル登録にあたり、以下の事項に同意いただく必要があります。

1. 提供情報の正確性: 登録するサークル情報（名称、活動内容、連絡先など）は、すべて正確かつ最新のものであることを保証します。虚偽の情報や誤解を招く情報の提供は行いません。

2. 活動内容の適法性: 登録するサークルの活動内容は、日本の法令および公序良俗に反しないものであることを保証します。違法な活動、差別的な活動、他者の権利を侵害する活動は行いません。

3. 個人情報の取り扱い: サークル登録時に提供される個人情報（代表者の氏名、連絡先など）は、本サービスの運営目的のためにのみ利用されることに同意します。これらの情報が不適切に利用されたり、第三者に開示されたりすることはありません。

4. 規約の遵守: 本サービスの利用規約およびプライバシーポリシーを理解し、遵守することに同意します。規約に違反する行為があった場合、サークル登録が取り消される可能性があることを承諾します。

5. 責任の所在: 登録されたサークルの活動において発生した問題や紛争については、サークル自身が一切の責任を負うものとします。本サービス運営者は、サークルの活動に関して一切の責任を負いません。

6. 情報の公開: 登録されたサークル情報の一部（サークル名、活動内容、公開連絡先など）が、本サービス上で一般に公開されることに同意します。公開される情報については、事前に確認し、同意したものとみなします。

7. 登録情報の変更・削除: 登録したサークル情報に変更があった場合は速やかに更新し、サークル活動を終了した場合は、本サービスの指示に従い登録情報を削除することに同意します。

8. 運営者からの連絡: 本サービス運営者から、登録情報に関する確認や、サービス運営上重要な連絡がEメールまたはその他の方法で届くことに同意します。

これらの同意事項に同意いただけない場合、サークル登録はできません。`}
              </Text>
            </ScrollView>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonDisagree]}
                onPress={handleDisagree}
              >
                <Text style={styles.buttonText}>同意しない</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonAgree]}
                onPress={handleAgree}
              >
                <Text style={styles.buttonText}>同意する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    width: '100%',
    height: 115, // ヘッダーの縦幅を調整
    paddingTop: StatusBar.currentHeight, // ステータスバーの高さ分を確保
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    position: 'absolute',
    bottom: 10, // ヘッダー下部からの距離を調整
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  contentSafeArea: {
    flex: 1,
  },
  mainContentWrapper: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '60%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContentScroll: {
    maxHeight: '60%',
    marginBottom: 20,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'left',
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginHorizontal: 10,
  },
  buttonAgree: {
    backgroundColor: '#2196F3',
  },
  buttonDisagree: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '95%',
    maxWidth: 400, 
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  circleDetailContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  // overviewSection, circleName, universityName, statusText など不要なスタイルは削除または未使用化
  circleImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  circleImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  circleImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    overflow: 'hidden', // これを追加することで、子要素がこの境界からはみ出さないようにします
  },
  circleImageEditIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // circleName, universityName, statusText など不要なスタイルは削除または未使用化
  managementGridSection: {
    flex: 1,
    paddingHorizontal: 10,
  },
  managementRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // 等間隔配置
    marginBottom: 15,
  },
  managementGridItem: {
    width: BUTTON_SIZE,
    aspectRatio: 1, // 正方形
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 5, // 等間隔
    marginVertical: 2,
  },
  managementGridItemText: {
    fontSize: 10, // 12→10
    color: '#333',
    textAlign: 'center',
    marginTop: 4, // 8→4
    fontWeight: '500',
  },
  managementGridItemPlaceholder: {
    width: BUTTON_SIZE,
    aspectRatio: 1,
    marginHorizontal: 5,
    marginVertical: 2,
  },
  overviewSectionCardLike: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: GRID_WIDTH,
    alignSelf: 'center',
  },
  overviewCardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  overviewCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  overviewCardStatus: {
    fontSize: 12,
    color: '#28a745',
    backgroundColor: '#e6ffe6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  circleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  circleImageLargeContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  circleImageLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover',
  },
  circleInfoTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  circleInfoName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  circleInfoSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  circleInfoGenre: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  subscriptionCard: {
    backgroundColor: '#e0f7fa',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  subscriptionButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  subscriptionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  subscriptionDesc: {
    fontSize: 13,
    color: '#333',
    marginTop: 8,
    marginBottom: 8,
  },
  subscriptionFeatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  subscriptionFeature: {
    alignItems: 'center',
    flex: 1,
  },
  subscriptionFeatureText: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  managementRow3col: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: BUTTON_GRID_GAP,
    marginHorizontal: 0,
  },
  managementGridItem3col: {
    width: BUTTON_SIZE_3COL,
    height: BUTTON_SIZE_3COL,
    backgroundColor: '#fff',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
