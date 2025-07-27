import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Alert, SafeAreaView, StatusBar, Dimensions, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as RNImage } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // 追加済み
import * as ImagePicker from 'expo-image-picker'; // 追加済み
import useFirestoreDoc from '../hooks/useFirestoreDoc';

const { width } = Dimensions.get('window');

// const tabRoutes = [ // 削除
//   { key: 'top', title: 'トップ' },
//   { key: 'events', title: 'イベント' },
//   { key: 'welcome', title: '新歓情報' },
// ];

// XロゴSVGコンポーネント
const XLogo = ({ size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 1200 1227" fill="none">
    <Path d="M1199.97 0H1067.6L600.01 529.09L132.4 0H0L494.18 587.29L0 1227H132.4L600.01 697.91L1067.6 1227H1200L705.82 639.71L1199.97 0ZM655.09 567.29L1067.6 70.59V0.59H1067.6L600.01 529.09L132.4 0.59H132.4V70.59L544.91 567.29L132.4 1156.41V1226.41H132.4L600.01 697.91L1067.6 1226.41H1067.6V1156.41L655.09 567.29Z" fill="#000"/>
  </Svg>
);

// Firebase StorageのdownloadURLからストレージパスを抽出し削除する共通関数
const deleteImageFromStorage = async (url) => {
  if (!url) return;
  try {
    // downloadURLからパスを抽出
    // 例: https://firebasestorage.googleapis.com/v0/b/xxx.appspot.com/o/circle_images%2Fheaders%2Fxxxx.jpg?alt=media&token=...
    const matches = url.match(/\/o\/([^?]+)\?/);
    if (!matches || !matches[1]) return;
    const path = decodeURIComponent(matches[1]);
    const storage = getStorage();
    const imgRef = storageRef(storage, path);
    await deleteObject(imgRef);
  } catch (e) {
    // 失敗しても致命的でないのでconsoleに出すだけ
    console.warn('画像のStorage削除に失敗:', e);
  }
};

export default function CircleProfileEditScreen({ route, navigation }) {
  const { circleId } = route.params;
  // サークルデータ取得（キャッシュ30秒）
  const { data: circleData, loading, error, reload } = useFirestoreDoc(db, circleId ? `circles/${circleId}` : '', { cacheDuration: 30000 });
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  // const [tabIndex, setTabIndex] = useState(0); // 削除
  // const [routes] = useState(tabRoutes); // 削除
  const [activeTab, setActiveTab] = useState('top'); // 追加
  const [uploading, setUploading] = useState(false); // 追加
  const [eventFormVisible, setEventFormVisible] = useState(false); // イベント追加フォーム表示
  const [eventTitle, setEventTitle] = useState('');
  const [eventDetail, setEventDetail] = useState('');
  const [eventImage, setEventImage] = useState(null);
  const [eventUploading, setEventUploading] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState(null); // 編集中のイベントindex
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDetail, setEditEventDetail] = useState('');
  const [editEventImage, setEditEventImage] = useState(null);
  const [editEventUploading, setEditEventUploading] = useState(false);
  const [description, setDescription] = useState(''); // サークル紹介編集用
  const [descSaving, setDescSaving] = useState(false); // 保存中状態
  const [recommendationsInput, setRecommendationsInput] = useState(''); // こんな人におすすめ編集用
  const [recSaving, setRecSaving] = useState(false); // 保存中状態
  const [leaderImage, setLeaderImage] = useState(null); // 代表者画像
  const [leaderMessage, setLeaderMessage] = useState(''); // 代表者メッセージ
  const [leaderSaving, setLeaderSaving] = useState(false); // 保存中
  const [welcomeConditions, setWelcomeConditions] = useState(''); // 入会条件編集用
  const [welcomeSaving, setWelcomeSaving] = useState(false); // 保存中状態
  const [isRecruiting, setIsRecruiting] = useState(false); // 入会募集状態
  const [activityImages, setActivityImages] = useState([]); // 活動写真配列
  const [activityUploading, setActivityUploading] = useState(false);
  // SNS・新歓LINEグループリンク用state
  const [snsLink, setSnsLink] = useState('');
  const [xLink, setXLink] = useState('');
  const [shinkanLineGroupLink, setShinkanLineGroupLink] = useState('');
  // 新歓スケジュール用state
  const [welcomeSchedule, setWelcomeSchedule] = useState('');
  const [activityLocation, setActivityLocation] = useState(''); // 活動場所
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // 未保存の変更があるかどうか

  // 初期値セット
  useEffect(() => {
    if (circleData) {
      setSnsLink(circleData.snsLink || '');
      setXLink(circleData.xLink || '');
      setShinkanLineGroupLink(circleData.shinkanLineGroupLink || '');
    }
  }, [circleData]);

  useEffect(() => {
    if (circleData && circleData.welcome && typeof circleData.welcome.schedule === 'string') {
      setWelcomeSchedule(circleData.welcome.schedule);
    }
  }, [circleData]);

  useEffect(() => {
    if (circleData) {
      setActivityLocation(circleData.activityLocation || '');
    }
  }, [circleData]);

  // 画面遷移時のアラート表示
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) {
        return;
      }

      // デフォルトの遷移を防ぐ
      e.preventDefault();

      Alert.alert(
        '未保存の変更があります',
        '変更を保存せずに画面を離れますか？',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: '保存せずに離れる',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

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

  // 既存の冗長なuseEffectやローディング・エラー処理を削除し、circleData, loading, errorを直接利用する形に整理
  useEffect(() => {
    // サークル紹介初期値セット
    if (circleData && typeof circleData.description === 'string') {
      setDescription(circleData.description);
    }
    // こんな人におすすめ初期値セット
    if (circleData && Array.isArray(circleData.recommendations)) {
      setRecommendationsInput(circleData.recommendations.join(', '));
    }
    if (circleData && typeof circleData.leaderMessage === 'string') {
      setLeaderMessage(circleData.leaderMessage);
    }
    if (circleData && typeof circleData.leaderImageUrl === 'string') {
      setLeaderImage({ uri: circleData.leaderImageUrl });
    }
    if (circleData && circleData.welcome && typeof circleData.welcome.conditions === 'string') {
      setWelcomeConditions(circleData.welcome.conditions);
    }
    if (circleData && circleData.welcome && typeof circleData.welcome.isRecruiting === 'boolean') {
      setIsRecruiting(circleData.welcome.isRecruiting);
    }
    if (circleData && Array.isArray(circleData.activityImages)) {
      setActivityImages(circleData.activityImages);
    }
  }, [circleData]);

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert("ログインが必要です", "お気に入り機能を利用するにはログインしてください。");
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const circleDocRef = doc(db, 'circles', circleId);

    try {
      if (isFavorite) {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayRemove(circleId) });
        await updateDoc(circleDocRef, { likes: increment(-1) });
        Alert.alert("お気に入り解除", "サークルをお気に入りから削除しました。");
      } else {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayUnion(circleId) });
        await updateDoc(circleDocRef, { likes: increment(1) });
        Alert.alert("お気に入り登録", "サークルをお気に入りに追加しました！");
      }
    } catch (error) {
      console.error("Error toggling favorite: ", error);
      Alert.alert("エラー", "お気に入り操作に失敗しました。");
    }
  };

  // ヘッダー画像アップロード処理
  const handleHeaderImagePress = async () => {
    if (uploading) return;
    // 画像選択
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      try {
        // 既存画像があればStorageから削除
        if (circleData.headerImageUrl) {
          await deleteImageFromStorage(circleData.headerImageUrl);
        }
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const storage = getStorage();
        const fileName = `circle_images/headers/${circleId}_${Date.now()}`;
        const imgRef = storageRef(storage, fileName);
        await uploadBytes(imgRef, blob);
        const downloadUrl = await getDownloadURL(imgRef);
        // Firestoreに保存
        await updateDoc(doc(db, 'circles', circleId), { headerImageUrl: downloadUrl });
        reload && reload(); // 追加: 変更を即時反映
      } catch (e) {
        Alert.alert('エラー', '画像のアップロードに失敗しました');
      } finally {
        setUploading(false);
      }
    }
  };

  // ヘッダー画像削除処理
  const handleDeleteHeaderImage = async () => {
    try {
      // 既存画像があればStorageから削除
      if (circleData.headerImageUrl) {
        await deleteImageFromStorage(circleData.headerImageUrl);
      }
      await updateDoc(doc(db, 'circles', circleId), { headerImageUrl: '' });
      Alert.alert('削除完了', 'ヘッダー画像を削除しました');
      reload && reload(); // 追加: 変更を即時反映
    } catch (e) {
      Alert.alert('エラー', 'ヘッダー画像の削除に失敗しました');
    }
  };

  // イベント画像選択
  const handlePickEventImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEventImage(result.assets[0]);
    }
  };

  // イベント追加処理
  const handleAddEvent = async () => {
    if (!eventTitle || !eventDetail) {
      Alert.alert('エラー', 'タイトルと詳細を入力してください');
      return;
    }
    setEventUploading(true);
    let imageUrl = '';
    try {
      if (eventImage) {
        const response = await fetch(eventImage.uri);
        const blob = await response.blob();
        const storage = getStorage();
        const fileName = `circle_images/events/${circleId}_${Date.now()}`;
        const imgRef = storageRef(storage, fileName);
        await uploadBytes(imgRef, blob);
        imageUrl = await getDownloadURL(imgRef);
      }
      // Firestoreのevents配列に追加
      const eventObj = {
        title: eventTitle,
        detail: eventDetail,
        image: imageUrl,
      };
      await updateDoc(doc(db, 'circles', circleId), {
        events: arrayUnion(eventObj)
      });
      setEventFormVisible(false);
      setEventTitle('');
      setEventDetail('');
      setEventImage(null);
      reload && reload(); // 追加: 変更を即時反映
    } catch (e) {
      Alert.alert('エラー', 'イベントの追加に失敗しました');
    } finally {
      setEventUploading(false);
    }
  };

  // 編集モード開始
  const handleEditEvent = (idx) => {
    setEditingEventIndex(idx);
    setEditEventTitle(circleData.events[idx].title);
    setEditEventDetail(circleData.events[idx].detail);
    setEditEventImage(circleData.events[idx].image ? { uri: circleData.events[idx].image } : null);
  };
  // 編集キャンセル
  const handleCancelEditEvent = () => {
    setEditingEventIndex(null);
    setEditEventTitle('');
    setEditEventDetail('');
    setEditEventImage(null);
  };
  // 編集画像選択
  const handlePickEditEventImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditEventImage(result.assets[0]);
    }
  };
  // 編集保存
  const handleSaveEditEvent = async () => {
    if (!editEventTitle || !editEventDetail) {
      Alert.alert('エラー', 'タイトルと詳細を入力してください');
      return;
    }
    setEditEventUploading(true);
    let imageUrl = editEventImage && editEventImage.uri ? editEventImage.uri : '';
    try {
      if (editEventImage && editEventImage.uri && !editEventImage.uri.startsWith('http')) {
        // 既存画像があればStorageから削除
        if (circleData.events && circleData.events[editingEventIndex] && circleData.events[editingEventIndex].image) {
          await deleteImageFromStorage(circleData.events[editingEventIndex].image);
        }
        const response = await fetch(editEventImage.uri);
        const blob = await response.blob();
        const storage = getStorage();
        const fileName = `circle_images/events/${circleId}_${Date.now()}`;
        const imgRef = storageRef(storage, fileName);
        await uploadBytes(imgRef, blob);
        imageUrl = await getDownloadURL(imgRef);
      }
      // 既存イベント配列を編集
      const newEvents = [...circleData.events];
      newEvents[editingEventIndex] = {
        ...newEvents[editingEventIndex],
        title: editEventTitle,
        detail: editEventDetail,
        image: imageUrl,
      };
      await updateDoc(doc(db, 'circles', circleId), { events: newEvents });
      setEditingEventIndex(null);
      setEditEventTitle('');
      setEditEventDetail('');
      setEditEventImage(null);
      reload && reload();
    } catch (e) {
      Alert.alert('エラー', 'イベントの更新に失敗しました');
    } finally {
      setEditEventUploading(false);
    }
  };
  // イベント削除
  const handleDeleteEvent = async (idx) => {
    try {
      const eventObj = circleData.events[idx];
      // 既存画像があればStorageから削除
      if (eventObj && eventObj.image) {
        await deleteImageFromStorage(eventObj.image);
      }
      // events配列から該当イベントのみ除外
      const newEvents = circleData.events.filter((_, i) => i !== idx);
      await updateDoc(doc(db, 'circles', circleId), {
        events: newEvents
      });
      setEditingEventIndex(null);
      Alert.alert('削除完了', 'イベントを削除しました');
      reload && reload(); // 追加: 変更を即時反映
    } catch (e) {
      Alert.alert('エラー', 'イベントの削除に失敗しました');
    }
  };

  // サークル紹介保存処理
  const handleSaveDescription = async () => {
    setDescSaving(true);
    try {
      await updateDoc(doc(db, 'circles', circleId), { description });
      // setCircleData(prev => ({ ...prev, description })); // useFirestoreDocは自動で更新
      Alert.alert('保存完了', 'サークル紹介を更新しました');
    } catch (e) {
      Alert.alert('エラー', 'サークル紹介の保存に失敗しました');
    } finally {
      setDescSaving(false);
    }
  };

  // こんな人におすすめ保存処理
  const handleSaveRecommendations = async () => {
    setRecSaving(true);
    try {
      const recArr = recommendationsInput.split(',').map(s => s.trim()).filter(Boolean);
      await updateDoc(doc(db, 'circles', circleId), { recommendations: recArr });
      // setCircleData(prev => ({ ...prev, recommendations: recArr })); // useFirestoreDocは自動で更新
      Alert.alert('保存完了', 'おすすめ項目を更新しました');
    } catch (e) {
      Alert.alert('エラー', 'おすすめ項目の保存に失敗しました');
    } finally {
      setRecSaving(false);
    }
  };

  // 代表者画像選択
  const handlePickLeaderImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      try {
        // 既存画像があればStorageから削除
        if (circleData.leaderImageUrl) {
          await deleteImageFromStorage(circleData.leaderImageUrl);
        }
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const storage = getStorage();
        const fileName = `circle_images/leaders/${circleId}_${Date.now()}`;
        const imgRef = storageRef(storage, fileName);
        await uploadBytes(imgRef, blob);
        const downloadUrl = await getDownloadURL(imgRef);
        await updateDoc(doc(db, 'circles', circleId), { leaderImageUrl: downloadUrl });
        setLeaderImage({ uri: downloadUrl });
        reload && reload();
      } catch (e) {
        Alert.alert('エラー', '代表者画像のアップロードに失敗しました');
      }
    }
  };

  // 代表者画像削除処理
  const handleDeleteLeaderImage = async () => {
    Alert.alert(
      "画像を削除",
      "本当に代表者の画像を削除しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        { 
          text: "削除", 
          onPress: async () => {
            try {
              // 既存画像があればStorageから削除
              if (circleData.leaderImageUrl) {
                await deleteImageFromStorage(circleData.leaderImageUrl);
              }
              await updateDoc(doc(db, 'circles', circleId), { leaderImageUrl: '' });
              setLeaderImage(null);
              Alert.alert('削除完了', '代表者の画像を削除しました');
            } catch (e) {
              Alert.alert('エラー', '画像の削除に失敗しました');
            }
          },
          style: "destructive"
        }
      ]
    );
  };
  // 代表者情報保存
  const handleSaveLeader = async () => {
    setLeaderSaving(true);
    try {
      await updateDoc(doc(db, 'circles', circleId), {
        leaderMessage: leaderMessage,
      });
      Alert.alert('保存完了', '代表者メッセージを更新しました');
      reload && reload();
    } catch (e) {
      Alert.alert('エラー', '代表者情報の保存に失敗しました');
    } finally {
      setLeaderSaving(false);
    }
  };

  // 入会条件保存処理
  const handleSaveWelcomeConditions = async () => {
    setWelcomeSaving(true);
    try {
      const newWelcome = { ...(circleData.welcome || {}), conditions: welcomeConditions };
      await updateDoc(doc(db, 'circles', circleId), { welcome: newWelcome });
      // setCircleData(prev => ({ ...prev, welcome: newWelcome })); // useFirestoreDocは自動で更新
      Alert.alert('保存完了', '入会条件を更新しました');
    } catch (e) {
      Alert.alert('エラー', '入会条件の保存に失敗しました');
    } finally {
      setWelcomeSaving(false);
    }
  };





  // 活動写真追加
  const handleAddActivityImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setActivityUploading(true);
      try {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const storage = getStorage();
        const fileName = `circle_images/activities/${circleId}_${Date.now()}`;
        const imgRef = storageRef(storage, fileName);
        await uploadBytes(imgRef, blob);
        const downloadUrl = await getDownloadURL(imgRef);
        const newImages = [...activityImages, downloadUrl];
        await updateDoc(doc(db, 'circles', circleId), { activityImages: newImages });
        setActivityImages(newImages);
        reload && reload();
      } catch (e) {
        Alert.alert('エラー', '活動写真の追加に失敗しました');
      } finally {
        setActivityUploading(false);
      }
    }
  };
  // 活動写真削除
  const handleDeleteActivityImage = async (idx) => {
    try {
      // 既存画像があればStorageから削除
      if (activityImages[idx]) {
        await deleteImageFromStorage(activityImages[idx]);
      }
      const newImages = activityImages.filter((_, i) => i !== idx);
      await updateDoc(doc(db, 'circles', circleId), { activityImages: newImages });
      setActivityImages(newImages);
      Alert.alert('削除完了', '活動写真を削除しました');
    } catch (e) {
      Alert.alert('エラー', '活動写真の削除に失敗しました');
    }
  };

  // 活動写真差し替え
  const handleReplaceActivityImage = async (idx) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setActivityUploading(true);
      try {
        // 既存画像があればStorageから削除
        if (activityImages[idx]) {
          await deleteImageFromStorage(activityImages[idx]);
        }
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const storage = getStorage();
        const fileName = `circle_images/activities/${circleId}_${Date.now()}`;
        const imgRef = storageRef(storage, fileName);
        await uploadBytes(imgRef, blob);
        const downloadUrl = await getDownloadURL(imgRef);
        const newImages = [...activityImages];
        newImages[idx] = downloadUrl;
        await updateDoc(doc(db, 'circles', circleId), { activityImages: newImages });
        setActivityImages(newImages);
        reload && reload();
      } catch (e) {
        Alert.alert('エラー', '活動写真の変更に失敗しました');
      } finally {
        setActivityUploading(false);
      }
    }
  };

  // 変更を検知する関数
  const checkForChanges = () => {
    if (!circleData) return false;
    
    const hasChanges = 
      description !== (circleData.description || '') ||
      recommendationsInput !== (circleData.recommendations?.join(', ') || '') ||
      leaderMessage !== (circleData.leaderMessage || '') ||
      welcomeConditions !== (circleData.welcome?.conditions || '') ||
      welcomeSchedule !== (circleData.welcome?.schedule || '') ||
      snsLink !== (circleData.snsLink || '') ||
      xLink !== (circleData.xLink || '') ||
      shinkanLineGroupLink !== (circleData.shinkanLineGroupLink || '') ||
      activityLocation !== (circleData.activityLocation || '') ||
      isRecruiting !== (circleData.welcome?.isRecruiting || false);
    
    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  };

  // 画面上部のCommonHeaderに保存ボタンを追加
  const handleHeaderSave = async () => {
    // 必要な保存処理をここにまとめて実装（例：サークル紹介、こんな人におすすめ、代表者情報、SNSリンク、入会条件など）
    // 例としてサークル紹介のみ保存
    try {
      await updateDoc(doc(db, 'circles', circleId), {
        description,
        recommendations: recommendationsInput.split(',').map(s => s.trim()).filter(Boolean),
        leaderMessage,
        welcome: { ...(circleData.welcome || {}), conditions: welcomeConditions, schedule: welcomeSchedule, isRecruiting },
        snsLink,
        xLink,
        shinkanLineGroupLink,
        activityLocation,
      });
      setHasUnsavedChanges(false);
      Alert.alert('保存完了', 'プロフィール情報を保存しました');
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const renderTopTab = () => (
    <View style={styles.tabContent}>
      {/* 活動写真アップロード・表示 */}
      <View style={{marginBottom: 20, width: '100%'}}>
        {activityImages && activityImages.length > 0 ? (
          <View style={{position: 'relative', width: '100%', aspectRatio: 16/9, alignSelf: 'center'}}>
            <TouchableOpacity onPress={() => handleReplaceActivityImage(0)} activeOpacity={0.7} style={{width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
              <Image source={{ uri: activityImages[0] }} style={{width: '100%', aspectRatio: 16/9, borderRadius: 0, backgroundColor: '#eee', marginBottom: 20}} />
            </TouchableOpacity>
            {/* ゴミ箱ボタン */}
            <TouchableOpacity
              style={{position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 4, zIndex: 2}}
              onPress={() => handleDeleteActivityImage(0)}
            >
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          // 画像がない場合は追加ボタンのみ
          <TouchableOpacity onPress={handleAddActivityImage} disabled={activityUploading} style={{width: '100%', aspectRatio: 16/9, borderRadius: 0, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginBottom: 20, alignSelf: 'center'}}>
            {activityUploading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <Ionicons name="camera-outline" size={48} color="#aaa" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {/* 基本情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>活動頻度</Text>
            <Text style={styles.infoValue}>{circleData.frequency}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>人数</Text>
            <Text style={styles.infoValue}>{circleData.members}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>男女比</Text>
            <Text style={styles.infoValue}>{circleData.genderratio}</Text>
          </View>
        </View>
        {/* 主な活動場所 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>主な活動場所</Text>
          <TextInput
            value={activityLocation}
            onChangeText={(text) => {
              setActivityLocation(text);
              checkForChanges();
            }}
            placeholder="例：大学構内、○○教室、○○会館など"
            style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', fontSize: 16, marginBottom: 8}}
          />
        </View>
        
        {circleData.features && circleData.features.length > 0 && (
          <View style={styles.featuresContainer}>
            <Text style={styles.infoLabel}>特色</Text>
            <View style={styles.featuresList}>
              {circleData.features.map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
      {/* サークル紹介（基本情報の下に移動・編集可） */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>サークル紹介</Text>
        <TextInput
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            checkForChanges();
          }}
          multiline
          style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', minHeight: 80, fontSize: 16, marginBottom: 8}}
        />
      </View>
      {/* こんな人におすすめ（サークル紹介の下に追加・編集可） */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>こんな人におすすめ</Text>
        <TextInput
          value={recommendationsInput}
          onChangeText={(text) => {
            setRecommendationsInput(text);
            checkForChanges();
          }}
          multiline
          placeholder={"・新しい友達を作りたい人\n・○○が好きな人\n・○○が得意な人"}
          style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', minHeight: 60, fontSize: 16, marginBottom: 8}}
        />
      </View>

      {/* 代表者編集（こんな人におすすめの下に追加） */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>代表者からのメッセージ</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 12 }}>
          <TouchableOpacity onPress={handlePickLeaderImage}>
            {leaderImage && leaderImage.uri ? (
              <Image source={{ uri: leaderImage.uri }} style={{width: 72, height: 72, borderRadius: 36, backgroundColor: '#eee'}} />
            ) : (
              <View style={{width: 72, height: 72, borderRadius: 36, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center'}}>
                <Ionicons name="camera-outline" size={36} color="#aaa" />
              </View>
            )}
          </TouchableOpacity>
          {leaderImage && leaderImage.uri && (
            <TouchableOpacity onPress={handleDeleteLeaderImage} style={{ marginLeft: 12, padding: 8, backgroundColor: '#fee', borderRadius: 24 }}>
              <Ionicons name="trash-outline" size={24} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          value={leaderMessage}
          onChangeText={(text) => {
            setLeaderMessage(text);
            checkForChanges();
          }}
          multiline
          placeholder="代表者からのメッセージを入力"
          style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', minHeight: 60, fontSize: 16, marginBottom: 8}}
        />
      </View>

      {/* SNSリンク（編集可） */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SNS</Text>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
          <RNImage source={require('../assets/SNS-icons/Instagram_Glyph_Gradient.png')} style={styles.snsLargeLogo} />
          <TextInput
            value={snsLink}
            onChangeText={(text) => {
              setSnsLink(text);
              checkForChanges();
            }}
            placeholder="Instagramリンクを入力"
            style={{flex: 1, marginLeft: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', fontSize: 16}}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
          <RNImage source={require('../assets/SNS-icons/X_logo-black.png')} style={styles.snsLargeLogo} />
          <TextInput
            value={xLink}
            onChangeText={(text) => {
              setXLink(text);
              checkForChanges();
            }}
            placeholder="X（旧Twitter）リンクを入力"
            style={{flex: 1, marginLeft: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', fontSize: 16}}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* LINEグループ */}
      {circleData.lineGroupLink && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LINEグループ</Text>
          <TouchableOpacity style={styles.lineButton} onPress={() => Linking.openURL(circleData.lineGroupLink)}>
            <Ionicons name="logo-whatsapp" size={24} color="#06C755" />
            <Text style={styles.lineButtonText}>LINEグループを開く</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyButton} onPress={() => {
            // Clipboard.setString(circleData.lineGroupLink);
            Alert.alert('コピーしました', 'LINEグループリンクをコピーしました');
          }}>
            <Ionicons name="copy-outline" size={18} color="#333" />
            <Text style={styles.copyButtonText}>リンクをコピー</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 新歓スケジュール */}
      {circleData.schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新歓スケジュール</Text>
          <Text style={styles.scheduleText}>{circleData.schedule}</Text>
        </View>
      )}
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>恒例イベント</Text>
        {/* イベント追加ボタン */}
        <TouchableOpacity style={{marginBottom: 16, alignSelf: 'center'}} onPress={() => setEventFormVisible(true)}>
          <View style={{backgroundColor: '#007bff', borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 32, lineHeight: 40}}>＋</Text>
          </View>
        </TouchableOpacity>
        {/* イベント追加フォーム */}
        {eventFormVisible && (
          <View style={{marginBottom: 20, backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e0e0e0', position: 'relative'}}>
            {/* 右上に閉じるボタン */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
              onPress={() => setEventFormVisible(false)}
              disabled={eventUploading}
            >
              <Ionicons name="close-outline" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>イベント追加</Text>
            <TextInput
              placeholder="タイトル"
              value={eventTitle}
              onChangeText={setEventTitle}
              style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8, backgroundColor: '#fff'}}
            />
            <TouchableOpacity onPress={handlePickEventImage} style={{marginBottom: 8}}>
              {eventImage ? (
                <Image source={{ uri: eventImage.uri }} style={{width: '100%', aspectRatio: 16/9, borderRadius: 8}} />
              ) : (
                <View style={{width: '100%', aspectRatio: 16/9, backgroundColor: '#eee', borderRadius: 8, justifyContent: 'center', alignItems: 'center'}}>
                  <Ionicons name="camera-outline" size={48} color="#aaa" />
                </View>
              )}
            </TouchableOpacity>
            <TextInput
              placeholder="詳細"
              value={eventDetail}
              onChangeText={setEventDetail}
              multiline
              style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8, backgroundColor: '#fff', minHeight: 60}}
            />
            <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
              <TouchableOpacity onPress={() => setEventFormVisible(false)} style={{marginRight: 16}} disabled={eventUploading}>
                <Text style={{color: '#666'}}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddEvent} disabled={eventUploading}>
                <View style={{backgroundColor: eventUploading ? '#aaa' : '#007bff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18}}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>{eventUploading ? '追加中...' : '保存'}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* イベントリスト */}
        {circleData.events && circleData.events.length > 0 && (
          circleData.events.slice(0, 4).map((event, idx) => (
            <View key={idx} style={styles.eventCard}>
              {/* 編集/削除ボタン */}
              <TouchableOpacity
                style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                onPress={() =>
                  editingEventIndex === idx
                    ? handleDeleteEvent(idx)
                    : handleEditEvent(idx)
                }
              >
                <Ionicons
                  name={editingEventIndex === idx ? 'trash-outline' : 'create-outline'}
                  size={24}
                  color={editingEventIndex === idx ? '#e74c3c' : '#007bff'}
                />
              </TouchableOpacity>
              {/* 編集モード */}
              {editingEventIndex === idx ? (
                <View style={{backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 0, position: 'relative'}}>
                  <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>イベント編集</Text>
                  <TextInput
                    placeholder="タイトル"
                    value={editEventTitle}
                    onChangeText={setEditEventTitle}
                    style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8, backgroundColor: '#fff'}}
                  />
                  <TextInput
                    placeholder="詳細"
                    value={editEventDetail}
                    onChangeText={setEditEventDetail}
                    multiline
                    style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8, backgroundColor: '#fff', minHeight: 60}}
                  />
                  <TouchableOpacity onPress={handlePickEditEventImage} style={{marginBottom: 8}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Ionicons name="image-outline" size={24} color="#007bff" />
                      <Text style={{marginLeft: 8, color: '#007bff'}}>画像を選択</Text>
                    </View>
                  </TouchableOpacity>
                  {editEventImage && (
                    <Image source={{ uri: editEventImage.uri }} style={{width: '100%', aspectRatio: 16/9, borderRadius: 8, marginBottom: 8}} />
                  )}
                  <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                    <TouchableOpacity onPress={handleCancelEditEvent} style={{marginRight: 16}} disabled={editEventUploading}>
                      <Text style={{color: '#666'}}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveEditEvent} disabled={editEventUploading}>
                      <View style={{backgroundColor: editEventUploading ? '#aaa' : '#007bff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18}}>
                        <Text style={{color: '#fff', fontWeight: 'bold'}}>{editEventUploading ? '保存中...' : '保存'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.image && (
                    <Image source={{ uri: event.image }} style={styles.eventImage} resizeMode="cover" />
                  )}
                  <Text style={styles.eventDetail}>{event.detail}</Text>
                </>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderWelcomeTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>入会募集状況</Text>
        <View style={styles.recruitingContainer}>
          <View style={styles.recruitingStatusContainer}>
            {isRecruiting ? (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                <Text style={styles.recruitingStatusText}>入会募集中</Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={24} color="#e74c3c" />
                <Text style={styles.recruitingStatusText}>現在入会の募集はありません</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[styles.toggleButton, isRecruiting && styles.toggleButtonActive]}
            onPress={() => {
              const newRecruitingStatus = !isRecruiting;
              setIsRecruiting(newRecruitingStatus);
              // 状態変更を即座に検知
              if (!circleData) return;
              
              const hasChanges = 
                description !== (circleData.description || '') ||
                recommendationsInput !== (circleData.recommendations?.join(', ') || '') ||
                leaderMessage !== (circleData.leaderMessage || '') ||
                welcomeConditions !== (circleData.welcome?.conditions || '') ||
                welcomeSchedule !== (circleData.welcome?.schedule || '') ||
                snsLink !== (circleData.snsLink || '') ||
                xLink !== (circleData.xLink || '') ||
                shinkanLineGroupLink !== (circleData.shinkanLineGroupLink || '') ||
                activityLocation !== (circleData.activityLocation || '') ||
                newRecruitingStatus !== (circleData.welcome?.isRecruiting || false);
              
              setHasUnsavedChanges(hasChanges);
            }}
          >
            <View style={[styles.toggleCircle, isRecruiting && styles.toggleCircleActive]} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>入会条件</Text>
        <TextInput
          value={welcomeConditions}
          onChangeText={(text) => {
            setWelcomeConditions(text);
            checkForChanges();
          }}
          multiline
          placeholder={"・○○経験者\n・○○大学に在籍中の方\n・大学１年生"}
          style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', minHeight: 60, fontSize: 16, marginBottom: 8}}
        />
      </View>
      {/* 新歓LINEグループ 追加 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>新歓LINEグループ</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Ionicons name="logo-whatsapp" size={24} color="#06C755" />
          <TextInput
            value={shinkanLineGroupLink}
            onChangeText={(text) => {
              setShinkanLineGroupLink(text);
              checkForChanges();
            }}
            placeholder="LINEグループ招待リンクを入力"
            style={{flex: 1, marginLeft: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', fontSize: 16}}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>新歓スケジュール</Text>
        <TextInput
          value={welcomeSchedule}
          onChangeText={(text) => {
            setWelcomeSchedule(text);
            checkForChanges();
          }}
          multiline
          placeholder={"2025/4/25 新歓BBQ"}
          style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', minHeight: 60, fontSize: 16, marginBottom: 8}}
        />
      </View>
    </View>
  );

  // タブバー部分を元のactiveTab/setActiveTab方式に戻す
  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'top' && styles.activeTabItem]}
          onPress={() => setActiveTab('top')}
        >
          <Text style={[styles.tabLabel, activeTab === 'top' && styles.activeTabLabel]}>
            トップ
          </Text>
          {activeTab === 'top' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'events' && styles.activeTabItem]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabLabel, activeTab === 'events' && styles.activeTabLabel]}>
            イベント
          </Text>
          {activeTab === 'events' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'welcome' && styles.activeTabItem]}
          onPress={() => setActiveTab('welcome')}
        >
          <Text style={[styles.tabLabel, activeTab === 'welcome' && styles.activeTabLabel]}>
            新歓情報
          </Text>
          {activeTab === 'welcome' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ローディング・エラー時のUIを共通化
  if (loading && !circleData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>サークルデータの取得に失敗しました</Text>
        <TouchableOpacity onPress={reload}><Text>再読み込み</Text></TouchableOpacity>
      </View>
    );
  }
  if (!circleData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>サークルが見つかりませんでした</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <CommonHeader title={circleData && circleData.name ? circleData.name : 'サークル詳細'} showBackButton onBack={() => navigation.goBack()} 
          rightButtonLabel="保存" onRightButtonPress={handleHeaderSave} />
        
        <ScrollView 
          style={styles.scrollView}
          stickyHeaderIndices={[2]} // タブバーをスティッキーヘッダーに設定
          showsVerticalScrollIndicator={false}
        >
          {/* ヘッダー画像エリア */}
          <TouchableOpacity style={styles.headerImageContainer} onPress={handleHeaderImagePress} activeOpacity={0.7}>
            {uploading ? (
              <View style={styles.headerImagePlaceholder}>
                <ActivityIndicator size="large" color="#007bff" />
              </View>
            ) : circleData.headerImageUrl ? (
              <>
                <Image source={{ uri: circleData.headerImageUrl }} style={styles.headerImage} />
                {/* ゴミ箱ボタン */}
                <TouchableOpacity
                  style={{position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 4, zIndex: 2}}
                  onPress={handleDeleteHeaderImage}
                >
                  <Ionicons name="trash-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.headerImagePlaceholder}>
                <Ionicons name="camera-outline" size={48} color="#aaa" />
              </View>
            )}
          </TouchableOpacity>

          {/* サークル基本情報 */}
          <View style={styles.circleInfoSection}>
            <View style={styles.circleInfo}>
              <View style={styles.logoContainer}>
                {circleData.imageUrl ? (
                  <Image source={{ uri: circleData.imageUrl }} style={styles.circleLogo} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="people-outline" size={32} color="#ccc" />
                  </View>
                )}
              </View>
              <View style={styles.circleTextInfo}>
                <View style={styles.circleNameRow}>
                  <Text style={styles.circleName}>{circleData.name}</Text>
                  {circleData.isOfficial && (
                    <View style={styles.officialBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                      <Text style={styles.officialText}>公式</Text>
                    </View>
                  )}
                  {/* SNSボタン（X, Instagram） */}
                  {(circleData.xLink || circleData.snsLink) && (
                    <View style={styles.snsIconRow}>
                      {circleData.snsLink && (
                        <TouchableOpacity onPress={() => Linking.openURL(circleData.snsLink)} style={styles.snsIconButton}>
                          <RNImage source={require('../assets/SNS-icons/Instagram_Glyph_Gradient.png')} style={styles.snsLogoImage} />
                        </TouchableOpacity>
                      )}
                      {circleData.xLink && (
                        <TouchableOpacity onPress={() => Linking.openURL(circleData.xLink)} style={styles.snsIconButton}>
                          <RNImage source={require('../assets/SNS-icons/X_logo-black.png')} style={styles.snsLogoImage} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
                <Text style={styles.universityName}>{circleData.universityName}</Text>
                <Text style={styles.genre}>{circleData.genre}</Text>
              </View>
            </View>
          </View>

          {/* サークル紹介 */}
          {/* このセクションを削除 */}

          {/* タブバー */}
          {renderTabBar()}

          {/* タブコンテンツ */}
          <View style={styles.tabContentContainer}>
            {activeTab === 'top' && renderTopTab()}
            {activeTab === 'events' && renderEventsTab()}
            {activeTab === 'welcome' && renderWelcomeTab()}
          </View>
        </ScrollView>

        {/* アクションボタン完全削除済み */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  headerImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f0f0f0',
  },
  headerImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  circleInfoSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  circleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  circleTextInfo: {
    marginLeft: 15,
    flex: 1,
  },
  circleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  circleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f7',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  officialText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: 'bold',
  },
  universityName: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  genre: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tabBarContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTabItem: {
    // アクティブインジケーターは別途表示
  },
  tabLabel: {
    fontSize: 16,
    color: '#666',
  },
  activeTabLabel: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007bff',
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    color: '#666',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    width: '30%', // Adjust as needed
    alignItems: 'center',
    backgroundColor: '#f8fafd',
    borderWidth: 1,
    borderColor: '#cce5ed',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  featuresContainer: {
    marginTop: 10,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#e0f2f7',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#cce5ed',
  },
  featureText: {
    fontSize: 13,
    color: '#333',
  },
  snsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  snsButtonText: {
    color: '#E1306C',
    fontSize: 15,
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  lineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6ffe6',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  lineButtonText: {
    color: '#06C755',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: '#333',
    fontSize: 13,
    marginLeft: 8,
  },
  scheduleText: {
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    color: '#666',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionBar: {
    backgroundColor: '#fff',
    paddingVertical: 18, // 以前は22
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    paddingVertical: 18, // 以前は22
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  favoriteButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  favoriteButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  memberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  memberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  requestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  requestedButtonText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 16, // 以前は10
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  leaderSection: {
    alignItems: 'flex-start',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    marginRight: 16,
  },
  leaderImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderBalloon: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cce5ed',
    minHeight: 56,
    justifyContent: 'center',
  },
  leaderMessage: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  activityImagesScroll: {
    marginBottom: 20,
  },
  activityImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 0,
    backgroundColor: '#eee',
    marginBottom: 20,
  },
  recommendList: {
    marginTop: 4,
  },
  recommendItem: {
    marginBottom: 4,
  },
  recommendText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  snsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 4,
  },
  snsIconButton: {
    marginLeft: 4,
    padding: 2,
  },
  snsLogoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  snsLargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
    marginTop: 8,
  },
  snsLargeButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  snsLargeLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  eventImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#eee',
  },
  eventDetail: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  calendarList: {
    marginTop: 8,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarDate: {
    fontSize: 15,
    color: '#007bff',
    width: 100,
    fontWeight: 'bold',
  },
  calendarEvent: {
    fontSize: 15,
    color: '#333',
  },
  reserveButton: {
    backgroundColor: '#007bff',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 入会募集関連のスタイル
  recruitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recruitingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flex: 1,
    marginRight: 16,
  },
  recruitingStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  toggleButton: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#007bff',
  },
  toggleCircle: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },
});