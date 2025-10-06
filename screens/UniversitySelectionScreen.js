import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

import universitiesData from '../universities.json';

// 最適化されたリストアイテムコンポーネント
const UniversityListItem = React.memo(({ item, isSelected, onToggle }) => (
  <TouchableOpacity
    style={styles.listItem}
    onPress={() => onToggle(item)}
  >
    <Text style={styles.listItemText}>{item}</Text>
    <View style={styles.checkmarkContainer}>
      {isSelected && (
        <Ionicons name="checkmark" size={24} color="#1380ec" />
      )}
    </View>
  </TouchableOpacity>
));

const UniversitySelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [searchText, setSearchText] = useState('');
  const [allUniversities, setAllUniversities] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [selectedUniversities, setSelectedUniversities] = useState(currentSelection || []);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  useEffect(() => {
    const fetchUniversities = () => {
      setLoadingUniversities(true);
      const uniqueUniversities = Array.from(new Set(universitiesData));
      setAllUniversities(uniqueUniversities);
      setFilteredUniversities(uniqueUniversities);
      setLoadingUniversities(false);
    };

    fetchUniversities();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = allUniversities.filter(uni =>
        uni.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUniversities(filtered);
    } else {
      setFilteredUniversities(allUniversities);
    }
  }, [searchText, allUniversities]);

  const handleToggleUniversity = useCallback((universityName) => {
    setSelectedUniversities(prev =>
      prev.includes(universityName)
        ? prev.filter(uni => uni !== universityName)
        : [...prev, universityName]
    );
  }, []);

  // 選択状態をSetに変換して高速化
  const selectedSet = useMemo(() => new Set(selectedUniversities), [selectedUniversities]);

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedUniversities);
    });
    return unsubscribe;
  }, [navigation, selectedUniversities, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="大学選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="大学名を入力"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {loadingUniversities ? (
          <ActivityIndicator size="small" color="#999" style={styles.loadingIndicator} />
        ) : (
          <FlatList
            data={filteredUniversities}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <UniversityListItem
                item={item}
                isSelected={selectedSet.has(item)}
                onToggle={handleToggleUniversity}
              />
            )}
            getItemLayout={(data, index) => ({
              length: 72, // paddingVertical(16*2) + marginBottom(8) + アイテム高さ
              offset: 72 * index,
              index,
            })}
            removeClippedSubviews={true}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            ListEmptyComponent={() => (
              <Text style={styles.emptyListText}>該当する大学がありません。</Text>
            )}
          />
        )}
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
    color: '#6b7280',
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1f2937',
  },
  loadingIndicator: {
    marginTop: 20,
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
    flex: 1, // テキストが残りのスペースを使用
  },
  checkmarkContainer: {
    width: 30, // 固定幅でチェックマーク領域を確保
    height: 24, // 固定高さ
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#6b7280',
    marginHorizontal: 16,
  },
});

export default UniversitySelectionScreen;