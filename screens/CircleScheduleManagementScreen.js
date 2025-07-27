import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, TextInput, Modal, ScrollView, Platform, Switch, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';

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
    return day === 0 || day === 6; // 日曜日または土曜日
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
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
    
    // アニメーション完了後にフラグをリセット
    setTimeout(() => setIsAnimating(false), 300);
  };



  // イベント数の取得
  const getEventCount = (date) => {
    const dateStr = formatDate(date);
    return events.filter(event => event.date === dateStr).length;
  };

  // セル内の予定表示
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
              isPast(day.date) && styles.pastDay,
              isSelected(day.date) && styles.selectedDayContent
            ]}>
              {isSelected(day.date) && <View style={styles.selectedDayBorder} />}
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
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function CircleScheduleManagementScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());


  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRef = collection(db, 'circles', circleId, 'schedule');
        const q = query(eventsRef, orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(list);
      } catch (e) {
        Alert.alert('エラー', 'スケジュール情報の取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [circleId]);

  // 画面がフォーカスされた時にイベントを再取得
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const fetchEvents = async () => {
        try {
          const eventsRef = collection(db, 'circles', circleId, 'schedule');
          const q = query(eventsRef, orderBy('date', 'asc'));
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setEvents(list);
        } catch (e) {
          console.error('Error fetching events:', e);
        }
      };
      fetchEvents();
    });

    return unsubscribe;
  }, [navigation, circleId]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };



  // 新規スケジュール追加画面への遷移
  const navigateToAddSchedule = () => {
    navigation.navigate('AddSchedule', {
      selectedDate: selectedDate,
      circleId: circleId
    });
  };

  // スケジュール編集画面への遷移
  const navigateToEditSchedule = (event) => {
    navigation.navigate('AddSchedule', {
      selectedDate: selectedDate,
      circleId: circleId,
      editMode: true,
      eventData: event
    });
  };

  const handleDelete = async (eventId) => {
    Alert.alert('確認', 'このスケジュールを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'circles', circleId, 'schedule', eventId));
          setEvents(prev => prev.filter(e => e.id !== eventId));
        } catch (e) {
          Alert.alert('エラー', '削除に失敗しました');
        }
      }}
    ]);
  };

  const getEventsForSelectedDate = () => {
    // メインコンポーネント内でformatDate関数を定義
    const formatDate = (date) => {
      // タイムゾーンの影響を避けるため、ローカル日付として処理
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateStr = formatDate(selectedDate);
    const filteredEvents = events.filter(event => event.date === dateStr);
    return filteredEvents;
  };

  const formatDateForDisplay = (date) => {
    const d = new Date(date);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekday}）`;
  };

  // ローディング状態でも画面を表示し、データが取得できたら更新する

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <CommonHeader title="スケジュール管理" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView>
          {/* カレンダー */}
          <Calendar 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            events={events}
          />

          {/* 選択された日付のスケジュール */}
          <View style={styles.scheduleSection}>
            <Text style={styles.scheduleTitle}>
              {formatDateForDisplay(selectedDate)}の予定
            </Text>
            {getEventsForSelectedDate().length > 0 ? (
              getEventsForSelectedDate().map(event => (
                <TouchableOpacity 
                  key={event.id} 
                  style={[
                    styles.eventItem,
                    { borderLeftColor: event.color || '#007bff' }
                  ]}
                  onPress={() => navigateToEditSchedule(event)}
                  activeOpacity={0.7}
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
                    <View style={styles.eventActions}>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          navigateToEditSchedule(event);
                        }}
                        style={styles.editButton}
                      >
                        <Ionicons name="create-outline" size={20} color="#007bff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(event.id);
                        }}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash" size={20} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {event.description && (
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noEventText}>この日に予定はありません</Text>
            )}
            
            {/* 追加ボタン */}
            <TouchableOpacity style={styles.addButton} onPress={navigateToAddSchedule}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>スケジュール追加</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    alignItems: 'center', 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#fff'
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  container: {
    flex: 1,
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
  eventDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#28a745',
  },
  selectedEventDot: {
    backgroundColor: '#fff',
    shadowColor: '#fff',
  },
  eventCountBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  selectedEventCountBadge: {
    backgroundColor: '#fff',
    shadowColor: '#fff',
  },
  eventCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  selectedEventCountText: {
    color: '#007bff',
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
  selectedDayEventItem: {
    backgroundColor: '#fff',
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
  selectedDayEventText: {
    color: '#007bff',
    fontWeight: '700',
  },
  moreEventsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // 洗練されたスケジュールセクション
  scheduleSection: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    letterSpacing: 0.3,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  eventTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
  },
  eventTimeBadge: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  eventLocationBadge: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffebee',
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 44,
    marginBottom: 6,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 44,
    lineHeight: 22,
  },
  noEventText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 32,
    fontSize: 16,
  },
  
  // 追加ボタン
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    borderRadius: 24,
    paddingVertical: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // モーダル関連
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    width: '100%',
  },
  bottomSheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  bottomSheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  textAreaContainer: {
    maxHeight: 120,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  addEventButton: {
    backgroundColor: '#007bff',
  },
  addEventButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // 時間選択ピッカー関連
  timePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
  },
  timePickerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  // スケジュール追加・編集画面のスタイル

}); 