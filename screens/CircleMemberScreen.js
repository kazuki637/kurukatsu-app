import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationBadge } from '../hooks/useNotificationBadge';

export default function CircleMemberScreen({ route, navigation }) {
  const { circleId } = route.params;
  
  const [circleName, setCircleName] = useState('サークル');
  const [circleData, setCircleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  // 通知バッジフックを使用
  const { unreadCount: unreadMessageCount } = useNotificationBadge(circleId);
  
  useEffect(() => {
    const fetchCircleData = async () => {
      if (!circleId) {
        setLoading(false);
        return;
    }

    try {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCircleData(data);
          setCircleName(data.name || 'サークル');
      }
    } catch (error) {
        console.error('Error fetching circle data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCircleData();
  }, [circleId]);

  // 未読メッセージ数はuseNotificationBadgeフックで管理

  if (loading) {
    return (
      <View style={styles.fullScreenContainer}>
        <CommonHeader title="サークル" showBackButton onBack={() => navigation.goBack()} />
        <SafeAreaView style={styles.contentSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007bff" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!circleData) {
        return (
      <View style={styles.fullScreenContainer}>
        <CommonHeader title="サークル" showBackButton onBack={() => navigation.goBack()} />
        <SafeAreaView style={styles.contentSafeArea}>
          <Text style={{ textAlign: 'center', marginTop: 40 }}>サークルが見つかりません</Text>
        </SafeAreaView>
                              </View>
    );
  }

  // メニュー項目のリスト
  const getMenuItems = () => {
    return [
      {
        label: 'カレンダー',
        icon: 'calendar-outline',
        onPress: () => navigation.navigate('CircleMemberSchedule', { circleId })
      },
      {
        label: '連絡',
        icon: 'mail-outline',
        onPress: () => navigation.navigate('CircleMemberContact', { circleId }),
        hasNotification: unreadMessageCount > 0,
        notificationCount: unreadMessageCount
      },
      {
        label: 'メンバー',
        icon: 'people-outline',
        onPress: () => navigation.navigate('CircleMemberMemberList', { circleId })
      }
    ];
  };

  const menuItems = getMenuItems();
                  
                  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader 
        title={circleName} 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.circleDetailContainer}>
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
                           
          {/* メニューセクション */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuItemIconContainer}>
                    <Ionicons name={item.icon} size={20} color="#007bff" />
                    </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
          </View>
                <View style={styles.menuItemRight}>
                  {item.hasNotification && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {item.notificationCount > 99 ? '99+' : item.notificationCount}
                      </Text>
                  </View>
                )}
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  // サークル情報セクション
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
  // メニューセクション
  menuSection: {
    marginTop: 25,
    paddingVertical: 0,
    paddingHorizontal: 20,
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
    marginBottom: 15,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIconContainer: {
    position: 'relative',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '400',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 通知バッジ
  notificationBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginRight: 8,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 