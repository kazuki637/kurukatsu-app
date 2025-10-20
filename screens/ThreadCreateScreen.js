import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, storage } from '../firebaseConfig';
import CommonHeader from '../components/CommonHeader';
import PostModeToggle from '../components/PostModeToggle';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import KurukatsuButton from '../components/KurukatsuButton';
import anonymousIdManager from '../utils/anonymousIdGenerator';

const ThreadCreateScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('サークル');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // カテゴリ一覧
  const categories = [
    'サークル',
    '就活',
    '学業',
    '人間関係',
    '雑談',
    'その他'
  ];



  // スレッド作成ボタン押下
  const handleCreateThread = () => {
    // バリデーション
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (title.length > 50) {
      Alert.alert('エラー', 'タイトルは50文字以内で入力してください');
      return;
    }
    if (!content.trim()) {
      Alert.alert('エラー', '本文を入力してください');
      return;
    }
    if (content.length > 1000) {
      Alert.alert('エラー', '本文は1000文字以内で入力してください');
      return;
    }

    // 確認モーダルを表示
    setConfirmModalVisible(true);
  };

  // スレッド作成処理
  const createThread = async () => {
    try {
      setConfirmModalVisible(false);
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      let imageUrl = null;

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
      console.log('ThreadCreate - User profile fetched:', userProfile);
      console.log('ThreadCreate - Is anonymous:', isAnonymous);

      // スレッド作成
      const threadData = {
        title: title.trim(),
        category,
        creatorId: user.uid,
        creatorName: isAnonymous ? '匿名ユーザー' : (userProfile?.name || user.displayName || 'ユーザー'),
        isAnonymous,
        content: content.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        postCount: 1,
        viewCount: 0,
        // 公開投稿の場合、作成者の詳細情報を追加
        ...(userProfile && !isAnonymous && {
          creatorProfileImageUrl: userProfile.profileImageUrl,
          creatorUniversity: userProfile.university,
          creatorGrade: userProfile.grade
        })
      };

      const threadRef = await addDoc(collection(db, 'threads'), threadData);

      // 最初の投稿を作成
      const postData = {
        postNumber: 1,
        userId: user.uid,
        userName: isAnonymous ? '匿名ユーザー' : (userProfile?.name || user.displayName || 'ユーザー'),
        isAnonymous,
        anonymousId: isAnonymous ? anonymousIdManager.getOrCreateAnonymousId(user.uid, threadRef.id) : null,
        content: content.trim(),
        createdAt: serverTimestamp(),
        reactions: 0,
        // 公開投稿の場合、ユーザーの詳細情報を追加
        ...(userProfile && !isAnonymous && {
          userProfileImageUrl: userProfile.profileImageUrl,
          userUniversity: userProfile.university,
          userGrade: userProfile.grade
        })
      };

      await addDoc(collection(db, 'threads', threadRef.id, 'posts'), postData);

      // 作成者の投稿形式をuserThreadSettingsに保存
      await setDoc(doc(db, 'userThreadSettings', user.uid, 'threads', threadRef.id), {
        isAnonymous,
        createdAt: serverTimestamp()
      });

      // スレッドリスト画面に戻る
      navigation.goBack();

    } catch (error) {
      console.error('スレッド作成エラー:', error);
      Alert.alert('エラー', 'スレッドの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <CommonHeader
        title="スレッド作成"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={{ height: 16 }} />
          
          {/* フォームフィールド */}
          <View style={styles.formSection}>
            <View style={styles.section}>
              <Text style={styles.label}>カテゴリ</Text>
              <View style={styles.selectRow}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.selectButton, category === cat && styles.selectedButton]} 
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.selectButtonText, category === cat && styles.selectedButtonText]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          {/* タイトル入力 */}
          <View style={styles.section}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="スレッドのタイトルを入力してください"
              placeholderTextColor="#a1a1aa"
              maxLength={50}
            />
            <Text style={styles.charCount}>{title.length}/50</Text>
          </View>

          {/* 本文入力 */}
          <View style={styles.section}>
            <Text style={styles.label}>本文</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="スレッドの内容を入力してください"
              placeholderTextColor="#a1a1aa"
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{content.length}/1000</Text>
          </View>


            {/* 投稿形式選択 */}
            <View style={styles.section}>
              <Text style={styles.label}>投稿形式</Text>
              <PostModeToggle
                isAnonymous={isAnonymous}
                onToggle={setIsAnonymous}
              />
            </View>
          </View>

          {/* 作成ボタン */}
          <KurukatsuButton
            title="スレッドを作成"
            onPress={handleCreateThread}
            loading={loading}
            disabled={loading || !title.trim() || !content.trim()}
            size="medium"
            variant="primary"
            hapticFeedback={true}
            style={styles.createButtonContainer}
          />
          
          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 確認モーダル */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="create-outline" size={40} color="#1380ec" />
            </View>
            <Text style={styles.modalTitle}>スレッドを作成</Text>
            <Text style={styles.modalSubtitle}>
              このスレッドは{isAnonymous ? '匿名' : '公開'}プロフィールで投稿されます。よろしいですか？
            </Text>
            <View style={styles.modalButtons}>
              <KurukatsuButton
                title="キャンセル"
                onPress={() => setConfirmModalVisible(false)}
                size="medium"
                variant="secondary"
                hapticFeedback={true}
                style={styles.modalCancelButtonContainer}
              />
              <KurukatsuButton
                title="作成"
                onPress={createThread}
                size="medium"
                variant="primary"
                backgroundColor="#1380ec"
                hapticFeedback={true}
                style={styles.modalCreateButtonContainer}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  formSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#18181b',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '400',
    color: '#18181b',
    minHeight: 48,
  },
  contentInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '400',
    color: '#18181b',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'right',
    marginTop: 4,
  },
  createButtonContainer: {
    marginTop: 0,
  },
  optional: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '400',
  },
  // セレクトボタン関連
  selectRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 4 
  },
  selectButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#e4e4e7', 
    marginRight: 8, 
    marginBottom: 8,
    backgroundColor: '#ffffff',
    minHeight: 40,
    justifyContent: 'center',
  },
  selectedButton: { 
    backgroundColor: '#1380ec', 
    borderColor: '#1380ec' 
  },
  selectButtonText: { 
    color: '#71717a', 
    fontSize: 15,
    fontWeight: '400',
  },
  selectedButtonText: { 
    color: '#ffffff', 
    fontWeight: '500' 
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
    maxWidth: 320,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButtonContainer: {
    flex: 1,
    marginRight: 8,
  },
  modalCreateButtonContainer: {
    flex: 1,
    marginLeft: 8,
  },
});

export default ThreadCreateScreen;
