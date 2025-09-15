import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { collection as firestoreCollection, query, where, orderBy, getDocs as getDocsFirestore } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationBadge } from '../hooks/useNotificationBadge';

export default function CircleMemberContactScreen({ route, navigation }) {
  const { circleId } = route.params;
  
  const [circleName, setCircleName] = useState('連絡');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [imageErrorMap, setImageErrorMap] = useState({});
  
  // 送信者情報のキャッシュ
  const [senderCache, setSenderCache] = useState({});
  
  // 通知バッジフックを使用
  const { unreadCount: unreadMessageCount } = useNotificationBadge(circleId);
  
  // 各メッセージの未読状態を管理
  const [messageReadStatus, setMessageReadStatus] = useState({});
  
  // 個別メッセージの未読状態更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateMessageReadStatus = (messageId, isRead) => {
      setMessageReadStatus(prev => ({
        ...prev,
        [messageId]: isRead
      }));
    };
    
    return () => {
      delete global.updateMessageReadStatus;
    };
  }, []);

  // 送信者情報を取得する関数
  const getSenderInfo = async (senderUid) => {
    if (senderCache[senderUid]) {
      return senderCache[senderUid];
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', senderUid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const senderInfo = {
          name: userData.name || userData.nickname || '不明',
          profileImageUrl: userData.profileImageUrl || null
        };
        setSenderCache(prev => ({ ...prev, [senderUid]: senderInfo }));
        return senderInfo;
      }
    } catch (error) {
      console.error('Error fetching sender info:', error);
    }
    
    return { name: '不明', profileImageUrl: null };
  };

  // メッセージを既読にする関数
  const markMessageAsRead = async (messageId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const messageRef = doc(db, 'users', user.uid, 'circleMessages', messageId);
      await setDoc(messageRef, { readAt: serverTimestamp() }, { merge: true });
      
      // ローカルのメッセージ状態も更新
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, readAt: new Date() }
            : msg
        )
      );

      // 個別メッセージの未読状態を更新
      if (global.updateMessageReadStatus) {
        global.updateMessageReadStatus(messageId, true);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // 未読メッセージ数はuseNotificationBadgeフックで管理

  useEffect(() => {
    const fetchCircle = async () => {
      if (circleId) {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCircleName(docSnap.data().name || '連絡');
        }
      }
    };
    fetchCircle();
  }, [circleId]);

  // メッセージ取得関数
  const fetchMessages = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'users', user.uid, 'circleMessages'),
        where('circleId', '==', circleId),
        orderBy('sentAt', 'desc')
      );
      const snap = await getDocs(q);
      const messagesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 送信者情報を事前に取得
      const messagesWithSenderInfo = await Promise.all(
        messagesData.map(async (message) => {
          if (message.senderUid) {
            const senderInfo = await getSenderInfo(message.senderUid);
            return {
              ...message,
              senderInfo
            };
          } else {
            // フォールバック: 保存された情報を使用
            return {
              ...message,
              senderInfo: {
                name: message.senderName || '不明',
                profileImageUrl: message.senderProfileImageUrl || null
              }
            };
          }
        })
      );
      
      setMessages(messagesWithSenderInfo);
      
      // 各メッセージの未読状態をローカル状態に保存
      const readStatusMap = {};
      messagesWithSenderInfo.forEach(message => {
        readStatusMap[message.id] = !!message.readAt;
      });
      setMessageReadStatus(readStatusMap);
      
      // イベントベース更新のため、未読数更新は削除
    } catch (e) {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    // データが既に存在する場合はローディングを表示しない
    if (messages.length > 0) {
      setMessagesLoading(false);
      return;
    }
    
    fetchMessages();
  }, [circleId]);

  return (
    <>
      <CommonHeader 
        title={circleName} 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <SafeAreaView style={styles.container}>
        <View style={[styles.tabContent, { justifyContent: 'flex-start', alignItems: 'stretch' }]}>
          {messagesLoading ? (
            <ActivityIndicator size="small" color="#999" style={{ marginTop: 40 }} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>お知らせはありません</Text>
              <Text style={styles.emptySubText}>サークルからの連絡が届くとここに表示されます</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const senderInfo = item.senderInfo;
                const hasImage = senderInfo?.profileImageUrl && senderInfo.profileImageUrl.trim() !== '' && !imageErrorMap[item.id];
                const isAttendance = item.type === 'attendance';
                const isUrgent = item.type === 'attendance' && item.deadline;
                
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.messageCard,
                      isUrgent && styles.urgentMessageCard
                    ]}
                    onPress={() => {
                      const currentUser = auth.currentUser;
                      if (currentUser) {
                        navigation.navigate('CircleMessageDetail', { message: { ...item, userUid: currentUser.uid } });
                      }
                    }}
                  >
                    {/* アイコンと情報の横並びレイアウト */}
                    <View style={styles.messageContentContainer}>
                      {/* アイコン */}
                      <View style={styles.messageIconContainer}>
                        {hasImage ? (
                          <Image
                            source={{ uri: senderInfo.profileImageUrl }}
                            style={styles.messageIcon}
                            onError={() => setImageErrorMap(prev => ({ ...prev, [item.id]: true }))}
                          />
                        ) : (
                          <View style={styles.messageIconPlaceholder}>
                            <Ionicons name="person-outline" size={30} color="#aaa" />
                          </View>
                        )}
                      </View>

                      {/* 送信者氏名とタイトル */}
                      <View style={styles.messageInfoContainer}>
                        <Text style={styles.messageSenderName}>{senderInfo?.name || '不明'}</Text>
                        <Text style={styles.messageTitle} numberOfLines={1} ellipsizeMode="tail">
                          {item.title}
                        </Text>
                        {item.body && (
                          <Text style={styles.messageContentPreview} numberOfLines={1} ellipsizeMode="tail">
                            {item.body.replace(/\n/g, ' ')}
                          </Text>
                        )}
                      </View>
                      
                      {/* 右側の連絡種別と送信日時 */}
                      <View style={styles.messageRightContainer}>
                        {/* 連絡種別バッジ */}
                        <View style={[styles.messageTypeBadge, isAttendance ? styles.attendanceBadge : styles.normalBadge]}>
                          <Ionicons 
                            name={isAttendance ? "calendar-outline" : "chatbubble-outline"} 
                            size={14} 
                            color={isAttendance ? "#fff" : "#007bff"} 
                          />
                          <Text style={[styles.messageTypeText, isAttendance ? styles.attendanceBadgeText : styles.normalBadgeText]}>
                            {isAttendance ? '出欠確認' : '通常連絡'}
                          </Text>
                        </View>
                        
                        <View style={styles.messageMeta}>
                          <Text style={styles.messageDate}>
                            {item.sentAt && item.sentAt.toDate ? 
                              item.sentAt.toDate().toLocaleDateString('ja-JP') : ''
                            }
                          </Text>
                          <Text style={styles.messageTime}>
                            {item.sentAt && item.sentAt.toDate ? 
                              item.sentAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''
                            }
                          </Text>
                        </View>
                        
                        {/* 未読の場合は赤●を表示 */}
                        {!messageReadStatus[item.id] && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                    </View>

                    {/* 出欠確認の期限表示 */}
                    {isAttendance && item.deadline && (
                      <View style={styles.deadlineContainer}>
                        <Ionicons name="time-outline" size={16} color="#ff6b6b" />
                        <Text style={styles.deadlineText}>
                          回答期限: {new Date(item.deadline).toLocaleDateString('ja-JP')}
                        </Text>
                      </View>
                    )}

                    {/* 新着インジケーター */}
                    {item.isNew && (
                      <View style={styles.newIndicator}>
                        <Text style={styles.newIndicatorText}>NEW</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // 連絡タブの新しいUIスタイル
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  urgentMessageCard: {
    backgroundColor: '#fff9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
    paddingLeft: 12,
  },
  messageTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  normalBadge: {
    backgroundColor: '#e3f2fd',
  },
  attendanceBadge: {
    backgroundColor: '#007bff',
  },
  messageTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  normalBadgeText: {
    color: '#007bff',
  },
  attendanceBadgeText: {
    color: '#fff',
  },
  messageContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // 上端揃えに変更
  },
  messageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  messageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  messageIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  messageSenderName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 26,
  },
  messageContentPreview: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    lineHeight: 20,
  },
  messageRightContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    minWidth: 90, // 最小幅を確保
  },
  messageMeta: {
    alignItems: 'flex-end',
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffebeb',
  },
  deadlineText: {
    fontSize: 13,
    color: '#ff6b6b',
    fontWeight: '500',
    marginLeft: 6,
  },
  newIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  newIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // 未読メッセージの赤●
  unreadDot: {
    position: 'absolute',
    top: '50%',
    right: 70, // 時刻の左に配置
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
    marginTop: -4, // 中央揃えのための調整
  },
});
