import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import CommonHeader from '../components/CommonHeader';
import ThreadCard from '../components/ThreadCard';
import CategoryTabBar from '../components/CategoryTabBar';
import KurukatsuButton from '../components/KurukatsuButton';

const ThreadListScreen = ({ navigation }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [sortBy, setSortBy] = useState('updated'); // 'created' or 'updated'
  const [showHelpModal, setShowHelpModal] = useState(false);

  // カテゴリ一覧
  const categories = [
    { label: 'すべて', value: 'すべて' },
    { label: 'サークル', value: 'サークル' },
    { label: '就活', value: '就活' },
    { label: '学業', value: '学業' },
    { label: '人間関係', value: '人間関係' },
    { label: '雑談', value: '雑談' },
    { label: 'その他', value: 'その他' }
  ];

  // スレッド一覧を取得
  const fetchThreads = async () => {
    try {
      setLoading(true);
      
      let threadsQuery;
      
      // 投稿数の多い順の場合は特別な処理
      if (sortBy === 'posts') {
        threadsQuery = query(
          collection(db, 'threads'),
          orderBy('postCount', 'desc'),
          limit(50)
        );
        
        // カテゴリフィルタ
        if (selectedCategory !== 'すべて') {
          threadsQuery = query(
            collection(db, 'threads'),
            where('category', '==', selectedCategory),
            orderBy('postCount', 'desc'),
            limit(50)
          );
        }
      } else {
        // 通常の並び替え（作成日時または更新日時）
        threadsQuery = query(
          collection(db, 'threads'),
          orderBy(sortBy === 'created' ? 'createdAt' : 'updatedAt', 'desc'),
          limit(50)
        );

        // カテゴリフィルタ
        if (selectedCategory !== 'すべて') {
          threadsQuery = query(
            collection(db, 'threads'),
            where('category', '==', selectedCategory),
            orderBy(sortBy === 'created' ? 'createdAt' : 'updatedAt', 'desc'),
            limit(50)
          );
        }
      }

      const snapshot = await getDocs(threadsQuery);
      const threadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setThreads(threadsData);
    } catch (error) {
      console.error('スレッド取得エラー:', error);
      Alert.alert('エラー', 'スレッドの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 検索フィルタリング
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) {
      return threads;
    }

    return threads.filter(thread =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [threads, searchQuery]);

  // 初回読み込み
  useEffect(() => {
    fetchThreads();
  }, [selectedCategory, sortBy]);

  // プルトゥリフレッシュ
  const onRefresh = () => {
    setRefreshing(true);
    fetchThreads();
  };

  // スレッド作成画面へ遷移
  const handleCreateThread = () => {
    navigation.navigate('ThreadCreate');
  };

  // スレッド詳細画面へ遷移
  const handleThreadPress = (thread) => {
    navigation.navigate('ThreadDetail', { threadId: thread.id });
  };

  // ソート切り替え
  const handleSortChange = () => {
    Alert.alert(
      '並び順を選択',
      'スレッドの並び順を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '新着順（作成日時）', 
          onPress: () => setSortBy('created')
        },
        { 
          text: '更新順（最終更新）', 
          onPress: () => setSortBy('updated')
        },
        { 
          text: '投稿数の多い順', 
          onPress: () => setSortBy('posts')
        }
      ]
    );
  };

  // スレッドカードのレンダリング
  const renderThreadCard = ({ item }) => (
    <ThreadCard
      thread={item}
      onPress={() => handleThreadPress(item)}
    />
  );

  // 空の状態のレンダリング
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>スレッドがありません</Text>
      <Text style={styles.emptySubtitle}>
        {selectedCategory === 'すべて' 
          ? 'まだスレッドが作成されていません'
          : `${selectedCategory}カテゴリのスレッドがありません`
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <CommonHeader
        title="掲示板"
        rightButton={
          <TouchableOpacity onPress={() => setShowHelpModal(true)}>
            <Ionicons name="help-circle-outline" size={24} color="#007bff" />
          </TouchableOpacity>
        }
      />
      
      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="スレッドを検索..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity onPress={handleSortChange} style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* カテゴリータブ */}
      <CategoryTabBar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* スレッド一覧 */}
      <FlatList
        data={filteredThreads}
        renderItem={renderThreadCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading || refreshing}
            onRefresh={onRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* FABボタン */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateThread}
        activeOpacity={1}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ヘルプモーダル */}
      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.helpModal}>
            <Text style={styles.helpModalTitle}>掲示板の使い方</Text>
            <Text style={styles.helpModalText}>
              掲示板では、大学生活に関する様々なトピックについて議論できます。
            </Text>
            <Text style={styles.helpModalSubtitle}>機能について</Text>
            <Text style={styles.helpModalText}>
              • カテゴリ別にスレッドを分類して表示{'\n'}
              • 検索機能でスレッドを探す{'\n'}
              • 並び順を変更（新着順、更新順、投稿数順）{'\n'}
              • 匿名投稿と公開投稿を選択可能{'\n'}
              • いいねや通報機能
            </Text>
            <Text style={styles.helpModalSubtitle}>投稿について</Text>
            <Text style={styles.helpModalText}>
              • 右下の「+」ボタンからスレッドを作成{'\n'}
              • 匿名投稿の場合は「匿名ユーザー」として表示{'\n'}
              • 公開投稿の場合はプロフィール情報が表示
            </Text>
            <KurukatsuButton
              title="閉じる"
              onPress={() => setShowHelpModal(false)}
              size="medium"
              variant="secondary"
              hapticFeedback={true}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1F2937',
  },
  sortButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  listContainer: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // ヘルプモーダルのスタイル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  helpModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpModalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  helpModalText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default ThreadListScreen;
