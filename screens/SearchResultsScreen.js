import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, StatusBar, Modal } from 'react-native';
import { Image } from 'expo-image'; // expo-image を使用
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, collection, getDocs, setDoc, serverTimestamp, updateDoc, arrayRemove, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';

const SearchResultsScreen = ({ route, navigation }) => {
  const { circles } = route.params;
  const [user, setUser] = useState(null);
  const [showOnlyRecruiting, setShowOnlyRecruiting] = useState(false);
  
  // アクションメニューの状態管理
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState(null);
  
  // ブロック機能の状態管理
  const [userBlockedCircleIds, setUserBlockedCircleIds] = useState([]);
  
  // ブロック状態更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateSearchResultsBlockStatus = (blockedIds) => {
      setUserBlockedCircleIds(blockedIds);
    };
    
    return () => {
      delete global.updateSearchResultsBlockStatus;
    };
  }, []);

  // お気に入り状態更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateSearchResultsFavoriteStatus = (favoriteCircleIds) => {
      // お気に入り状態が変更された場合、現在のuserProfileを更新
      if (userProfile) {
        setUserProfile(prev => ({
          ...prev,
          favoriteCircleIds: favoriteCircleIds
        }));
      }
    };
    
    return () => {
      delete global.updateSearchResultsFavoriteStatus;
    };
  }, [userProfile]);
  
  // 初回ロード時にブロック状態を取得
  useEffect(() => {
    const fetchUserBlocks = async () => {
      if (user) {
        try {
          const blocksRef = collection(db, 'users', user.uid, 'blocks');
          const blocksSnapshot = await getDocs(blocksRef);
          const blockedIds = blocksSnapshot.docs.map(doc => doc.id);
          setUserBlockedCircleIds(blockedIds);
        } catch (error) {
          console.error('Error fetching user blocks:', error);
          setUserBlockedCircleIds([]);
        }
      }
    };
    fetchUserBlocks();
  }, [user]);
  
  // ユーザープロフィールの状態管理
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);

  // ブロック状態の取得
  useEffect(() => {
    if (user) {
      const fetchUserBlocks = async () => {
        try {
          const blocksRef = collection(db, 'users', user.uid, 'blocks');
          const blocksSnapshot = await getDocs(blocksRef);
          const blockedIds = blocksSnapshot.docs.map(doc => doc.id);
          setUserBlockedCircleIds(blockedIds);
        } catch (error) {
          console.error('Error fetching user blocks:', error);
        }
      };
      fetchUserBlocks();
    } else {
      setUserBlockedCircleIds([]);
    }
  }, [user]);
  
  // 画面がフォーカスされたときにブロック状態を再取得
  // イベントベース更新のため、フォーカス時のブロック状態取得は削除
  // ブロック操作時にリアルタイム更新される

  // ユーザープロフィールの取得
  useEffect(() => {
    let unsubscribe;
    if (user) {
      try {
        const userDoc = doc(db, 'users', user.uid);
        unsubscribe = onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          }
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    } else {
      setUserProfile(null);
    }
    
    // クリーンアップ関数
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);



  // フィルタリングされたサークルリストを計算（いいね数でソート、ブロックしたサークルを除外）
  const filteredCircles = (showOnlyRecruiting 
    ? circles.filter(circle => 
        circle.welcome?.isRecruiting === true && 
        !userBlockedCircleIds.includes(circle.id)
      )
    : circles.filter(circle => 
        !userBlockedCircleIds.includes(circle.id)
      )
  ).sort((a, b) => (b.likes || 0) - (a.likes || 0));

  // アクションシートの表示
  const showActionSheetForCircle = (circle) => {
    setSelectedCircle(circle);
    setActionMenuVisible(true);
  };

  // アクションシートの非表示
  const hideActionSheet = () => {
    setActionMenuVisible(false);
    // フェードアニメーション完了後にselectedCircleをクリア
    setTimeout(() => {
      setSelectedCircle(null);
    }, 300); // fadeアニメーションの標準時間
  };

  // ブロック機能
  const handleBlock = async () => {
    if (!selectedCircle || !user) return;
    
    // 所属チェック
    if (isUserMemberOfCircle(selectedCircle.id)) {
      Alert.alert('ブロック不可', '所属しているサークルはブロックできません。');
      return;
    }
    
    // 既にブロック済みかチェック
    if (userBlockedCircleIds.includes(selectedCircle.id)) {
      Alert.alert('エラー', '既にブロック済みのサークルです。');
      return;
    }
    
    try {
      // ブロックデータを作成
      const blockData = {
        blockedCircleId: selectedCircle.id,
        blockedCircleName: selectedCircle.name,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid, 'blocks', selectedCircle.id), blockData);
      
      // ブロック操作完了（スナップショットリスナーで自動更新される）
      
      // いいね！している場合は削除
      if (userProfile && userProfile.favoriteCircleIds && userProfile.favoriteCircleIds.includes(selectedCircle.id)) {
        const userDocRef = doc(db, 'users', user.uid);
        const circleDocRef = doc(db, 'circles', selectedCircle.id);
        await updateDoc(userDocRef, { favoriteCircleIds: arrayRemove(selectedCircle.id) });
        await updateDoc(circleDocRef, { likes: increment(-1) });
        
        // グローバルお気に入り状態を更新
        global.updateFavoriteStatus(selectedCircle.id, false);
      }
      
      // ローカル状態を更新
      setUserBlockedCircleIds(prev => [...prev, selectedCircle.id]);
      
      Alert.alert('ブロック完了', `${selectedCircle.name}をブロックしました。`);
      hideActionSheet();
    } catch (error) {
      console.error('Error blocking circle:', error);
      Alert.alert('エラー', 'ブロックに失敗しました。');
    }
  };

  // 所属チェック関数
  const isUserMemberOfCircle = (circleId) => {
    // ユーザープロフィールから所属サークルIDを取得してチェック
    if (userProfile && userProfile.joinedCircleIds) {
      return userProfile.joinedCircleIds.includes(circleId);
    }
    return false;
  };

  // 報告機能
  const handleReport = () => {
    if (selectedCircle) {
      hideActionSheet();
      navigation.navigate('共通', { screen: 'Report', params: {
        circleId: selectedCircle.id,
        circleName: selectedCircle.name
      }});
    }
  };


  const renderItem = ({ item }) => {
    return (
    <TouchableOpacity 
      style={styles.resultItemWrapper}
      onPress={() => navigation.navigate('共通', { screen: 'CircleDetail', params: { circleId: item.id } })}
      activeOpacity={1}
    >
      {/* ヘッダー画像（カードの外側に配置） */}
      {item.headerImageUrl && (
        <Image source={{ uri: item.headerImageUrl }} style={styles.headerImageCard} contentFit="cover" cachePolicy="memory-disk" />
      )}
      
      <View style={[
        styles.resultItem,
        !item.headerImageUrl && styles.resultItemWithoutHeader
      ]}>
        <View style={styles.headerContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.accountImage} cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.accountImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
              <Ionicons name="people-outline" size={40} color="#aaa" />
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.resultTitle} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
            <Text style={styles.resultDetail} numberOfLines={1} ellipsizeMode="tail">{item.universityName} - {item.genre}</Text>
          </View>
          
          {/* 「・・・」ボタン（ヘッダーコンテナ内の右側） */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation(); // サークルアイテムのタップを防ぐ
              showActionSheetForCircle(item);
            }}
            activeOpacity={1}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {item.thumbnailImage && (
          <Image 
            source={{ uri: item.thumbnailImage }}
            style={styles.thumbnailImage}
            placeholder={{ blurhash: 'LKN]y_?b%M_3%Mxu%Mxu%Mxu%Mxu' }} contentFit="cover" transition={1000}
            cachePolicy="memory-disk"
          />
        )}

      </View>
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
                  activeOpacity={1}
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
      
      {/* アクションメニュー */}
      <Modal
        visible={actionMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setActionMenuVisible(false);
          // フェードアニメーション完了後にselectedCircleをクリア
          setTimeout(() => {
            setSelectedCircle(null);
          }, 300);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideActionSheet}
        >
          <View style={styles.actionMenuContainer}>
            {/* 所属していないサークルのみブロックオプションを表示 */}
            {selectedCircle && !isUserMemberOfCircle(selectedCircle.id) && (
              <TouchableOpacity
                style={styles.actionMenuItemWithBorder}
                onPress={handleBlock}
                activeOpacity={1}
              >
                <Ionicons name="ban-outline" size={20} color="#dc3545" />
                <Text style={[styles.actionMenuText, styles.actionMenuTextRed]}>ブロック</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionMenuItemWithBorder}
              onPress={handleReport}
              activeOpacity={1}
            >
              <Ionicons name="flag-outline" size={20} color="#dc3545" />
              <Text style={[styles.actionMenuText, styles.actionMenuTextRed]}>報告する</Text>
            </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={hideActionSheet}
                activeOpacity={1}
              >
                <Ionicons name="close-outline" size={20} color="#666" />
                <Text style={styles.actionMenuText}>キャンセル</Text>
              </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
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
    backgroundColor: '#f0f2f5',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  resultItemWrapper: {
    marginBottom: 10,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  resultItemWithoutHeader: {
    borderTopWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 12,
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
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderBottomWidth: 0,
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
  actionButton: {
    alignSelf: 'center',
    padding: 8,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '80%',
    alignSelf: 'center',
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  actionMenuItemWithBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionMenuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  actionMenuTextRed: {
    color: '#dc3545',
  },
});

export default SearchResultsScreen;