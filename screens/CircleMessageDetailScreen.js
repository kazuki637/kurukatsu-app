import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, FlatList, Dimensions, Alert, ActivityIndicator } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { useState } from 'react';
import { Modalize } from 'react-native-modalize';
import { useRef } from 'react';
import { useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { collection, setDoc, doc, serverTimestamp, getDocs, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import KurukatsuButton from '../components/KurukatsuButton';
// import { updateUnreadCounts } from '../hooks/useNotificationBadge'; // リアルタイムリスナーが自動更新するため不要
import { startTransition } from 'react';
import useUsersMap from '../hooks/useUsersMap';

export default function CircleMessageDetailScreen({ route, navigation }) {
  const { message, userUid } = route.params;
  const modalizeRef = useRef(null);
  const attendanceModalizeRef = useRef(null);
  const [modalType, setModalType] = useState('read'); // 'read' or 'unread'
  const [userList, setUserList] = useState([]); // 表示用ユーザー一覧
  const [userCount, setUserCount] = useState(0);
  const { height } = Dimensions.get('window');
  const SHEET_HEIGHT = height * 0.8;

  // 既読・未読リスト・人数のstate
  const [readUsers, setReadUsers] = useState([]);
  const [unreadUsers, setUnreadUsers] = useState([]);
  const [loadingReadStatus, setLoadingReadStatus] = useState(true);
  const [memberUids, setMemberUids] = useState([]);
  const [readMap, setReadMap] = useState({});
  
  // 出席確認のstate
  const [attendanceStatus, setAttendanceStatus] = useState(null); // 'attending', 'absent', 'pending', null
  const [attendanceCounts, setAttendanceCounts] = useState({ attending: 0, absent: 0, pending: 0 });
  const [loadingAttendanceStatus, setLoadingAttendanceStatus] = useState(true);
  const [attendanceRaw, setAttendanceRaw] = useState({ attending: [], absent: [], pendingExplicit: [], respondedAtByUid: {} });
  
  // 回答状況確認用のstate
  const [attendanceUsers, setAttendanceUsers] = useState({ attending: [], absent: [], pending: [] });
  const [attendanceModalType, setAttendanceModalType] = useState('attending'); // 'attending', 'absent', 'pending'
  
  // 削除機能のstate
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // 送信者情報はCircleMemberContactScreenから受け取る

  // 回答期限が過ぎているかどうかを判定
  const isDeadlinePassed = () => {
    if (!message.deadline) return false;
    const deadline = new Date(message.deadline);
    const now = new Date();
    
    // 期限当日の23:59:59まで回答可能
    const deadlineEndOfDay = new Date(deadline);
    deadlineEndOfDay.setHours(23, 59, 59, 999);
    
    return now > deadlineEndOfDay;
  };

  // 出席確認データの取得
  const fetchAttendanceData = async () => {
    if (!message.circleId || !message.id || message.type !== 'attendance') return;
    
    try {
      setLoadingAttendanceStatus(true);
      const messageId = message.messageId || message.id;
      const attendanceRef = collection(db, 'circles', message.circleId, 'messages', messageId, 'attendance');
      const attendanceSnap = await getDocs(attendanceRef);
      
      let attendingUIDs = [];
      let absentUIDs = [];
      let pendingExplicitUIDs = [];
      let respondedAtByUid = {};
      let currentUserStatus = null;

      for (const docSnapshot of attendanceSnap.docs) {
        const data = docSnapshot.data();
        const uid = docSnapshot.id;
        if (data.status === 'attending') attendingUIDs.push(uid);
        else if (data.status === 'absent') absentUIDs.push(uid);
        else if (data.status === 'pending') pendingExplicitUIDs.push(uid);
        if (data.respondedAt && data.respondedAt.toDate) respondedAtByUid[uid] = data.respondedAt.toDate();

        const currentUser = auth.currentUser;
        if (currentUser && uid === currentUser.uid) currentUserStatus = data.status;
      }

      setAttendanceStatus(currentUserStatus);
      setAttendanceRaw({ attending: attendingUIDs, absent: absentUIDs, pendingExplicit: pendingExplicitUIDs, respondedAtByUid });
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoadingAttendanceStatus(false);
    }
  };

  // 出席・欠席ボタンの処理
  const handleAttendance = async (status) => {
    const currentUser = auth.currentUser;
  if (!currentUser || !message.circleId || !message.id || message.type !== 'attendance') return;
    
    // 回答期限が過ぎている場合は処理を中止
    if (isDeadlinePassed()) {
      Alert.alert('回答期限終了', '回答期限が過ぎているため、回答できません。');
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }
      
      const messageId = message.messageId || message.id;
      const attendanceRef = doc(db, 'circles', message.circleId, 'messages', messageId, 'attendance', currentUser.uid);
      
      // 同じステータスを押した場合は取り消し
      if (attendanceStatus === status) {
        // ドキュメントを削除
        await deleteDoc(attendanceRef);
        setAttendanceStatus(null);
        
        // カウントを更新
        if (status === 'attending') {
          setAttendanceCounts(prev => ({
            ...prev,
            attending: prev.attending - 1
          }));
          // 回答者一覧から削除
          setAttendanceUsers(prev => ({
            ...prev,
            attending: prev.attending.filter(user => user.uid !== currentUser.uid)
          }));
        } else if (status === 'absent') {
          setAttendanceCounts(prev => ({
            ...prev,
            absent: prev.absent - 1
          }));
          // 回答者一覧から削除
          setAttendanceUsers(prev => ({
            ...prev,
            absent: prev.absent.filter(user => user.uid !== currentUser.uid)
          }));
        } else if (status === 'pending') {
          setAttendanceCounts(prev => ({
            ...prev,
            pending: prev.pending - 1
          }));
          // 回答者一覧から削除
          setAttendanceUsers(prev => ({
            ...prev,
            pending: prev.pending.filter(user => user.uid !== currentUser.uid)
          }));
        }
        
        Alert.alert('取り消し完了', '出席確認を取り消しました');
        return;
      }
      
      // 新しいステータスを登録
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      const userName = userData.name || userData.nickname || '未設定';
      
      await setDoc(attendanceRef, {
        status: status,
        respondedAt: serverTimestamp(),
        userName: userName,
      });
      
      setAttendanceStatus(status);
      
      // カウントを更新
      if (status === 'attending') {
        setAttendanceCounts(prev => ({
          ...prev,
          attending: prev.attending + (attendanceStatus === 'absent' ? 1 : 1),
          absent: prev.absent - (attendanceStatus === 'absent' ? 1 : 0),
          pending: prev.pending - (attendanceStatus === 'pending' ? 1 : 0)
        }));
        // 回答者一覧を更新
        setAttendanceUsers(prev => {
          // 既存の回答を削除
          const filteredAttending = prev.attending.filter(user => user.uid !== currentUser.uid);
          const filteredAbsent = prev.absent.filter(user => user.uid !== currentUser.uid);
          const filteredPending = prev.pending.filter(user => user.uid !== currentUser.uid);
          
          return {
            attending: [...filteredAttending, {
              uid: currentUser.uid,
              name: userName,
              respondedAt: new Date(),
              status: 'attending'
            }],
            absent: filteredAbsent,
            pending: filteredPending
          };
        });
      } else if (status === 'absent') {
        setAttendanceCounts(prev => ({
          ...prev,
          attending: prev.attending - (attendanceStatus === 'attending' ? 1 : 0),
          absent: prev.absent + (attendanceStatus === 'attending' ? 1 : 1),
          pending: prev.pending - (attendanceStatus === 'pending' ? 1 : 0)
        }));
        // 回答者一覧を更新
        setAttendanceUsers(prev => {
          // 既存の回答を削除
          const filteredAttending = prev.attending.filter(user => user.uid !== currentUser.uid);
          const filteredAbsent = prev.absent.filter(user => user.uid !== currentUser.uid);
          const filteredPending = prev.pending.filter(user => user.uid !== currentUser.uid);
          
          return {
            attending: filteredAttending,
            absent: [...filteredAbsent, {
              uid: currentUser.uid,
              name: userName,
              respondedAt: new Date(),
              status: 'absent'
            }],
            pending: filteredPending
          };
        });
      } else if (status === 'pending') {
        setAttendanceCounts(prev => ({
          ...prev,
          attending: prev.attending - (attendanceStatus === 'attending' ? 1 : 0),
          absent: prev.absent - (attendanceStatus === 'absent' ? 1 : 0),
          pending: prev.pending + (attendanceStatus === 'attending' || attendanceStatus === 'absent' ? 1 : 1)
        }));
        // 回答者一覧を更新
        setAttendanceUsers(prev => {
          // 既存の回答を削除
          const filteredAttending = prev.attending.filter(user => user.uid !== currentUser.uid);
          const filteredAbsent = prev.absent.filter(user => user.uid !== currentUser.uid);
          const filteredPending = prev.pending.filter(user => user.uid !== currentUser.uid);
          
          return {
            attending: filteredAttending,
            absent: filteredAbsent,
            pending: [...filteredPending, {
              uid: currentUser.uid,
              name: userName,
              respondedAt: new Date(),
              status: 'pending'
            }]
          };
        });
      }
      
      const statusText = status === 'attending' ? '出席' : status === 'absent' ? '欠席' : '保留';
      Alert.alert('完了', `${statusText}を登録しました`);
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('エラー', '出席確認の登録に失敗しました');
    }
  };

  // 既読・未読ユーザー取得（ベースライン: members）
  const fetchReadUsers = async () => {
    if (!message.circleId || !message.id) return;
    // 1. サークルメンバー一覧取得
    const membersRef = collection(db, 'circles', message.circleId, 'members');
    const membersSnap = await getDocs(membersRef);
    const uids = membersSnap.docs.map(doc => doc.id);
    setMemberUids(uids);
    
    // 2. サークルレベルでの既読情報取得
    const messageId = message.messageId || message.id; // messageIdを優先、なければidを使用
    const readStatusRef = collection(db, 'circles', message.circleId, 'messages', messageId, 'readStatus');
    const readStatusSnap = await getDocs(readStatusRef);
    const rm = {};
    readStatusSnap.forEach(docSnap => {
      const d = docSnap.data();
      rm[docSnap.id] = d.readAt ? d.readAt.toDate() : null;
    });
    setReadMap(rm);
    // プロフィール解決はフックで別effectが担当
    return { readUsers: [], unreadUsers: [] };
  };

  // 送信者情報を取得（CircleMemberContactScreenから受け取ったsenderInfoを使用）
  const senderInfo = message.senderInfo || {
    name: message.senderName || '不明',
    profileImageUrl: message.senderProfileImageUrl || null
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

        // 1-2. 既読登録（ユーザーレベル）
        const userMessageRef = doc(db, 'users', user.uid, 'circleMessages', message.id);
        await setDoc(userMessageRef, { readAt: serverTimestamp() }, { merge: true });
        
        // 個別メッセージの未読状態を更新
        if (global.updateMessageReadStatus) {
          global.updateMessageReadStatus(message.id, true);
        }
        
        // 未読数の更新はuseNotificationBadgeフックのリアルタイムリスナーが自動的に処理
        
        // メンバーと既読情報を取得（プロフィールは別effectで処理）
        const { readUsers, unreadUsers } = await fetchReadUsers();
        if (readUsers || unreadUsers) {
          startTransition(() => {
            setReadUsers(readUsers || []);
            setUnreadUsers(unreadUsers || []);
          });
        }
        
        // 6. 出欠確認データの取得
        if (message.type === 'attendance') {
          await fetchAttendanceData();
        }
      } catch (e) {
        console.error('Error in registerAndFetch:', e);
      } finally {
        setLoadingReadStatus(false);
      }
    };
    registerAndFetch();
  }, [message]);

  // プロフィール購読
  const userIdToProfile = useUsersMap(memberUids);

  // 既読・未読リストをプロフィール付きで再構築
  useEffect(() => {
    if (memberUids.length === 0) return;
    const users = memberUids.map(uid => ({
      uid,
      name: (userIdToProfile[uid]?.name || userIdToProfile[uid]?.nickname || '未設定'),
      profileImageUrl: userIdToProfile[uid]?.profileImageUrl || '',
      readAt: readMap[uid] || null,
    }));
    const rUsers = users.filter(u => u.readAt);
    const uUsers = users.filter(u => !u.readAt);
    setReadUsers(rUsers);
    setUnreadUsers(uUsers);
  }, [memberUids, userIdToProfile, readMap]);

  // 出欠: プロフィールと未回答を含むpendingを再構築
  useEffect(() => {
    if (memberUids.length === 0 || message.type !== 'attendance') return;
    const attendingSet = new Set(attendanceRaw.attending);
    const absentSet = new Set(attendanceRaw.absent);
    const pendingExplicitSet = new Set(attendanceRaw.pendingExplicit);
    const respondedSet = new Set([...attendingSet, ...absentSet, ...pendingExplicitSet]);

    const attendingList = attendanceRaw.attending.map(uid => ({
      uid,
      name: (userIdToProfile[uid]?.name || userIdToProfile[uid]?.nickname || '未設定'),
      respondedAt: attendanceRaw.respondedAtByUid[uid] || null,
    }));
    const absentList = attendanceRaw.absent.map(uid => ({
      uid,
      name: (userIdToProfile[uid]?.name || userIdToProfile[uid]?.nickname || '未設定'),
      respondedAt: attendanceRaw.respondedAtByUid[uid] || null,
    }));
    // 未回答ユーザーもpendingに含める
    const pendingUIDsFinal = Array.from(new Set([
      ...attendanceRaw.pendingExplicit,
      ...memberUids.filter(uid => !respondedSet.has(uid))
    ]));
    const pendingList = pendingUIDsFinal.map(uid => ({
      uid,
      name: (userIdToProfile[uid]?.name || userIdToProfile[uid]?.nickname || '未設定'),
      respondedAt: attendanceRaw.respondedAtByUid[uid] || null,
    }));

    setAttendanceCounts({ attending: attendingList.length, absent: absentList.length, pending: pendingList.length });
    setAttendanceUsers({ attending: attendingList, absent: absentList, pending: pendingList });
  }, [memberUids, userIdToProfile, attendanceRaw, message.type]);

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

  // メッセージ削除機能（モーダル表示）
  const handleDeleteMessage = () => {
    setDeleteModalVisible(true);
  };

  // 実際の削除処理
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteModalVisible(false);
      
      // ユーザーのcircleMessagesから該当メッセージを削除
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userMessageRef = doc(db, 'users', currentUser.uid, 'circleMessages', message.id);
        await deleteDoc(userMessageRef);
      }
      
      // 削除成功後、前の画面に戻る（削除完了フラグ付き）
      navigation.goBack();
      
      // 削除完了を前の画面に通知
      if (navigation.getParent) {
        navigation.getParent().setParams({ 
          messageDeleted: true,
          deletedMessageId: message.id 
        });
      }
      
    } catch (error) {
      console.error('メッセージ削除エラー:', error);
      Alert.alert('エラー', 'メッセージの削除に失敗しました。');
    } finally {
      setIsDeleting(false);
    }
  };

  // 回答状況確認ボタン押下時の処理
  const handleShowAttendanceSheet = (type) => {
    setAttendanceModalType(type);
    if (type === 'attending') {
      setUserList(attendanceUsers.attending);
      setUserCount(attendanceUsers.attending.length);
    } else if (type === 'absent') {
      setUserList(attendanceUsers.absent);
      setUserCount(attendanceUsers.absent.length);
    } else if (type === 'pending') {
      setUserList(attendanceUsers.pending);
      setUserCount(attendanceUsers.pending.length);
    }
    attendanceModalizeRef.current?.open();
  };

  // 回答状況確認ボタン押下時の処理（全回答者一覧表示）
  const handleShowAllAttendanceSheet = () => {
    // 全回答者を一つのリストにまとめる
    const allAttendanceUsers = [
      ...attendanceUsers.attending.map(user => ({ ...user, status: 'attending' })),
      ...attendanceUsers.absent.map(user => ({ ...user, status: 'absent' })),
      ...attendanceUsers.pending.map(user => ({ ...user, status: 'pending' }))
    ];
    
    setUserList(allAttendanceUsers);
    setUserCount(allAttendanceUsers.length);
    setAttendanceModalType('all');
    attendanceModalizeRef.current?.open();
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="連絡"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 送信日時（最上部） */}
        <Text style={{ color: '#888', fontSize: 12, alignSelf: 'flex-start', marginBottom: 12 }}>
          {message.sentAt && message.sentAt.toDate ? message.sentAt.toDate().toLocaleString('ja-JP') : ''}
        </Text>
        {/* 上部：種別＋タイトル（横並び） */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, flex: 1 }}>
          <Text style={{ color: '#007bff', fontSize: 18, fontWeight: 'bold' }}>
            {message.type === 'attendance' ? '出欠確認' : '通常連絡'}
          </Text>
          <View style={{ width: 1.5, height: 24, backgroundColor: '#d0d7de', marginHorizontal: 12, borderRadius: 1 }} />
          <Text style={{ color: '#222', fontSize: 18, fontWeight: 'bold', flex: 1 }}>{message.title}</Text>
        </View>
        {/* 送信者アイコン＋氏名 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          {senderInfo?.profileImageUrl ? (
            <Image source={{ uri: senderInfo.profileImageUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
          ) : (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e0e0', marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="person-outline" size={20} color="#999" />
            </View>
          )}
          <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{senderInfo?.name || '不明'}</Text>
        </View>
        {/* 区切り線 */}
        <View style={{ height: 1, backgroundColor: '#e0e0e0', marginBottom: 35 }} />
        {/* メッセージ内容 */}
        <Text style={{ color: '#333', fontSize: 16, marginBottom: 30 }}>{message.body}</Text>
        {message.deadline && (
          <Text style={{ color: '#d9534f', fontSize: 14, marginBottom: 30 }}>
            回答期限: {new Date(message.deadline).toLocaleDateString('ja-JP')}
            {isDeadlinePassed() && (
              <Text style={{ color: '#dc3545', fontWeight: 'bold' }}> (期限終了)</Text>
            )}
          </Text>
        )}
        
        {/* 出欠確認の場合、出席・欠席ボタンを表示 */}
        {message.type === 'attendance' && (
          <>
            {/* 区切り線（出席・欠席ボタンの上） */}
            <View style={{ height: 1, backgroundColor: '#e0e0e0', width: '100%', marginBottom: 20 }} />
            {/* 出席・欠席・保留ボタン */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 20 }}>
                <TouchableOpacity 
                  onPress={() => handleAttendance('attending')} 
                  disabled={isDeadlinePassed() || loadingAttendanceStatus}
                style={{ 
                  backgroundColor: attendanceStatus === 'attending' ? '#007bff' : '#f0f0f0', 
                  borderRadius: 12, 
                  paddingVertical: 16, 
                  paddingHorizontal: 16, 
                  width: 80,
                  height: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (isDeadlinePassed() || loadingAttendanceStatus) ? 0.5 : 1
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={28} 
                    color={attendanceStatus === 'attending' ? '#fff' : '#666'} 
                  />
                  <Text style={{ 
                    color: attendanceStatus === 'attending' ? '#fff' : '#666', 
                    fontWeight: 'bold', 
                    fontSize: 16,
                    marginLeft: 4
                  }}>
                    出席
                  </Text>
                </View>
                {loadingAttendanceStatus ? (
                  <ActivityIndicator size="small" color={attendanceStatus === 'attending' ? '#fff' : '#999'} style={{ marginTop: 4 }} />
                ) : (
                  <Text style={{ 
                    color: attendanceStatus === 'attending' ? '#fff' : '#666', 
                    fontWeight: 'bold', 
                    fontSize: 12,
                    marginTop: 4
                  }}>
                    ({attendanceCounts.attending})
                  </Text>
                )}
              </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleAttendance('absent')} 
                  disabled={isDeadlinePassed() || loadingAttendanceStatus}
                style={{ 
                  backgroundColor: attendanceStatus === 'absent' ? '#dc3545' : '#f0f0f0', 
                  borderRadius: 12, 
                  paddingVertical: 16, 
                  paddingHorizontal: 16, 
                  width: 80,
                  height: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (isDeadlinePassed() || loadingAttendanceStatus) ? 0.5 : 1
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="close-circle" 
                    size={28} 
                    color={attendanceStatus === 'absent' ? '#fff' : '#666'} 
                  />
                  <Text style={{ 
                    color: attendanceStatus === 'absent' ? '#fff' : '#666', 
                    fontWeight: 'bold', 
                    fontSize: 16,
                    marginLeft: 4
                  }}>
                    欠席
                  </Text>
                </View>
                {loadingAttendanceStatus ? (
                  <ActivityIndicator size="small" color={attendanceStatus === 'absent' ? '#fff' : '#999'} style={{ marginTop: 4 }} />
                ) : (
                  <Text style={{ 
                    color: attendanceStatus === 'absent' ? '#fff' : '#666', 
                    fontWeight: 'bold', 
                    fontSize: 12,
                    marginTop: 4
                  }}>
                    ({attendanceCounts.absent})
                  </Text>
                )}
              </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleAttendance('pending')} 
                  disabled={isDeadlinePassed() || loadingAttendanceStatus}
                style={{ 
                  backgroundColor: attendanceStatus === 'pending' ? '#ffc107' : '#f0f0f0', 
                  borderRadius: 12, 
                  paddingVertical: 16, 
                  paddingHorizontal: 16, 
                  width: 80,
                  height: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (isDeadlinePassed() || loadingAttendanceStatus) ? 0.5 : 1
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons 
                    name="help-circle" 
                    size={28} 
                    color={attendanceStatus === 'pending' ? '#fff' : '#666'} 
                  />
                  <Text style={{ 
                    color: attendanceStatus === 'pending' ? '#fff' : '#666', 
                    fontWeight: 'bold', 
                    fontSize: 16,
                    marginLeft: 4
                  }}>
                    保留
                  </Text>
                </View>
                {loadingAttendanceStatus ? (
                  <ActivityIndicator size="small" color={attendanceStatus === 'pending' ? '#fff' : '#999'} style={{ marginTop: 4 }} />
                ) : (
                  <Text style={{ 
                    color: attendanceStatus === 'pending' ? '#fff' : '#666', 
                    fontWeight: 'bold', 
                    fontSize: 12,
                    marginTop: 4
                  }}>
                    ({attendanceCounts.pending})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* 回答状況確認ボタン */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity 
                onPress={handleShowAllAttendanceSheet} 
                disabled={loadingAttendanceStatus}
                style={{ 
                  backgroundColor: '#f0f0f0', 
                  borderRadius: 8, 
                  paddingVertical: 12, 
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: loadingAttendanceStatus ? 0.5 : 1
                }}
              >
                <Ionicons name="people" size={20} color="#666" style={{ marginRight: 8 }} />
                <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 16 }}>回答状況を確認</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {/* 区切り線（既読・未読ボタンの上） */}
        <View style={{ height: 1, backgroundColor: '#e0e0e0', width: '100%', marginBottom: 30 }} />
        {/* 既読・未読ボタン */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 18 }}>
          <TouchableOpacity 
            onPress={() => handleShowSheet('read')} 
            disabled={loadingReadStatus}
            style={{ 
              backgroundColor: loadingReadStatus ? '#e0e0e0' : '#f0f0f0', 
              borderRadius: 8, 
              paddingVertical: 10, 
              paddingHorizontal: 24, 
              marginRight: 12, 
              flex: 1, 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: loadingReadStatus ? 0.6 : 1
            }}
          >
            <Text style={{ color: loadingReadStatus ? '#999' : '#666', fontWeight: 'bold', fontSize: 16 }}>既読</Text>
            {loadingReadStatus ? (
              <ActivityIndicator size="small" color="#999" style={{ marginLeft: 4 }} />
            ) : (
              <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 16, marginLeft: 4 }}>({readUsers.length})</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleShowSheet('unread')} 
            disabled={loadingReadStatus}
            style={{ 
              backgroundColor: loadingReadStatus ? '#e0e0e0' : '#f0f0f0', 
              borderRadius: 8, 
              paddingVertical: 10, 
              paddingHorizontal: 24, 
              flex: 1, 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: loadingReadStatus ? 0.6 : 1
            }}
          >
            <Text style={{ color: loadingReadStatus ? '#999' : '#666', fontWeight: 'bold', fontSize: 16 }}>未読</Text>
            {loadingReadStatus ? (
              <ActivityIndicator size="small" color="#999" style={{ marginLeft: 4 }} />
            ) : (
              <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 16, marginLeft: 4 }}>({unreadUsers.length})</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* 削除ボタン */}
        <View style={styles.deleteButtonWrapper}>
          <KurukatsuButton
            title="削除する"
            onPress={handleDeleteMessage}
            variant="primary"
            size="medium"
            backgroundColor="#DC2626"
            disabled={isDeleting}
            style={styles.deleteButtonContainer}
          />
        </View>
      </ScrollView>

      {/* 削除確認モーダル */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="trash-outline" size={40} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>連絡を削除しますか？</Text>
            <Text style={styles.modalSubtitle}>
              この操作は元に戻せません。本当にこの連絡を削除しますか？
            </Text>
            <View style={styles.modalButtons}>
              <KurukatsuButton
                title="キャンセル"
                onPress={() => setDeleteModalVisible(false)}
                size="medium"
                variant="secondary"
                hapticFeedback={true}
                style={styles.modalCancelButtonContainer}
              />
              <KurukatsuButton
                title="削除する"
                onPress={handleConfirmDelete}
                size="medium"
                variant="primary"
                backgroundColor="#DC2626"
                hapticFeedback={true}
                disabled={isDeleting}
                style={styles.modalDeleteButtonContainer}
              />
            </View>
          </View>
        </View>
      </Modal>

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
      {/* 回答状況確認ユーザー一覧ボトムシート */}
      <Modalize
        ref={attendanceModalizeRef}
        adjustToContentHeight={false}
        modalHeight={SHEET_HEIGHT}
        handleStyle={{ backgroundColor: '#222', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        modalStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#fff' }}
        overlayStyle={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        handlePosition="inside"
        HeaderComponent={
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
                {attendanceModalType === 'attending' ? '出席' : 
                 attendanceModalType === 'absent' ? '欠席' :
                 attendanceModalType === 'pending' ? '保留' :
                 attendanceModalType === 'all' ? '回答者一覧' : 'ユーザー一覧'}
              </Text>
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
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>{item.name}</Text>
                {item.status && (
                  <View style={{ 
                    backgroundColor: item.status === 'attending' ? '#007bff' : 
                                  item.status === 'absent' ? '#dc3545' : '#ffc107',
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2
                  }}>
                    <Text style={{ 
                      color: '#fff', 
                      fontSize: 10, 
                      fontWeight: 'bold' 
                    }}>
                      {item.status === 'attending' ? '出席' : 
                       item.status === 'absent' ? '欠席' : '保留'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: '#888', fontSize: 16, width: 110, textAlign: 'right' }}>
                {item.readAt ? item.readAt.toLocaleString('ja-JP') : 
                 item.respondedAt ? item.respondedAt.toLocaleString('ja-JP') : ''}
              </Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  // モーダルのスタイル
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButtonContainer: {
    flex: 1,
    marginRight: 8,
  },
  modalDeleteButtonContainer: {
    flex: 1,
    marginLeft: 8,
  },
  deleteButtonWrapper: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  deleteButtonContainer: {
    width: '100%',
    maxWidth: 300,
  },
}); 