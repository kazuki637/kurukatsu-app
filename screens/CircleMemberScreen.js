import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FlatList, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// 高度に洗練されたカレンダーコンポーネント
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
    // タイムゾーンの影響を避けるため、ローカル日付として処理
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
    if (isAnimating) return;
    setIsAnimating(true);
    
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction > 0) {
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
          style={[styles.monthButton, isAnimating && styles.disabledButton]}
          activeOpacity={0.7}
          disabled={isAnimating}
        >
          <Ionicons name="chevron-back" size={28} color="#007bff" />
        </TouchableOpacity>
        
        <View style={styles.monthTitleContainer}>
          <Text style={styles.monthTitle}>
            {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
          </Text>
          <Text style={styles.monthSubtitle}>
            {getEventCount(currentMonth) > 0 ? `${getEventCount(currentMonth)}件のスケジュール` : 'スケジュールなし'}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => changeMonth(1)} 
          style={[styles.monthButton, isAnimating && styles.disabledButton]}
          activeOpacity={0.7}
          disabled={isAnimating}
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
  const [expandedEvents, setExpandedEvents] = useState(new Set());

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
    const d = new Date(date);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekday}）`;
  };

  // 詳細表示の切り替え
  const toggleEventDetails = (eventId) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // タブ切り替え用
  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {eventsLoading ? (
              <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />
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
                            {hasDescription && (
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
                            )}
                          </View>
                          {hasDescription && isExpanded && (
                            <Text style={styles.eventDescription}>{event.description}</Text>
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
}); 