import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking, // Import Linking
  SafeAreaView, // Import SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db, storage } from '../firebaseConfig';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import CommonHeader from '../components/CommonHeader';
import useFirestoreDoc from '../hooks/useFirestoreDoc';

const { width } = Dimensions.get('window');
const gridItemSize = (width - 20 * 3) / 2;

// グローバルキャッシュ
// let userProfileCache = null;
// let circlesCache = { joined: [], saved: [] };
// let lastFetchTime = 0;
// const CACHE_DURATION = 30000; // 30秒間キャッシュ

export default function MyPageScreen({ navigation }) {
  const user = auth.currentUser;
  const userId = user ? user.uid : null;
  // ユーザープロフィール取得（キャッシュ30秒）
  const { data: userProfile, loading, error, reload } = useFirestoreDoc(db, userId ? `users/${userId}` : '', { cacheDuration: 30000 });
  const [savedCircles, setSavedCircles] = useState([]);
  const [joinedCircles, setJoinedCircles] = useState([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [imageError, setImageError] = useState(false);

  // 画面がフォーカスされたときにユーザーデータをリロード
  useFocusEffect(
    React.useCallback(() => {
      reload && reload();
    }, [reload])
  );

  // userProfile取得後にサークル情報を取得
  React.useEffect(() => {
    const fetchCircles = async () => {
      if (!userProfile) return;
      setCirclesLoading(true);
      try {
        // joinedCircles
        let joined = [];
        if (userProfile.joinedCircleIds && userProfile.joinedCircleIds.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < userProfile.joinedCircleIds.length; i += batchSize) {
            const batch = userProfile.joinedCircleIds.slice(i, i + batchSize);
            const circlesRef = collection(db, 'circles');
            const q = query(circlesRef, where('__name__', 'in', batch));
            const querySnapshot = await getDocs(q);
            joined.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
        setJoinedCircles(joined);
        // savedCircles
        let saved = [];
        if (userProfile.favoriteCircleIds && userProfile.favoriteCircleIds.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < userProfile.favoriteCircleIds.length; i += batchSize) {
            const batch = userProfile.favoriteCircleIds.slice(i, i + batchSize);
            const circlesRef = collection(db, 'circles');
            const q = query(circlesRef, where('__name__', 'in', batch));
            const querySnapshot = await getDocs(q);
            saved.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
        setSavedCircles(saved);
      } catch (e) {
        setJoinedCircles([]);
        setSavedCircles([]);
      } finally {
        setCirclesLoading(false);
      }
    };
    fetchCircles();
  }, [
    userProfile?.joinedCircleIds && userProfile.joinedCircleIds.join(','),
    userProfile?.favoriteCircleIds && userProfile.favoriteCircleIds.join(',')
  ]);

  // useFocusEffectや冗長なキャッシュ・ローディング処理を削除

  // 初回ローディング時のみローディング画面を表示
  if (loading && !userProfile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" style={{ flex: 1 }} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.container}>
        <Text>ユーザーデータの取得に失敗しました</Text>
        <TouchableOpacity onPress={reload}><Text>再読み込み</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader title="マイページ" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainerSimple}>
              {userProfile?.profileImageUrl && userProfile.profileImageUrl.trim() !== '' && !imageError ? (
                <Image
                  source={{ uri: userProfile.profileImageUrl }}
                  style={styles.profileImage}
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={[styles.profileImage, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                  <Ionicons name="person-outline" size={48} color="#aaa" />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{userProfile?.nickname || 'ユーザー名'}</Text>
            {(userProfile?.isUniversityPublic && (userProfile?.university || '大学名')) || (userProfile?.isGradePublic && (userProfile?.grade || '学年')) ? (
              <Text style={styles.userUniversity}>
                {userProfile?.isUniversityPublic && (userProfile?.university || '大学名')}
                {userProfile?.isUniversityPublic && userProfile?.isGradePublic && (userProfile?.university || '大学名') && (userProfile?.grade || '学年') ? '・' : ''}
                {userProfile?.isGradePublic && (userProfile?.grade || '学年')}
              </Text>
            ) : null}
            <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('ProfileEdit')}>
              <Text style={styles.editProfileButtonText}>プロフィールを編集</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.contentArea}>
            <Text style={styles.contentTitle}>所属しているサークル</Text>
            {circlesLoading ? (
              <ActivityIndicator size="small" color="#007bff" />
            ) : joinedCircles.length > 0 ? (
              <View style={styles.gridContainer}>
                {joinedCircles.map(item => (
                  <TouchableOpacity key={item.id} style={styles.gridItem} onPress={() => navigation.navigate('CircleMember', { circleId: item.id })}>
                    <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} style={styles.gridImage} />
                    <Text style={styles.gridItemText} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyMessage}>所属サークルはまだありません。</Text>
            )}
          </View>
          <View style={styles.contentArea}>
            <Text style={styles.contentTitle}>保存したサークル</Text>
            {circlesLoading ? (
              <ActivityIndicator size="small" color="#007bff" />
            ) : savedCircles.length > 0 ? (
              <View style={styles.gridContainer}>
                {savedCircles.map(item => (
                  <TouchableOpacity key={item.id} style={styles.gridItem} onPress={() => navigation.navigate('CircleDetail', { circleId: item.id })}>
                    <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} style={styles.gridImage} />
                    <Text style={styles.gridItemText} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyMessage}>保存したサークルはまだありません。</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  profileSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  profileImageContainerSimple: { alignItems: 'center', marginBottom: 12 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },
  userUniversity: { fontSize: 16, color: '#666', marginTop: 4 },
  editProfileButton: { marginTop: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 8, alignItems: 'center', paddingHorizontal: 24 },
  editProfileButtonText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  contentArea: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  contentTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: (Dimensions.get('window').width - 20 * 3) / 2, marginBottom: 20 },
  gridImage: { width: '100%', height: (Dimensions.get('window').width - 20 * 3) / 2, borderRadius: 12, backgroundColor: '#e0e0e0' },
  gridItemText: { marginTop: 8, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  emptyMessage: { textAlign: 'center', color: '#666', marginTop: 20 }
});