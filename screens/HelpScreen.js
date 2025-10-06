import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function HelpScreen({ navigation }) {
  const [subject, setSubject] = useState('');
  const [inquiry, setInquiry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState('');

  // ユーザー名を取得
  useEffect(() => {
    const fetchUserName = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || '');
          }
        } catch (error) {
          console.error('ユーザー名の取得に失敗:', error);
        }
      }
    };

    fetchUserName();
  }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !inquiry.trim()) {
      Alert.alert('エラー', '件名とお問い合わせ内容を入力してください。');
      return;
    }

    // 認証状態を確認
    if (!auth.currentUser) {
      Alert.alert('エラー', 'ログインが必要です。');
      return;
    }

    setIsSubmitting(true);

    try {
      // Firestoreにお問い合わせを保存
      const inquiryData = {
        subject: subject.trim(),
        inquiry: inquiry.trim(),
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: userName || '未設定',
        createdAt: serverTimestamp(),
        status: 'pending' // pending, in_progress, resolved
      };

      await addDoc(collection(db, 'inquiries'), inquiryData);

      Alert.alert(
        '送信完了',
        'お問い合わせを送信しました。2~3営業日以内にご返信いたします。',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('お問い合わせ送信エラー:', error);
      Alert.alert('エラー', 'お問い合わせの送信に失敗しました。しばらく時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="お問い合わせ" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <SafeAreaView style={styles.contentSafeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 件名セクション */}
          <View style={styles.section}>
            <Text style={styles.label}>件名</Text>
            <TextInput
              style={styles.subjectInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="件名を入力してください"
              maxLength={100}
            />
            <Text style={styles.instruction}>
              【必須】 例：○○においてバグが生じた、○○のような機能が欲しい
            </Text>
          </View>

          {/* お問い合わせ内容セクション */}
          <View style={styles.section}>
            <Text style={styles.label}>お問い合わせ内容</Text>
            <TextInput
              style={styles.inquiryInput}
              value={inquiry}
              onChangeText={setInquiry}
              placeholder="お問い合わせ内容を入力してください"
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.instruction}>
              【必須】ご質問やご要望の内容を記入してください。
            </Text>
          </View>

          {/* 注意事項 */}
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>ご注意事項</Text>
            <Text style={styles.notesText}>
              ※お問い合わせから2~3営業日以内に順次ご返信させていただきます。
            </Text>
            <Text style={styles.notesText}>
              ※土・日・祝日にいただいたお問い合わせは翌営業日以降、順次ご対応させていただきます。
            </Text>
            <Text style={styles.notesText}>
              ※ご返信は、クルカツに登録いただいたメールアドレス（{auth.currentUser?.email || '未設定'}）宛に送信いたします。
            </Text>
            <Text style={styles.notesText}>
              【受信許可設定について】「kurukatsu.app@gmail.com」からのメールを受信できるよう、受信許可設定(迷惑メール設定・ドメイン指定受信等)のご確認をお願いいたします。
            </Text>
          </View>

          <View style={{ height: 20 }} />

          {/* 送信ボタン */}
          <KurukatsuButton
            title="送信する"
            onPress={handleSubmit}
            variant="primary"
            size="medium"
            disabled={!subject.trim() || !inquiry.trim() || isSubmitting}
            loading={isSubmitting}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentSafeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subjectInput: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  inquiryInput: {
    height: 150,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    paddingVertical: 10,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  instruction: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  notesSection: {
    marginTop: 20,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});