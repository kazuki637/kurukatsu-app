import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import CommonHeader from '../components/CommonHeader';

export default function TermsOfServiceScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <CommonHeader 
        title="利用規約" 
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
            <Text style={styles.mainTitle}>利用規約</Text>
            
            <Text style={styles.paragraph}>
              本利用規約（以下「本規約」といいます。）は、「クルカツ」（以下「本サービス」といいます。）の利用条件を定めるものです。本サービスを利用するすべての方（以下「利用者」といいます。）は、本規約に同意の上で本サービスをご利用ください。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第1条（適用）</Text>
            <Text style={styles.paragraph}>
              本規約は、利用者と本サービスの運営者である組嶽和樹（以下「運営者」といいます。）との間の本サービス利用に関わる一切の関係に適用されます。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第2条（利用登録）</Text>
            <Text style={styles.paragraph}>
              1. 利用希望者は、本規約に同意のうえ、運営者の定める方法によって利用登録を申請するものとします。
            </Text>
            <Text style={styles.paragraph}>
              2. 登録情報に虚偽、誤記、漏れがあった場合、利用登録を承認しない、または取り消すことがあります。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第3条（アカウント管理）</Text>
            <Text style={styles.paragraph}>
              1. 利用者は、自己の責任において本サービスのアカウントを管理するものとします。
            </Text>
            <Text style={styles.paragraph}>
              2. アカウント情報の不正使用等により生じた損害について、運営者は一切の責任を負いません。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第4条（禁止事項）</Text>
            <Text style={styles.paragraph}>
              利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。
            </Text>
            <Text style={styles.paragraph}>
              1. 法令または公序良俗に違反する行為
            </Text>
            <Text style={styles.paragraph}>
              2. 虚偽の情報を登録する行為
            </Text>
            <Text style={styles.paragraph}>
              3. 他の利用者や第三者の権利を侵害する行為
            </Text>
            <Text style={styles.paragraph}>
              4. 本サービスの運営を妨害する行為
            </Text>
            <Text style={styles.paragraph}>
              5. 反社会的勢力への関与
            </Text>
            <Text style={styles.paragraph}>
              6. その他、運営者が不適切と判断する行為
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第5条（本サービスの提供の停止等）</Text>
            <Text style={styles.paragraph}>
              1. 運営者は、以下の場合に事前通知なく本サービスの全部または一部の提供を停止または中断できるものとします。
            </Text>
            <Text style={styles.paragraph}>
              • システム保守や障害対応
            </Text>
            <Text style={styles.paragraph}>
              • 火災・停電・地震等の不可抗力
            </Text>
            <Text style={styles.paragraph}>
              • その他、運営者が提供困難と判断した場合
            </Text>
            <Text style={styles.paragraph}>
              2. 運営者は、停止・中断により利用者または第三者が被った損害について、一切の責任を負いません。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第6条（知的財産権）</Text>
            <Text style={styles.paragraph}>
              1. 本サービスに関する知的財産権は、運営者または正当な権利者に帰属します。
            </Text>
            <Text style={styles.paragraph}>
              2. 利用者は、権利者の許諾なくこれらを利用することはできません。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第7条（免責事項）</Text>
            <Text style={styles.paragraph}>
              1. 運営者は、本サービスに関して、利用者間または第三者との間に生じたトラブルについて、一切の責任を負いません。
            </Text>
            <Text style={styles.paragraph}>
              2. 運営者は、本サービスに関して、利用者に生じた損害について、過失がない限り責任を負いません。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第8条（利用停止・登録抹消）</Text>
            <Text style={styles.paragraph}>
              運営者は、利用者が本規約に違反した場合、事前の通知なくアカウントの停止・削除を行うことができます。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第9条（規約の変更）</Text>
            <Text style={styles.paragraph}>
              運営者は、必要と判断した場合には、利用者に通知することなく本規約を変更できるものとします。変更後の規約は、本サービス上に掲示した時点から効力を生じます。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第10条（準拠法・裁判管轄）</Text>
            <Text style={styles.paragraph}>
              1. 本規約の解釈には、日本法を準拠法とします。
            </Text>
            <Text style={styles.paragraph}>
              2. 本サービスに関して紛争が生じた場合、運営者の住所地を管轄する裁判所を専属的合意管轄とします。
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>第11条（お問い合わせ窓口）</Text>
            <Text style={styles.paragraph}>
              本規約に関するお問い合わせは、以下の窓口までお願いいたします。
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
    backgroundColor: '#f2f2f7',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80, // SafeAreaViewの高さを考慮
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
});