import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Dimensions } from 'react-native';
import { Image } from 'expo-image';
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
        <View style={styles.contentSection}>
          {/* タイトル */}
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* 開催日 */}
          {event.eventDate && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>開催日</Text>
              <Text style={styles.sectionValue}>{formatEventDate(event.eventDate)}</Text>
            </View>
          )}

          {/* 開催場所 */}
          {event.location && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>開催場所</Text>
              <Text style={styles.sectionValue}>{event.location}</Text>
            </View>
          )}

          {/* 参加費 */}
          {event.fee && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>参加費</Text>
              <Text style={styles.sectionValue}>{event.fee}</Text>
            </View>
          )}

          {/* 詳細説明 */}
          {event.detail && (
            <View style={styles.infoSection}>
              <Text style={styles.detailLabel}>詳細</Text>
              <Text style={styles.detailText}>{event.detail}</Text>
            </View>
          )}

          {/* 申し込みボタン */}
          {event.snsLink && (
            <View style={styles.buttonContainer}>
              <KurukatsuButton
                title="申し込む"
                onPress={handleApplicationPress}
                size="medium"
                variant="primary"
                hapticFeedback={true}
                style={styles.applicationButton}
              />
            </View>
          )}
        </View>
      </ScrollView>
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
    marginBottom: 24,
  },
  contentSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: -20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  sectionValue: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginTop: 12,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    lineHeight: 32,
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: -20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginTop: 12,
  },
  buttonContainer: {
    marginTop: 24,
  },
  applicationButton: {
    width: '100%',
  },
});

