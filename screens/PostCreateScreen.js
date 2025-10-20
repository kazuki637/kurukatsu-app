import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db, storage } from '../firebaseConfig';
import PostModeToggle from '../components/PostModeToggle';
import KurukatsuButton from '../components/KurukatsuButton';
import anonymousIdManager from '../utils/anonymousIdGenerator';

const PostCreateScreen = ({ visible, onClose, threadId, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);

  // モーダルが閉じられた時の処理
  const handleClose = () => {
    setContent('');
    setIsAnonymous(false);
    onClose();
  };

  // 投稿作成
  const handleCreatePost = async () => {
    if (!content.trim()) {
      Alert.alert('エラー', '投稿内容を入力してください');
      return;
    }
    if (content.length > 1000) {
      Alert.alert('エラー', '投稿は1000文字以内で入力してください');
      return;
    }

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

      // 投稿作成
      const postData = {
        postNumber: 0, // 実際の投稿番号はサーバーサイドで設定
        userId: user.uid,
        userName: isAnonymous ? '匿名ユーザー' : user.displayName || 'ユーザー',
        isAnonymous,
        anonymousId,
        content: content.trim(),
        createdAt: serverTimestamp(),
        reactions: 0
      };

      const postRef = await addDoc(collection(db, 'threads', threadId, 'posts'), postData);

      // スレッドの投稿数と更新日時を更新
      await updateDoc(doc(db, 'threads', threadId), {
        postCount: serverTimestamp(), // 実際のカウントはサーバーサイドで計算
        updatedAt: serverTimestamp()
      });

      Alert.alert('投稿完了', '投稿が作成されました');
      handleClose();
      
      if (onPostCreated) {
        onPostCreated();
      }

    } catch (error) {
      console.error('投稿作成エラー:', error);
      Alert.alert('エラー', '投稿の作成に失敗しました');
    } finally {
      setPosting(false);
    }
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>投稿作成</Text>
          <TouchableOpacity 
            onPress={handleCreatePost}
            disabled={posting || !content.trim()}
            style={[
              styles.postButton,
              (!content.trim() || posting) && styles.disabledButton
            ]}
          >
            <Text style={[
              styles.postText,
              (!content.trim() || posting) && styles.disabledText
            ]}>
              {posting ? '投稿中...' : '投稿'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* 投稿形式選択 */}
          <PostModeToggle
            isAnonymous={isAnonymous}
            onToggle={setIsAnonymous}
          />


          {/* 本文入力 */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={content}
              onChangeText={setContent}
              placeholder="投稿内容を入力してください..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{content.length}/1000</Text>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  postButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  postText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default PostCreateScreen;
