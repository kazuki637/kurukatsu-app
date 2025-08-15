import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const FEATURES = [
  'イベント充実',
  '友達作り重視',
  '初心者歓迎',
  'ゆるめ',
  '真剣',
  '体育会系',
  'フラット',
  '和やか',
  '賑やか',
];

const FeatureSelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [selectedFeatures, setSelectedFeatures] = useState(currentSelection || []);

  const handleToggleFeature = (feature) => {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedFeatures);
    });
    return unsubscribe;
  }, [navigation, selectedFeatures, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="特徴選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <FlatList
          data={FEATURES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleToggleFeature(item)}
            >
              <Text style={styles.listItemText}>{item}</Text>
              {selectedFeatures.includes(item) && (
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

export default FeatureSelectionScreen;