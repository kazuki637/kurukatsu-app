import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import Video from 'react-native-video'; // Uncomment if you plan to add video functionality later
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function CircleDetailScreen({ route, navigation }) {
  const { circleId } = route.params; // Changed from clubId to circleId
  const [circleData, setCircleData] = useState(null); // Changed from clubData to circleData
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

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
          const favorites = userData.favoriteCircleIds || [];
          const joinedCircles = userData.joinedCircleIds || [];
          setIsFavorite(favorites.includes(circleId));
          setIsMember(joinedCircles.includes(circleId));
        } else {
          setIsFavorite(false);
          setIsMember(false);
        }
      });
      return unsubscribeSnapshot;
    } else {
      setIsFavorite(false);
      setIsMember(false);
    }
  }, [user, circleId]);

  useEffect(() => {
    if (user && circleId) {
      // 申請済みかどうかチェック
      const checkRequest = async () => {
        try {
          const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
          const q = query(requestsRef, where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          setHasRequested(!snapshot.empty);
        } catch (e) {
          setHasRequested(false);
        }
      };
      checkRequest();
    }
  }, [user, circleId]);

  const handleJoinRequest = async () => {
    if (!user) {
      Alert.alert('ログインが必要です', '入会申請にはログインが必要です。');
      return;
    }
    try {
      // ユーザープロフィール取得
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
      await addDoc(requestsRef, {
        userId: user.uid,
        name: userData.name || '',
        university: userData.university || '',
        grade: userData.grade || '',
        email: user.email || '',
        requestedAt: new Date(),
      });
      setHasRequested(true);
      Alert.alert('申請完了', '入会申請を送信しました。');
    } catch (e) {
      Alert.alert('エラー', '申請の送信に失敗しました');
    }
  };

  useEffect(() => {
    const fetchCircleDetail = async () => {
      try {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCircleData({ id: docSnap.id, ...data });
          // メンバー数を設定
          if (data.memberIds && Array.isArray(data.memberIds)) {
            setMemberCount(data.memberIds.length);
          }
        } else {
          Alert.alert("エラー", "サークルが見つかりませんでした。");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error fetching circle detail: ", error);
        Alert.alert("エラー", "サークル情報の取得に失敗しました。");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchCircleDetail();
  }, [circleId]);

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert("ログインが必要です", "お気に入り機能を利用するにはログインしてください。");
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const circleDocRef = doc(db, 'circles', circleId);

    try {
      if (isFavorite) {
        // Remove from favorites
        await updateDoc(userDocRef, { favoriteCircleIds: arrayRemove(circleId) });
        await updateDoc(circleDocRef, { likes: increment(-1) });
        Alert.alert("お気に入り解除", "サークルをお気に入りから削除しました。");
      } else {
        // Add to favorites
        await updateDoc(userDocRef, { favoriteCircleIds: arrayUnion(circleId) });
        await updateDoc(circleDocRef, { likes: increment(1) });
        Alert.alert("お気に入り登録", "サークルをお気に入りに追加しました！");
      }
    } catch (error) {
      console.error("Error toggling favorite: ", error);
      Alert.alert("エラー", "お気に入り操作に失敗しました。");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>サークル情報を読み込み中...</Text>
      </View>
    );
  }

  if (!circleData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>サークル情報がありません。</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Header with Back Button and Save Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          {/* 右上の保存ボタンは削除 */}
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {circleData.imageUrl && <Image source={{ uri: circleData.imageUrl }} style={styles.accountImage} />}
          <Text style={styles.circleName}>{circleData.name}</Text>
          <Text style={styles.universityGenre}>{circleData.universityName} - {circleData.genre}</Text>

          {circleData.thumbnailImage && (
            <Image source={{ uri: circleData.thumbnailImage }} style={styles.thumbnailImage} />
          )}

          <Text style={styles.description}>{circleData.description}</Text>

          {/* Additional Info Sections (from dummy data) */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>活動頻度</Text>
            <Text style={styles.infoText}>{circleData.frequency}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>人数</Text>
            <Text style={styles.infoText}>{circleData.members}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>男女比</Text>
            <Text style={styles.infoText}>{circleData.genderratio}</Text>
          </View>
          {circleData.features && circleData.features.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>特色</Text>
              <Text style={styles.infoText}>{circleData.features.join('、')}</Text>
            </View>
          )}

          {/* メンバー情報 */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>メンバー数</Text>
            <Text style={styles.infoText}>{memberCount}人</Text>
          </View>

          {/* メンバーシップ状態 */}
          {isMember && (
            <View style={styles.infoSection}>
              <View style={styles.memberBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                <Text style={styles.memberBadgeText}>メンバー</Text>
              </View>
            </View>
          )}

          {/* --- 追加情報 --- */}
          {circleData.snsLink ? (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>SNSリンク</Text>
              <TouchableOpacity onPress={() => Linking.openURL(circleData.snsLink)} style={styles.snsButton}>
                <Ionicons name="logo-instagram" size={22} color="#E1306C" style={{ marginRight: 8 }} />
                <Text style={styles.snsButtonText}>{circleData.snsLink}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {circleData.schedule ? (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>新歓スケジュール</Text>
              <Text style={styles.infoText}>{circleData.schedule}</Text>
            </View>
          ) : null}
          {circleData.lineGroupLink ? (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>LINEグループ</Text>
              <TouchableOpacity style={styles.lineButton} onPress={() => Linking.openURL(circleData.lineGroupLink)}>
                <Ionicons name="logo-whatsapp" size={22} color="#06C755" style={{ marginRight: 8 }} />
                <Text style={styles.lineButtonText}>LINEグループを開く</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.copyButton} onPress={() => {navigator.clipboard.writeText(circleData.lineGroupLink); Alert.alert('コピーしました', 'LINEグループリンクをコピーしました');}}>
                <Ionicons name="copy-outline" size={18} color="#333" style={{ marginRight: 4 }} />
                <Text style={styles.copyButtonText}>リンクをコピー</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {/* --- 追加情報ここまで --- */}
        </View>

        {/* Actions (Contact, Favorite, Join) */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleFavorite}>
            <View style={styles.actionButtonContent}>
              <Ionicons name={isFavorite ? "bookmark" : "bookmark-outline"} size={24} color={isFavorite ? "gold" : "#333"} />
              <Text style={styles.actionButtonText}>{isFavorite ? "保存済み" : "保存"}</Text>
            </View>
          </TouchableOpacity>
          {/* 入会申請ボタン */}
          {isMember ? (
            <View style={[styles.actionButton, { backgroundColor: '#28a745', borderColor: '#28a745' }]}> 
              <View style={styles.actionButtonContent}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>入会済み</Text>
              </View>
            </View>
          ) : hasRequested ? (
            <View style={[styles.actionButton, { backgroundColor: '#eee', borderColor: '#ccc' }]}> 
              <View style={styles.actionButtonContent}>
                <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                <Text style={[styles.actionButtonText, { color: '#28a745' }]}>申請済み</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#007bff', borderColor: '#007bff' }]} onPress={handleJoinRequest}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="person-add" size={24} color="#fff" />
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>入会申請</Text>
              </View>
            </TouchableOpacity>
          )}
          {/* Assuming contact info is not in dummy data, this will be commented out for now */}
          {/* <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`mailto:${circleData.contactInfo}`)}>
            <View style={styles.actionButtonContent}>
              <Ionicons name="mail-outline" size={24} color="#333" />
              <Text style={styles.actionButtonText}>問い合わせ</Text>
            </View>
          </TouchableOpacity> */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 5,
  },
  saveButton: {
    padding: 5,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  mainContent: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  accountImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  circleName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  universityGenre: {
    fontSize: 18,
    color: 'gray',
    marginBottom: 10,
    textAlign: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 20,
    width: '100%',
  },
  infoSection: {
    width: '100%',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  snsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 8, padding: 8, marginTop: 4 },
  snsButtonText: { color: '#E1306C', fontSize: 15, textDecorationLine: 'underline' },
  lineButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6ffe6', borderRadius: 8, padding: 8, marginTop: 4 },
  lineButtonText: { color: '#06C755', fontSize: 15, fontWeight: 'bold' },
  copyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, padding: 6, marginTop: 6, alignSelf: 'flex-start' },
  copyButtonText: { color: '#333', fontSize: 13 },
  memberBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#e8f5e8', 
    borderRadius: 20, 
    paddingHorizontal: 12, 
    paddingVertical: 6,
    alignSelf: 'flex-start'
  },
  memberBadgeText: { 
    color: '#28a745', 
    fontSize: 14, 
    fontWeight: 'bold',
    marginLeft: 4
  },
});
