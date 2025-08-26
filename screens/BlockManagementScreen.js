import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';

export default function BlockManagementScreen({ navigation }) {
  const [blockedCircles, setBlockedCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchBlockedCircles();
    }
  }, [user]);

  // 画面がフォーカスされたときにブロック状態を更新
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBlockedCircles();
      }
    }, [user])
  );

  const fetchBlockedCircles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const blocksRef = collection(db, 'users', user.uid, 'blocks');
      const blocksSnapshot = await getDocs(blocksRef);
      
      const blockedData = blocksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // ブロックしたサークルの詳細情報（画像URL等）を取得
      const enrichedBlockedData = await Promise.all(
        blockedData.map(async (blockData) => {
          try {
            const circleDoc = await getDoc(doc(db, 'circles', blockData.id));
            if (circleDoc.exists()) {
              const circleData = circleDoc.data();
              return {
                ...blockData,
                imageUrl: circleData.imageUrl || null,
                name: circleData.name || blockData.blockedCircleName
              };
            }
            return blockData;
          } catch (error) {
            console.error(`Error fetching circle data for ${blockData.id}:`, error);
            return blockData;
          }
        })
      );
      
      setBlockedCircles(enrichedBlockedData);
    } catch (error) {
      console.error('Error fetching blocked circles:', error);
      Alert.alert('エラー', 'ブロックしたサークルの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (circleId, circleName) => {
    if (!user) return;

    Alert.alert(
      'ブロック解除',
      `「${circleName}」のブロックを解除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'blocks', circleId));
              
              // ローカル状態を更新
              setBlockedCircles(prev => prev.filter(circle => circle.id !== circleId));
              
              // 成功メッセージを表示
              Alert.alert(
                '完了\n', 
                'ブロックを解除しました。',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error unblocking circle:', error);
              Alert.alert('エラー', 'ブロック解除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const renderBlockedCircle = (circle) => (
    <View key={circle.id} style={styles.circleItem}>
      {/* サークルアイコン */}
      {circle.imageUrl ? (
        <Image source={{ uri: circle.imageUrl }} style={styles.circleIcon} />
      ) : (
        <View style={[styles.circleIcon, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
          <Ionicons name="people-outline" size={24} color="#aaa" />
        </View>
      )}
      
      <View style={styles.circleInfo}>
        <Text style={styles.circleName}>{circle.blockedCircleName}</Text>
        <Text style={styles.blockDate}>
          ブロック日: {circle.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '不明'}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(circle.id, circle.blockedCircleName)}
      >
        <Text style={styles.unblockButtonText}>解除</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <CommonHeader title="ブロックリスト" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader title="ブロックリスト" navigation={navigation} />
      
      {/* 固定ヘッダーセクション（常に表示） */}
      <View style={styles.fixedHeaderSection}>
        <Text style={styles.sectionTitle}>ブロックしたサークル</Text>
        <Text style={styles.sectionDescription}>
          ブロックしたサークルは、検索結果・ホーム画面・マイページから非表示になります
        </Text>
      </View>
      
      {blockedCircles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>ブロックしたサークルはありません</Text>
          <Text style={styles.emptyDescription}>
            サークルをブロックすると、ここで管理できます
          </Text>
        </View>
      ) : (
        /* スクロール可能なサークルリスト */
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {blockedCircles.map(renderBlockedCircle)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: -120,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  headerSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  fixedHeaderSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  circleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  circleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  blockDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  unblockButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
