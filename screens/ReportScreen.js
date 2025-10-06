import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';

const ReportScreen = ({ route, navigation }) => {
  const { circleId, circleName } = route.params;
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  // 報告理由のカテゴリ
  const reportReasons = [
    { id: 'inappropriate_content', label: '不適切な内容', icon: 'warning-outline' },
    { id: 'spam_fraud', label: 'スパム・詐欺', icon: 'shield-outline' },
    { id: 'harassment', label: 'ハラスメント・いじめ', icon: 'person-remove-outline' },
    { id: 'violence_threat', label: '暴力・脅迫', icon: 'alert-circle-outline' },
    { id: 'sexual_content', label: '性的な内容', icon: 'eye-off-outline' },
    { id: 'discrimination', label: '差別・偏見', icon: 'close-circle-outline' },
    { id: 'copyright', label: '著作権侵害', icon: 'document-outline' },
    { id: 'other', label: 'その他', icon: 'ellipsis-horizontal' }
  ];

  // 報告理由の選択
  const handleReasonSelect = (reasonId) => {
    setSelectedReason(reasonId);
  };

  // 報告の送信
  const handleSubmitReport = async () => {
    if (!selectedReason) {
      Alert.alert('エラー', '報告理由を選択してください。');
      return;
    }

    if (!details.trim()) {
      Alert.alert('エラー', '詳細説明は必須です。');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('エラー', 'ログインが必要です。');
        return;
      }

      // 報告データを作成
      const reportData = {
        circleId,
        circleName,
        reporterId: currentUser.uid,
        reporterEmail: currentUser.email,
        reportReason: selectedReason,
        reportDetails: details.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        reviewedAt: null,
        resolvedAt: null,
        adminNotes: ''
      };

      // Firestoreに保存
      await addDoc(collection(db, 'reports'), reportData);

      Alert.alert(
        '報告完了', 
        '報告を受け付けました。ご協力ありがとうございます。',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('エラー', '報告の送信に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      <CommonHeader 
        title="サークルを報告" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      
      <SafeAreaView style={styles.contentSafeArea}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            contentInsetAdjustmentBehavior="automatic"
          >


          {/* 報告理由の選択 */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>報告理由を選択してください</Text>
            <View style={styles.reasonGrid}>
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason.id && styles.reasonItemSelected
                  ]}
                  onPress={() => handleReasonSelect(reason.id)}
                >
                  <Ionicons 
                    name={reason.icon} 
                    size={24} 
                    color={selectedReason === reason.id ? '#fff' : '#666'} 
                  />
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason.id && styles.reasonTextSelected
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 詳細説明の入力 */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>詳細説明<Text style={styles.required}>（必須）</Text></Text>
            <Text style={styles.sectionSubtitle}>
              より具体的な問題や状況を教えてください
            </Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="問題の詳細を入力してください..."
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>



          {/* 報告送信ボタン */}
          <KurukatsuButton
            title="報告する"
            onPress={handleSubmitReport}
            variant="primary"
            size="medium"
            disabled={!selectedReason || !details.trim() || loading}
            loading={loading}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentSafeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  required: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reasonItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reasonItemSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#fff',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#fff',
  },
});

export default ReportScreen;
