import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const ThreadCard = ({ 
  thread, 
  onPress, 
  style,
  creatorProfile,
}) => {
  const {
    title,
    category,
    postCount,
    updatedAt,
    isAnonymous,
  } = thread;

  // カテゴリの表示名マッピング
  const categoryNames = {
    'サークル': 'サークル',
    '就活': '就活',
    '学業': '学業',
    '人間関係': '人間関係',
    '雑談': '雑談',
    'その他': 'その他'
  };

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

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>
            {categoryNames[category] || category}
          </Text>
        </View>
        <Text style={styles.timeText}>
          {formatDate(updatedAt)}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      <View style={styles.footer}>
        <View style={styles.creatorContainer}>
          {!isAnonymous && creatorProfile?.profileImageUrl ? (
            <Image
              source={{ uri: creatorProfile.profileImageUrl }}
              style={styles.creatorImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.anonymousIconContainer}>
              <Ionicons 
                name="person-circle-outline" 
                size={32} 
                color="#6B7280" 
              />
            </View>
          )}
          <View style={styles.creatorDetails}>
            <Text style={styles.creatorText}>
              {isAnonymous ? '匿名ユーザー' : (creatorProfile?.name || 'ユーザー')}
            </Text>
            {!isAnonymous && (creatorProfile?.university || creatorProfile?.grade) ? (
              <Text style={styles.creatorMeta}>
                {[creatorProfile?.university, creatorProfile?.grade].filter(Boolean).join(' ')}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.postCountContainer}>
          <Ionicons 
            name="chatbubble-outline" 
            size={16} 
            color="#6B7280" 
          />
          <Text style={styles.postCountText}>
            {postCount || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    backgroundColor: '#1380ec',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  anonymousIconContainer: {
    width: 32,
    height: 32,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorDetails: {
    flex: 1,
  },
  creatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  creatorMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  postCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postCountText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
});

export default ThreadCard;
