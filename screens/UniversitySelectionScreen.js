import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

import universitiesData from '../universities.json';

const UniversitySelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [searchText, setSearchText] = useState('');
  const [allUniversities, setAllUniversities] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [selectedUniversities, setSelectedUniversities] = useState(currentSelection || []);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  useEffect(() => {
    const fetchUniversities = async () => {
      setLoadingUniversities(true);
      const uniqueUniversities = Array.from(new Set(universitiesData));
      await new Promise(resolve => setTimeout(resolve, 500));
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

  const handleToggleUniversity = (universityName) => {
    setSelectedUniversities(prev =>
      prev.includes(universityName)
        ? prev.filter(uni => uni !== universityName)
        : [...prev, universityName]
    );
  };

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
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
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
            keyExtractor={(item, index) => item + index}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleToggleUniversity(item)}
              >
                <Text style={styles.listItemText}>{item}</Text>
                {selectedUniversities.includes(item) && (
                  <Ionicons name="checkmark" size={24} color="#007bff" />
                )}
              </TouchableOpacity>
            )}
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 20,
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
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default UniversitySelectionScreen;