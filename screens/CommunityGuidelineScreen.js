import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';

const CommunityGuidelineScreen = ({ navigation, onAgree }) => {
  const handleAgree = () => {
    if (onAgree) {
      onAgree();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="コミュニティガイドライン"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <SafeAreaView style={styles.contentSafeArea}>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="people" size={48} color="#007bff" />
          <Text style={styles.title}>クルカツ掲示板へようこそ</Text>
          <Text style={styles.subtitle}>
            みんなが気持ちよく使える掲示板にするために、以下のルールを守ってご利用ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 基本ルール</Text>
          <View style={styles.ruleList}>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>1</Text>
              <Text style={styles.ruleText}>
                他のユーザーを尊重し、礼儀正しいコミュニケーションを心がけてください
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>2</Text>
              <Text style={styles.ruleText}>
                個人情報（本名、住所、電話番号など）は投稿しないでください
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>3</Text>
              <Text style={styles.ruleText}>
                スパムや宣伝目的の投稿は禁止です
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>4</Text>
              <Text style={styles.ruleText}>
                不適切な画像や動画の投稿は禁止です
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚫 禁止事項</Text>
          <View style={styles.prohibitionList}>
            <View style={styles.prohibitionItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.prohibitionText}>
                誹謗中傷、いじめ、差別的な発言
              </Text>
            </View>
            <View style={styles.prohibitionItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.prohibitionText}>
                性的な内容や不適切な表現
              </Text>
            </View>
            <View style={styles.prohibitionItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.prohibitionText}>
                著作権侵害や違法なコンテンツの共有
              </Text>
            </View>
            <View style={styles.prohibitionItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.prohibitionText}>
                同じ内容の繰り返し投稿（スパム）
              </Text>
            </View>
            <View style={styles.prohibitionItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.prohibitionText}>
                他のユーザーになりすます行為
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 マナー</Text>
          <View style={styles.mannerList}>
            <View style={styles.mannerItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.mannerText}>
                投稿前に内容を確認し、誤字脱字をチェックしましょう
              </Text>
            </View>
            <View style={styles.mannerItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.mannerText}>
                質問には丁寧に回答し、建設的な議論を心がけましょう
              </Text>
            </View>
            <View style={styles.mannerItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.mannerText}>
                検索機能を活用し、重複するスレッドを作成しないようにしましょう
              </Text>
            </View>
            <View style={styles.mannerItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.mannerText}>
                不適切な投稿を見つけたら通報機能を活用しましょう
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 プライバシーについて</Text>
          <Text style={styles.privacyText}>
            匿名投稿機能をご利用いただけます。匿名投稿では、あなたのプロフィール情報は表示されませんが、
            スレッド内では同じ匿名IDが使用されます。プライバシーを守りながら、安心してご利用ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ 違反時の対応</Text>
          <Text style={styles.violationText}>
            ガイドラインに違反する投稿や行為が発見された場合、以下の対応を行います：
          </Text>
          <View style={styles.violationList}>
            <Text style={styles.violationItem}>• 該当投稿の削除</Text>
            <Text style={styles.violationItem}>• アカウントの一時停止</Text>
            <Text style={styles.violationItem}>• アカウントの永久停止（重大な違反の場合）</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            このガイドラインを理解し、同意いただける場合は「同意する」ボタンを押してください。
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <KurukatsuButton
          title="同意する"
          onPress={handleAgree}
          size="large"
        />
      </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  ruleList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ruleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007bff',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  prohibitionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  prohibitionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prohibitionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 8,
  },
  mannerList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mannerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mannerText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
  },
  violationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  violationList: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  violationItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default CommunityGuidelineScreen;
