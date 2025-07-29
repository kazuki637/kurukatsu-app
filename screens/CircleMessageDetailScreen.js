import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, FlatList, Dimensions } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { useState } from 'react';
import { Modalize } from 'react-native-modalize';
import { useRef } from 'react';
import { useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { collection, setDoc, doc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';

export default function CircleMessageDetailScreen({ route, navigation }) {
  const { message } = route.params;
  const modalizeRef = useRef(null);
  const [modalType, setModalType] = useState('read'); // 'read' or 'unread'
  const [userList, setUserList] = useState([]); // 表示用ユーザー一覧
  const [userCount, setUserCount] = useState(0);
  const { height } = Dimensions.get('window');
  const SHEET_HEIGHT = height * 0.8;

  // 既読・未読リスト・人数のstate
  const [readUsers, setReadUsers] = useState([]);
  const [unreadUsers, setUnreadUsers] = useState([]);

  // 既読・未読ユーザー取得
  const fetchReadUsers = async () => {
    if (!message.circleId || !message.id) return;
    // 1. サークルメンバー一覧取得
    const membersRef = collection(db, 'circles', message.circleId, 'members');
    const membersSnap = await getDocs(membersRef);
    const memberUids = membersSnap.docs.map(doc => doc.id);
    
    // 2. サークルレベルでの既読情報取得
    const messageId = message.messageId || message.id; // messageIdを優先、なければidを使用
    const readStatusRef = collection(db, 'circles', message.circleId, 'messages', messageId, 'readStatus');
    const readStatusSnap = await getDocs(readStatusRef);
    const readMap = {};
    readStatusSnap.forEach(doc => {
      const d = doc.data();
      readMap[doc.id] = d.readAt ? d.readAt.toDate() : null;
    });
    
    // 3. プロフィール取得
    const users = [];
    for (const uid of memberUids) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const d = userDoc.exists() ? userDoc.data() : {};
      users.push({
        uid,
        name: d.name || d.nickname || '未設定',
        profileImageUrl: d.profileImageUrl || '',
        readAt: readMap[uid] || null,
      });
    }
    // 4. 既読・未読で分割
    const readUsers = users.filter(u => u.readAt);
    const unreadUsers = users.filter(u => !u.readAt);
    return { readUsers, unreadUsers };
  };

  useEffect(() => {
    const registerAndFetch = async () => {
      try {
        // 1. 既読登録（サークルレベル）
        const user = auth.currentUser;
        if (!user) {
          return;
        }
        const messageId = message.messageId || message.id; // messageIdを優先、なければidを使用
        if (!message.circleId || !messageId) {
          return;
        }
        const readStatusRef = doc(db, 'circles', message.circleId, 'messages', messageId, 'readStatus', user.uid);
        const readStatusSnap = await getDoc(readStatusRef);
        if (!readStatusSnap.exists()) {
          await setDoc(readStatusRef, { readAt: serverTimestamp() });
        }
        
        // 2. サークルメンバー一覧取得
        const membersRef = collection(db, 'circles', message.circleId, 'members');
        const membersSnap = await getDocs(membersRef);
        const memberUids = membersSnap.docs.map(doc => doc.id);
        
        // 3. サークルレベルでの既読情報取得
        const readStatusCollectionRef = collection(db, 'circles', message.circleId, 'messages', messageId, 'readStatus');
        const readStatusCollectionSnap = await getDocs(readStatusCollectionRef);
        const readMap = {};
        readStatusCollectionSnap.forEach(doc => {
          const d = doc.data();
          readMap[doc.id] = d.readAt ? d.readAt.toDate() : null;
        });
        
        // 4. プロフィール取得
        const users = [];
        for (const uid of memberUids) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          const d = userDoc.exists() ? userDoc.data() : {};
          users.push({
            uid,
            name: d.name || d.nickname || '未設定',
            profileImageUrl: d.profileImageUrl || '',
            readAt: readMap[uid] || null,
          });
        }
        // 5. 既読・未読で分割
        setReadUsers(users.filter(u => u.readAt));
        setUnreadUsers(users.filter(u => !u.readAt));
      } catch (e) {
        console.error('Error in registerAndFetch:', e);
      }
    };
    registerAndFetch();
  }, [message]);

  // 既読・未読ボタン押下時の処理
  const handleShowSheet = (type) => {
    setModalType(type);
    if (type === 'read') {
      setUserList(readUsers);
      setUserCount(readUsers.length);
    } else {
      setUserList(unreadUsers);
      setUserCount(unreadUsers.length);
    }
    modalizeRef.current?.open();
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="連絡"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* 送信日時（最上部） */}
        <Text style={{ color: '#888', fontSize: 12, alignSelf: 'flex-start', marginBottom: 12 }}>
          {message.sentAt && message.sentAt.toDate ? message.sentAt.toDate().toLocaleString('ja-JP') : ''}
        </Text>
        {/* 上部：種別＋タイトル（横並び） */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#007bff', fontSize: 18, fontWeight: 'bold' }}>
            {message.type === 'attendance' ? '出欠確認' : '通常連絡'}
          </Text>
          <View style={{ width: 1.5, height: 24, backgroundColor: '#d0d7de', marginHorizontal: 12, borderRadius: 1 }} />
          <Text style={{ color: '#222', fontSize: 18, fontWeight: 'bold' }}>{message.title}</Text>
        </View>
        {/* 送信者アイコン＋氏名 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          {message.senderProfileImageUrl ? (
            <Image source={{ uri: message.senderProfileImageUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
          ) : (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccc', marginRight: 10 }} />
          )}
          <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{message.senderName || '不明'}</Text>
        </View>
        {/* 区切り線 */}
        <View style={{ height: 1, backgroundColor: '#e0e0e0', marginBottom: 35 }} />
        {/* メッセージ内容 */}
        <Text style={{ color: '#333', fontSize: 16, marginBottom: 30 }}>{message.body}</Text>
        {message.deadline && (
          <Text style={{ color: '#d9534f', fontSize: 14, marginBottom: 30 }}>回答期限: {new Date(message.deadline).toLocaleDateString('ja-JP')}</Text>
        )}
        {/* 区切り線（既読・未読ボタンの上） */}
        <View style={{ height: 1, backgroundColor: '#e0e0e0', width: '100%', marginBottom: 30 }} />
        {/* 既読・未読ボタン */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 18 }}>
          <TouchableOpacity onPress={() => handleShowSheet('read')} style={{ backgroundColor: '#e6f0fa', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, marginRight: 12, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 16 }}>既読</Text>
            <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 16, marginLeft: 4 }}>({readUsers.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleShowSheet('unread')} style={{ backgroundColor: '#f8e6e6', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#d9534f', fontWeight: 'bold', fontSize: 16 }}>未読</Text>
            <Text style={{ color: '#d9534f', fontWeight: 'bold', fontSize: 16, marginLeft: 4 }}>({unreadUsers.length})</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* 既読・未読ユーザー一覧ボトムシート */}
      <Modalize
        ref={modalizeRef}
        adjustToContentHeight={false}
        modalHeight={SHEET_HEIGHT}
        handleStyle={{ backgroundColor: '#222', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        modalStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#fff' }}
        overlayStyle={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        handlePosition="inside"
        HeaderComponent={
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{modalType === 'read' ? '既読' : '未読'}</Text>
              <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 18 }}>{userCount}人</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#e0e0e0', width: '100%' }} />
          </>
        }
        flatListProps={{
          data: userList,
          keyExtractor: item => item.uid,
          renderItem: ({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingHorizontal: 20 }}>
              <Text style={{ flex: 1, fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: '#888', fontSize: 16, width: 110, textAlign: 'right' }}>{item.readAt ? item.readAt.toLocaleString('ja-JP') : ''}</Text>
            </View>
          ),
          ListEmptyComponent: <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>ユーザーがいません</Text>,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 