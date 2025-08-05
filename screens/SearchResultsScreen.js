import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Image } from 'expo-image'; // expo-image を使用
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';

const SearchResultsScreen = ({ route, navigation }) => {
  const { circles } = route.params;
  const [user, setUser] = useState(null);
  const [showOnlyRecruiting, setShowOnlyRecruiting] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);



  // フィルタリングされたサークルリストを計算
  const filteredCircles = showOnlyRecruiting 
    ? circles.filter(circle => circle.welcome?.isRecruiting === true)
    : circles;



  const renderItem = ({ item }) => {
    return (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => navigation.navigate('CircleDetail', { circleId: item.id })}
    >
      <View style={styles.headerContainer}>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.accountImage} />
        )}
        <View style={styles.headerTextContainer}>
          <Text style={styles.resultTitle}>{item.name}</Text>
          <Text style={styles.resultDetail}>{item.universityName} - {item.genre}</Text>
        </View>
      </View>

      {/* ヘッダー画像（サークル詳細画面のheaderImageUrl） */}
      {item.headerImageUrl && (
        <Image source={{ uri: item.headerImageUrl }} style={styles.headerImageCard} resizeMode="cover" />
      )}

      {item.thumbnailImage && (
        <Image 
          source={{ uri: item.thumbnailImage }}
          style={styles.thumbnailImage}
          placeholder={{ blurhash: 'LKN]y_?b%M_3%Mxu%Mxu%Mxu%Mxu' }} contentFit="cover" transition={1000}
        />
      )}

      {item.description ? (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText} numberOfLines={3}>{item.description}</Text>
        </View>
      ) : null}
      
      {/* 活動場所と募集中表示 */}
      {(item.welcome?.isRecruiting === true || item.activityLocation) && (
        <View style={styles.infoContainer}>
          {item.welcome?.isRecruiting === true && (
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.infoText}>募集中</Text>
            </View>
          )}
          {item.activityLocation && (
            <View style={styles.infoItem}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.infoText}>{item.activityLocation}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

  return (
    <View style={[styles.fullScreenContainer, { flex: 1 }]}> 
      <CommonHeader title="検索結果" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={[styles.contentSafeArea, { flex: 1 }]}> 
        <FlatList
          data={filteredCircles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderItem({ item })}
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
          extraData={[showOnlyRecruiting]}
                      ListHeaderComponent={() => (
              <View style={styles.filterContainer}>
                <TouchableOpacity 
                  style={styles.filterCheckbox}
                  onPress={() => setShowOnlyRecruiting(!showOnlyRecruiting)}
                >
                  <View style={[styles.checkbox, showOnlyRecruiting && styles.checkboxChecked]}>
                    {showOnlyRecruiting && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.filterText}>入会募集中のサークルのみ表示</Text>
                </TouchableOpacity>
                <Text style={styles.resultCountText}>
                  検索結果<Text style={styles.resultCountNumber}>{filteredCircles.length}</Text>件
                </Text>
              </View>
            )}
          ListEmptyComponent={() => (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>該当するサークルは見つかりませんでした。</Text>
            </View>
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
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  accountImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  resultDetail: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    padding: 5,
  },
  thumbnailImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  descriptionContainer: {
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  headerImageCard: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 10,
  },
  // フィルター関連のスタイル
  filterContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  filterCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007bff',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
  },
  filterText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  resultCountText: {
    fontSize: 14,
    color: '#333',
    marginTop: 15,
    marginLeft: 0,
  },
  resultCountNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
});

export default SearchResultsScreen;