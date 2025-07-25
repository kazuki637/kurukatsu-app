import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const GENDER_RATIO_OPTIONS = [
  '男性多め',
  '女性多め',
  '半々',
];

const GenderRatioSelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [selectedGenderRatios, setSelectedGenderRatios] = useState(currentSelection || []);

  const handleToggleGenderRatio = (ratio) => {
    setSelectedGenderRatios(prev =>
      prev.includes(ratio) ? prev.filter(r => r !== ratio) : [...prev, ratio]
    );
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(selectedGenderRatios);
    }
    navigation.goBack();
  };

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedGenderRatios);
    });
    return unsubscribe;
  }, [navigation, selectedGenderRatios, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="男女比選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <FlatList
          data={GENDER_RATIO_OPTIONS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleToggleGenderRatio(item)}
            >
              <Text style={styles.listItemText}>{item}</Text>
              {selectedGenderRatios.includes(item) && (
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
    height: 60, // 固定の高さ
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default GenderRatioSelectionScreen;