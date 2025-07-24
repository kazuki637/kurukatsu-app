import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FlatList, ActivityIndicator } from 'react-native';

export default function CircleMemberScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [circleName, setCircleName] = useState('メンバー');
  const [tabIndex, setTabIndex] = useState(0);
  const tabs = [
    { key: 'calendar', title: 'カレンダー' },
    { key: 'news', title: '連絡' },
  ];
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    const fetchCircle = async () => {
      if (circleId) {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCircleName(docSnap.data().name || 'メンバー');
        }
      }
    };
    fetchCircle();
  }, [circleId]);

  useEffect(() => {
    if (tabIndex !== 1) return;
    const fetchMessages = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setMessagesLoading(true);
      try {
        const q = query(
          collection(db, 'users', user.uid, 'circleMessages'),
          where('circleId', '==', circleId),
          orderBy('sentAt', 'desc')
        );
        const snap = await getDocs(q);
        setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };
    fetchMessages();
  }, [tabIndex, circleId]);

  // タブ切り替え用
  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return <View style={styles.tabContent}><Text style={styles.text}>カレンダー（ダミー表示）</Text></View>;
      case 1:
        return (
          <View style={[styles.tabContent, { justifyContent: 'flex-start', alignItems: 'stretch', padding: 16 }]}>
            {messagesLoading ? (
              <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />
            ) : messages.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>お知らせはありません</Text>
            ) : (
              <FlatList
                data={messages}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={{ backgroundColor: '#f8f8f8', borderRadius: 10, padding: 14, marginBottom: 14 }}
                    onPress={() => navigation.navigate('CircleMessageDetail', { message: { ...item, userUid: auth.currentUser.uid } })}
                  >
                    {/* 右上：送信日時 */}
                    <View style={{ position: 'absolute', top: 10, right: 14 }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>
                        {item.sentAt && item.sentAt.toDate ? item.sentAt.toDate().toLocaleString('ja-JP') : ''}
                      </Text>
                    </View>
                    {/* 上部：種別＋タイトル（横並び） */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ color: '#007bff', fontSize: 18, fontWeight: 'bold' }}>
                        {item.type === 'attendance' ? '出欠確認' : '通常連絡'}
                      </Text>
                      <View style={{ width: 1.5, height: 24, backgroundColor: '#d0d7de', marginHorizontal: 12, borderRadius: 1 }} />
                      <Text style={{ color: '#222', fontSize: 18, fontWeight: 'bold' }}>
                        {item.title}
                      </Text>
                    </View>
                    {/* 下部：送信者アイコン＋送信者名 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {item.senderProfileImageUrl ? (
                        <Image source={{ uri: item.senderProfileImageUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                      ) : (
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccc', marginRight: 10 }} />
                      )}
                      <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{item.senderName || '不明'}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <CommonHeader title={circleName} />
      <SafeAreaView style={styles.container}>
        {/* タブバー */}
        <View style={styles.tabBar}>
          {tabs.map((tab, i) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, tabIndex === i && styles.tabItemActive]}
              onPress={() => setTabIndex(i)}
            >
              <Text style={[styles.tabText, tabIndex === i && styles.tabTextActive]}>{tab.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* タブ内容 */}
        {renderTabContent()}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
}); 