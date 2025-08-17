import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, ScrollView, FlatList, ActivityIndicator, TextInput, Modal, Dimensions } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { collection as firestoreCollection, query, where, orderBy, getDocs as getDocsFirestore, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { getRoleDisplayName } from '../utils/permissionUtils';
import { Modalize } from 'react-native-modalize';

// 高度に洗練されたカレンダーコンポーネント
const Calendar = ({ selectedDate, onDateSelect, events }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return today;
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // 選択された日付に基づいてカレンダーの月を更新
  useEffect(() => {
    if (selectedDate) {
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      setCurrentMonth(new Date(selectedYear, selectedMonth, 1));
    }
  }, [selectedDate]);
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    // 前月の日付を追加
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    // 当月の日付を追加
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push({ date: currentDate, isCurrentMonth: true });
    }
    
    // 月末が含まれる週の翌月の日付を追加
    const totalCells = days.length;
    const currentWeek = Math.ceil(totalCells / 7);
    
    // 月末が含まれる週の場合のみ、その週の残りのセルに翌月の日付を追加
    if (currentWeek <= 6) {
      const remainingCellsInWeek = 7 - (totalCells % 7);
      if (remainingCellsInWeek < 7) { // 週が完全でない場合のみ
        for (let i = 1; i <= remainingCellsInWeek; i++) {
          const nextDate = new Date(year, month + 1, i);
          days.push({ date: nextDate, isCurrentMonth: false });
        }
      }
    }
    
    return days;
  };

  const formatDate = (date) => {
    // ローカル日付として処理（タイムゾーンオフセットを引かない）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasEvent = (date) => {
    const dateStr = formatDate(date);
    return events.some(event => event.date === dateStr);
  };

  const isSelected = (date) => {
    return formatDate(date) === formatDate(selectedDate);
  };

  const isToday = (date) => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();
    
    return todayYear === dateYear && todayMonth === dateMonth && todayDay === dateDay;
  };

  const isPast = (date) => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();
    
    if (dateYear < todayYear) return true;
    if (dateYear > todayYear) return false;
    if (dateMonth < todayMonth) return true;
    if (dateMonth > todayMonth) return false;
    return dateDay < todayDay;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isSaturday = (date) => {
    return date.getDay() === 6;
  };

  const isSunday = (date) => {
    return date.getDay() === 0;
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction > 0) {
        newMonth.setMonth(newMonth.getMonth() + 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() - 1);
      }
      return newMonth;
    });
  };

  const getEventCount = (date) => {
    const dateStr = formatDate(date);
    return events.filter(event => event.date === dateStr).length;
  };

  const renderDayEvents = (date) => {
    const dateStr = formatDate(date);
    const dayEvents = events.filter(event => event.date === dateStr);
    
    if (dayEvents.length === 0) return null;
    
    return (
      <View style={styles.dayEventsContainer}>
        {dayEvents.slice(0, 2).map((event, index) => (
          <View key={index} style={[
            styles.dayEventItem,
            { backgroundColor: event.color || '#007bff' }
          ]}>
            <Text style={styles.dayEventText} numberOfLines={1} ellipsizeMode="clip">
              {event.title}
            </Text>
          </View>
        ))}
        {dayEvents.length > 2 && (
          <Text style={styles.moreEventsText}>
            +{dayEvents.length - 2}
          </Text>
        )}
      </View>
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <View style={styles.calendarContainer}>
      {/* 高度に洗練されたカレンダーヘッダー */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity 
          onPress={() => changeMonth(-1)} 
          style={styles.monthButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#007bff" />
        </TouchableOpacity>
        
        <View style={styles.monthTitleContainer}>
          <Text style={styles.monthTitle}>
            {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
          </Text>
          {getEventCount(currentMonth) > 0 && (
            <Text style={styles.monthSubtitle}>
              {getEventCount(currentMonth)}件のスケジュール
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={() => changeMonth(1)} 
          style={styles.monthButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={28} color="#007bff" />
        </TouchableOpacity>
      </View>

      {/* 洗練された曜日ヘッダー */}
      <View style={styles.weekHeader}>
        {[
          { day: '日', isWeekend: true, isSunday: true },
          { day: '月', isWeekend: false },
          { day: '火', isWeekend: false },
          { day: '水', isWeekend: false },
          { day: '木', isWeekend: false },
          { day: '金', isWeekend: false },
          { day: '土', isWeekend: true, isSaturday: true }
        ].map((item, index) => (
          <Text 
            key={index} 
            style={[
              styles.weekDay,
              item.isWeekend && styles.weekendDay,
              item.isSunday && styles.sundayDay,
              item.isSaturday && styles.saturdayDay
            ]}
          >
            {item.day}
          </Text>
        ))}
      </View>

      {/* 洗練されたカレンダーグリッド */}
      <View style={styles.calendarGrid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.calendarDay,
              !day.isCurrentMonth && styles.otherMonthDay,
              isSelected(day.date) && styles.selectedDay,
              isToday(day.date) && styles.today,
              hasEvent(day.date) && styles.eventDay,
              isPast(day.date) && styles.pastDay
            ]}
            onPress={() => onDateSelect(day.date)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.dayContent,
              isToday(day.date) && styles.todayContent,
              isPast(day.date) && styles.pastDay
            ]}>
              <Text style={[
                styles.dayText,
                !day.isCurrentMonth && styles.otherMonthText,
                isToday(day.date) && styles.todayText,
                isPast(day.date) && styles.pastDayText,
                isSaturday(day.date) && styles.saturdayText,
                isSunday(day.date) && styles.sundayText
              ]}>
                {day.date.getDate()}
              </Text>
              {renderDayEvents(day.date)}
            </View>
            {isSelected(day.date) && <View style={styles.selectedDayBorder} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function CircleMemberScreen({ route, navigation }) {
  const { circleId, initialTab } = route.params;
  const { height } = Dimensions.get('window');
  const SHEET_HEIGHT = height * 0.8;
  
  // refs
  const attendanceModalizeRef = useRef(null);
  
  const [circleName, setCircleName] = useState('メンバー');
  const [tabIndex, setTabIndex] = useState(() => {
    // initialTabパラメータに基づいて初期タブを設定
    if (initialTab === 'contact') {
      return 1; // 連絡タブ
    }
    return 0; // デフォルトはカレンダータブ
  });
  const tabs = [
    { key: 'calendar', title: 'カレンダー' },
    { key: 'news', title: '連絡' },
    { key: 'members', title: 'メンバー' },
  ];
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [imageErrorMap, setImageErrorMap] = useState({});
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  
  // メンバー関連の状態
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);

  // 送信者情報のキャッシュ
  const [senderCache, setSenderCache] = useState({});
  
  // 出席状況確認用のstate
  const [attendanceUsers, setAttendanceUsers] = useState({ attending: [], absent: [], pending: [] });
  const [attendanceModalType, setAttendanceModalType] = useState('all');
  const [userList, setUserList] = useState([]);
  const [userCount, setUserCount] = useState(0);
  
  // 現在のユーザーの出席状況を管理
  const [currentUserAttendance, setCurrentUserAttendance] = useState({});

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
    
    // データが既に存在する場合はローディングを表示しない
    if (messages.length > 0) {
      setMessagesLoading(false);
      return;
    }
    
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
      } catch (e) {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };
    fetchMessages();
  }, [tabIndex, circleId]);

  // イベント取得
  useEffect(() => {
    const fetchEvents = async () => {
      if (!circleId) return;
      setEventsLoading(true);
      try {
        const eventsRef = collection(db, 'circles', circleId, 'schedule');
        const q = query(eventsRef, orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(eventsList);
      } catch (e) {
        console.error('Error fetching events:', e);
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, [circleId]);

  // メンバー取得
  useEffect(() => {
    if (tabIndex !== 2) return;
    
    // データが既に存在する場合はローディングを表示しない
    if (members.length > 0) {
      setMembersLoading(false);
      return;
    }
    
    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnap = await getDocs(membersRef);
        const memberIds = membersSnap.docs.map(doc => doc.id);
        const membersList = [];
        for (const memberId of memberIds) {
          try {
            const userDoc = await getDoc(doc(db, 'users', memberId));
            const memberDoc = await getDoc(doc(db, 'circles', circleId, 'members', memberId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const memberData = memberDoc.data();
              membersList.push({
                id: memberId,
                name: userData.name || '氏名未設定',
                university: userData.university || '',
                grade: userData.grade || '',
                email: userData.email || '',
                profileImageUrl: userData.profileImageUrl || null,
                role: memberData.role || 'member',
                joinedAt: memberData.joinedAt
              });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
        setMembers(membersList);
      } catch (e) {
        console.error('Error fetching members:', e);
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [tabIndex, circleId]);

  // 日付選択ハンドラー
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  // 選択された日付のイベントを取得
  const getEventsForSelectedDate = () => {
    const formatDate = (date) => {
      // ローカル日付として処理（タイムゾーンオフセットを引かない）
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const selectedDateStr = formatDate(selectedDate);
    return events.filter(event => event.date === selectedDateStr);
  };

  // 日付フォーマット
  const formatDateForDisplay = (date) => {
    const d = new Date(date);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekday}）`;
  };

  // 詳細表示の切り替え
  const toggleEventDetails = async (eventId) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
        // 詳細展開時に出席状況データを取得
        fetchAttendanceData(eventId);
      }
      return newSet;
    });
  };

  // 出席状況データの取得
  const fetchAttendanceData = async (eventId) => {
    try {
      const attendanceRef = collection(db, 'circles', circleId, 'events', eventId, 'attendance');
      const attendanceSnap = await getDocs(attendanceRef);
      
      let attendingCount = 0;
      let absentCount = 0;
      let pendingCount = 0;
      
      // 回答者一覧を取得
      const attendingUsers = [];
      const absentUsers = [];
      const pendingUsers = [];
      
      // 現在のユーザーの出席状況を取得
      const currentUser = auth.currentUser;
      let currentUserStatus = null;
      
      for (const docSnapshot of attendanceSnap.docs) {
        const data = docSnapshot.data();
        const userDocRef = doc(db, 'users', docSnapshot.id);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        const userName = userData.name || userData.nickname || '未設定';
        
        if (data.status === 'attending') {
          attendingCount++;
          attendingUsers.push({
            uid: docSnapshot.id,
            name: userName,
            respondedAt: data.respondedAt ? data.respondedAt.toDate() : null,
          });
        } else if (data.status === 'absent') {
          absentCount++;
          absentUsers.push({
            uid: docSnapshot.id,
            name: userName,
            respondedAt: data.respondedAt ? data.respondedAt.toDate() : null,
          });
        } else if (data.status === 'pending') {
          pendingCount++;
          pendingUsers.push({
            uid: docSnapshot.id,
            name: userName,
            respondedAt: data.respondedAt ? data.respondedAt.toDate() : null,
          });
        }
        
        // 現在のユーザーの出席状況を取得
        if (currentUser && docSnapshot.id === currentUser.uid) {
          currentUserStatus = data.status;
        }
      }
      
      setAttendanceUsers({
        attending: attendingUsers,
        absent: absentUsers,
        pending: pendingUsers
      });
      
      // 現在のユーザーの出席状況を更新
      setCurrentUserAttendance(prev => ({
        ...prev,
        [eventId]: currentUserStatus
      }));
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  // 出席・欠席の処理
  const handleAttendance = async (eventId, status) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      const currentStatus = currentUserAttendance[eventId];
      
      // 同じステータスを押した場合は取り消し
      if (currentStatus === status) {
        // ドキュメントを削除
        const attendanceRef = doc(db, 'circles', circleId, 'events', eventId, 'attendance', user.uid);
        await deleteDoc(attendanceRef);
        
        // 現在のユーザーの出席状況を即座に更新
        setCurrentUserAttendance(prev => ({
          ...prev,
          [eventId]: null
        }));
        
        // 出席状況データを再取得
        await fetchAttendanceData(eventId);
        
        Alert.alert('取り消し完了', '出席確認を取り消しました');
        return;
      }

      // 新しいステータスを登録
      const attendanceRef = doc(db, 'circles', circleId, 'events', eventId, 'attendance', user.uid);
      await setDoc(attendanceRef, {
        status: status,
        respondedAt: new Date(),
        userName: user.displayName || '未設定',
      });

      // 現在のユーザーの出席状況を即座に更新
      setCurrentUserAttendance(prev => ({
        ...prev,
        [eventId]: status
      }));

      // 出席状況データを再取得
      await fetchAttendanceData(eventId);

      Alert.alert('完了', `出席状況を${status === 'attending' ? '出席' : '欠席'}に更新しました`);
    } catch (error) {
      console.error('出席状況の更新に失敗:', error);
      Alert.alert('エラー', '出席状況の更新に失敗しました');
    }
  };

  // 回答状況確認の表示
  const handleShowAttendanceStatus = async (eventId) => {
    try {
      // 出席状況データを取得
      await fetchAttendanceData(eventId);
      
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
    } catch (error) {
      console.error('出席状況データの取得に失敗:', error);
      Alert.alert('エラー', '出席状況データの取得に失敗しました');
    }
  };

  // 役割に基づくソート関数（自分を一番上に）
  const sortMembersByRole = (memberList) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // ログアウト時は役割順のみでソート
      const rolePriority = {
        'leader': 1,
        'admin': 2,
        'member': 3
      };
      
      return memberList.sort((a, b) => {
        const priorityA = rolePriority[a.role] || 4;
        const priorityB = rolePriority[b.role] || 4;
        return priorityA - priorityB;
      });
    }
    
    const rolePriority = {
      'leader': 2,
      'admin': 3,
      'member': 4
    };
    
    return memberList.sort((a, b) => {
      // 自分を一番上に
      if (a.id === currentUser.uid) return -1;
      if (b.id === currentUser.uid) return 1;
      
      // その他のメンバーは役割順
      const priorityA = rolePriority[a.role] || 5;
      const priorityB = rolePriority[b.role] || 5;
      return priorityA - priorityB;
    });
  };

  const filteredMembers = sortMembersByRole(
    members.filter(member =>
      member.name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
      member.university.toLowerCase().includes(memberSearchText.toLowerCase()) ||
      member.grade.toLowerCase().includes(memberSearchText.toLowerCase())
    )
  );

  // 脱退処理
  const handleLeave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // 現在のユーザーが代表者かどうかをチェック
    const currentUserMember = members.find(member => member.id === user.uid);
    if (currentUserMember && currentUserMember.role === 'leader') {
      setLeaveModalVisible(false);
      Alert.alert(
        '脱退できません', 
        'あなたはこのサークルの代表者です。\n代表者を引き継いだ後、脱退してください。',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // サークルメンバーから削除
      await deleteDoc(doc(db, 'circles', circleId, 'members', user.uid));
      
      // ユーザーのjoinedCircleIdsからサークルIDを削除
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayRemove(circleId)
      });
      
      setLeaveModalVisible(false);
      Alert.alert('脱退完了', 'サークルを脱退しました', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error leaving circle:', e);
      Alert.alert('エラー', '脱退に失敗しました');
    }
  };

  // タブ切り替え用
  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {eventsLoading ? (
              <ActivityIndicator size="small" color="#999" style={{ marginTop: 40 }} />
            ) : (
              <>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  events={events}
                />
                <View style={styles.scheduleSection}>
                  <Text style={styles.scheduleTitle}>
                    {formatDateForDisplay(selectedDate)}の予定
                  </Text>
                  {getEventsForSelectedDate().length === 0 ? (
                    <Text style={styles.noEventText}>この日に予定はありません</Text>
                  ) : (
                    getEventsForSelectedDate().map(event => {
                      const isExpanded = expandedEvents.has(event.id);
                      const hasDescription = event.description && event.description.trim() !== '';
                      
                      return (
                        <View 
                          key={event.id} 
                          style={[
                            styles.eventItem,
                            { borderLeftColor: event.color || '#007bff' }
                          ]}
                        >
                          <View style={styles.eventHeader}>
                            <Ionicons name="calendar-outline" size={24} color={event.color || '#007bff'} />
                            <View style={styles.eventTitleContainer}>
                              <Text style={styles.eventTitle}>{event.title}</Text>
                              <View style={styles.eventDetails}>
                                {event.isAllDay ? (
                                  <Text style={styles.eventTimeBadge}>終日</Text>
                                ) : event.startTime && event.endTime ? (
                                  <Text style={styles.eventTimeBadge}>{event.startTime} - {event.endTime}</Text>
                                ) : event.startTime ? (
                                  <Text style={styles.eventTimeBadge}>{event.startTime}</Text>
                                ) : null}
                                {event.location && (
                                  <Text style={styles.eventLocationBadge}>{event.location}</Text>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() => toggleEventDetails(event.id)}
                              style={styles.detailsButton}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.detailsButtonText}>
                                {isExpanded ? '詳細を閉じる' : '詳細を見る'}
                              </Text>
                              <Ionicons 
                                name={isExpanded ? "chevron-up" : "chevron-down"} 
                                size={16} 
                                color="#007bff" 
                                style={{ marginLeft: 4 }}
                              />
                            </TouchableOpacity>
                          </View>
                          {isExpanded && (
                            <>
                              {hasDescription && (
                                <Text style={styles.eventDescription}>{event.description}</Text>
                              )}
                              
                              {/* 出席・欠席・回答状況確認ボタン */}
                              <View style={styles.attendanceButtonsContainer}>
                                <View style={styles.attendanceButtonsRow}>
                                  <TouchableOpacity 
                                    onPress={() => handleAttendance(event.id, 'attending')} 
                                    style={[
                                      styles.attendanceButton, 
                                      { 
                                        backgroundColor: currentUserAttendance[event.id] === 'attending' ? '#007bff' : '#f0f0f0'
                                      }
                                    ]}
                                  >
                                    <View style={styles.attendanceButtonContent}>
                                      <Ionicons 
                                        name="checkmark-circle" 
                                        size={24} 
                                        color={currentUserAttendance[event.id] === 'attending' ? '#fff' : '#666'} 
                                      />
                                      <Text style={[
                                        styles.attendanceButtonText,
                                        { color: currentUserAttendance[event.id] === 'attending' ? '#fff' : '#666' }
                                      ]}>
                                        出席
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                  
                                  <TouchableOpacity 
                                    onPress={() => handleAttendance(event.id, 'absent')} 
                                    style={[
                                      styles.attendanceButton, 
                                      { 
                                        backgroundColor: currentUserAttendance[event.id] === 'absent' ? '#dc3545' : '#f0f0f0'
                                      }
                                    ]}
                                  >
                                    <View style={styles.attendanceButtonContent}>
                                      <Ionicons 
                                        name="close-circle" 
                                        size={24} 
                                        color={currentUserAttendance[event.id] === 'absent' ? '#fff' : '#666'} 
                                      />
                                      <Text style={[
                                        styles.attendanceButtonText,
                                        { color: currentUserAttendance[event.id] === 'absent' ? '#fff' : '#666' }
                                      ]}>
                                        欠席
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                </View>
                                
                                <TouchableOpacity 
                                  onPress={() => handleShowAttendanceStatus(event.id)} 
                                  style={styles.attendanceStatusButton}
                                >
                                  <Ionicons name="people" size={20} color="#666" style={{ marginRight: 8 }} />
                                  <Text style={styles.attendanceStatusButtonText}>回答状況を確認</Text>
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </ScrollView>
        );
      case 1:
        return (
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
        );
      case 2:
        return (
          <View style={styles.tabContent}>
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="名前・大学・学年で検索"
                value={memberSearchText}
                onChangeText={setMemberSearchText}
                clearButtonMode="while-editing"
              />
            </View>
            {memberSearchText.length > 0 && (
              <Text style={styles.hitCountText}>
                検索結果
                <Text style={styles.hitCountNumber}>{filteredMembers.length}</Text>
                件
              </Text>
            )}
            {membersLoading ? (
              <ActivityIndicator size="small" color="#999" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={filteredMembers}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const hasImage = item.profileImageUrl && item.profileImageUrl.trim() !== '' && !imageErrorMap[item.id];
                  return (
                    <View style={styles.memberItem}>
                      {hasImage ? (
                        <Image
                          source={{ uri: item.profileImageUrl }}
                          style={styles.memberAvatar}
                          onError={() => setImageErrorMap(prev => ({ ...prev, [item.id]: true }))}
                        />
                      ) : (
                        <View style={[styles.memberAvatar, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                          <Ionicons name="person-outline" size={40} color="#aaa" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{item.name || '氏名未設定'}</Text>
                        <Text style={styles.memberInfo}>{item.university || ''} {item.grade || ''}</Text>
                        <Text style={styles.memberRole}>{getRoleDisplayName(item.role)}</Text>
                      </View>
                                  {(() => {
                                    const currentUser = auth.currentUser;
                                    return currentUser && item.id === currentUser.uid;
                                  })() && (
              <TouchableOpacity
                style={styles.memberLeaveButton}
                onPress={() => setLeaveModalVisible(true)}
              >
                <Text style={styles.memberLeaveButtonText}>脱退する</Text>
              </TouchableOpacity>
            )}
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>メンバーがいません</Text>}
                contentContainerStyle={{ padding: 20 }}
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

      {/* 脱退確認モーダル */}
      <Modal
        visible={leaveModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>確認</Text>
            <Text style={styles.modalSubtitle}>
              本当にサークルを脱退しますか？
            </Text>
                          <Text style={styles.modalWarning}>
                あなたはサークルメンバーではなくなり、{'\n'}サークル情報にアクセスできなくなります
              </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setLeaveModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={handleLeave}
              >
                <Text style={styles.leaveButtonText}>脱退する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                      fontSize: 16, 
                      fontWeight: 'bold' 
                    }}>
                      {item.status === 'attending' ? '出席' : 
                       item.status === 'absent' ? '欠席' : '保留'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: '#888', fontSize: 16, width: 110, textAlign: 'right' }}>
                {item.respondedAt ? item.respondedAt.toLocaleString('ja-JP') : ''}
              </Text>
            </View>
          ),
          ListEmptyComponent: <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>ユーザーがいません</Text>,
        }}
      />
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
    backgroundColor: '#fff',
  },
  // 洗練されたカレンダー関連のスタイル
  calendarContainer: {
    backgroundColor: '#fff',
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  monthButton: {
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  monthSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  weekendDay: {
    color: '#007bff',
  },
  saturdayDay: {
    color: '#007bff',
  },
  sundayDay: {
    color: '#e74c3c',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 2/3,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  dayContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    padding: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  otherMonthDay: {
    opacity: 0.4,
  },
  otherMonthText: {
    color: '#bbb',
    fontWeight: '400',
  },
  selectedDay: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  selectedDayContent: {
    backgroundColor: 'transparent',
    position: 'relative',
  },
  selectedDayText: {
    color: '#007bff',
    fontWeight: '700',
  },
  selectedDayBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 2,
  },
  today: {
    backgroundColor: 'transparent',
  },
  todayContent: {
    backgroundColor: '#e3f2fd',
  },
  todayText: {
    color: '#007bff',
    fontWeight: '700',
  },
  eventDay: {
    backgroundColor: 'transparent',
  },
  pastDay: {
    backgroundColor: '#f5f5f5',
  },
  pastDayText: {
    color: '#999',
  },
  saturdayText: {
    color: '#007bff',
  },
  sundayText: {
    color: '#e74c3c',
  },
  dayEventsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    width: '100%',
    alignItems: 'center',
  },
  dayEventItem: {
    backgroundColor: '#e8f5e8',
    borderRadius: 2,
    paddingHorizontal: 0,
    paddingVertical: 1,
    marginBottom: 1,
    width: '110%',
  },
  dayEventText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'left',
    numberOfLines: 1,
    ellipsizeMode: 'clip',
    paddingRight: 2,
  },
  moreEventsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // スケジュール表示関連のスタイル
  scheduleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  noEventText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
  eventItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 8,
    borderLeftColor: '#007bff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventTimeBadge: {
    backgroundColor: '#e3f2fd',
    color: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  eventLocationBadge: {
    backgroundColor: '#f3e5f5',
    color: '#9c27b0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007bff',
    marginLeft: 8,
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
  },
  // メンバー関連のスタイル
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  hitCountText: {
    marginHorizontal: 15,
    marginBottom: 10,
    fontSize: 14,
    color: '#666',
  },
  hitCountNumber: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  memberInfo: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: 'bold',
  },
  memberLeaveButton: {
    backgroundColor: '#f44336',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 16,
  },
  memberLeaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalWarning: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // 出席・欠席ボタンのスタイル
  attendanceButtonsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attendanceButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  attendanceButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  attendanceStatusButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceStatusButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  leaveButton: {
    flex: 1,
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
}); 