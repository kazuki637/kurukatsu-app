import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const ACTIVITY_WEEKDAYS = [
  '月曜日',
  '火曜日',
  '水曜日',
  '木曜日',
  '金曜日',
  '土曜日',
  '日曜日',
  '不定期',
];

const ActivityDaySelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [selectedDays, setSelectedDays] = useState(currentSelection || []);

  const handleToggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(selectedDays);
    }
    navigation.goBack();
  };

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedDays);
    });
    return unsubscribe;
  }, [navigation, selectedDays, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="活動曜日選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <FlatList
          data={ACTIVITY_WEEKDAYS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleToggleDay(item)}
            >
              <Text style={styles.listItemText}>{item}</Text>
              {selectedDays.includes(item) && (
                <Ionicons name="checkmark" size={24} color="#007bff" />
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#eef2f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#eef2f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default ActivityDaySelectionScreen;
