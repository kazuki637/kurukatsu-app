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
          contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleToggleFeature(item)}
              >
                <Text style={styles.listItemText}>{item}</Text>
                <View style={styles.checkmarkContainer}>
                  {selectedFeatures.includes(item) && (
                    <Ionicons name="checkmark" size={24} color="#1380ec" />
                  )}
                </View>
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
    backgroundColor: '#f0f2f5',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  checkmarkContainer: {
    width: 30,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingTop: 16,
  },
});

export default FeatureSelectionScreen;