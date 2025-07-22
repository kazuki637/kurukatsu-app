import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Image } from 'expo-image'; // expo-image を使用
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';

const SearchResultsScreen = ({ route, navigation }) => {
  const { circles } = route.params;
  const [user, setUser] = useState(null);
  const [userSavedCircles, setUserSavedCircles] = useState({});

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const saved = userData.favoriteCircleIds || [];
          const newSaved = {};
          saved.forEach(id => newSaved[id] = true);
          setUserSavedCircles(newSaved);
        } else {
          setUserSavedCircles({});
        }
      });
      return unsubscribeSnapshot;
    } else {
      setUserSavedCircles({});
    }
  }, [user]);

  const toggleSave = async (circleId) => {
    if (!user) {
      Alert.alert("ログインが必要です", "サークルを保存するにはログインしてください。");
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const isCurrentlySaved = userSavedCircles[circleId];

    try {
      if (isCurrentlySaved) {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayRemove(circleId) });
        Alert.alert("保存解除", "サークルを保存済みから削除しました。");
      } else {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayUnion(circleId) });
        Alert.alert("保存完了", "サークルを保存しました！");
      }
      // Optimistic UI update
      setUserSavedCircles(prev => ({
        ...prev,
        [circleId]: !isCurrentlySaved,
      }));
    } catch (error) {
      console.error("Error toggling save: ", error);
      Alert.alert("エラー", "保存操作に失敗しました。");
      // Revert UI on error
      setUserSavedCircles(prev => ({
        ...prev,
        [circleId]: isCurrentlySaved,
      }));
    }
  };

  const renderItem = ({ item, userSavedCircles, toggleSave }) => {
    console.log("Rendering item:", item); // Add this line for debugging
    const isSaved = userSavedCircles[item.id];
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
        <TouchableOpacity style={styles.saveButton} onPress={() => toggleSave(item.id)}>
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={24} color={isSaved ? "gold" : "#666"} />
        </TouchableOpacity>
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
    </TouchableOpacity>
  );
};

  return (
    <View style={[styles.fullScreenContainer, { flex: 1 }]}> 
      <CommonHeader title="検索結果" showBackButton onBack={() => navigation.goBack()} />
      <SafeAreaView style={[styles.contentSafeArea, { flex: 1 }]}> 
        {circles.length > 0 ? (
          <FlatList
            data={circles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderItem({ item, userSavedCircles, toggleSave })}
            contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
            extraData={userSavedCircles}
          />
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>該当するサークルは見つかりませんでした。</Text>
          </View>
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
    marginBottom: 10,
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
});

export default SearchResultsScreen;