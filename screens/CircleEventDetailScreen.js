import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';

const { width } = Dimensions.get('window');

export default function CircleEventDetailScreen({ route, navigation }) {
  const { event, circleName } = route.params;

  if (!event) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="イベント詳細" 
          showBackButton 
          onBack={() => navigation.goBack()} 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>イベント情報が見つかりません</Text>
        </View>
      </View>
    );
  }

  // 日付フォーマット関数
  const formatEventDate = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  // 申し込みボタン押下時の処理
  const handleApplicationPress = () => {
    if (!event.snsLink) {
      Alert.alert('エラー', 'SNSリンクが設定されていません');
      return;
    }

    // URL形式チェック
    if (!event.snsLink.startsWith('http://') && !event.snsLink.startsWith('https://')) {
      Alert.alert('エラー', '無効なリンクです');
      return;
    }

    // 外部リンクを開く
    Linking.openURL(event.snsLink).catch((err) => {
      console.error('Failed to open URL:', err);
      Alert.alert('エラー', 'リンクを開けませんでした');
    });
  };

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="イベント詳細" 
        showBackButton 
        onBack={() => navigation.goBack()} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* イベント画像 */}
        {event.image && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: event.image }} 
              style={styles.eventImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* イベント情報セクション */}
        <View style={styles.infoSection}>
          {/* タイトル */}
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.divider} />

          {/* 開催日時 */}
          {event.eventDate && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={24} color="#007bff" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>開催日時</Text>
                <Text style={styles.infoValue}>{formatEventDate(event.eventDate)}</Text>
              </View>
            </View>
          )}

          {/* 開催場所 */}
          {event.location && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location-outline" size={24} color="#28a745" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>開催場所</Text>
                <Text style={styles.infoValue}>{event.location}</Text>
              </View>
            </View>
          )}

          {/* 参加費 */}
          {event.fee && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="cash-outline" size={24} color="#ffc107" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>参加費</Text>
                <Text style={styles.infoValue}>{event.fee}</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* 詳細説明 */}
          {event.detail && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>詳細</Text>
              <Text style={styles.detailText}>{event.detail}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 申し込みボタン */}
      {event.snsLink && (
        <View style={styles.buttonContainer}>
          <KurukatsuButton
            title="申し込む"
            onPress={handleApplicationPress}
            size="large"
            variant="primary"
            hapticFeedback={true}
            style={styles.applicationButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#e0e0e0',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    lineHeight: 32,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoIconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  detailSection: {
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  buttonContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  applicationButton: {
    width: '100%',
  },
});

