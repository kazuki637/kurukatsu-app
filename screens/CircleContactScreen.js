import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, TextInput, Image, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import CommonHeader from '../components/CommonHeader';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

export default function CircleContactScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]); // メンバー一覧
  const [selectedUids, setSelectedUids] = useState([]); // 選択されたuid
  const [selectAll, setSelectAll] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // 宛先選択モーダル
  const [messageType, setMessageType] = useState('normal'); // 通常連絡, 出欠確認
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [searchText, setSearchText] = useState(''); // 宛先検索
  const [deadline, setDeadline] = useState(new Date(Date.now() + 86400000)); // 回答期限（デフォルト翌日）
  const [showDatePicker, setShowDatePicker] = useState(false);
  const maxBodyLength = 1000;
  const [imageErrorMap, setImageErrorMap] = useState({});

  // 通知送信の共通関数
  const sendNotification = async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: {
            ...data,
            type: 'circleContact', // 通知タイプ
            circleId: circleId,     // サークルID
            timestamp: Date.now(),  // タイムスタンプ
          }
        },
        trigger: null, // 即時通知
      });
    } catch (error) {
      console.error('通知の送信に失敗しました:', error);
    }
  };

  // 出欠確認期限前の通知をスケジュール
  const scheduleDeadlineReminder = async (eventName, deadline) => {
    try {
      // 期限1日前のリマインダー
      const reminderTime = new Date(deadline);
      reminderTime.setDate(reminderTime.getDate() - 1);
      
      // 現在時刻より後の場合のみスケジュール
      if (reminderTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '出欠確認期限のリマインダー',
            body: `${eventName}の出欠確認期限が明日です`,
            data: { 
              type: 'deadline_reminder',
              eventName: eventName,
              deadline: deadline 
            },
          },
          trigger: {
            date: reminderTime,
          },
        });
        console.log('出欠確認期限前の通知をスケジュールしました:', reminderTime);
      }
    } catch (error) {
      console.error('出欠確認期限前の通知スケジュールでエラーが発生しました:', error);
    }
  };

  // 宛先未選択（自分だけしか選択されてない状態）かどうかを判定
  const isOnlySelfSelected = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return true;
    return selectedUids.length === 1 && selectedUids.includes(currentUser.uid);
  };

  // メンバー一覧取得
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Alert.alert('エラー', 'ユーザー情報が取得できませんでした');
          navigation.goBack();
          return;
        }

        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnap = await getDocs(membersRef);
        const memberUids = membersSnap.docs.map(doc => doc.id);
        // 各uidからユーザープロフィール取得
        const memberProfiles = [];
        for (const uid of memberUids) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const d = userDoc.data();
            memberProfiles.push({
              uid,
              name: d.name || d.nickname || '未設定',
              profileImageUrl: d.profileImageUrl || '',
              university: d.university || '',
              grade: d.grade || '',
              isCurrentUser: uid === currentUser.uid, // 自分自身かどうかのフラグ
            });
          }
        }
        setMembers(memberProfiles);
        
        // 自分自身を強制選択
        setSelectedUids([currentUser.uid]);
        setSelectAll(false);
      } catch (e) {
        Alert.alert('エラー', 'メンバー一覧の取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [circleId]);

  // 宛先選択（全選択・個別選択）
  const handleSelectAll = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (selectAll) {
      // 全選択解除時は自分自身のみ選択
      setSelectedUids([currentUser.uid]);
      setSelectAll(false);
    } else {
      // 全選択時は全メンバーを選択
      setSelectedUids(members.map(m => m.uid));
      setSelectAll(true);
    }
  };
  
  const handleToggleSelect = (uid) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // 自分自身は選択不可
    if (uid === currentUser.uid) {
      return;
    }

    if (selectedUids.includes(uid)) {
      setSelectedUids(selectedUids.filter(id => id !== uid));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedUids, uid];
      setSelectedUids(newSelected);
      // 全選択判定（自分自身を除く）
      const otherMembers = members.filter(m => m.uid !== currentUser.uid);
      if (newSelected.length === members.length) setSelectAll(true);
    }
  };

  // 送信
  const handleSend = async () => {
    if (!title.trim() || !body.trim() || selectedUids.length === 0) {
      Alert.alert('エラー', '全項目を入力し、宛先を選択してください');
      return;
    }
    if (isOnlySelfSelected()) {
      Alert.alert('エラー', '宛先を選択してください（自分以外のメンバーを選択してください）');
      return;
    }
    if (messageType === 'attendance' && !deadline) {
      Alert.alert('エラー', '回答期限を設定してください');
      return;
    }
    setLoading(true);
    try {
      const sender = auth.currentUser;
      if (!sender) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }
      const senderUid = sender.uid;
      // Firestoreからプロフィール情報も取得
      const senderDoc = await getDoc(doc(db, 'users', senderUid));
      const senderData = senderDoc.exists() ? senderDoc.data() : {};
      const senderName = senderData.name || senderData.nickname || '不明';
      
      // メッセージデータを準備（プロフィール画像URLは保存しない）
      const messageData = {
        type: messageType,
        title,
        body,
        circleId,
        sentAt: serverTimestamp(),
        ...(messageType === 'attendance' ? { deadline: deadline.toISOString() } : {}),
        senderUid,
        senderName,
        recipientUids: selectedUids, // 宛先ユーザーIDを追加
      };
      
      // 1. サークルコレクションにメッセージを保存
      const circleMessageRef = collection(db, 'circles', circleId, 'messages');
      const circleMessageDoc = await addDoc(circleMessageRef, messageData);
      const messageId = circleMessageDoc.id;
      
      // 2. 各宛先ユーザーのコレクションにメッセージを保存
      for (const uid of selectedUids) {
        const userMessageRef = collection(db, 'users', uid, 'circleMessages');
        await addDoc(userMessageRef, {
          ...messageData,
          messageId: messageId, // サークルコレクションのメッセージIDを参照
        });
      }

      // 3. 通知の送信
      // 自分以外の宛先ユーザーに通知を送信
      const currentUser = auth.currentUser;
      const recipients = selectedUids.filter(uid => uid !== currentUser?.uid);
      
      if (recipients.length > 0) {
        // メッセージ受信通知を送信
        for (const uid of recipients) {
          const recipientMember = members.find(m => m.uid === uid);
          const recipientName = recipientMember?.name || 'メンバー';
          
          await sendNotification(
            '新しいメッセージが届きました',
            `${senderName}から「${title}」が届きました`,
            {
              type: 'new_message',
              messageId: messageId,
              circleId: circleId,
              senderName: senderName,
              title: title
            }
          );
        }
      }

      // 4. 出欠確認の場合は期限前の通知をスケジュール
      if (messageType === 'attendance' && deadline) {
        await scheduleDeadlineReminder(title, deadline);
      }

      setTitle('');
      setBody('');
      setSelectedUids([]);
      setSelectAll(false);
      Alert.alert(
        '送信完了',
        'メッセージを送信しました',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    } catch (e) {
      console.error('Error sending message:', e);
      Alert.alert('エラー', 'メッセージの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="small" color="#999" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <CommonHeader title="サークル連絡" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* 連絡種別 */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>連絡種別</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setMessageType('normal')} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
              <Ionicons name={messageType === 'normal' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#007bff" />
              <Text style={{ marginLeft: 6 }}>通常連絡</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMessageType('attendance')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={messageType === 'attendance' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#007bff" />
              <Text style={{ marginLeft: 6 }}>出欠確認</Text>
            </TouchableOpacity>
          </View>

          {/* 宛先選択 */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>宛先</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{ borderWidth: 1, borderColor: '#007bff', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Text style={{ color: '#007bff', fontWeight: 'bold' }}>宛先を選択</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            {selectedUids.length === members.length && members.length > 0 ? (
              <Text style={{ color: '#007bff' }}>全員（自分含む）</Text>
            ) : selectedUids.length > 0 ? (
              <Text style={{ color: '#007bff' }}>選択中のメンバー（{selectedUids.length}人、自分含む）</Text>
            ) : (
              <Text style={{ color: '#007bff' }}>自分（強制選択）</Text>
            )}
            {isOnlySelfSelected() && (
              <Text style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
                宛先を選択してください（自分以外のメンバーを選択してください）
              </Text>
            )}
          </View>

          {/* タイトル */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>タイトル</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', marginBottom: 16 }}
            value={title}
            onChangeText={setTitle}
            placeholder="タイトルを入力"
            maxLength={100}
          />

          {/* 本文 */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>本文</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', minHeight: 100, maxHeight: 200, textAlignVertical: 'top', marginBottom: 16 }}
            value={body}
            onChangeText={text => setBody(text.slice(0, maxBodyLength))}
            placeholder="本文を入力"
            multiline
            numberOfLines={6}
            maxLength={maxBodyLength}
          />
          <Text style={{ alignSelf: 'flex-end', color: '#888', marginBottom: 16 }}>{body.length}/{maxBodyLength}文字</Text>
          {/* 出欠確認時のみ 回答期限 */}
          {messageType === 'attendance' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>回答期限</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#fafafa', marginTop: 4 }}>
                <Text style={{ fontSize: 16, color: '#333' }}>{deadline ? deadline.toLocaleDateString('ja-JP') : '日付を選択'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <DateTimePicker
                    value={deadline}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    locale="ja-JP"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) setDeadline(selectedDate);
                    }}
                  />
                </View>
              )}
            </View>
          )}

          {/* 送信ボタン */}
          <TouchableOpacity 
            style={{ 
              backgroundColor: isOnlySelfSelected() ? '#ccc' : '#007bff', 
              borderRadius: 8, 
              padding: 16, 
              alignItems: 'center' 
            }} 
            onPress={handleSend}
            disabled={isOnlySelfSelected()}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>送信</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 宛先選択モーダル */}
        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, flex: 1 }}>宛先を選択</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#007bff" />
              </TouchableOpacity>
            </View>
            {/* 検索バー */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, marginBottom: 10 }}>
              <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, fontSize: 16, backgroundColor: '#fff' }}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="氏名・大学名・学年で検索"
                clearButtonMode="while-editing"
              />
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <TouchableOpacity onPress={handleSelectAll} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name={selectAll ? 'checkbox' : 'square-outline'} size={24} color="#007bff" />
                <Text style={{ marginLeft: 8, color: '#007bff', fontWeight: 'bold' }}>全員選択</Text>
              </TouchableOpacity>
              {members.filter(member => {
                const keyword = searchText.toLowerCase();
                return (
                  (member.name && member.name.toLowerCase().includes(keyword)) ||
                  (member.university ? member.university.toLowerCase().includes(keyword) : false) ||
                  (member.grade ? member.grade.toLowerCase().includes(keyword) : false)
                );
              }).map(member => {
                const hasImage = member.profileImageUrl && member.profileImageUrl.trim() !== '' && !imageErrorMap[member.uid];
                const isCurrentUser = member.isCurrentUser;
                
                return (
                  <TouchableOpacity 
                    key={member.uid} 
                    onPress={() => !isCurrentUser && handleToggleSelect(member.uid)} 
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      marginBottom: 12,
                      opacity: isCurrentUser ? 0.6 : 1 // 自分自身は薄く表示
                    }}
                  >
                    <Ionicons 
                      name={selectedUids.includes(member.uid) ? 'checkbox' : 'square-outline'} 
                      size={22} 
                      color={isCurrentUser ? "#ccc" : "#007bff"} // 自分自身はグレー
                    />
                    {hasImage ? (
                      <Image
                        source={{ uri: member.profileImageUrl }}
                        style={{ width: 32, height: 32, borderRadius: 16, marginLeft: 8, marginRight: 8 }}
                        onError={() => setImageErrorMap(prev => ({ ...prev, [member.uid]: true }))}
                      />
                    ) : (
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0', marginLeft: 8, marginRight: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                        <Ionicons name="person-outline" size={18} color="#aaa" />
                      </View>
                    )}
                    <Text style={{ color: isCurrentUser ? '#888' : '#333' }}>{member.name}</Text>
                    {member.university && <Text style={{ color: '#888', marginLeft: 8 }}>{member.university}</Text>}
                    {member.grade && <Text style={{ color: '#888', marginLeft: 8 }}>{member.grade}</Text>}
                    {isCurrentUser && <Text style={{ color: '#007bff', marginLeft: 8, fontSize: 12 }}>(自分)</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{ backgroundColor: '#007bff', borderRadius: 8, padding: 16, alignItems: 'center', margin: 20 }} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>完了</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
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