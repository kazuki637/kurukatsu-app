import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import CommonHeader from '../components/CommonHeader';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <CommonHeader 
        title="プライバシーポリシー" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.mainTitle}>Privacy Policy</Text>
            <Text style={styles.subtitle}>個人情報保護方針</Text>
            
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>制定年月日: 2025年8月16日</Text>
              <Text style={styles.metadataText}>最終改正年月日: 2025年8月16日</Text>
              <Text style={styles.metadataText}>クルカツ運営者 組嶽和樹</Text>
            </View>

            <Text style={styles.sectionTitle}>基本方針</Text>
            <Text style={styles.paragraph}>
              「クルカツ」（以下「本サービス」といいます。）の運営者である組嶽和樹（以下「運営者」といいます。）は、本サービスにおける利用者の個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第1条（収集する情報）</Text>
            <Text style={styles.paragraph}>
              運営者は、利用者が本サービスを利用するにあたり、以下の情報を取得することがあります。
            </Text>
            <Text style={styles.subSectionTitle}>1. 登録情報</Text>
            <Text style={styles.paragraph}>
              • 氏名、メールアドレス、パスワード、所属大学、学部・学年
            </Text>
            <Text style={styles.paragraph}>
              • 学生証画像（本人確認のため）
            </Text>
            <Text style={styles.subSectionTitle}>2. サークル情報</Text>
            <Text style={styles.paragraph}>
              • サークル名、活動内容、代表者・メンバーに関する情報
            </Text>
            <Text style={styles.subSectionTitle}>3. 利用状況に関する情報</Text>
            <Text style={styles.paragraph}>
              • アプリの利用履歴、アクセスログ、端末情報、Cookie等の識別子
            </Text>
            <Text style={styles.subSectionTitle}>4. その他</Text>
            <Text style={styles.paragraph}>
              その他、利用者が入力または送信する情報
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第2条（利用目的）</Text>
            <Text style={styles.paragraph}>
              運営者は、取得した情報を以下の目的のために利用します。
            </Text>
            <Text style={styles.paragraph}>
              1. 本サービスの提供・運営
            </Text>
            <Text style={styles.paragraph}>
              2. 利用者本人確認、なりすまし防止、不正利用の防止
            </Text>
            <Text style={styles.paragraph}>
              3. サークル検索・管理等、本サービスの機能提供
            </Text>
            <Text style={styles.paragraph}>
              4. 本サービスに関する問い合わせ対応、サポートのため
            </Text>
            <Text style={styles.paragraph}>
              5. 本サービスの改善、新機能・キャンペーン等の案内
            </Text>
            <Text style={styles.paragraph}>
              6. 利用状況の分析
            </Text>
            <Text style={styles.paragraph}>
              7. 法令または規約に基づく対応
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第3条（第三者提供・委託）</Text>
            <Text style={styles.paragraph}>
              1. 運営者は、以下の場合を除き、利用者の同意なく個人情報を第三者に提供しません。
            </Text>
            <Text style={styles.paragraph}>
              • 法令に基づく場合
            </Text>
            <Text style={styles.paragraph}>
              • 利用者の同意がある場合
            </Text>
            <Text style={styles.paragraph}>
              • 人命・財産保護のために必要で、本人の同意取得が困難な場合
            </Text>
            <Text style={styles.paragraph}>
              2. 運営者は、本サービス運営のため、個人情報の取扱いを外部に委託することがあります。
            </Text>
            <Text style={styles.paragraph}>
              • 例：Firebase（Google LLC）
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第4条（安全管理措置）</Text>
            <Text style={styles.paragraph}>
              運営者は、個人情報への不正アクセス、漏洩、滅失、毀損を防止するため、適切な安全管理措置を講じます。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第5条（利用者の権利）</Text>
            <Text style={styles.paragraph}>
              利用者は、運営者が保有する自身の個人情報について、開示・訂正・追加・削除・利用停止を求めることができます。具体的な手続きは、第7条に定める窓口までお問い合わせください。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第6条（プライバシーポリシーの変更）</Text>
            <Text style={styles.paragraph}>
              運営者は、必要に応じて本ポリシーを改定することがあります。改定後は、本サービス上に掲示した時点から効力を生じるものとします。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第7条（お問い合わせ窓口）</Text>
            <Text style={styles.paragraph}>
              本ポリシーに関するお問い合わせは、以下の窓口までお願いいたします。
            </Text>
            <Text style={styles.paragraph}>
              • 運営者名：組嶽 和樹
            </Text>
            <Text style={styles.paragraph}>
              • E-mail：kurukatsu.app@gmail.com
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // 背景色を追加
  },
  contentSafeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  metadata: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 14,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#444',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
    color: '#555',
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#555',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
});