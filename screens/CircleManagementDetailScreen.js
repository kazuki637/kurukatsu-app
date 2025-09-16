import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, ActivityIndicator, Image, Alert, Dimensions, ScrollView, Animated, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';

const BUTTON_SIZE = (Dimensions.get('window').width - 40) / 2.5; // 2列+等間隔
const GRID_WIDTH = BUTTON_SIZE * 2 + 10; // ボタン2個＋間隔
const GRID_COLUMNS = 3;
const GRID_ROWS = 2;
const BUTTON_GRID_MARGIN = 32;
const BUTTON_GRID_GAP = 16;
const BUTTON_SIZE_3COL = (Dimensions.get('window').width - BUTTON_GRID_GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;

export default function CircleManagementDetailScreen({ route, navigation }) {
  const { circleId, circleName } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [circleData, setCircleData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [joinRequestsCount, setJoinRequestsCount] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnimation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user || !circleId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(doc(db, 'circles', circleId), (circleDoc) => {
      try {
        if (circleDoc.exists()) {
          const newCircleData = circleDoc.data();
          setCircleData(newCircleData);
        }

        // ユーザーがログアウトしている場合は処理をスキップ
        if (!user) {
          setUserRole(null);
          setLoading(false);
          return;
        }

        // ユーザーの役割を取得（一度だけ）
        getDoc(doc(db, 'circles', circleId, 'members', user.uid)).then((memberDoc) => {
          if (memberDoc.exists()) {
            setUserRole(memberDoc.data().role || 'member');
          }
        });

        // 入会申請の数を取得
        getDocs(collection(db, 'circles', circleId, 'joinRequests')).then((requestsSnapshot) => {
          setJoinRequestsCount(requestsSnapshot.size);
        });
      } catch (error) {
        console.error('Error fetching circle data:', error);
        Alert.alert('エラー', 'サークル情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to circle:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, circleId]);

  // 入会申請数更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateCircleManagementDetailJoinRequests = (targetCircleId, count) => {
      if (targetCircleId === circleId) {
        setJoinRequestsCount(count);
      }
    };
    
    return () => {
      delete global.updateCircleManagementDetailJoinRequests;
    };
  }, [circleId]);

  if (loading) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{circleName || "サークル管理"}</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007bff" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{circleName || "サークル管理"}</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#666' }}>ログインしてください</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!circleData) {
    return (
      <View style={styles.fullScreenContainer}>
        <CommonHeader title={circleName || "サークル管理"} showBackButton onBack={() => navigation.goBack()} />
        <SafeAreaView style={styles.contentSafeArea}>
          <Text style={{ textAlign: 'center', marginTop: 40 }}>サークルが見つかりません</Text>
        </SafeAreaView>
      </View>
    );
  }

  // 管理ボタンのリスト（3行×2列配置）
  const getManagementButtonsGrid = () => {
    return [
      // 1行目
      {
        label: 'プロフィールを\n編集する',
        iconSource: require('../assets/Button-icons/Profile.png'),
        onPress: () => navigation.navigate('CircleProfileEdit', { circleId })
      },
      {
        label: 'メンバーを\n管理する',
        iconSource: require('../assets/Button-icons/Member.png'),
        onPress: () => navigation.navigate('CircleMemberManagement', { circleId }),
        hasNotification: joinRequestsCount > 0,
        notificationCount: joinRequestsCount
      },
      // 2行目
      {
        label: '連絡を\n送信する',
        iconSource: require('../assets/Button-icons/Message.png'),
        onPress: () => navigation.navigate('CircleContact', { circleId })
      },
      {
        label: 'カレンダーを\n作成する',
        iconSource: require('../assets/Button-icons/Calendar.png'),
        onPress: () => navigation.navigate('CircleScheduleManagement', { circleId })
      },
      // 3行目
      {
        label: '代表者を\n引き継ぐ',
        iconSource: require('../assets/Button-icons/Leader.png'),
        onPress: () => {
          if (userRole === 'leader') {
            navigation.navigate('CircleLeadershipTransfer', { circleId, circleName });
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
          if (userRole === 'leader') {
            navigation.navigate('CircleSettings', { circleId });
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

  // メニュー項目のリスト
  const getMenuItems = () => {
    return [];
  };

  // 統合メニュー項目のリスト
  const getIntegratedMenuItems = () => {
    return [
      {
        label: 'ミッション',
        icon: 'trophy',
        onPress: () => {
          // TODO: ミッション画面への遷移
          Alert.alert('お知らせ', 'ミッション機能は準備中です');
        }
      },
      {
        label: 'ポイント交換所',
        icon: 'storefront',
        onPress: () => {
          // TODO: ポイント交換所画面への遷移
          Alert.alert('お知らせ', 'ポイント交換所機能は準備中です');
        }
      },
      {
        label: 'キャンペーン情報',
        icon: 'flame',
        onPress: () => {
          // TODO: キャンペーン情報画面への遷移
          Alert.alert('お知らせ', 'キャンペーン情報機能は準備中です');
        }
      }
    ];
  };

  const managementButtonsGrid = getManagementButtonsGrid();
  const menuItems = getMenuItems();
  const integratedMenuItems = getIntegratedMenuItems();

  // カードをひっくり返す関数
  const flipCard = () => {
    const toValue = isCardFlipped ? 0 : 1;
    setIsCardFlipped(!isCardFlipped);
    
    Animated.timing(flipAnimation, {
      toValue,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{circleName || "サークル管理"}</Text>
      </View>
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.circleDetailContainer} showsVerticalScrollIndicator={false}>
          {/* サークル情報：アイコン＋サークル名・ジャンル（横並び） */}
          <View style={styles.circleInfoRow}>
            <View style={styles.circleImageLargeContainer}>
              <View style={styles.circleImageWrapper}>
                {circleData.imageUrl && !imageError ? (
                  <Image 
                    source={{ uri: circleData.imageUrl }} 
                    style={styles.circleImageLarge}
                    onError={() => setImageError(true)}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.circleImageLarge, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
                    <Ionicons name="people-outline" size={64} color="#aaa" />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.circleInfoTextCol}>
              <Text style={styles.circleInfoName}>{circleData.name}</Text>
              <Text style={styles.circleInfoSub}>
                {circleData.universityName}
                {circleData.genre ? `・${circleData.genre}` : ''}
              </Text>
            </View>
          </View>

          {/* クルカツポイントカード - 一時的に非表示（ポイント制度導入予定） */}
          {/* <View style={styles.kurukatsuPointsSection}>
            <View style={styles.kurukatsuPointsCardContainer}>
              <Animated.View 
                style={[
                  styles.kurukatsuPointsCard,
                  {
                    transform: [{
                      rotateY: flipAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      })
                    }]
                  }
                ]}
                pointerEvents={isCardFlipped ? 'none' : 'auto'}
              >
                <View style={styles.kurukatsuPointsCardFront}>
                  <Text style={styles.kurukatsuPointsTitle}>クルカツポイント</Text>
                  <View style={styles.kurukatsuPointsContent}>
                    <Image source={require('../assets/KP.png')} style={styles.kurukatsuPointsIcon} />
                    <Text style={styles.kurukatsuPointsAmount}>0</Text>
                    <Text style={styles.kurukatsuPointsUnit}>pt</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.kurukatsuPointsTapButton, styles.kurukatsuPointsTapButtonFront]}
                    onPress={flipCard}
                  >
                    <Text style={[styles.kurukatsuPointsTapText, styles.kurukatsuPointsTapTextFront]}>詳細を見る</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
              
              <Animated.View 
                style={[
                  styles.kurukatsuPointsCard,
                  styles.kurukatsuPointsCardBack,
                  {
                    transform: [{
                      rotateY: flipAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['180deg', '360deg'],
                      })
                    }]
                  }
                ]}
                pointerEvents={isCardFlipped ? 'auto' : 'none'}
              >
                <View style={styles.kurukatsuPointsCardFront}>
                  <Text style={styles.kurukatsuPointsTitle}>クルカツポイント</Text>
                  <View style={styles.kurukatsuPointsBackButtons}>
                    <TouchableOpacity style={styles.kurukatsuPointsBackButton}>
                      <Ionicons name="time-outline" size={20} color="#007bff" />
                      <Text style={styles.kurukatsuPointsBackButtonText}>履歴</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.kurukatsuPointsBackButton}>
                      <Ionicons name="add-circle-outline" size={20} color="#007bff" />
                      <Text style={styles.kurukatsuPointsBackButtonText}>貯める</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.kurukatsuPointsBackButton}>
                      <Ionicons name="remove-circle-outline" size={20} color="#007bff" />
                      <Text style={styles.kurukatsuPointsBackButtonText}>使う</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={[styles.kurukatsuPointsTapButton, styles.kurukatsuPointsTapButtonBack]}
                    onPress={flipCard}
                  >
                    <Text style={[styles.kurukatsuPointsTapText, styles.kurukatsuPointsTapTextBack]}>戻る</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </View> */}

          {/* 管理ボタン（3行×2列配置） */}
          <View style={styles.managementGridSection}>
            {Array.from({ length: 3 }).map((_, rowIdx) => (
              <View style={[styles.managementRow2col, rowIdx === 2 && styles.managementRow2colLast]} key={rowIdx}>
                {managementButtonsGrid.slice(rowIdx * 2, rowIdx * 2 + 2).map((btn, colIdx) => (
                  btn ? (
                    <TouchableOpacity
                      key={btn.label}
                      style={styles.managementGridItem2col}
                      onPress={btn.onPress}
                    >
                      <LinearGradient
                        colors={['#B8E6FF', '#E0F6FF', '#C8F0FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.buttonGradient}
                      >
                        <View style={styles.buttonContent}>
                          <Text style={styles.managementGridItemText}>{btn.label}</Text>
                          <View style={styles.buttonIconContainer}>
                            <Image source={btn.iconSource} style={styles.buttonIcon} />
                          </View>
                          {btn.hasNotification && (
                            <View style={styles.notificationBadge}>
                              <Text style={styles.notificationBadgeText}>{btn.notificationCount}</Text>
                            </View>
                          )}
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View key={`empty-${colIdx}`} style={styles.managementGridItem2col} />
                  )
                ))}
              </View>
            ))}
          </View>

          {/* プロモーションセクション */}
          <View style={styles.promotionSection}>
            <TouchableOpacity 
              style={styles.promotionCard}
              onPress={() => {
                Linking.openURL('https://www.instagram.com/kurukatsu_app?igsh=bmRhcTk3bWsyYmVj&utm_source=qr');
              }}
            >
              <View style={styles.promotionContent}>
                <View style={styles.promotionIconContainer}>
                  <Image source={require('../assets/icon.png')} style={styles.promotionIcon} />
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

          {/* メニュー項目（moomoo証券スタイル） */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={20} color="#007bff" />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>

          {/* 統合メニュー項目（一つのカード） - 一時的に非表示 */}
          {/* <View style={styles.integratedMenuSection}>
            <View style={styles.integratedMenuCard}>
              {integratedMenuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.integratedMenuItem,
                    index < integratedMenuItems.length - 1 && styles.integratedMenuItemBorder
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={item.icon} size={20} color="#007bff" />
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </View> */}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: (Dimensions.get('window').width - 60) / 2,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 12,
  },
  managementGridItemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
    fontWeight: '500',
    alignSelf: 'flex-start',
  },
  buttonContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    position: 'relative',
  },
  buttonIconContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    position: 'relative',
    paddingRight: 20,
    paddingBottom: 20,
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
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  menuSection: {
    marginTop: 5,
    paddingVertical: 0,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '400',
  },

  // クルカツポイントカードのスタイル
  kurukatsuPointsSection: {
    marginTop: 15,
    paddingHorizontal: 40,
  },
  kurukatsuPointsCardContainer: {
    position: 'relative',
  },
  kurukatsuPointsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    backfaceVisibility: 'hidden',
  },
  kurukatsuPointsCardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    backfaceVisibility: 'hidden',
  },
  kurukatsuPointsCardFront: {
    flex: 1,
    position: 'relative',
    minHeight: 130,
  },
  kurukatsuPointsTapButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kurukatsuPointsTapText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  kurukatsuPointsTapButtonFront: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
  },
  kurukatsuPointsTapTextFront: {
    color: '#007bff',
  },
  kurukatsuPointsTapButtonBack: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  kurukatsuPointsTapTextBack: {
    color: '#808080',
  },
  kurukatsuPointsBackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'baseline',
    paddingVertical: 20,
    minHeight: 80,
  },
  kurukatsuPointsBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  kurukatsuPointsBackButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '300',
    marginTop: 8,
  },
  kurukatsuPointsTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#666',
    marginBottom: 15,
  },
  kurukatsuPointsContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 20,
    minHeight: 80,
  },
  kurukatsuPointsIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  kurukatsuPointsAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#007bff',
  },
  kurukatsuPointsUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007bff',
    marginLeft: 4,
  },
  kurukatsuPointsDescription: {
    fontSize: 14,
    color: '#666',
  },

  integratedMenuSection: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  integratedMenuCard: {
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
  integratedMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  integratedMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  // プロモーションセクション
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

}); 