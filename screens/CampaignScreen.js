import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';

const CampaignScreen = ({ navigation }) => {
  const handleRegisterCircle = () => {
    navigation.navigate('サークル運営', { screen: 'CircleRegistration' });
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="キャンペーン"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* キャンペーン画像 */}
          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/campaign.png')} 
              style={styles.campaignImage}
              contentFit="contain"
            />
          </View>

          {/* キャンペーンタイトル */}
          <View style={styles.header}>
            <Ionicons name="gift" size={48} color="#FF6B35" />
            <Text style={styles.title}>サークル登録でAmazonギフトカード1,000円分が当たる！</Text>
            <Text style={styles.subtitle}>
              新歓シーズンを盛り上げる特別キャンペーンを開催中！
              サークルを登録して、抽選でAmazonギフトカード1,000円分をプレゼント！
            </Text>
          </View>

          {/* 参加条件セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 参加条件</Text>
            <View style={styles.conditionList}>
              <View style={styles.conditionItem}>
                <View style={styles.conditionNumber}>
                  <Text style={styles.conditionNumberText}>1</Text>
                </View>
                <View style={styles.conditionContent}>
                  <Text style={styles.conditionTitle}>サークルを登録</Text>
                  <Text style={styles.conditionDescription}>
                    クルカツにサークルを登録してください
                  </Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <View style={styles.conditionNumber}>
                  <Text style={styles.conditionNumberText}>2</Text>
                </View>
                <View style={styles.conditionContent}>
                  <Text style={styles.conditionTitle}>新歓プロフィールを入力</Text>
                  <Text style={styles.conditionDescription}>
                    必須項目：ヘッダー画像、サークル紹介文を入力してください
                  </Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <View style={styles.conditionNumber}>
                  <Text style={styles.conditionNumberText}>3</Text>
                </View>
                <View style={styles.conditionContent}>
                  <Text style={styles.conditionTitle}>完了</Text>
                  <Text style={styles.conditionDescription}>
                    登録完了後、自動的にキャンペーンに参加できます
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 特典詳細セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 特典詳細</Text>
            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Ionicons name="card" size={32} color="#FF6B35" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Amazonギフトカード 1,000円分</Text>
                <Text style={styles.benefitDescription}>
                  抽選で当選した方にAmazonギフトカード1,000円分をプレゼント！
                  当選者には登録時のメールアドレスに送付いたします。
                </Text>
              </View>
            </View>
          </View>

          {/* 注意事項セクション */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ 注意事項</Text>
            <View style={styles.noticeList}>
              <View style={styles.noticeItem}>
                <Ionicons name="information-circle" size={16} color="#6B7280" />
                <Text style={styles.noticeText}>
                  期間：2025年10月1日〜2026年3月31日
                </Text>
              </View>
              <View style={styles.noticeItem}>
                <Ionicons name="information-circle" size={16} color="#6B7280" />
                <Text style={styles.noticeText}>
                  当選発表：2026年4月
                </Text>
              </View>
              <View style={styles.noticeItem}>
                <Ionicons name="information-circle" size={16} color="#6B7280" />
                <Text style={styles.noticeText}>
                  1サークルにつき1回まで応募可能
                </Text>
              </View>
            </View>
          </View>

          {/* 参加ボタン */}
          <View style={styles.buttonContainer}>
            <KurukatsuButton
              title="サークルを登録して参加する"
              onPress={handleRegisterCircle}
              size="large"
              variant="primary"
              backgroundColor="#FF6B35"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  campaignImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  conditionList: {
    gap: 16,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  conditionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conditionNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  conditionContent: {
    flex: 1,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  conditionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef7f0',
    borderRadius: 8,
    padding: 16,
  },
  benefitIcon: {
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  noticeList: {
    gap: 8,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default CampaignScreen;
