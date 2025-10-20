import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import CommonHeader from '../components/CommonHeader';
import PostItem from '../components/PostItem';
import KurukatsuButton from '../components/KurukatsuButton';
import anonymousIdManager from '../utils/anonymousIdGenerator';

// 日時フォーマット関数
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ThreadDetailScreen = ({ navigation, route }) => {
  const { threadId } = route.params;
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [postModeFixed, setPostModeFixed] = useState(false);
  const [userThreadMode, setUserThreadMode] = useState(null);
  const [userReactions, setUserReactions] = useState({});
  const [showPostModeModal, setShowPostModeModal] = useState(false);
  const [tempIsAnonymous, setTempIsAnonymous] = useState(false);
  const [replyingToPost, setReplyingToPost] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyModalPost, setReplyModalPost] = useState(null);
  const flatListRef = useRef(null);


  // スレッド情報を取得
  const fetchThread = async () => {
    try {
      const threadDoc = await getDoc(doc(db, 'threads', threadId));
      if (threadDoc.exists()) {
        setThread({ id: threadDoc.id, ...threadDoc.data() });
      } else {
        Alert.alert('エラー', 'スレッドが見つかりません');
        navigation.goBack();
      }
    } catch (error) {
      console.error('スレッド取得エラー:', error);
      Alert.alert('エラー', 'スレッドの取得に失敗しました');
    }
  };

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, 'threads', threadId, 'posts'),
        orderBy('postNumber', 'asc')
      );
      const snapshot = await getDocs(postsQuery);
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    } catch (error) {
      console.error('投稿取得エラー:', error);
      Alert.alert('エラー', '投稿の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ユーザーのスレッド投稿モードを取得
  const fetchUserThreadMode = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userModeDoc = await getDoc(doc(db, 'userThreadSettings', user.uid, 'threads', threadId));
      if (userModeDoc.exists()) {
        const mode = userModeDoc.data();
        setUserThreadMode(mode.isAnonymous);
        setIsAnonymous(mode.isAnonymous);
        setPostModeFixed(true);
      }
    } catch (error) {
      console.error('ユーザーモード取得エラー:', error);
    }
  };

  // ユーザーのいいね状態を取得
  const fetchUserReactions = async () => {
    try {
      const user = auth.currentUser;
      if (!user || posts.length === 0) return;

      const reactionsMap = {};
      for (const post of posts) {
        const reactionDoc = await getDoc(
          doc(db, 'threads', threadId, 'posts', post.id, 'reactions', user.uid)
        );
        reactionsMap[post.id] = reactionDoc.exists();
      }
      setUserReactions(reactionsMap);
    } catch (error) {
      console.error('いいね状態取得エラー:', error);
    }
  };

  // リアルタイム投稿監視
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'threads', threadId, 'posts'),
      orderBy('postNumber', 'asc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });

    return unsubscribe;
  }, [threadId]);

  // 初回読み込み
  useEffect(() => {
    const initialize = async () => {
      await fetchThread();
      await fetchPosts();
      await fetchUserThreadMode();
    };
    initialize();
  }, [threadId]);

  // postsが更新されたらいいね状態も取得
  useEffect(() => {
    if (posts.length > 0) {
      fetchUserReactions();
    }
  }, [posts]);

  // 投稿作成
  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      Alert.alert('エラー', '投稿内容を入力してください');
      return;
    }
    if (newPost.length > 1000) {
      Alert.alert('エラー', '投稿は1000文字以内で入力してください');
      return;
    }

    // 投稿形式が未設定の場合、選択を促す
    if (!postModeFixed) {
      Alert.alert(
        '投稿形式を選択してください',
        '「投稿形式: 未設定」をタップして選択してください',
        [{ text: 'OK' }]
      );
      return;
    }

    // 投稿を実行
    await executePost();
  };

  // 投稿実行処理
  const executePost = async () => {
    try {
      setPosting(true);

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      let imageUrl = null;

      // 匿名ID生成
      let anonymousId = null;
      if (isAnonymous) {
        anonymousId = anonymousIdManager.getOrCreateAnonymousId(user.uid, threadId);
      }

      // ユーザーの詳細情報を取得（公開投稿の場合）
      let userProfile = null;
      if (!isAnonymous) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userProfile = userDoc.data();
          }
        } catch (error) {
          console.error('ユーザー情報取得エラー:', error);
        }
      }

      // デバッグログ追加
      console.log('User profile fetched:', userProfile);
      console.log('Is anonymous:', isAnonymous);

      // 投稿作成
      const postData = {
        postNumber: posts.length + 1,
        userId: user.uid,
        userName: isAnonymous ? '匿名ユーザー' : (userProfile?.name || user.displayName || 'ユーザー'),
        isAnonymous: isAnonymous,
        anonymousId,
        content: newPost.trim(),
        createdAt: serverTimestamp(),
        reactions: 0,
        replyToPostNumber: replyingToPost?.postNumber || null,
        // 公開投稿の場合、ユーザーの詳細情報を追加
        ...(userProfile && !isAnonymous && {
          userProfileImageUrl: userProfile.profileImageUrl,
          userUniversity: userProfile.university,
          userGrade: userProfile.grade
        })
      };

      await addDoc(collection(db, 'threads', threadId, 'posts'), postData);

      // スレッドの投稿数と更新日時を更新
      await updateDoc(doc(db, 'threads', threadId), {
        postCount: posts.length + 1,
        updatedAt: serverTimestamp()
      });

      // 入力フィールドをクリア
      setNewPost('');
      setReplyingToPost(null);

      // 最新の投稿にスクロール
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('投稿作成エラー:', error);
      Alert.alert('エラー', '投稿の作成に失敗しました');
    } finally {
      setPosting(false);
    }
  };

  // いいね処理
  const handleReaction = async (post, isLiked) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const reactionRef = doc(db, 'threads', threadId, 'posts', post.id, 'reactions', user.uid);
      
      if (isLiked) {
        // いいねを削除
        await deleteDoc(reactionRef);
        await updateDoc(doc(db, 'threads', threadId, 'posts', post.id), {
          reactions: post.reactions - 1
        });
        setUserReactions(prev => ({ ...prev, [post.id]: false }));
      } else {
        // いいねを追加
        await setDoc(reactionRef, {
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'threads', threadId, 'posts', post.id), {
          reactions: post.reactions + 1
        });
        setUserReactions(prev => ({ ...prev, [post.id]: true }));
      }
    } catch (error) {
      console.error('いいねエラー:', error);
    }
  };

  // 通報処理
  const handleReport = (post) => {
    Alert.alert(
      '投稿を通報',
      '通報理由を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '不適切な内容', onPress: () => reportPost(post, '不適切な内容') },
        { text: '誹謗中傷', onPress: () => reportPost(post, '誹謗中傷') },
        { text: 'スパム', onPress: () => reportPost(post, 'スパム') },
        { text: 'その他', onPress: () => reportPost(post, 'その他') }
      ]
    );
  };

  // 通報実行
  const reportPost = async (post, reason) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'post_reports'), {
        type: 'post',
        reporterId: user.uid,
        targetId: post.id,
        threadId: threadId,
        reason,
        details: '',
        createdAt: serverTimestamp()
      });

      Alert.alert('通報完了', '投稿を通報しました');
    } catch (error) {
      console.error('通報エラー:', error);
      Alert.alert('エラー', '通報に失敗しました');
    }
  };


  // モーダルで投稿形式を確定
  const handleConfirmPostMode = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      // 投稿形式を固定
      await setDoc(doc(db, 'userThreadSettings', user.uid, 'threads', threadId), {
        isAnonymous: tempIsAnonymous,
        createdAt: serverTimestamp()
      });
      
      setIsAnonymous(tempIsAnonymous);
      setPostModeFixed(true);
      setShowPostModeModal(false);
    } catch (error) {
      console.error('投稿形式設定エラー:', error);
      Alert.alert('エラー', '投稿形式の設定に失敗しました');
    }
  };

  // モーダルをキャンセル
  const handleCancelPostMode = () => {
    setShowPostModeModal(false);
  };

  // ユーザープロフィール画面への遷移
  const handleUserPress = (post) => {
    if (post.isAnonymous) {
      Alert.alert('匿名ユーザー', '匿名ユーザーのプロフィールは表示できません');
      return;
    }
    navigation.navigate('共通', { screen: 'Profile', params: { userId: post.userId } });
  };

  // 返信ボタンの処理
  const handleReply = (post) => {
    setReplyingToPost(post);
  };

  // 返信先投稿の表示
  const handleReplyTargetPress = async (postNumber) => {
    const targetPost = posts.find(p => p.postNumber === postNumber);
    if (targetPost) {
      setReplyModalPost(targetPost);
      setShowReplyModal(true);
    }
  };

  // 投稿アイテムのレンダリング
  const renderPostItem = ({ item }) => (
    <PostItem
      post={item}
      onReaction={handleReaction}
      onReport={handleReport}
      currentUserId={auth.currentUser?.uid}
      isLiked={userReactions[item.id] || false}
      onUserPress={handleUserPress}
      onReply={handleReply}
      replyToPostNumber={item.replyToPostNumber}
      onReplyTargetPress={handleReplyTargetPress}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="スレッド詳細" 
          showBackButton={true}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="スレッド詳細" 
          showBackButton={true}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>スレッドが見つかりません</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="スレッド詳細" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* スレッド情報 */}
        <View style={styles.threadHeader}>
          <View style={styles.threadInfo}>
            <Text style={styles.threadTitle}>{thread.title}</Text>
            <View style={styles.threadMeta}>
              <Text style={styles.categoryText}>{thread.category}</Text>
              <Text style={styles.creatorText}>
                {thread.isAnonymous ? '匿名ユーザー' : thread.creatorName}
              </Text>
            </View>
          </View>
        </View>

        {/* 投稿一覧 */}
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          style={styles.postsList}
          contentContainerStyle={styles.postsContainer}
          showsVerticalScrollIndicator={true}
        />

        {/* 投稿入力フォーム */}
        <View style={styles.inputContainer}>
          {/* First row: Mode + Reply + Image button */}
          <View style={styles.topControlsRow}>
            <TouchableOpacity 
              style={[
                styles.modeSelector,
                postModeFixed && styles.modeSelectorDisabled
              ]}
              onPress={() => !postModeFixed && setShowPostModeModal(true)}
              disabled={postModeFixed}
            >
              <Text style={[
                styles.modeSelectorText,
                postModeFixed && styles.modeSelectorTextDisabled
              ]}>
                投稿形式: {postModeFixed ? (isAnonymous ? '匿名' : '公開') : '未設定'}
              </Text>
            </TouchableOpacity>
            
            <View 
              style={[
                styles.replySelector,
                !replyingToPost && styles.replySelectorDisabled
              ]}
            >
              <Text style={[
                styles.replySelectorText,
                !replyingToPost && styles.replySelectorTextDisabled
              ]}>
                返信先: {replyingToPost ? `#${replyingToPost.postNumber}` : '未設定'}
              </Text>
              {replyingToPost && (
                <TouchableOpacity 
                  onPress={() => setReplyingToPost(null)}
                  style={styles.replySelectorCloseButton}
                >
                  <Ionicons name="close-circle" size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
            
          </View>


          {/* Second row: Input + Post button */}
          <View style={styles.bottomInputRow}>
            <TextInput
              style={styles.compactTextInput}
              value={newPost}
              onChangeText={setNewPost}
              placeholder="投稿を入力..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={styles.compactPostButton}
              onPress={handleCreatePost}
              disabled={posting || !newPost.trim()}
            >
              <Text style={[
                styles.compactPostButtonText,
                (posting || !newPost.trim()) && styles.compactPostButtonTextDisabled
              ]}>
                投稿
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 投稿形式選択モーダル */}
      <Modal
        visible={showPostModeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPostMode}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="create-outline" size={40} color="#007bff" />
            </View>
            <Text style={styles.modalTitle}>投稿形式を選択</Text>
            <Text style={styles.modalSubtitle}>
              投稿形式を選択してください。一度選択すると変更できません。
            </Text>
            
            <View style={styles.modeSelectionContainer}>
              <KurukatsuButton
                title="公開プロフィール"
                onPress={() => setTempIsAnonymous(false)}
                size="medium"
                variant={!tempIsAnonymous ? "primary" : "outline"}
                backgroundColor="#007bff"
                style={styles.modeOptionButton}
                buttonStyle={[
                  styles.modeOptionButtonInner,
                  !tempIsAnonymous && styles.modeOptionButtonSelected
                ]}
                textStyle={[
                  styles.modeOptionButtonText,
                  !tempIsAnonymous && styles.modeOptionButtonTextSelected
                ]}
              >
                <View style={styles.modeOptionContent}>
                  <Ionicons 
                    name="person-outline" 
                    size={24} 
                    color={!tempIsAnonymous ? "#FFFFFF" : "#007bff"} 
                    style={styles.modeOptionIcon}
                  />
                </View>
              </KurukatsuButton>
              
              <KurukatsuButton
                title="匿名投稿"
                onPress={() => setTempIsAnonymous(true)}
                size="medium"
                variant={tempIsAnonymous ? "primary" : "outline"}
                backgroundColor="#007bff"
                style={styles.modeOptionButton}
                buttonStyle={[
                  styles.modeOptionButtonInner,
                  tempIsAnonymous && styles.modeOptionButtonSelected
                ]}
                textStyle={[
                  styles.modeOptionButtonText,
                  tempIsAnonymous && styles.modeOptionButtonTextSelected
                ]}
              >
                <View style={styles.modeOptionContent}>
                  <Ionicons 
                    name="eye-off-outline" 
                    size={24} 
                    color={tempIsAnonymous ? "#FFFFFF" : "#007bff"} 
                    style={styles.modeOptionIcon}
                  />
                </View>
              </KurukatsuButton>
            </View>
            
            <View style={styles.modalButtons}>
              <KurukatsuButton
                title="キャンセル"
                onPress={handleCancelPostMode}
                size="medium"
                variant="secondary"
                style={styles.modalCancelButton}
              />
              <KurukatsuButton
                title="決定"
                onPress={handleConfirmPostMode}
                size="medium"
                variant="primary"
                style={styles.modalConfirmButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 返信先投稿表示モーダル */}
      <Modal
        visible={showReplyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReplyModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReplyModal(false)}
        >
          <View style={styles.replyModalContent}>
            {replyModalPost && (
              <>
                <View style={styles.replyModalHeader}>
                  <View style={styles.replyModalHeaderTop}>
                    <View style={styles.replyModalHeaderInfo}>
                      <Text style={styles.replyModalPostNumber}>
                        #{replyModalPost.postNumber}
                      </Text>
                      <Text style={styles.replyModalUserName}>
                        {replyModalPost.isAnonymous ? '匿名ユーザー' : replyModalPost.userName}
                      </Text>
                      <Text style={styles.replyModalUserMeta}>
                        {replyModalPost.isAnonymous 
                          ? `ID: ${replyModalPost.anonymousId}` 
                          : [replyModalPost.userUniversity, replyModalPost.userGrade].filter(Boolean).join(' ')}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.replyModalCloseButton}
                      onPress={() => setShowReplyModal(false)}
                    >
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.replyModalContentText}>
                  {replyModalPost.content}
                </Text>
                <Text style={styles.replyModalTime}>
                  {formatDate(replyModalPost.createdAt)}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  threadHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  threadInfo: {
    marginBottom: 0,
  },
  threadTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#1380ec',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  creatorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  postsList: {
    flex: 1,
  },
  postsContainer: {
    paddingVertical: 8,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  // モーダルのスタイル
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modeSelectionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  modeOptionSelected: {
    borderColor: '#007bff',
    backgroundColor: '#EFF6FF',
  },
  modeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 12,
  },
  modeOptionTextSelected: {
    color: '#007bff',
  },
  // KurukatsuButton用の新しいスタイル
  modeOptionButton: {
    marginBottom: 12,
  },
  modeOptionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modeOptionButtonSelected: {
    // 選択時の追加スタイル
  },
  modeOptionButtonText: {
    marginLeft: 8,
  },
  modeOptionButtonTextSelected: {
    // 選択時のテキストスタイル
  },
  modeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeOptionIcon: {
    marginRight: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
  },
  modalConfirmButton: {
    flex: 1,
  },
  // 新しいコンパクト投稿フォームのスタイル
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  modeSelector: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  modeSelectorText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  modeSelectorDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  modeSelectorTextDisabled: {
    color: '#9CA3AF',
  },
  replySelector: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 36,
  },
  replySelectorText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
    flex: 1,
  },
  replySelectorIcon: {
    marginLeft: 4,
  },
  replySelectorCloseButton: {
    paddingHorizontal: 4,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replySelectorDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  replySelectorTextDisabled: {
    color: '#9CA3AF',
  },
  bottomInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  compactTextInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 80,
    minHeight: 40,
  },
  compactPostButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  compactPostButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  compactPostButtonTextDisabled: {
    opacity: 0.5,
  },
  // 返信機能のスタイル
  replyModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  replyModalHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  replyModalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  replyModalHeaderInfo: {
    flex: 1,
  },
  replyModalCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  replyModalPostNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  replyModalUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  replyModalUserMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  replyModalContentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  replyModalTime: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
});

export default ThreadDetailScreen;
