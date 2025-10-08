import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Alert, SafeAreaView, StatusBar, Dimensions, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as RNImage } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // 追加済み
import * as ImagePicker from 'expo-image-picker'; // 追加済み
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modalize } from 'react-native-modalize';
import KurukatsuButton from '../components/KurukatsuButton';
import useFirestoreDoc from '../hooks/useFirestoreDoc';
import { compressHeaderImage, compressCircleImage, compressActivityImage, compressEventImage } from '../utils/imageCompression';

const { width } = Dimensions.get('window');

// const tabRoutes = [ // 削除
//   { key: 'top', title: 'トップ' },
//   { key: 'events', title: 'イベント' },
//   { key: 'welcome', title: '新歓情報' },
// ];



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
  const { height } = Dimensions.get('window');
  const SHEET_HEIGHT = height * 0.8;
  
  // サークルデータ取得（キャッシュ30秒）
  const { data: circleData, loading, error } = useFirestoreDoc('circles', circleId);
  const [user, setUser] = useState(null);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  // const [tabIndex, setTabIndex] = useState(0); // 削除
  // const [routes] = useState(tabRoutes); // 削除
  const [activeTab, setActiveTab] = useState('top'); // 追加
  const [uploading, setUploading] = useState(false); // 追加
  const [eventFormVisible, setEventFormVisible] = useState(false); // イベント追加フォーム表示（非推奨・Modalize移行）
  const [eventTitle, setEventTitle] = useState('');
  const [eventDetail, setEventDetail] = useState('');
  const [eventImage, setEventImage] = useState(null);
  const [eventDate, setEventDate] = useState(new Date()); // 開催日
  const [eventLocation, setEventLocation] = useState(''); // 開催場所
  const [eventFee, setEventFee] = useState(''); // 参加費
  const [eventSnsLink, setEventSnsLink] = useState(''); // SNSリンク
  const [showDatePicker, setShowDatePicker] = useState(false); // DatePicker表示制御
  const [eventUploading, setEventUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 編集モード判定
  const [editingEventIndex, setEditingEventIndex] = useState(null); // 編集中のイベントindex
  const eventModalizeRef = useRef(null); // Modalizeの参照
  const [description, setDescription] = useState(''); // サークル紹介編集用
  const [descSaving, setDescSaving] = useState(false); // 保存中状態
  const [recommendationsInput, setRecommendationsInput] = useState(''); // こんな人におすすめ編集用
  const [recSaving, setRecSaving] = useState(false); // 保存中状態
  const [leaderProfileImage, setLeaderProfileImage] = useState(null); // 代表者のプロフィール画像
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
  const [activityLocation, setActivityLocation] = useState(''); // 活動場所
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // 未保存の変更があるかどうか
  const [members, setMembers] = useState([]); // メンバーデータ
  const horizontalScrollRef = useRef(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // インジケーターアニメーション関数
  const animateIndicator = (tabIndex) => {
    Animated.timing(indicatorAnim, {
      toValue: tabIndex,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // タブ切り替え関数
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    const tabIndex = ['top', 'events', 'welcome'].indexOf(tabName);
    animateIndicator(tabIndex);
    setScrollProgress(tabIndex);
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({
        x: tabIndex * Dimensions.get('window').width,
        animated: true,
      });
    }
  };

  // 水平スクロール完了時の最終同期
  const handleHorizontalScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const tabIndex = Math.round(scrollX / screenWidth);
    const tabs = ['top', 'events', 'welcome'];
    if (tabIndex >= 0 && tabIndex < tabs.length) {
      setActiveTab(tabs[tabIndex]);
      // スクロール完了時は即座に最終位置に設定
      indicatorAnim.setValue(tabIndex);
      setScrollProgress(tabIndex);
    }
  };

  // スクロール中のリアルタイム追従
  const handleScrollMovement = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const progress = scrollX / screenWidth;
    
    // インジケーターをリアルタイムで移動
    indicatorAnim.setValue(progress);
    // スクロールプログレスを更新
    setScrollProgress(progress);
  };

  // タブテキストのハイライト状態を計算
  const getTabTextStyle = (tabIndex) => {
    const isActive = Math.round(scrollProgress) === tabIndex;
    
    return {
      color: isActive ? '#2563eb' : '#666',
      fontWeight: isActive ? 'bold' : 'normal',
    };
  };

  // 初期値セット
  useEffect(() => {
    if (circleData) {
      setSnsLink(circleData.snsLink || '');
      setXLink(circleData.xLink || '');
      setShinkanLineGroupLink(circleData.shinkanLineGroupLink || '');
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
          const joinedCircles = userData.joinedCircleIds || [];
          setIsMember(joinedCircles.includes(circleId));
        } else {
          setIsMember(false);
        }
      });
      return unsubscribeSnapshot;
    } else {
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

  // メンバー数更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateCircleProfileEditMemberCount = (targetCircleId, count) => {
      if (targetCircleId === circleId) {
        // メンバー数が変更された場合、現在のメンバーリストの長さと比較
        // 実際のリストは別途更新されるため、ここでは通知のみ
        console.log(`メンバー数が更新されました: ${count}`);
      }
    };
    
    return () => {
      delete global.updateCircleProfileEditMemberCount;
    };
  }, [circleId]);

  // 初回ロード時にメンバーデータを取得
  useEffect(() => {
    if (!circleId) return;

    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnapshot = await getDocs(membersRef);
        const membersData = [];
        
        for (const memberDoc of membersSnapshot.docs) {
          const memberId = memberDoc.id;
          const memberData = memberDoc.data();
          
          // メンバードキュメントから直接性別と大学情報を取得
          // ユーザー情報も取得（名前など他の情報のため）
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            membersData.push({
              id: memberId,
              gender: memberData.gender || userData.gender || null,
              university: memberData.university || userData.university || null,
              ...memberData,
              ...userData
            });
          }
        }
        
        setMembers(membersData);
        
        // グローバルメンバー数を更新
        global.updateMemberCount(circleId, membersData.length);
        
        // テスト用のダミーデータ（メンバーが0人の場合）
        if (membersData.length === 0) {
          const dummyMembers = [
            { id: '1', gender: '男性', university: '東京大学' },
            { id: '2', gender: '男性', university: '東京大学' },
            { id: '3', gender: '男性', university: '早稲田大学' },
            { id: '4', gender: '女性', university: '東京大学' },
            { id: '5', gender: '女性', university: '慶應義塾大学' },
          ];
          setMembers(dummyMembers);
          // ダミーデータの場合もグローバル更新
          global.updateMemberCount(circleId, dummyMembers.length);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    };

    fetchMembers();
  }, [circleId]);

  // 大学データを処理する関数
  const generateUniversityData = (members) => {
    const universityCount = {};
    members.forEach(member => {
      const university = member.university || '大学名未設定';
      universityCount[university] = (universityCount[university] || 0) + 1;
    });
    
    // データを降順にソート
    const sortedData = Object.entries(universityCount)
      .sort(([, a], [, b]) => b - a)
      .map(([university, count]) => ({
        university,
        count
      }));

    return sortedData;
  };

  // 横棒グラフコンポーネント
  const BarChart = ({ data, maxWidth = 200 }) => {
    if (!data || data.length === 0) return null;

    const maxCount = Math.max(...data.map(item => item.count));

    return (
      <View style={styles.barChartContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barChartRow}>
            <Text style={styles.universityName}>{item.university}</Text>
            <Text style={styles.countText}>{item.count}</Text>
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    width: (item.count / maxCount) * maxWidth,
                    backgroundColor: '#007AFF'
                  }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

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

      // グローバル入会申請数を更新（+1）
      const currentCount = global.globalJoinRequestsCount?.[circleId] || 0;
      global.updateJoinRequestsCount(circleId, currentCount + 1);
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

  // 代表者のプロフィール画像を取得
  useEffect(() => {
    if (!circleData || !circleData.leaderId) return;

    const fetchLeaderProfileImage = async () => {
      try {
        const leaderDoc = await getDoc(doc(db, 'users', circleData.leaderId));
        if (leaderDoc.exists()) {
          const leaderData = leaderDoc.data();
          setLeaderProfileImage(leaderData.profileImageUrl || null);
        }
      } catch (error) {
        console.error('Error fetching leader profile image:', error);
      }
    };

    fetchLeaderProfileImage();
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
        
        // グローバルお気に入り状態を更新
        global.updateFavoriteStatus(circleId, false);
        
        Alert.alert("お気に入り解除", "サークルをお気に入りから削除しました。");
      } else {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayUnion(circleId) });
        await updateDoc(circleDocRef, { likes: increment(1) });
        
        // グローバルお気に入り状態を更新
        global.updateFavoriteStatus(circleId, true);
        
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
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // 選択された画像でクロップ画面に遷移
      navigation.navigate('ImageCrop', {
        imageType: 'header',
        selectedImageUri: result.assets[0].uri,
        circleName: circleData.name, // サークル名を渡す
        onCropComplete: async (croppedUri) => {
          setUploading(true);
          try {
            // 既存画像があればStorageから削除
            if (circleData.headerImageUrl) {
              await deleteImageFromStorage(circleData.headerImageUrl);
            }
            
            // 画像を圧縮
            console.log('ヘッダー画像圧縮開始...');
            const compressedUri = await compressHeaderImage(croppedUri);
            console.log('ヘッダー画像圧縮完了');
            
            // 圧縮された画像をアップロード
            const response = await fetch(compressedUri);
            const blob = await response.blob();
            const storage = getStorage();
            const fileName = `circle_images/${circleData.name}/headers/${circleId}_${Date.now()}`;
            const imgRef = storageRef(storage, fileName);
            await uploadBytes(imgRef, blob);
            const downloadUrl = await getDownloadURL(imgRef);
            
            // Firestoreに保存
            await updateDoc(doc(db, 'circles', circleId), { headerImageUrl: downloadUrl });

            
            console.log('ヘッダー画像アップロード完了');
          } catch (e) {
            console.error('ヘッダー画像アップロードエラー:', e);
            Alert.alert('エラー', '画像のアップロードに失敗しました');
          } finally {
            setUploading(false);
          }
        }
      });
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
    } catch (e) {
      Alert.alert('エラー', 'ヘッダー画像の削除に失敗しました');
    }
  };

  // URL形式チェック
  const isValidUrl = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // イベント画像選択
  const handlePickEventImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // 選択された画像でクロップ画面に遷移
      navigation.navigate('ImageCrop', {
        imageType: 'event',
        selectedImageUri: result.assets[0].uri,
        circleName: circleData.name,
        onCropComplete: (croppedUri) => {
          setEventImage({ uri: croppedUri });
        }
      });
    }
  };

  // 新規イベント追加モーダルを開く
  const navigateToAddEvent = () => {
    setIsEditMode(false);
    setEditingEventIndex(null);
    setEventTitle('');
    setEventDetail('');
    setEventImage(null);
    setEventDate(new Date());
    setEventLocation('');
    setEventFee('');
    setEventSnsLink('');
    eventModalizeRef.current?.open();
  };

  // イベント編集モーダルを開く
  const navigateToEditEvent = (idx) => {
    const event = circleData.events[idx];
    setIsEditMode(true);
    setEditingEventIndex(idx);
    setEventTitle(event.title || '');
    setEventDetail(event.detail || '');
    setEventImage(event.image ? { uri: event.image } : null);
    
    // eventDateの処理
    if (event.eventDate) {
      if (event.eventDate.toDate) {
        setEventDate(event.eventDate.toDate());
      } else if (event.eventDate instanceof Date) {
        setEventDate(event.eventDate);
      } else {
        setEventDate(new Date());
      }
    } else {
      setEventDate(new Date());
    }
    
    setEventLocation(event.location || '');
    setEventFee(event.fee || '');
    setEventSnsLink(event.snsLink || '');
    eventModalizeRef.current?.open();
  };

  // イベント保存処理（新規追加/編集共通）
  const handleSaveEvent = async () => {
    // バリデーション
    if (!eventTitle.trim()) {
      Alert.alert('入力エラー', 'タイトルを入力してください');
      return;
    }
    if (!eventImage) {
      Alert.alert('入力エラー', '写真を選択してください');
      return;
    }
    if (!eventLocation.trim()) {
      Alert.alert('入力エラー', '開催場所を入力してください');
      return;
    }
    if (!eventFee.trim()) {
      Alert.alert('入力エラー', '参加費を入力してください');
      return;
    }
    if (!eventDetail.trim()) {
      Alert.alert('入力エラー', '詳細を入力してください');
      return;
    }
    if (!eventSnsLink.trim()) {
      Alert.alert('入力エラー', 'SNSリンクを入力してください');
      return;
    }
    if (!isValidUrl(eventSnsLink)) {
      Alert.alert('入力エラー', 'SNSリンクは有効なURLを入力してください\n(http:// または https:// で始まる必要があります)');
      return;
    }

    setEventUploading(true);
    let imageUrl = '';
    
    try {
      // 画像アップロード処理
      if (eventImage.uri && !eventImage.uri.startsWith('http')) {
        // 新規画像の場合
        try {
          // 編集モードで既存画像があれば削除
          if (isEditMode && circleData.events[editingEventIndex]?.image) {
            await deleteImageFromStorage(circleData.events[editingEventIndex].image);
          }
          
          console.log('イベント画像圧縮開始...');
          const compressedUri = await compressEventImage(eventImage.uri);
          console.log('イベント画像圧縮完了');
          
          const response = await fetch(compressedUri);
          const blob = await response.blob();
          const storage = getStorage();
          const fileName = `circle_images/${circleData.name}/events/${circleId}_${Date.now()}`;
          const imgRef = storageRef(storage, fileName);
          await uploadBytes(imgRef, blob);
          imageUrl = await getDownloadURL(imgRef);
          
          console.log('イベント画像アップロード完了');
        } catch (error) {
          console.error('イベント画像アップロードエラー:', error);
          Alert.alert('エラー', 'イベント画像のアップロードに失敗しました');
          setEventUploading(false);
          return;
        }
      } else if (eventImage.uri) {
        // 既存画像をそのまま使用
        imageUrl = eventImage.uri;
      }

      // イベントオブジェクト作成
      const eventObj = {
        title: eventTitle.trim(),
        detail: eventDetail.trim(),
        image: imageUrl,
        eventDate: Timestamp.fromDate(eventDate),
        location: eventLocation.trim(),
        fee: eventFee.trim(),
        snsLink: eventSnsLink.trim(),
        deadline: Timestamp.fromDate(eventDate), // 締切日＝開催日
      };

      if (isEditMode && editingEventIndex !== null) {
        // 編集モード
        const newEvents = [...circleData.events];
        newEvents[editingEventIndex] = eventObj;
        await updateDoc(doc(db, 'circles', circleId), { events: newEvents });
        Alert.alert('成功', 'イベントを更新しました');
      } else {
        // 新規追加モード
        await updateDoc(doc(db, 'circles', circleId), {
          events: arrayUnion(eventObj)
        });
        Alert.alert('成功', 'イベントを追加しました');
      }

      eventModalizeRef.current?.close();
    } catch (e) {
      console.error('イベント保存エラー:', e);
      Alert.alert('エラー', 'イベントの保存に失敗しました');
    } finally {
      setEventUploading(false);
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


  // 代表者情報保存
  const handleSaveLeader = async () => {
    setLeaderSaving(true);
    try {
      await updateDoc(doc(db, 'circles', circleId), {
        leaderMessage: leaderMessage,
      });
      Alert.alert('保存完了', '代表者メッセージを更新しました');
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
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // 選択された画像でクロップ画面に遷移
      navigation.navigate('ImageCrop', {
        imageType: 'activity',
        selectedImageUri: result.assets[0].uri,
        circleName: circleData.name, // サークル名を渡す
        onCropComplete: async (croppedUri) => {
          setActivityUploading(true);
          try {
            // 画像を圧縮
            console.log('活動写真圧縮開始...');
            const compressedUri = await compressActivityImage(croppedUri);
            console.log('活動写真圧縮完了');
            
            // 圧縮された画像をアップロード
            const response = await fetch(compressedUri);
            const blob = await response.blob();
            const storage = getStorage();
            const fileName = `circle_images/${circleData.name}/activities/${circleId}_${Date.now()}`;
            const imgRef = storageRef(storage, fileName);
            await uploadBytes(imgRef, blob);
            const downloadUrl = await getDownloadURL(imgRef);
            const newImages = [...activityImages, downloadUrl];
            await updateDoc(doc(db, 'circles', circleId), { activityImages: newImages });
            setActivityImages(newImages);
            
            console.log('活動写真アップロード完了');
          } catch (e) {
            console.error('活動写真アップロードエラー:', e);
            Alert.alert('エラー', '活動写真の追加に失敗しました');
          } finally {
            setActivityUploading(false);
          }
        }
      });
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
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // 選択された画像でクロップ画面に遷移
      navigation.navigate('ImageCrop', {
        imageType: 'activity',
        selectedImageUri: result.assets[0].uri,
        circleName: circleData.name, // サークル名を渡す
        onCropComplete: async (croppedUri) => {
          setActivityUploading(true);
          try {
            // 既存画像があればStorageから削除
            if (activityImages[idx]) {
              await deleteImageFromStorage(activityImages[idx]);
            }
            
            // 画像を圧縮
            console.log('活動写真差し替え圧縮開始...');
            const compressedUri = await compressActivityImage(croppedUri);
            console.log('活動写真差し替え圧縮完了');
            
            // 圧縮された画像をアップロード
            const response = await fetch(compressedUri);
            const blob = await response.blob();
            const storage = getStorage();
            const fileName = `circle_images/${circleData.name}/activities/${circleId}_${Date.now()}`;
            const imgRef = storageRef(storage, fileName);
            await uploadBytes(imgRef, blob);
            const downloadUrl = await getDownloadURL(imgRef);
            const newImages = [...activityImages];
            newImages[idx] = downloadUrl;
            await updateDoc(doc(db, 'circles', circleId), { activityImages: newImages });
            setActivityImages(newImages);
            
            console.log('活動写真差し替えアップロード完了');
          } catch (e) {
            console.error('活動写真差し替えアップロードエラー:', e);
            Alert.alert('エラー', '活動写真の変更に失敗しました');
          } finally {
            setActivityUploading(false);
          }
        }
      });
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
        welcome: { ...(circleData.welcome || {}), conditions: welcomeConditions, isRecruiting },
        snsLink,
        xLink,
        shinkanLineGroupLink,
        activityLocation,
      });
      setHasUnsavedChanges(false);
      Alert.alert(
        '保存完了', 
        'プロフィール情報を保存しました',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const renderTopTab = () => (
    <View style={styles.tabContent}>
      {/* 活動写真アップロード・表示 */}
      <View style={{marginBottom: 20, width: '100%'}}>
        {activityImages && activityImages.length > 0 ? (
          <View style={{position: 'relative', width: '100%', aspectRatio: 16/9, alignSelf: 'center', marginBottom: 20}}>
            <TouchableOpacity onPress={() => handleReplaceActivityImage(0)} activeOpacity={0.7} style={{width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
                <Image 
                  source={{ 
                    uri: activityImages[0],
                    cache: 'force-cache'
                  }} 
                  style={{width: '100%', aspectRatio: 16/9, borderRadius: 0, backgroundColor: '#eee'}}
                  resizeMode="cover"
                />
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
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Ionicons name="camera-outline" size={48} color="#aaa" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* サークル紹介 */}
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
        
        {circleData.activityDays && circleData.activityDays.length > 0 && (
          <View style={styles.featuresContainer}>
            <Text style={styles.infoLabel}>活動曜日</Text>
            <View style={styles.featuresList}>
              {circleData.activityDays.map((day, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
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

        {/* メンバー構成（横棒グラフ） */}
        {members.length > 0 && (
          <View style={styles.memberCompositionContainer}>
            <Text style={styles.infoLabel}>メンバーの所属大学</Text>
            <BarChart data={generateUniversityData(members)} />
          </View>
        )}
      </View>

      {/* 活動場所 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>活動場所</Text>
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

      {/* こんな人におすすめ */}
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

      {/* 代表者からのメッセージ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>代表者からのメッセージ</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 12 }}>
          {leaderProfileImage ? (
            <Image source={{ uri: leaderProfileImage }} style={{width: 72, height: 72, borderRadius: 36, backgroundColor: '#eee'}} />
          ) : (
            <View style={{width: 72, height: 72, borderRadius: 36, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center'}}>
              <Ionicons name="person-outline" size={36} color="#aaa" />
            </View>
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

      {/* SNS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SNS</Text>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
          <Image 
            source={require('../assets/SNS-icons/Instagram_Glyph_Gradient.png')} 
            style={styles.snsLargeLogo}
          />
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
          <Image 
            source={require('../assets/SNS-icons/X_logo-black.png')} 
            style={styles.snsLargeLogo}
          />
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
    </View>
  );

  // 締切チェック関数（編集画面では全イベント表示、期限切れは自動削除）
  const isEventExpired = (event) => {
    if (!event.eventDate && !event.deadline) return false;
    
    const deadline = event.deadline || event.eventDate;
    let deadlineDate;
    
    if (deadline.toDate) {
      deadlineDate = deadline.toDate();
    } else if (deadline instanceof Date) {
      deadlineDate = deadline;
    } else {
      return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    return deadlineDate < today;
  };

  // 期限切れイベントを自動削除
  const cleanupExpiredEvents = async () => {
    if (!circleData.events || circleData.events.length === 0) return;
    
    const expiredEvents = circleData.events.filter(event => isEventExpired(event));
    if (expiredEvents.length === 0) return;
    
    try {
      // 期限切れイベントの画像をStorageから削除
      for (const event of expiredEvents) {
        if (event.image) {
          await deleteImageFromStorage(event.image);
        }
      }
      
      // 有効なイベントのみ保持
      const activeEvents = circleData.events.filter(event => !isEventExpired(event));
      await updateDoc(doc(db, 'circles', circleId), {
        events: activeEvents
      });
      
      console.log(`${expiredEvents.length}件の期限切れイベントを削除しました`);
    } catch (error) {
      console.error('期限切れイベントの削除に失敗:', error);
    }
  };

  // 画面表示時に期限切れイベントをクリーンアップ
  useEffect(() => {
    if (circleData && circleData.events) {
      cleanupExpiredEvents();
    }
  }, [circleData?.events?.length]);

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>新歓イベント</Text>
        {/* イベント追加ボタン */}
        <View style={styles.eventAddButtonContainer}>
          <KurukatsuButton
            title="新歓イベント追加"
            onPress={navigateToAddEvent}
            size="medium"
            variant="primary"
            hapticFeedback={true}
            style={styles.eventAddButton}
          />
        </View>
        
        {/* イベントリスト（有効なイベントのみ表示） */}
        {circleData.events && circleData.events.length > 0 && (
          circleData.events.filter(event => !isEventExpired(event)).map((event, idx) => (
            <View key={idx} style={styles.eventCard}>
              {/* イベント画像 */}
              {event.image && (
                <Image source={{ uri: event.image }} style={styles.eventImage} resizeMode="cover" />
              )}
              
              {/* イベント情報 */}
              <View style={styles.eventCardContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                
                {/* 編集・削除ボタン */}
                <View style={styles.eventActionsRow}>
                  <TouchableOpacity
                    style={styles.eventEditButton}
                    onPress={() => navigateToEditEvent(idx)}
                  >
                    <Ionicons name="create-outline" size={20} color="#007bff" />
                    <Text style={styles.eventEditButtonText}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.eventDeleteButton}
                    onPress={() => {
                      Alert.alert(
                        '確認',
                        'このイベントを削除しますか？',
                        [
                          { text: 'キャンセル', style: 'cancel' },
                          { text: '削除', style: 'destructive', onPress: () => handleDeleteEvent(idx) }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc3545" />
                    <Text style={styles.eventDeleteButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
        {isRecruiting ? (
          <View style={styles.recruitingStatusContainer}>
            <View style={[styles.recruitingIconContainer, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="checkmark" size={24} color="#10b981" />
            </View>
            <Text style={styles.recruitingStatusText}>入会募集中</Text>
          </View>
        ) : (
          <View style={styles.recruitingStatusContainer}>
            <View style={[styles.recruitingIconContainer, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="close" size={24} color="#ef4444" />
            </View>
            <Text style={styles.recruitingStatusText}>現在入会の募集はありません</Text>
          </View>
        )}
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
          <Image 
            source={require('../assets/SNS-icons/LINE_Brand_icon.png')} 
            style={styles.snsLargeLogo}
          />
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
    </View>
  );

  // タブバー部分（スワイプ遷移対応版）
  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'top' && styles.activeTabItem]}
          onPress={() => handleTabChange('top')}
        >
          <Text style={[styles.tabLabel, getTabTextStyle(0)]}>
            トップ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'events' && styles.activeTabItem]}
          onPress={() => handleTabChange('events')}
        >
          <Text style={[styles.tabLabel, getTabTextStyle(1)]}>
            新歓イベント
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'welcome' && styles.activeTabItem]}
          onPress={() => handleTabChange('welcome')}
        >
          <Text style={[styles.tabLabel, getTabTextStyle(2)]}>
            新歓情報
          </Text>
        </TouchableOpacity>
        
        {/* アニメーションするインジケーター */}
        <Animated.View 
          style={[
            styles.animatedIndicator,
            {
              transform: [{
                translateX: indicatorAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [0, Dimensions.get('window').width / 3, (Dimensions.get('window').width / 3) * 2],
                })
              }]
            }
          ]}
        />
      </View>
    </View>
  );

  // ローディング・エラー時のUIを共通化
  if (loading && !circleData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>サークルデータの取得に失敗しました</Text>
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
                <ActivityIndicator size="small" color="#999" />
              </View>
            ) : circleData.headerImageUrl ? (
              <>
                <Image 
                  source={{ 
                    uri: circleData.headerImageUrl,
                    cache: 'force-cache'
                  }} 
                  style={styles.headerImage}
                  resizeMode="cover"
                />
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
                  <Image 
                    source={{ 
                      uri: circleData.imageUrl,
                      cache: 'force-cache'
                    }} 
                    style={styles.circleLogo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="people-outline" size={32} color="#ccc" />
                  </View>
                )}
              </View>
              <View style={styles.circleTextInfo}>
                {/* サークル名（独立した行） */}
                <View style={styles.circleNameContainer}>
                  <Text style={styles.circleName} numberOfLines={2} ellipsizeMode="tail">{circleData.name}</Text>
                </View>
                
                {/* 大学名・ジャンル（サークル名の下） */}
                <View style={styles.circleDetailsContainer}>
                  <Text style={styles.universityName}>{circleData.universityName}</Text>
                  <Text style={styles.genre}>{circleData.genre}</Text>
                </View>
              </View>
            </View>
            
            {/* SNSボタン（サークル情報セクションの右下に絶対配置） */}
            {(circleData.xLink || circleData.snsLink) && (
              <View style={styles.snsIconContainer}>
                {circleData.snsLink && (
                  <TouchableOpacity onPress={() => Linking.openURL(circleData.snsLink)} style={styles.snsIconButton}>
                    <Image 
                      source={require('../assets/SNS-icons/Instagram_Glyph_Gradient.png')} 
                      style={styles.snsLogoImage}
                    />
                  </TouchableOpacity>
                )}
                {circleData.xLink && (
                  <TouchableOpacity onPress={() => Linking.openURL(circleData.xLink)} style={styles.snsIconButton}>
                    <Image 
                      source={require('../assets/SNS-icons/X_logo-black.png')} 
                      style={styles.snsLogoImage}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* タブバー */}
          {renderTabBar()}

          {/* タブコンテンツ */}
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScrollMovement}
            onMomentumScrollEnd={handleHorizontalScroll}
            scrollEventThrottle={16}
            style={styles.horizontalScrollView}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <View style={styles.tabContentContainer}>
              {renderTopTab()}
            </View>
            <View style={styles.tabContentContainer}>
              {renderEventsTab()}
            </View>
            <View style={styles.tabContentContainer}>
              {renderWelcomeTab()}
            </View>
          </ScrollView>
        </ScrollView>

        {/* アクションボタン完全削除済み */}
      </View>

      {/* イベント追加/編集ボトムシート */}
      <Modalize
        ref={eventModalizeRef}
        adjustToContentHeight={false}
        modalHeight={SHEET_HEIGHT}
        withHandle={false}
        panGestureEnabled={false}
        modalStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#fff' }}
        overlayStyle={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        scrollViewProps={{ showsVerticalScrollIndicator: false }}
        HeaderComponent={
          <View style={styles.eventModalHeader}>
            <TouchableOpacity 
              style={styles.eventModalHeaderButton} 
              onPress={() => eventModalizeRef.current?.close()}
            >
              <Text style={styles.eventModalHeaderButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <View style={styles.eventModalHeaderTitleContainer}>
              <Text style={styles.eventModalHeaderTitle}>{isEditMode ? 'イベント編集' : '新しいイベント'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.eventModalHeaderButton} 
              onPress={handleSaveEvent}
            >
              <Text style={styles.eventModalHeaderButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <KeyboardAvoidingView 
          style={styles.eventModalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            style={styles.eventModalForm} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.eventModalFormContent}
          >
            {/* タイトル */}
            <View style={styles.eventModalFormRow}>
              <Text style={styles.eventModalFormLabel}>タイトル</Text>
              <TextInput 
                style={styles.eventModalFormInput} 
                value={eventTitle} 
                onChangeText={setEventTitle}
              />
            </View>

            {/* 写真 */}
            <View style={styles.eventModalFormRow}>
              <Text style={styles.eventModalFormLabel}>写真</Text>
              <TouchableOpacity onPress={handlePickEventImage} style={styles.eventImagePickerButton}>
                {eventImage ? (
                  <Image source={{ uri: eventImage.uri }} style={styles.eventImagePreview} />
                ) : (
                  <View style={styles.eventImagePlaceholder}>
                    <Ionicons name="camera-outline" size={48} color="#aaa" />
                    <Text style={styles.eventImagePlaceholderText}>写真を選択</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* 開催日 */}
            <View style={styles.eventModalFormRow}>
              <Text style={styles.eventModalFormLabel}>開催日</Text>
              <TouchableOpacity 
                style={styles.eventDatePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.eventDateText}>
                  {eventDate.getFullYear()}年{eventDate.getMonth() + 1}月{eventDate.getDate()}日
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    locale="ja-JP"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setEventDate(selectedDate);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                </View>
              )}
            </View>

            {/* 開催場所 */}
            <View style={styles.eventModalFormRow}>
              <Text style={styles.eventModalFormLabel}>開催場所</Text>
              <TextInput 
                style={styles.eventModalFormInput} 
                value={eventLocation}
                onChangeText={setEventLocation}
              />
            </View>

            {/* 参加費 */}
            <View style={styles.eventModalFormRow}>
              <Text style={styles.eventModalFormLabel}>参加費</Text>
              <TextInput 
                style={styles.eventModalFormInput} 
                value={eventFee}
                onChangeText={setEventFee}
              />
            </View>

            {/* SNSリンク */}
            <View style={styles.eventModalFormRow}>
              <Text style={styles.eventModalFormLabel}>SNSリンク</Text>
              <TextInput 
                style={styles.eventModalFormInput} 
                value={eventSnsLink}
                onChangeText={setEventSnsLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {/* 詳細 */}
            <View style={styles.eventModalFormRow}>
              <Text style={styles.eventModalFormLabel}>詳細</Text>
              <View style={styles.eventModalDetailInputContainer}>
                <TextInput 
                  style={[styles.eventModalFormInput, styles.eventModalDetailInput]} 
                  value={eventDetail} 
                  onChangeText={setEventDetail} 
                  placeholder="イベントの詳細を入力してください"
                  multiline
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modalize>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
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
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  circleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 5,
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
    paddingRight: 0,
  },
  circleNameContainer: {
    marginBottom: 8,
  },
  circleDetailsContainer: {
    gap: 4,
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
    color: '#1f2937',
    lineHeight: 30,
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
    color: '#6b7280',
    lineHeight: 22,
  },
  genre: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  tabBarContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    position: 'relative',
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
    color: '#2563eb',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2563eb',
  },
  animatedIndicator: {
    position: 'absolute',
    bottom: 0,
    width: Dimensions.get('window').width / 3,
    height: 2,
    backgroundColor: '#2563eb',
  },
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: Dimensions.get('window').width,
  },
  horizontalScrollView: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 24,
    color: '#374151',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
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
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  featureText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  snsIconContainer: {
    position: 'absolute',
    bottom: 15,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  snsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 4,
  },
  snsIconButton: {
    padding: 2,
  },
  snsLogoImage: {
    width: 36,
    height: 36,
    contentFit: 'contain',
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
    contentFit: 'contain',
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
    contentFit: 'contain',
  },
  // 横棒グラフ関連のスタイル
  barChartContainer: {
    marginTop: 10,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  universityName: {
    fontSize: 14,
    color: '#333',
    width: 120,
    marginRight: 10,
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 30,
    textAlign: 'right',
    marginRight: 10,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 10,
  },
  memberCompositionContainer: {
    marginTop: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#eee',
  },
  eventCardContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  eventActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  eventEditButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  eventDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  eventDeleteButtonText: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '600',
  },
  eventDetail: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  eventAddButtonContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  eventAddButton: {
    width: '100%',
    maxWidth: 300,
  },
  // イベント編集Modal用スタイル
  eventModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  eventModalHeaderButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
  },
  eventModalHeaderButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    textAlign: 'center',
  },
  eventModalHeaderTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventModalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  eventModalKeyboardView: {
    flex: 1,
  },
  eventModalForm: {
    flex: 1,
    paddingHorizontal: 16,
  },
  eventModalFormContent: {
    paddingBottom: 20,
  },
  eventModalFormRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventModalFormLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 12,
  },
  eventModalFormInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  eventImagePickerButton: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  eventImagePreview: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  eventImagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  eventDatePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  eventDateText: {
    fontSize: 16,
    color: '#333',
  },
  eventModalDetailInputContainer: {
    flex: 1,
  },
  eventModalDetailInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
  recruitingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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