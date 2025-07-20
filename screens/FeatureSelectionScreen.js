import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const FEATURES = [
  'ワイワイ',
  '真剣',
  '初心者歓迎',
  '友達作り重視',
  'イベント充実',
  '勉強サポート',
  '国際交流',
  'アットホーム',
  'スポーツ志向',
];

const FeatureSelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [selectedFeatures, setSelectedFeatures] = useState(currentSelection || []);

  const handleToggleFeature = (feature) => {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(selectedFeatures);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="特色選択" showBackButton onBack={() => navigation.goBack()} rightButtonLabel="完了" onRightButtonPress={handleComplete} />
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