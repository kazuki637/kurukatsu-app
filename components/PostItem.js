import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const PostItem = ({ 
  post, 
  onReport,
  onReaction,
  currentUserId,
  isLiked = false,
  style,
  onUserPress,
  onReply,
  replyToPostNumber,
  onReplyTargetPress,
  userProfile,
  isLastPost = false,
}) => {
  const {
    postNumber,
    isAnonymous,
    anonymousId,
    content,
    createdAt,
    reactions,
    userId,
  } = post;

  // 日時のフォーマット
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'たった今';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // いいねボタンの処理
  const handleReaction = () => {
    if (onReaction) {
      onReaction(post, isLiked);
    }
  };

  // 通報ボタンの処理
  const handleReport = () => {
    Alert.alert(
      '投稿を通報',
      'この投稿を通報しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '通報', style: 'destructive', onPress: () => onReport && onReport(post) }
      ]
    );
  };

  // 返信ボタンの処理
  const handleReply = () => {
    if (onReply) {
      onReply(post);
    }
  };

  // 投稿者名の表示
  const getDisplayName = () => {
    if (isAnonymous) {
      return '匿名ユーザー';
    }
    return (userProfile?.name) || 'ユーザー';
  };

  return (
    <View style={[
      styles.container, 
      style,
      postNumber === 1 && styles.firstPostContainer,
      isLastPost && styles.lastPostContainer
    ]}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={[
            styles.postNumberContainer,
            postNumber === 1 && styles.firstPostNumberContainer
          ]}>
            <Text style={[
              styles.postNumber,
              postNumber === 1 && styles.firstPostNumber
            ]}>#{postNumber}</Text>
          </View>
          <Text style={styles.timeText}>
            {formatDate(createdAt)}
          </Text>
        </View>
        
        <View style={styles.rightActions}>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={handleReaction}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={isLiked ? "#EF4444" : "#6B7280"} 
            />
            <Text style={[
              styles.headerActionText,
              isLiked && styles.likedText
            ]}>
              {reactions}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.replyButton}
            onPress={handleReply}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={16} 
              color="#6B7280" 
            />
            <Text style={styles.headerActionText}>
              返信
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={handleReport}
          >
            <Ionicons 
              name="flag-outline" 
              size={16} 
              color="#6B7280" 
            />
            <Text style={styles.headerActionText}>
              通報
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => !isAnonymous && onUserPress && onUserPress(post)}
          activeOpacity={isAnonymous ? 1.0 : 0.7}
          disabled={isAnonymous}
        >
          {!isAnonymous && userProfile?.profileImageUrl ? (
            <Image
              source={{ uri: userProfile.profileImageUrl }}
              style={styles.profileImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.anonymousIconContainer}>
              <Ionicons 
                name="person-circle-outline" 
                size={52} 
                color="#6B7280" 
              />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {getDisplayName()}
            </Text>
            {!isAnonymous && (userProfile?.university || userProfile?.grade) ? (
              <Text style={styles.userMeta}>
                {[userProfile?.university, userProfile?.grade].filter(Boolean).join(' ')}
              </Text>
            ) : isAnonymous && anonymousId ? (
              <Text style={styles.userMeta}>
                ID: {anonymousId}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {replyToPostNumber && (
          <TouchableOpacity 
            style={styles.replyTargetContainer}
            onPress={() => onReplyTargetPress && onReplyTargetPress(replyToPostNumber)}
            activeOpacity={0.7}
          >
            <Text style={styles.replyTargetText}>
              {'>>'}#{replyToPostNumber}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.content}>
          {content}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postNumberContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  postNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  headerActionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  contentContainer: {
    marginBottom: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  anonymousIconContainer: {
    width: 48,
    height: 48,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  userMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1F2937',
    marginBottom: 0,
  },
  likedText: {
    color: '#EF4444',
  },
  // #1投稿用の特別なスタイル
  firstPostContainer: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 4,
    borderLeftColor: '#1380ec',
  },
  firstPostNumberContainer: {
    backgroundColor: '#1380ec',
  },
  firstPostNumber: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  replyTargetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  replyTargetText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  lastPostContainer: {
    borderBottomWidth: 0,
  },
});

export default PostItem;
