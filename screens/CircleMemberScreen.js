import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FlatList, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// カレンダーコンポーネント
const Calendar = ({ selectedDate, onDateSelect, events }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  
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
    
    if (currentWeek <= 6) {
      const remainingCellsInWeek = 7 - (totalCells % 7);
      if (remainingCellsInWeek < 7) {
        for (let i = 1; i <= remainingCellsInWeek; i++) {
          const nextDate = new Date(year, month + 1, i);
          days.push({ date: nextDate, isCurrentMonth: false });
        }
      }
    }
    
    return days;
  };

  const formatDate = (date) => {
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
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
    if (isAnimating) return;
    setIsAnimating(true);
    
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'next') {
        newMonth.setMonth(newMonth.getMonth() + 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() - 1);
      }
      return newMonth;
    });
    
    setTimeout(() => setIsAnimating(false), 300);
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
          <View key={index} style={styles.dayEventDot} />
        ))}
        {dayEvents.length > 2 && (
          <Text style={styles.dayEventCount}>+{dayEvents.length - 2}</Text>
        )}
      </View>
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <View style={styles.calendarContainer}>
      {/* ヘッダー */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthButton}>
          <Ionicons name="chevron-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
        </Text>
        <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthButton}>
          <Ionicons name="chevron-forward" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      {/* 曜日ヘッダー */}
      <View style={styles.weekdayHeader}>
        {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
          <Text key={day} style={[
            styles.weekdayText,
            index === 0 && styles.sundayText,
            index === 6 && styles.saturdayText
          ]}>
            {day}
          </Text>
        ))}
      </View>

      {/* カレンダーグリッド */}
      <View style={styles.calendarGrid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.calendarDay,
              !day.isCurrentMonth && styles.otherMonthDay,
              isSelected(day.date) && styles.selectedDay,
              isToday(day.date) && styles.todayDay,
              isWeekend(day.date) && styles.weekendDay
            ]}
            onPress={() => onDateSelect(day.date)}
          >
            <Text style={[
              styles.dayText,
              !day.isCurrentMonth && styles.otherMonthText,
              isSelected(day.date) && styles.selectedDayText,
              isToday(day.date) && styles.todayText,
              isSunday(day.date) && styles.sundayText,
              isSaturday(day.date) && styles.saturdayText
            ]}>
              {day.date.getDate()}
            </Text>
            {hasEvent(day.date) && renderDayEvents(day.date)}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

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
  const [imageErrorMap, setImageErrorMap] = useState({});
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // 日付選択ハンドラー
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  // 選択された日付のイベントを取得
  const getEventsForSelectedDate = () => {
    const formatDate = (date) => {
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
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 (${weekday})`;
  };

  // タブ切り替え用
  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <View style={styles.tabContent}>
            {eventsLoading ? (
              <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />
            ) : (
              <>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  events={events}
                />
                <View style={styles.eventsSection}>
                  <Text style={styles.eventsSectionTitle}>
                    {formatDateForDisplay(selectedDate)}の予定
                  </Text>
                  {getEventsForSelectedDate().length === 0 ? (
                    <Text style={styles.noEventsText}>予定はありません</Text>
                  ) : (
                    <FlatList
                      data={getEventsForSelectedDate()}
                      keyExtractor={item => item.id}
                      renderItem={({ item }) => (
                        <View style={styles.eventItem}>
                          <View style={styles.eventHeader}>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            <Text style={styles.eventTime}>
                              {item.startTime} - {item.endTime}
                            </Text>
                          </View>
                          {item.description && (
                            <Text style={styles.eventDescription}>{item.description}</Text>
                          )}
                          {item.location && (
                            <View style={styles.eventLocation}>
                              <Ionicons name="location-outline" size={16} color="#666" />
                              <Text style={styles.eventLocationText}>{item.location}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        );
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
                renderItem={({ item }) => {
                  const hasImage = item.senderProfileImageUrl && item.senderProfileImageUrl.trim() !== '' && !imageErrorMap[item.id];
                  return (
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
                        {hasImage ? (
                          <Image
                            source={{ uri: item.senderProfileImageUrl }}
                            style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }}
                            onError={() => setImageErrorMap(prev => ({ ...prev, [item.id]: true }))}
                          />
                        ) : (
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e0e0', marginRight: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                            <Ionicons name="person-outline" size={22} color="#aaa" />
                          </View>
                        )}
                        <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{item.senderName || '不明'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
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
    backgroundColor: '#fff',
  },
  // カレンダー関連のスタイル
  calendarContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    paddingVertical: 8,
  },
  sundayText: {
    color: '#ff4444',
  },
  saturdayText: {
    color: '#4444ff',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#eee',
    position: 'relative',
  },
  otherMonthDay: {
    backgroundColor: '#f8f8f8',
  },
  selectedDay: {
    backgroundColor: '#007bff',
  },
  todayDay: {
    backgroundColor: '#e3f2fd',
  },
  weekendDay: {
    backgroundColor: '#fafafa',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  otherMonthText: {
    color: '#ccc',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  dayEventsContainer: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#007bff',
    marginHorizontal: 1,
  },
  dayEventCount: {
    fontSize: 8,
    color: '#007bff',
    fontWeight: 'bold',
  },
  // イベント表示関連のスタイル
  eventsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  eventsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  noEventsText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 20,
  },
  eventItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
}); 