import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeftButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>特色選択</Text>
        <TouchableOpacity onPress={handleComplete} style={styles.headerRightButton}>
          <Text style={styles.doneButtonText}>完了</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    width: '100%',
    height: 115, // ヘッダーの縦幅を調整
    paddingTop: StatusBar.currentHeight, // ステータスバーの高さ分を確保
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    position: 'absolute',
    bottom: 10, // ヘッダー下部からの距離を調整
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerLeftButton: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerRightButton: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  doneButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
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