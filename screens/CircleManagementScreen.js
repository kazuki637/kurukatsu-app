import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, Modal, ScrollView, Dimensions, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';

export default function CircleManagementScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminCircles, setAdminCircles] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [isRegisterModalVisible, setRegisterModalVisible] = useState(false);
  const [isSwitchModalVisible, setSwitchModalVisible] = useState(false);
  const [totalJoinRequestsCount, setTotalJoinRequestsCount] = useState(0);
  const [imageError, setImageError] = useState(false);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);

  // 管理サークルの取得
  useEffect(() => {
    if (user === null) {
      return;
    }
    
    if (!user) {
      global.totalJoinRequestsCount = 0;
      return;
    }

    const fetchAdminCircles = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setAdminCircles([]);
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const adminCircleIds = userData.adminCircleIds || [];
        
        if (adminCircleIds.length === 0) {
          setAdminCircles([]);
          setSelectedCircleId(null);
          setTotalJoinRequestsCount(0);
          global.totalJoinRequestsCount = 0;
          setLoading(false);
          return;
        }

        // 管理サークルの詳細情報を並列取得
        const circlePromises = adminCircleIds.map(async (circleId) => {
          try {
            const circleDoc = await getDoc(doc(db, 'circles', circleId));
            if (!circleDoc.exists()) return null;

            // ユーザーの役割を取得
            const memberDoc = await getDoc(doc(db, 'circles', circleId, 'members', user.uid));
            if (!memberDoc.exists()) return null;

            const role = memberDoc.data().role || 'member';
            if (role !== 'leader' && role !== 'admin') return null;

            // 入会申請数を取得
            let joinRequestsCount = 0;
            try {
              const requestsSnapshot = await getDocs(collection(db, 'circles', circleId, 'joinRequests'));
              joinRequestsCount = requestsSnapshot.size;
            } catch (error) {
              console.error(`Error fetching join requests for circle ${circleId}:`, error);
            }

            return {
              id: circleId,
              ...circleDoc.data(),
              role,
              joinRequestsCount
            };
          } catch (error) {
            console.error(`Error fetching circle ${circleId}:`, error);
            return null;
          }
        });

        const circles = await Promise.all(circlePromises);
        const validCircles = circles.filter(circle => circle !== null);
        
        const totalRequests = validCircles.reduce((sum, circle) => sum + circle.joinRequestsCount, 0);
        
        setAdminCircles(validCircles);
        setTotalJoinRequestsCount(totalRequests);
        global.totalJoinRequestsCount = totalRequests;

      } catch (error) {
        console.error('Error fetching admin circles:', error);
        setAdminCircles([]);
        setSelectedCircleId(null);
        setTotalJoinRequestsCount(0);
        global.totalJoinRequestsCount = 0;
      } finally {
        setLoading(false);
      }
    };

    fetchAdminCircles();

    // ユーザードキュメントの変更を監視
    const userDocUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const adminCircleIds = userData.adminCircleIds || [];
        
        // 管理サークルIDが変更された場合は再取得
        if (JSON.stringify(adminCircleIds) !== JSON.stringify(adminCircles.map(c => c.id))) {
          fetchAdminCircles();
        }
      }
    });

    return () => {
      userDocUnsubscribe();
    };
  }, [user?.uid]);

  // selectedCircleIdの初期化
  useEffect(() => {
    const initializeSelectedCircle = async () => {
      if (adminCircles.length === 0) {
        setSelectedCircleId(null);
        return;
      }
      
      if (!user) return;

      // AsyncStorageから最後に選択したサークルIDを取得
      const savedCircleId = await AsyncStorage.getItem(`lastSelectedCircleId_${user.uid}`);
      
      // 保存されたIDが管理サークルに存在するかチェック
      const validCircle = adminCircles.find(c => c.id === savedCircleId);
      
      if (validCircle) {
        setSelectedCircleId(savedCircleId);
      } else {
        // なければ配列の先頭
        setSelectedCircleId(adminCircles[0].id);
        await AsyncStorage.setItem(`lastSelectedCircleId_${user.uid}`, adminCircles[0].id);
      }
    };
    
    initializeSelectedCircle();
  }, [adminCircles.length, user?.uid]);

  // 画面がフォーカスされた際にデータを再取得
  useFocusEffect(
    React.useCallback(() => {
      // 画像エラーをリセット
      setImageError(false);
      
      if (user) {
        const fetchAdminCircles = async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
              setAdminCircles([]);
              setSelectedCircleId(null);
              setTotalJoinRequestsCount(0);
              global.totalJoinRequestsCount = 0;
              return;
            }

            const userData = userDoc.data();
            const adminCircleIds = userData.adminCircleIds || [];
            
            if (adminCircleIds.length === 0) {
              setAdminCircles([]);
              setSelectedCircleId(null);
              setTotalJoinRequestsCount(0);
              global.totalJoinRequestsCount = 0;
              return;
            }

            const circlePromises = adminCircleIds.map(async (circleId) => {
              try {
                const circleDoc = await getDoc(doc(db, 'circles', circleId));
                if (!circleDoc.exists()) return null;

                const memberDoc = await getDoc(doc(db, 'circles', circleId, 'members', user.uid));
                if (!memberDoc.exists()) return null;

                const role = memberDoc.data().role || 'member';
                if (role !== 'leader' && role !== 'admin') return null;

                let joinRequestsCount = 0;
                try {
                  const requestsSnapshot = await getDocs(collection(db, 'circles', circleId, 'joinRequests'));
                  joinRequestsCount = requestsSnapshot.size;
                } catch (error) {
                  console.error(`Error fetching join requests for circle ${circleId}:`, error);
                }

                return {
                  id: circleId,
                  ...circleDoc.data(),
                  role,
                  joinRequestsCount
                };
              } catch (error) {
                console.error(`Error fetching circle ${circleId}:`, error);
                return null;
              }
            });

            const circles = await Promise.all(circlePromises);
            const validCircles = circles.filter(circle => circle !== null);
            
            const totalRequests = validCircles.reduce((sum, circle) => sum + circle.joinRequestsCount, 0);
            
            setAdminCircles(validCircles);
            setTotalJoinRequestsCount(totalRequests);
            global.totalJoinRequestsCount = totalRequests;

          } catch (error) {
            console.error('Error fetching admin circles on focus:', error);
            setAdminCircles([]);
            setSelectedCircleId(null);
            setTotalJoinRequestsCount(0);
            global.totalJoinRequestsCount = 0;
          }
        };

        fetchAdminCircles();
      }
    }, [user?.uid])
  );

  // 入会申請数のイベントベース更新
  useEffect(() => {
    if (!user) return;

    global.updateCircleManagementJoinRequests = (circleId, delta) => {
      setAdminCircles(prev => {
        const updated = prev.map(c => {
          if (c.id === circleId) {
            const newCount = Math.max(0, c.joinRequestsCount + delta);
            return { ...c, joinRequestsCount: newCount };
          }
          return c;
        });
        
        const totalRequests = updated.reduce((sum, c) => sum + c.joinRequestsCount, 0);
        setTotalJoinRequestsCount(totalRequests);
        global.totalJoinRequestsCount = totalRequests;
        
        return updated;
      });
    };

    return () => {
      delete global.updateCircleManagementJoinRequests;
    };
  }, [user?.uid]);

  // 新規登録ボタン
  const handleRegisterCirclePress = async () => {
    if (!user) {
      Alert.alert('ログインが必要です', 'サークル登録にはログインが必要です。');
      return;
    }

    setRegisterModalVisible(true);
  };

  const handleRegisterAgree = () => {
    setRegisterModalVisible(false);
    navigation.getParent()?.navigate('CircleRegistration');
  };

  const handleRegisterDisagree = () => {
    setRegisterModalVisible(false);
  };

  // サークル切り替え
  const handleSwitchCircle = async (circleId) => {
    setSelectedCircleId(circleId);
    setSwitchModalVisible(false);
    
    if (user) {
      await AsyncStorage.setItem(`lastSelectedCircleId_${user.uid}`, circleId);
    }
  };

  // 選択中のサークルデータ
  const selectedCircle = adminCircles.find(c => c.id === selectedCircleId);

  // 選択中のサークルが変更されたとき、または画像URLが変更されたときに画像エラーをリセット
  useEffect(() => {
    setImageError(false);
  }, [selectedCircleId, selectedCircle?.imageUrl]);

  // 管理ボタンのリスト
  const getManagementButtonsGrid = () => {
    if (!selectedCircle) return [];
    
    const currentJoinRequestsCount = selectedCircle.joinRequestsCount || 0;
    
    return [
      {
        label: '新歓プロフィールを\n編集する',
        iconSource: require('../assets/Button-icons/Profile.png'),
        onPress: () => navigation.navigate('CircleProfileEdit', { circleId: selectedCircleId })
      },
      {
        label: 'メンバーを\n管理する',
        iconSource: require('../assets/Button-icons/Member.png'),
        onPress: () => navigation.navigate('CircleMemberManagement', { circleId: selectedCircleId }),
        hasNotification: currentJoinRequestsCount > 0,
        notificationCount: currentJoinRequestsCount
      },
      {
        label: '連絡を\n送信する',
        iconSource: require('../assets/Button-icons/Message.png'),
        onPress: () => navigation.navigate('CircleContact', { circleId: selectedCircleId })
      },
      {
        label: 'カレンダーを\n作成する',
        iconSource: require('../assets/Button-icons/Calendar.png'),
        onPress: () => navigation.navigate('CircleScheduleManagement', { circleId: selectedCircleId })
      },
      {
        label: '代表者を\n引き継ぐ',
        iconSource: require('../assets/Button-icons/Leader.png'),
        onPress: () => {
          if (selectedCircle.role === 'leader') {
            navigation.navigate('CircleLeadershipTransfer', { circleId: selectedCircleId, circleName: selectedCircle.name });
          } else {
            Alert.alert(
              'アクセス権限がありません',
              '代表者のみが利用できる機能です。',
              [{ text: 'OK' }]
            );
          }
        }
      },
      {
        label: 'サークル設定を\n変更する',
        iconSource: require('../assets/Button-icons/Setting.png'),
        onPress: () => {
          if (selectedCircle.role === 'leader') {
            navigation.navigate('CircleSettings', { circleId: selectedCircleId });
          } else {
            Alert.alert(
              'アクセス権限がありません',
              '代表者のみが利用できる機能です。',
              [{ text: 'OK' }]
            );
          }
        }
      }
    ];
  };

  // ローディング画面
  if (loading) {
    return (
      <View style={styles.modernContainer}>
        <CommonHeader title="サークル運営" />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // 認証状態未確定
  if (user === null) {
    return (
      <View style={styles.modernContainer}>
        <CommonHeader title="サークル運営" />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // サークル0件の案内画面
  if (adminCircles.length === 0) {
    return (
      <View style={styles.modernContainer}>
        <CommonHeader title="サークル運営" />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.modernMainContent}>
            <View style={styles.modernCardContainer}>
              <View style={styles.modernCard}>
                <View style={styles.modernCardHeader}>
                  <Text style={styles.modernCardTitle}>サークルの管理ができる！</Text>
                  <Text style={styles.modernCardSubtitle}>
                    メンバーの管理やイベントの企画など{"\n"}あなたのサークル運営をサポートします
                  </Text>
                </View>
                  <Image 
                    source={require('../assets/CircleManagement.png')} 
                    style={styles.modernManagementImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                <Text style={styles.modernCardNote}>
                  ※これはサークル代表者向けの機能です
                </Text>
              </View>
            </View>
            <View style={styles.modernButtonContainer}>
              <KurukatsuButton
                onPress={handleRegisterCirclePress}
                size="medium"
                variant="primary"
                hapticFeedback={true}
                style={styles.kurukatsuButtonStyle}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
                  <Text style={styles.kurukatsuButtonText}>新しいサークルを登録する</Text>
                </View>
              </KurukatsuButton>
            </View>
          </View>
        </SafeAreaView>

        {/* 新規登録同意モーダル */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isRegisterModalVisible}
          onRequestClose={() => setRegisterModalVisible(false)}
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
                <KurukatsuButton
                  title="同意しない"
                  onPress={handleRegisterDisagree}
                  size="medium"
                  variant="secondary"
                  hapticFeedback={true}
                  style={styles.modalButtonKurukatsu}
                />
                <KurukatsuButton
                  title="同意する"
                  onPress={handleRegisterAgree}
                  size="medium"
                  variant="primary"
                  hapticFeedback={true}
                  style={styles.modalButtonKurukatsu}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // 詳細表示（1件以上）
  const managementButtonsGrid = getManagementButtonsGrid();

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>サークル運営</Text>
      </View>
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.circleDetailContainer} showsVerticalScrollIndicator={false}>
          {/* サークル情報 */}
          <View style={styles.circleInfoRow}>
            <View style={styles.circleImageLargeContainer}>
              <View style={styles.circleImageWrapper}>
                {selectedCircle?.imageUrl && !imageError ? (
                  <Image 
                    source={{ uri: selectedCircle.imageUrl }} 
                    style={styles.circleImageLarge}
                    onError={() => setImageError(true)}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.circleImageLarge, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
                    <Ionicons name="people-outline" size={64} color="#aaa" />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.circleInfoTextCol}>
              <Text style={styles.circleInfoName}>{selectedCircle?.name}</Text>
              <Text style={styles.circleInfoSub}>
                {selectedCircle?.universityName}
                {selectedCircle?.genre ? `・${selectedCircle.genre}` : ''}
              </Text>
            </View>
          </View>

          {/* 管理ボタン（3行×2列） */}
          <View style={styles.managementGridSection}>
            {Array.from({ length: 3 }).map((_, rowIdx) => (
              <View style={[styles.managementRow2col, rowIdx === 2 && styles.managementRow2colLast]} key={rowIdx}>
                {managementButtonsGrid.slice(rowIdx * 2, rowIdx * 2 + 2).map((btn, colIdx) => (
                  btn ? (
                    <TouchableOpacity
                      key={btn.label}
                      style={styles.managementGridItem2col}
                      onPress={btn.onPress}
                      activeOpacity={1}
                    >
                      <View style={styles.buttonBackground}>
                        <View style={styles.buttonContent2}>
                          <Text style={styles.managementGridItemText}>{btn.label}</Text>
                          <View style={styles.buttonIconContainer}>
                            <Image 
                              source={btn.iconSource} 
                              style={styles.buttonIcon}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                            />
                          </View>
                          {btn.hasNotification && (
                            <View style={styles.notificationBadge}>
                              <Text style={styles.notificationBadgeText}>{btn.notificationCount}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View key={`empty-${colIdx}`} style={styles.managementGridItem2col} />
                  )
                ))}
              </View>
            ))}
          </View>

          {/* サークル切り替えボタン */}
          <View style={styles.switchButtonSection}>
            <KurukatsuButton
              onPress={() => setSwitchModalVisible(true)}
              size="medium"
              variant="secondary"
              hapticFeedback={true}
              style={styles.switchButton}
            >
              <View style={styles.switchButtonContent}>
                <Ionicons name="swap-horizontal" size={20} color="#2563eb" />
                <Text style={styles.switchButtonText}>サークルを切り替える</Text>
                {totalJoinRequestsCount > 0 && (
                  <View style={styles.switchNotificationBadge}>
                    <Text style={styles.notificationBadgeText}>{totalJoinRequestsCount}</Text>
                  </View>
                )}
              </View>
            </KurukatsuButton>
          </View>

          {/* Instagram案内 */}
          <View style={styles.promotionSection}>
            <TouchableOpacity 
              style={styles.promotionCard}
              onPress={() => {
                Linking.openURL('https://www.instagram.com/kurukatsu_app?igsh=bmRhcTk3bWsyYmVj&utm_source=qr');
              }}
              activeOpacity={1}
            >
              <View style={styles.promotionContent}>
                <View style={styles.promotionIconContainer}>
                  <Image 
                    source={require('../assets/icon.png')} 
                    style={styles.promotionIcon}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </View>
                <View style={styles.promotionTextContainer}>
                  <View style={styles.promotionTitleContainer}>
                    <Text style={styles.promotionTitle}>クルカツ公式Instagram</Text>
                    <Ionicons name="logo-instagram" size={16} color="#E4405F" style={styles.instagramLogo} />
                  </View>
                  <Text style={styles.promotionSubtitle}>アプリの感想や要望はDMまで！</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* サークル切り替えモーダル */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isSwitchModalVisible}
        onRequestClose={() => setSwitchModalVisible(false)}
      >
        <View style={styles.switchModalOverlay}>
          <View style={styles.switchModalView}>
            <View style={styles.switchModalHeader}>
              <Text style={styles.switchModalTitle}>管理しているサークル</Text>
              <TouchableOpacity onPress={() => setSwitchModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.switchModalContent}>
              {adminCircles.map((circle) => (
                <TouchableOpacity
                  key={circle.id}
                  style={[
                    styles.switchCircleCard,
                    circle.id === selectedCircleId && styles.switchCircleCardSelected
                  ]}
                  onPress={() => handleSwitchCircle(circle.id)}
                  activeOpacity={1}
                >
                  <View style={styles.circleCardContent}>
                    {circle.imageUrl ? (
                      <Image source={{ uri: circle.imageUrl }} style={styles.circleImage} />
                    ) : (
                      <View style={[styles.circleImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="people-outline" size={40} color="#aaa" />
                      </View>
                    )}
                    <View style={{ marginLeft: 16, flex: 1 }}>
                      <Text style={styles.circleName}>{circle.name}</Text>
                      <Text style={styles.circleRole}>
                        {circle.universityName}
                        {circle.genre ? `・${circle.genre}` : ''}
                      </Text>
                    </View>
                    
                    {circle.joinRequestsCount > 0 && (
                      <View style={styles.modalNotificationBadge}>
                        <Text style={styles.notificationBadgeText}>{circle.joinRequestsCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* 新規登録ボタン */}
              <KurukatsuButton
                onPress={() => {
                  setSwitchModalVisible(false);
                  handleRegisterCirclePress();
                }}
                size="medium"
                variant="secondary"
                hapticFeedback={true}
                style={styles.newCircleButton}
              >
                <View style={styles.newCircleButtonContent}>
                  <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                  <Text style={styles.newCircleButtonText}>新しいサークルを登録</Text>
                </View>
              </KurukatsuButton>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 新規登録同意モーダル */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isRegisterModalVisible}
        onRequestClose={() => setRegisterModalVisible(false)}
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
              <KurukatsuButton
                title="同意しない"
                onPress={handleRegisterDisagree}
                size="medium"
                variant="secondary"
                hapticFeedback={true}
                style={styles.modalButtonKurukatsu}
              />
              <KurukatsuButton
                title="同意する"
                onPress={handleRegisterAgree}
                size="medium"
                variant="primary"
                hapticFeedback={true}
                style={styles.modalButtonKurukatsu}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    width: '100%',
    height: 100,
    paddingTop: StatusBar.currentHeight,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  contentSafeArea: { 
    flex: 1 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  circleDetailContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  circleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
    paddingHorizontal: 20,
  },
  circleImageLargeContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  circleImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
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
    color: '#333',
  },
  circleInfoSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  managementGridSection: {
    marginTop: 25,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  managementRow2col: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  managementRow2colLast: {
    marginBottom: 0,
  },
  managementGridItem2col: {
    width: (Dimensions.get('window').width - 55) / 2,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonBackground: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#d9effe',
  },
  managementGridItemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
    fontWeight: '500',
    alignSelf: 'flex-start',
  },
  buttonContent2: {
    flex: 1,
    padding: 12,
    position: 'relative',
  },
  buttonIconContainer: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 60,
    height: 60,
  },
  buttonIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalNotificationBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 12,
  },
  // サークル切り替えボタン
  switchButtonSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  switchButton: {
    width: '100%',
  },
  switchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  switchNotificationBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  // Instagram案内
  promotionSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  promotionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  promotionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotionIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promotionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  promotionTextContainer: {
    flex: 1,
  },
  promotionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 6,
  },
  instagramLogo: {
    marginLeft: 4,
  },
  promotionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  // サークル切り替えモーダル
  switchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchModalView: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '90%',
    maxHeight: '70%',
  },
  switchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  switchModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  switchModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  switchCircleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  switchCircleCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  circleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  circleImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#e0e0e0' 
  },
  circleName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1f2937' 
  },
  circleRole: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginTop: 4 
  },
  newCircleButton: {
    marginTop: 8,
  },
  newCircleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCircleButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // 新規登録モーダル
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '90%',
    maxHeight: '60%',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContentScroll: {
    maxHeight: '60%',
    marginBottom: 20,
  },
  modalText: {
    marginBottom: 16,
    textAlign: 'left',
    lineHeight: 22,
    color: '#374151',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButtonKurukatsu: {
    flex: 1,
  },
  // 0件案内画面
  modernMainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  modernCardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  modernCardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modernCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 12,
  },
  modernCardSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modernManagementImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 16,
  },
  modernCardNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modernButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  kurukatsuButtonStyle: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kurukatsuButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

