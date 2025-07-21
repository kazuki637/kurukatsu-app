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

const { width } = Dimensions.get('window');
const gridItemSize = (width - 20 * 3) / 2;

// グローバルキャッシュ
let userProfileCache = null;
let circlesCache = { joined: [], saved: [] };
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30秒間キャッシュ

export default function MyPageScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [savedCircles, setSavedCircles] = useState([]);
  const [joinedCircles, setJoinedCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const user = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        setIsInitialLoad(false);
        return;
      }
      
      const now = Date.now();
      const isCacheValid = (now - lastFetchTime) < CACHE_DURATION;
      
      // キャッシュが有効な場合はキャッシュから表示
      if (isCacheValid && userProfileCache && circlesCache) {
        setUserProfile(userProfileCache);
        setJoinedCircles(circlesCache.joined);
        setSavedCircles(circlesCache.saved);
        setLoading(false);
        setCirclesLoading(false);
        setIsInitialLoad(false);
        return;
      }
      
      // 初回のみローディングを表示
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userData.isUniversityPublic = userData.isUniversityPublic !== false;
            userData.isGradePublic = userData.isGradePublic !== false;
            
            // キャッシュに保存
            userProfileCache = userData;
            setUserProfile(userData);
            
            // サークルデータの取得を開始
            if (isInitialLoad) {
              setCirclesLoading(true);
            }
            
            // 所属サークル取得（より安全な方法）
            const joinedCirclesData = [];
            if (userData.joinedCircleIds && userData.joinedCircleIds.length > 0) {
              try {
                // Firestoreの 'in' クエリは最大10個の要素まで
                const batchSize = 10;
                for (let i = 0; i < userData.joinedCircleIds.length; i += batchSize) {
                  const batch = userData.joinedCircleIds.slice(i, i + batchSize);
                  const circlesRef = collection(db, 'circles');
                  const q = query(circlesRef, where('__name__', 'in', batch));
                  const querySnapshot = await getDocs(q);
                  joinedCirclesData.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
              } catch (error) {
                console.error("Error fetching joined circles: ", error);
              }
            }
            
            // 保存サークル取得（より安全な方法）
            const savedCirclesData = [];
            if (userData.favoriteCircleIds && userData.favoriteCircleIds.length > 0) {
              try {
                // Firestoreの 'in' クエリは最大10個の要素まで
                const batchSize = 10;
                for (let i = 0; i < userData.favoriteCircleIds.length; i += batchSize) {
                  const batch = userData.favoriteCircleIds.slice(i, i + batchSize);
                  const circlesRef = collection(db, 'circles');
                  const q = query(circlesRef, where('__name__', 'in', batch));
                  const querySnapshot = await getDocs(q);
                  savedCirclesData.push(...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
              } catch (error) {
                console.error("Error fetching saved circles: ", error);
              }
            }
            
            // キャッシュに保存
            circlesCache = { joined: joinedCirclesData, saved: savedCirclesData };
            lastFetchTime = Date.now();
            
            setJoinedCircles(joinedCirclesData);
            setSavedCircles(savedCirclesData);
            
            // サークルデータの取得完了
            setCirclesLoading(false);
          } else {
            setUserProfile(null);
            setSavedCircles([]);
            setJoinedCircles([]);
            userProfileCache = null;
            circlesCache = { joined: [], saved: [] };
          }
        } catch (error) {
          console.error("Error fetching user data: ", error);
          setUserProfile(null);
          setSavedCircles([]);
          setJoinedCircles([]);
          setCirclesLoading(false);
          userProfileCache = null;
          circlesCache = { joined: [], saved: [] };
        } finally {
          setLoading(false);
          setIsInitialLoad(false);
        }
      };
      
      fetchUserData();
    }, [user, isInitialLoad])
  );

  // 初回ローディング時のみローディング画面を表示
  if (isInitialLoad && loading && !userProfile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" style={{ flex: 1 }} />
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
              <Image
                source={{ uri: userProfile?.profileImageUrl || 'https://via.placeholder.com/100' }}
                style={styles.profileImage}
              />
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