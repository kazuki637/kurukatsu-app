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


// 追加: 4桁時刻入力用のカスタムコンポーネント
function TimeInput({ value, onChange, placeholder }) {
  // value: "hhmm" 形式の4桁または空文字
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // 入力値を4桁に制限
  const handleChange = (text) => {
    // 数字以外除去
    let newText = text.replace(/[^0-9]/g, "");
    if (newText.length > 4) newText = newText.slice(0, 4);
    onChange(newText);
  };
  
  // バックスペース対応
  const handleKeyPress = (e) => {
    if (e.nativeEvent.key === 'Backspace' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  
  // 表示用分割
  const h1 = value[0] || '';
  const h2 = value[1] || '';
  const m1 = value[2] || '';
  const m2 = value[3] || '';
  
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center' }}
      activeOpacity={1}
      onPress={() => inputRef.current && inputRef.current.focus()}
    >
      <View style={[
        styles.timeInputBox,
        isFocused && styles.timeInputBoxFocused
      ]}>
        <Text style={[
          styles.timeInputText,
          isFocused && styles.timeInputTextFocused
        ]}>{h1}</Text>
      </View>
      <View style={[
        styles.timeInputBox,
        isFocused && styles.timeInputBoxFocused
      ]}>
        <Text style={[
          styles.timeInputText,
          isFocused && styles.timeInputTextFocused
        ]}>{h2}</Text>
      </View>
      <Text style={{ fontSize: 20, marginHorizontal: 4 }}>:</Text>
      <View style={[
        styles.timeInputBox,
        isFocused && styles.timeInputBoxFocused
      ]}>
        <Text style={[
          styles.timeInputText,
          isFocused && styles.timeInputTextFocused
        ]}>{m1}</Text>
      </View>
      <View style={[
        styles.timeInputBox,
        isFocused && styles.timeInputBoxFocused
      ]}>
        <Text style={[
          styles.timeInputText,
          isFocused && styles.timeInputTextFocused
        ]}>{m2}</Text>
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onKeyPress={handleKeyPress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        maxLength={4}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        placeholder={placeholder}
        blurOnSubmit={false}
        caretHidden
      />
    </TouchableOpacity>
  );
}

export default function AddScheduleScreen({ route, navigation }) {
  const { selectedDate, circleId, editMode, eventData } = route.params;
  
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  // state: startTime, endTime → "hhmm"形式で管理
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [location, setLocation] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007bff');

  const scrollViewRef = useRef(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  // Add: 詳細欄のref
  // detailInputRefの定義を削除

  // 編集モードの場合、既存のデータを初期値として設定
  React.useEffect(() => {
    if (editMode === true && eventData) {
      setNewTitle(eventData.title || '');
      setNewDescription(eventData.description || '');
      setIsAllDay(eventData.isAllDay || false);
      // startTime, endTime → "hhmm"形式に変換
      if (eventData.startTime) {
        setStartTimeInput(eventData.startTime.replace(':', ''));
      }
      if (eventData.endTime) {
        setEndTimeInput(eventData.endTime.replace(':', ''));
      }
      setLocation(eventData.location || '');
      setSelectedColor(eventData.color || '#007bff');
      
      
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
        startTime: isAllDay ? '' : (startTimeInput.length === 4 ? `${startTimeInput.slice(0,2)}:${startTimeInput.slice(2,4)}` : ''),
        endTime: isAllDay ? '' : (endTimeInput.length === 4 ? `${endTimeInput.slice(0,2)}:${endTimeInput.slice(2,4)}` : ''),
        description: newDescription.trim(),
        location: location.trim(),
        color: selectedColor,

        updatedAt: new Date()
      };

      if (editMode === true && route.params.eventData && route.params.eventData.id) {
        // 編集モード：既存のスケジュールを更新
        const eventRef = doc(db, 'circles', circleId, 'schedule', route.params.eventData.id);
        
        await updateDoc(eventRef, updateData);
        Alert.alert('成功', 'スケジュールが更新されました', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // 新規追加モード
        const eventsRef = collection(db, 'circles', circleId, 'schedule');
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
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>開始</Text>
            <TimeInput
              value={startTimeInput}
              onChange={setStartTimeInput}
              placeholder="hhmm"
            />
          </View>
        )}

        {/* 終了時刻 */}
        {!isAllDay && (
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>終了</Text>
            <TimeInput
              value={endTimeInput}
              onChange={setEndTimeInput}
              placeholder="hhmm"
            />
          </View>
        )}

        {/* 場所入力 */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>場所</Text>
          <TextInput 
            style={styles.formInput} 
            value={location}
            onChangeText={setLocation}
            placeholder="場所"
          />
        </View>

        {/* 色選択 */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>色</Text>
          <View style={styles.colorContainer}>
            {['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'].map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  selectedColor === color && styles.selectedColorOption
                ]}
                onPress={() => setSelectedColor(color)}
              >
                <View style={[styles.colorCircle, { backgroundColor: color }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>



        {/* 詳細入力 */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>詳細</Text>
          <View style={styles.detailInputContainer}>
            <TextInput 
              style={[styles.formInput, styles.detailInput]} 
              value={newDescription} 
              onChangeText={setNewDescription} 
              placeholder="詳細を入力してください"
              multiline
            />
          </View>
        </View>
        </ScrollView>
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
    marginBottom: 8, // 追加: 下余白
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
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  // 追加: 4桁分割表示用スタイル
  timeInputBox: {
    width: 32,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafbfc',
  },
  timeInputBoxFocused: {
    borderColor: '#007bff',
    borderWidth: 2,
    backgroundColor: '#fff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeInputText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  timeInputTextFocused: {
    color: '#007bff',
  },
}); 