import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, ActivityIndicator, Image, Alert, FlatList, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import { getUserRole, checkStudentIdVerification } from '../utils/permissionUtils';

export default function CircleManagementScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminCircles, setAdminCircles] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [totalJoinRequestsCount, setTotalJoinRequestsCount] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      } else {
        // ユーザーが認証されている場合は、権限情報取得が完了するまでローディング状態を維持
        setLoading(true);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      // ユーザーがログアウトした場合はグローバル変数をリセット
      global.totalJoinRequestsCount = 0;
      return;
    }

    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(collection(db, 'circles'), async (snapshot) => {
      try {
        // ユーザーがログアウトしている場合は処理をスキップ
        if (!user) {
          setAdminCircles([]);
          setLoading(false);
          return;
        }

        const adminCircleList = [];
        let totalRequests = 0;
        
        for (const circleDoc of snapshot.docs) {
          const circleId = circleDoc.id;
          const memberDoc = await getDoc(doc(db, 'circles', circleId, 'members', user.uid));
          if (memberDoc.exists()) {
            const role = memberDoc.data().role || 'member';
            if (role === 'leader' || role === 'admin') {
              // 入会申請数を取得
              let joinRequestsCount = 0;
              try {
                const requestsSnapshot = await getDocs(collection(db, 'circles', circleId, 'joinRequests'));
                joinRequestsCount = requestsSnapshot.size;
                totalRequests += joinRequestsCount;
              } catch (error) {
                console.error(`Error fetching join requests for circle ${circleId}:`, error);
              }
              
              adminCircleList.push({ 
                id: circleId, 
                ...circleDoc.data(), 
                role,
                joinRequestsCount 
              });
            }
          }
        }
        
        setAdminCircles(adminCircleList);
        setTotalJoinRequestsCount(totalRequests);
        
        // グローバル変数に設定（タブバーの赤丸表示用）
        global.totalJoinRequestsCount = totalRequests;
      } catch (error) {
        console.error('Error fetching admin circles:', error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to circles:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 入会申請の変更をリアルタイムで監視
  useEffect(() => {
    if (!user || adminCircles.length === 0) return;

    const unsubscribeListeners = [];
    
    // 各管理サークルの入会申請をリアルタイムで監視
    adminCircles.forEach(circle => {
      const unsubscribe = onSnapshot(
        collection(db, 'circles', circle.id, 'joinRequests'),
        async (snapshot) => {
          try {
            const joinRequestsCount = snapshot.size;
            
            // 該当サークルの入会申請数を更新
            setAdminCircles(prev => prev.map(c => 
              c.id === circle.id ? { ...c, joinRequestsCount } : c
            ));
            
            // 全体の入会申請数を再計算
            const updatedCircles = adminCircles.map(c => 
              c.id === circle.id ? { ...c, joinRequestsCount } : c
            );
            const totalRequests = updatedCircles.reduce((sum, c) => sum + c.joinRequestsCount, 0);
            
            setTotalJoinRequestsCount(totalRequests);
            global.totalJoinRequestsCount = totalRequests;
            
            // グローバル入会申請数を更新
            global.updateJoinRequestsCount(circle.id, joinRequestsCount);
          } catch (error) {
            console.error(`Error listening to join requests for circle ${circle.id}:`, error);
          }
        },
        (error) => {
          console.error(`Error listening to join requests for circle ${circle.id}:`, error);
        }
      );
      
      unsubscribeListeners.push(unsubscribe);
    });

    return () => {
      unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid, adminCircles]);

  const handleRegisterCirclePress = async () => {
    if (!user) {
      Alert.alert('ログインが必要です', 'サークル登録にはログインが必要です。');
      return;
    }

    // 学生証認証状態を確認
    const isStudentIdVerified = await checkStudentIdVerification(user.uid);
    if (!isStudentIdVerified) {
      Alert.alert(
        '学生証認証が必要です',
        'サークル登録には学生証の認証が必要です。\nプロフィール編集画面で学生証を認証してください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: 'プロフィール編集へ', 
            onPress: () => navigation.navigate('ProfileEdit')
          }
        ]
      );
      return;
    }

    setModalVisible(true);
  };

  const handleAgree = () => {
    setModalVisible(false);
    navigation.navigate('CircleRegistration');
  };

  const handleDisagree = () => {
    setModalVisible(false);
  };

  if (loading) {
      return (
    <LinearGradient
      colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
      style={styles.fullScreenContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>サークル管理</Text>
      </View>
      <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007bff" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!user) {
    return (
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
        style={styles.fullScreenContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>サークル管理</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#fff' }}>ログインしてください</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (adminCircles.length === 0) {
    return (
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
        style={styles.fullScreenContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>サークル管理</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.mainContentWrapper}>
            <View style={styles.cardContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>サークルの管理ができる！</Text>
                <Text style={styles.cardSubtitle}>
                  {`メンバーの管理やイベントの企画など\nあなたのサークル運営をサポートします`}
                </Text>
                <Text style={styles.cardNote}>
                  ※これはサークル代表者向けの機能です
                </Text>
                <Image 
                  source={require('../assets/CircleManagement.png')} 
                  style={styles.circleManagementImage}
                  contentFit="contain"
                />
              </View>
            </View>
            <View style={styles.createButtonContainer}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleRegisterCirclePress}
              >
                <Ionicons name="add-circle-outline" size={32} color="#fff" />
                <Text style={styles.createButtonText}>新しいサークルを登録する</Text>
              </TouchableOpacity>
            </View>
          </View>
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
      </LinearGradient>
    );
  }

  const renderCircleItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.circleCard}
      onPress={() => navigation.navigate('CircleManagementDetail', { circleId: item.id, circleName: item.name })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.circleImage} />
        ) : (
          <View style={[styles.circleImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
            <Ionicons name="people-outline" size={40} color="#aaa" />
          </View>
        )}
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={styles.circleName}>{item.name}</Text>
          <Text style={styles.circleRole}>{item.role === 'leader' ? '代表者' : '管理者'}</Text>
        </View>
        
        {/* 入会申請がある場合に数字付き赤丸を表示 */}
        {item.joinRequestsCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{item.joinRequestsCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
      style={styles.fullScreenContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>サークル管理</Text>
      </View>
      <SafeAreaView style={styles.contentSafeArea}>
        <FlatList
          data={adminCircles}
          keyExtractor={item => item.id}
          renderItem={renderCircleItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        />
        <View style={styles.createButtonContainer}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleRegisterCirclePress}
          >
            <Ionicons name="add-circle-outline" size={32} color="#fff" />
            <Text style={styles.createButtonText}>新しいサークルを登録する</Text>
          </TouchableOpacity>
        </View>
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
      </LinearGradient>
    );
  }

const styles = StyleSheet.create({
  fullScreenContainer: { 
    flex: 1, 
    backgroundColor: '#1e3a8a',
  },
  header: { 
    width: '100%', 
    height: 115, 
    paddingTop: StatusBar.currentHeight, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255, 255, 255, 0.2)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative' 
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' },
  contentSafeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  registerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignSelf: 'center', marginTop: 32 },
  circleCard: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  circleImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e0e0' },
  circleName: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  circleRole: { fontSize: 14, color: '#888', marginTop: 4 },
  manageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
  manageButtonText: { color: '#007bff', marginLeft: 4, fontSize: 14, fontWeight: 'bold' },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  card: {
    width: '95%',
    maxWidth: 400,
    alignItems: 'center',
    borderRadius: 12,
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 0,
  },
  cardNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  circleManagementImage: {
    width: '100%',
    height: 350,
    borderRadius: 10,
  },
  mainContentWrapper: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 100,
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Modal styles
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
  // 入会申請通知バッジ（数字付き）
  notificationBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
