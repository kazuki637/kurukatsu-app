import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const MEMBERS_OPTIONS = [
  '1-10人',
  '11-30人',
  '31-50人',
  '51-100人',
  '100人以上',
];

const MembersSelectionScreen = ({ route, navigation }) => {
  const { currentSelection, onComplete } = route.params || {};
  const [selectedMembers, setSelectedMembers] = useState(currentSelection || []);

  const handleToggleMembers = (members) => {
    setSelectedMembers(prev =>
      prev.includes(members) ? prev.filter(m => m !== members) : [...prev, members]
    );
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(selectedMembers);
    }
    navigation.goBack();
  };

  // 戻る時にonCompleteを呼ぶ
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (onComplete) onComplete(selectedMembers);
    });
    return unsubscribe;
  }, [navigation, selectedMembers, onComplete]);

  return (
    <View style={styles.fullScreenContainer}>
      <CommonHeader title="メンバー選択" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={styles.contentSafeArea}>
        <FlatList
          data={MEMBERS_OPTIONS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => handleToggleMembers(item)}
            >
              <Text style={styles.listItemText}>{item}</Text>
              {selectedMembers.includes(item) && (
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

export default MembersSelectionScreen;