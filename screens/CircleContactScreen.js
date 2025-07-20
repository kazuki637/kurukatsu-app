import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';

export default function CircleContactScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const messagesRef = collection(db, 'circles', circleId, 'messages');
        const snapshot = await getDocs(messagesRef);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // 日付順にソート
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMessages(list);
      } catch (e) {
        Alert.alert('エラー', 'メッセージの取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [circleId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      const messagesRef = collection(db, 'circles', circleId, 'messages');
      await addDoc(messagesRef, {
        text: newMessage,
        createdAt: serverTimestamp(),
      });
      setMessages(prev => [
        { text: newMessage, createdAt: { seconds: Date.now() / 1000 } },
        ...prev
      ]);
      setNewMessage('');
    } catch (e) {
      Alert.alert('エラー', 'メッセージの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1 }}>
        <CommonHeader title="サークル連絡先" />
        <FlatList
          data={messages}
          keyExtractor={(item, idx) => item.id || idx.toString()}
          renderItem={({ item }) => (
            <View style={styles.messageItem}>
              <Ionicons name="mail-outline" size={28} color="#007bff" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.messageDate}>{item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString('ja-JP') : ''}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>メッセージがありません</Text>}
          contentContainerStyle={{ padding: 20 }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="メッセージを入力..."
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  messageItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, marginBottom: 14 },
  messageText: { fontSize: 15, color: '#333' },
  messageDate: { fontSize: 12, color: '#888', marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', marginRight: 10 },
  sendButton: { backgroundColor: '#007bff', borderRadius: 8, padding: 10 },
}); 