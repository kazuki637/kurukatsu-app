import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const GENRES = [
  'スポーツ（球技）',
  'スポーツ（球技以外）',
  'アウトドア・旅行',
  '文化・教養',
  '芸術・芸能',
  '音楽',
  '学問・研究',
  '趣味・娯楽',
  '国際交流',
  'ボランティア',
  'イベント',
  'オールラウンド',
  'その他',
];

const GenreSelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [selectedGenres, setSelectedGenres] = useState(currentSelection || []);

  const handleToggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(selectedGenres);
    }
    navigation.goBack();
  };

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedGenres);
    });
    return unsubscribe;
  }, [navigation, selectedGenres, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="ジャンル選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <FlatList
          data={GENRES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleToggleGenre(item)}
              >
                <Text style={styles.listItemText}>{item}</Text>
                <View style={styles.checkmarkContainer}>
                  {selectedGenres.includes(item) && (
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

export default GenreSelectionScreen;