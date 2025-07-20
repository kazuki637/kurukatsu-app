import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  TextInput, 
  ScrollView, 
  Platform, 
  Switch, 
  Keyboard,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

export default function AddScheduleScreen({ route, navigation }) {
  const { selectedDate, circleId, editMode, eventData } = route.params;
  
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState(new Date());
  const [selectedEndTime, setSelectedEndTime] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState('#007bff');
  const scrollViewRef = useRef(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // 編集モードの場合、既存のデータを初期値として設定
  React.useEffect(() => {
    if (editMode === true && eventData) {
      setNewTitle(eventData.title || '');
      setNewDescription(eventData.description || '');
      setIsAllDay(eventData.isAllDay || false);
      setStartTime(eventData.startTime || '');
      setEndTime(eventData.endTime || '');
      setLocation(eventData.location || '');
      setSelectedColor(eventData.color || '#007bff');
      
      // 時間の初期値を設定
      if (eventData.startTime) {
        const [hours, minutes] = eventData.startTime.split(':');
        const startDate = new Date();
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setSelectedStartTime(startDate);
      }
      
      if (eventData.endTime) {
        const [hours, minutes] = eventData.endTime.split(':');
        const endDate = new Date();
        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setSelectedEndTime(endDate);
      }
    }
  }, [editMode, eventData]);

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const handleSaveEvent = async () => {
    if (!newTitle.trim()) {
      Alert.alert('入力エラー', 'タイトルを入力してください');
      return;
    }

    try {
      const formatDate = (date) => {
        // タイムゾーンの影響を避けるため、ローカル日付として処理
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const updateData = {
        title: newTitle.trim(),
        date: formatDate(selectedDate),
        isAllDay: isAllDay,
        startTime: isAllDay ? '' : startTime.trim(),
        endTime: isAllDay ? '' : endTime.trim(),
        description: newDescription.trim(),
        location: location.trim(),
        color: selectedColor,
        updatedAt: new Date()
      };

      if (editMode === true && route.params.eventData && route.params.eventData.id) {
        // 編集モード：既存のスケジュールを更新
        const eventRef = doc(db, 'circles', circleId, 'events', route.params.eventData.id);
        
        await updateDoc(eventRef, updateData);
        Alert.alert('成功', 'スケジュールが更新されました', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // 新規追加モード
        const eventsRef = collection(db, 'circles', circleId, 'events');
        const newEventData = { ...updateData };
        newEventData.createdAt = new Date();
        delete newEventData.updatedAt;
        await addDoc(eventsRef, newEventData);
        Alert.alert('成功', 'スケジュールが追加されました', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      Alert.alert('エラー', editMode ? 'スケジュールの更新に失敗しました' : 'スケジュールの追加に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>キャンセル</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{editMode ? '予定を編集' : '新しい予定'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleSaveEvent}
        >
          <Text style={styles.headerButtonText} numberOfLines={1} adjustsFontSizeToFit={true}>保存</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 選択された日付表示 */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        </View>

        {/* 入力フォーム */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.form} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContent}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
        {/* タイトル行 */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>タイトル</Text>
          <TextInput 
            style={styles.titleInput} 
            value={newTitle} 
            onChangeText={setNewTitle} 
            placeholder="タイトル"
            onFocus={() => {
              if (!isTimePickerOpen) {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }, 100);
              }
            }}
          />
        </View>

        {/* 終日予定トグル */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>終日予定</Text>
          <Switch 
            value={isAllDay} 
            onValueChange={setIsAllDay}
            trackColor={{ false: '#e0e0e0', true: '#007bff' }}
            thumbColor={isAllDay ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* 開始時刻 */}
        {!isAllDay && (
                      <TouchableOpacity 
              style={styles.timeRow}
              onPress={() => {
                setShowStartTimePicker(true);
                setIsTimePickerOpen(true);
              }}
              activeOpacity={0.7}
            >
            <Text style={styles.timeLabel}>開始</Text>
            <View style={styles.timeValueContainer}>
              <Text style={styles.timeValue}>
                {startTime || '17:00'}
              </Text>
            </View>
            {showStartTimePicker && (
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={selectedStartTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale="ja-JP"
                  minuteInterval={5}
                  onChange={(event, selectedTime) => {
                    setShowStartTimePicker(Platform.OS === 'ios');
                    setIsTimePickerOpen(false);
                    if (selectedTime) {
                      setSelectedStartTime(selectedTime);
                      const hours = String(selectedTime.getHours()).padStart(2, '0');
                      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
                      setStartTime(`${hours}:${minutes}`);
                    }
                  }}
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* 終了時刻 */}
        {!isAllDay && (
                      <TouchableOpacity 
              style={styles.timeRow}
              onPress={() => {
                setShowEndTimePicker(true);
                setIsTimePickerOpen(true);
              }}
              activeOpacity={0.7}
            >
            <Text style={styles.timeLabel}>終了</Text>
            <View style={styles.timeValueContainer}>
              <Text style={styles.timeValue}>
                {endTime || '18:00'}
              </Text>
            </View>
            {showEndTimePicker && (
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={selectedEndTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale="ja-JP"
                  minuteInterval={5}
                  onChange={(event, selectedTime) => {
                    setShowEndTimePicker(Platform.OS === 'ios');
                    setIsTimePickerOpen(false);
                    if (selectedTime) {
                      setSelectedEndTime(selectedTime);
                      const hours = String(selectedTime.getHours()).padStart(2, '0');
                      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
                      setEndTime(`${hours}:${minutes}`);
                    }
                  }}
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* 場所入力 */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>場所</Text>
          <TextInput 
            style={styles.formInput} 
            value={location}
            onChangeText={setLocation}
            placeholder="場所"
            onFocus={() => {
              if (!isTimePickerOpen) {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 200, animated: true });
                }, 100);
              }
            }}
          />
        </View>

        {/* 色選択 */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>色</Text>
          <View style={styles.colorContainer}>
            {['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c'].map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColorOption
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 詳細入力 */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>詳細</Text>
          <TouchableOpacity 
            style={styles.detailInputContainer} 
            activeOpacity={1} 
            onPress={() => Keyboard.dismiss()}
          >
            <TextInput 
              style={[styles.formInput, styles.detailInput]} 
              value={newDescription} 
              onChangeText={setNewDescription} 
              placeholder="詳細"
              multiline
              numberOfLines={4}
              onFocus={() => {
                if (!isTimePickerOpen) {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 400, animated: true });
                  }, 100);
                }
              }}
            />
          </TouchableOpacity>
        </View>
        </ScrollView>

        {/* フッター保存ボタン */}
        <TouchableOpacity 
          style={styles.footerSaveButton} 
          onPress={handleSaveEvent}
        >
          <Text style={styles.footerSaveButtonText}>保存</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  formContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 80,
  },
  headerButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    textAlign: 'center',
    numberOfLines: 1,
    flexShrink: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dateSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    width: 80,
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  timeValue: {
    fontSize: 16,
    color: '#333',
  },
  timeRow: {
    flexDirection: 'column',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timePickerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    width: 80,
  },
  formInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  detailInputContainer: {
    flex: 1,
  },
  detailInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#333',
    borderWidth: 3,
  },
  footerSaveButton: {
    backgroundColor: '#007bff',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerSaveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 