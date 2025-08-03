import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, ActivityIndicator, Image, Alert, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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
          setCircleData(circleDoc.data());
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

  if (loading) {
    return (
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
        style={styles.fullScreenContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{circleName || "サークル管理"}</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 10 }}>サークル情報を読み込み中...</Text>
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
          <Text style={styles.headerTitle}>{circleName || "サークル管理"}</Text>
        </View>
        <SafeAreaView style={styles.contentSafeArea}>
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#fff' }}>ログインしてください</Text>
        </SafeAreaView>
      </LinearGradient>
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

  // 管理ボタンのリスト（代表者のみ「代表者を引き継ぐ」ボタンを表示）
  const getManagementButtonsGrid = () => {
    const baseButtons = [
      {
        label: 'プロフィール編集',
        icon: 'create-outline',
        onPress: () => navigation.navigate('CircleProfileEdit', { circleId })
      },
      {
        label: 'メンバー管理',
        icon: 'people-outline',
        onPress: () => navigation.navigate('CircleMemberManagement', { circleId })
      },
      {
        label: '連絡',
        icon: 'mail-outline',
        onPress: () => navigation.navigate('CircleContact', { circleId })
      },
      {
        label: 'スケジュール',
        icon: 'calendar-outline',
        onPress: () => navigation.navigate('CircleScheduleManagement', { circleId })
      },
      {
        label: 'サークル設定',
        icon: 'settings-outline',
        onPress: () => navigation.navigate('CircleSettings', { circleId })
      }
    ];

    // 代表者のみ「代表者を引き継ぐ」ボタンを追加
    if (userRole === 'leader') {
      baseButtons.splice(2, 0, {
        label: '代表者を引き継ぐ',
        icon: 'swap-horizontal-outline',
        onPress: () => navigation.navigate('CircleLeadershipTransfer', { circleId, circleName })
      });
    }

    return baseButtons;
  };

  const managementButtonsGrid = getManagementButtonsGrid();

  return (
    <LinearGradient
      colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
      style={styles.fullScreenContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{circleName || "サークル管理"}</Text>
      </View>
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.circleDetailContainer}>
          {/* サークル情報：アイコン＋サークル名・ジャンル（横並び） */}
          <View style={styles.circleInfoRow}>
            <View style={styles.circleImageLargeContainer}>
              {circleData.imageUrl ? (
                <Image source={{ uri: circleData.imageUrl }} style={styles.circleImageLarge} />
              ) : (
                <Ionicons name="image-outline" size={64} color="#ccc" />
              )}
            </View>
            <View style={styles.circleInfoTextCol}>
              <Text style={styles.circleInfoName}>{circleData.name}</Text>
              <Text style={styles.circleInfoSub}>
                {circleData.universityName}
                {circleData.genre ? `・${circleData.genre}` : ''}
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
              <TouchableOpacity 
                style={styles.subscriptionButton}
                onPress={() => navigation.navigate('Subscription', { circleId, circleName })}
              >
                <Text style={styles.subscriptionButtonText}>無料で体験する</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subscriptionDesc}>¥0で7日間プレミアムを楽しみましょう</Text>
            <View style={styles.subscriptionFeatureRow}>
              <View style={styles.subscriptionFeature}><Ionicons name="calendar-outline" size={20} color="#333" /><Text style={styles.subscriptionFeatureText}>スケジュール</Text></View>
              <View style={styles.subscriptionFeature}><Ionicons name="mail-outline" size={20} color="#333" /><Text style={styles.subscriptionFeatureText}>連絡</Text></View>
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
      </SafeAreaView>
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
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#fff',
  },
  circleInfoSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  subscriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  subscriptionButton: {
    backgroundColor: '#1e3a8a',
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
    color: '#1e3a8a',
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
    color: '#1e3a8a',
    marginTop: 2,
  },
  managementGridSection: {
    flex: 1,
    paddingHorizontal: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  managementGridItemText: {
    fontSize: 10,
    color: '#1e3a8a',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },

}); 