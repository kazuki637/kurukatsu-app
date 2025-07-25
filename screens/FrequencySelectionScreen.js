import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const FREQUENCIES = [
  '週１回',
  '週２回',
  '週３回',
  '月１回',
  '不定期',
];

const FrequencySelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [selectedFrequencies, setSelectedFrequencies] = useState(currentSelection || []);

  const handleToggleFrequency = (frequency) => {
    setSelectedFrequencies(prev =>
      prev.includes(frequency) ? prev.filter(f => f !== frequency) : [...prev, frequency]
    );
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(selectedFrequencies);
    }
    navigation.goBack();
  };

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedFrequencies);
    });
    return unsubscribe;
  }, [navigation, selectedFrequencies, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="活動頻度選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <FlatList
          data={FREQUENCIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleToggleFrequency(item)}
            >
              <Text style={styles.listItemText}>{item}</Text>
              {selectedFrequencies.includes(item) && (
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

export default FrequencySelectionScreen;