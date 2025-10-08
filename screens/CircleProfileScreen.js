import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Alert, SafeAreaView, StatusBar, Dimensions, Modal, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Image as RNImage } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment, collection, addDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';
import { checkStudentIdVerification } from '../utils/permissionUtils';
import useFirestoreDoc from '../hooks/useFirestoreDoc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserNotificationTokens, sendPushNotification } from '../utils/notificationUtils';
import { useFocusEffect } from '@react-navigation/native';


const { width } = Dimensions.get('window');

// const tabRoutes = [ // 削除
//   { key: 'top', title: 'トップ' },
//   { key: 'events', title: 'イベント' },
//   { key: 'welcome', title: '新歓情報' },
// ];



export default function CircleProfileScreen({ route, navigation }) {
  const { circleId } = route.params;
  // サークルデータ取得（キャッシュ30秒）
  const { data: circleData, loading, error } = useFirestoreDoc('circles', circleId);
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('top');
  const [leaderProfileImage, setLeaderProfileImage] = useState(null);
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
  const handleScroll = (event) => {
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
  
  // アクションメニュー用の状態
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [userBlockedCircleIds, setUserBlockedCircleIds] = useState([]);
  
  // 入会申請確認モーダル用の状態
  const [showJoinConfirmModal, setShowJoinConfirmModal] = useState(false);
  
  
  // 画像のプリロード関数
  const preloadImages = async () => {
    if (!circleData) return;
    
    const imagesToPreload = [];
    
    if (circleData.headerImageUrl) {
      imagesToPreload.push(circleData.headerImageUrl);
    }
    if (circleData.imageUrl) {
      imagesToPreload.push(circleData.imageUrl);
    }
    if (circleData.activityImages && circleData.activityImages.length > 0) {
      imagesToPreload.push(circleData.activityImages[0]);
    }
    
    try {
      await Promise.all(
        imagesToPreload.map(url => 
          ExpoImage.prefetch(url, { 
            cachePolicy: 'memory-disk',
            priority: 'high'
          })
        )
      );
    } catch (error) {
      console.log('Image preload failed:', error);
    }
  };

  // データ読み込み完了時に画像をプリロード
  useEffect(() => {
    if (circleData && !loading) {
      preloadImages();
    }
  }, [circleData, loading]);
  
  // ブロック状態更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateCircleProfileBlockStatus = (blockedIds) => {
      setUserBlockedCircleIds(blockedIds);
    };
    
    return () => {
      delete global.updateCircleProfileBlockStatus;
    };
  }, []);
  
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
  const [selectedCircle, setSelectedCircle] = useState(null);

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

  // メンバー数更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateCircleProfileMemberCount = (targetCircleId, count) => {
      if (targetCircleId === circleId) {
        // メンバー数が変更された場合、現在のメンバーリストの長さと比較
        // 実際のリストは別途更新されるため、ここでは通知のみ
        console.log(`メンバー数が更新されました: ${count}`);
      }
    };
    
    return () => {
      delete global.updateCircleProfileMemberCount;
    };
  }, [circleId]);

  // 初回ロード時にメンバーデータを取得
  useEffect(() => {
    if (!circleId) return;

    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnapshot = await getDocs(membersRef);
        
        const membersData = membersSnapshot.docs.map(memberDoc => {
          const memberData = memberDoc.data();
          console.log(`メンバー ${memberDoc.id} のデータ:`, memberData);
          
          return {
            id: memberDoc.id,
            ...memberData
          };
        });
        
        console.log('取得したメンバーデータ:', membersData);
        setMembers(membersData);
        
        // グローバルメンバー数を更新
        global.updateMemberCount(circleId, membersData.length);
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    };

    fetchMembers();
  }, [circleId]);

  // 入会申請状態を確認する関数
  const checkJoinRequestStatus = async () => {
    if (!user || !circleId) return;
    
    try {
      const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
      const q = query(requestsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      setHasRequested(!snapshot.empty);
      console.log('入会申請状態確認:', !snapshot.empty ? '申請済み' : '未申請');
    } catch (e) {
      console.error('入会申請状態確認エラー:', e);
      setHasRequested(false);
    }
  };

  useEffect(() => {
    checkJoinRequestStatus();
  }, [user, circleId]);

  // 画面フォーカス時に入会申請状態を再確認
  useFocusEffect(
    React.useCallback(() => {
      checkJoinRequestStatus();
    }, [user, circleId])
  );
  
  // ブロック状態を取得
  useEffect(() => {
    if (!user) return;
    
    const fetchUserBlocks = async () => {
      try {
        const blocksRef = collection(db, 'users', user.uid, 'blocks');
        const blocksSnapshot = await getDocs(blocksRef);
        const blockedIds = blocksSnapshot.docs.map(doc => doc.id);
        setUserBlockedCircleIds(blockedIds);
      } catch (error) {
        console.error('Error fetching user blocks:', error);
        setUserBlockedCircleIds([]);
      }
    };
    
    fetchUserBlocks();
  }, [user]);

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



  // 入会申請確認モーダルを表示
  const handleJoinRequestPress = () => {
    if (!user) {
      Alert.alert('ログインが必要です', '入会申請にはログインが必要です。');
      return;
    }
    setShowJoinConfirmModal(true);
  };

  // 実際の入会申請処理
  const handleJoinRequest = async () => {
    setShowJoinConfirmModal(false);

    // 学生証認証状態を確認 - 一時的に無効化
    /*
    const isStudentIdVerified = await checkStudentIdVerification(user.uid);
    if (!isStudentIdVerified) {
      Alert.alert(
        '学生証認証が必要です',
        '入会申請には学生証の認証が必要です。\nプロフィール編集画面で学生証を認証してください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: 'プロフィール編集へ', 
            onPress: () => navigation.navigate('共通', { screen: 'ProfileEdit' })
          }
        ]
      );
      return;
    }
    */

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

      // グローバル入会申請数を更新（+1）
      const currentCount = global.globalJoinRequestsCount?.[circleId] || 0;
      global.updateJoinRequestsCount(circleId, currentCount + 1);

      // サークル代表者・管理者へプッシュ通知を送信
      await sendJoinRequestNotification(userData.name || '不明');

    } catch (e) {
      Alert.alert('エラー', '申請の送信に失敗しました');
    }
  };

  // 入会申請通知を送信
  const sendJoinRequestNotification = async (applicantName) => {
    if (!circleData) return;

    try {
      console.log('入会申請通知送信開始');
      console.log('サークルID:', circleId);
      console.log('代表者ID:', circleData.leaderId);
      console.log('メンバー数:', members.length);
      
      // サークルの代表者と管理者の通知トークンを取得
      const leaderAndAdminTokens = [];
      
      // 代表者の通知トークンを取得
      if (circleData.leaderId) {
        console.log('代表者の通知トークンを取得中...');
        const leaderTokens = await getUserNotificationTokens(circleData.leaderId, 'joinRequest');
        console.log('代表者の通知トークン数:', leaderTokens.length);
        leaderAndAdminTokens.push(...leaderTokens);
      }
      
      // 管理者の通知トークンを取得
      if (members.length > 0) {
        console.log('全メンバー:', members.map(m => ({ id: m.id, role: m.role, name: m.name })));
        const adminMembers = members.filter(member => member.role === 'admin');
        console.log('管理者メンバー数:', adminMembers.length);
        console.log('管理者詳細:', adminMembers.map(m => ({ id: m.id, role: m.role, name: m.name })));
        
        for (const adminMember of adminMembers) {
          console.log(`管理者 ${adminMember.name} (${adminMember.id}) の通知トークンを取得中...`);
          const adminTokens = await getUserNotificationTokens(adminMember.id, 'joinRequest');
          console.log(`管理者 ${adminMember.name} の通知トークン数:`, adminTokens.length);
          leaderAndAdminTokens.push(...adminTokens);
        }
      } else {
        console.log('メンバーが0人のため、管理者の通知トークンは取得しません');
      }
      
      // 重複を除去
      const uniqueTokens = [...new Set(leaderAndAdminTokens)];
      console.log('総通知トークン数:', uniqueTokens.length);
      
      if (uniqueTokens.length > 0) {
        const notificationTitle = '新しい入会申請';
        const notificationBody = `${circleData.name}に${applicantName}さんから入会申請が届きました`;
        const notificationData = {
          type: 'joinRequest',
          circleId: circleId,
          circleName: circleData.name,
          applicantName: applicantName,
        };
        
        await sendPushNotification(uniqueTokens, notificationTitle, notificationBody, notificationData);
        console.log('入会申請通知を送信しました');
      } else {
        console.log('通知トークンが0件のため、通知を送信しません');
      }
    } catch (error) {
      console.error('入会申請通知の送信に失敗:', error);
    }
  };

  // 既存の冗長なuseEffectやローディング・エラー処理を削除し、circleData, loading, errorを直接利用する形に整理

  // アクションメニューの表示・非表示
  const showActionSheetForCircle = () => {
    setActionMenuVisible(true);
  };

  const hideActionSheet = () => {
    setActionMenuVisible(false);
    // フェードアニメーション完了後にselectedCircleをクリア
    setTimeout(() => {
      setSelectedCircle(null);
    }, 300);
  };

  // ユーザーがサークルのメンバーかどうかをチェック
  const isUserMemberOfCircle = (circleId) => {
    return isMember;
  };

  // ブロック機能
  const handleBlock = async () => {
    if (!user || !circleData) return;

    // 所属しているサークルはブロック不可
    if (isUserMemberOfCircle(circleId)) {
      Alert.alert('ブロック不可', '所属しているサークルはブロックできません。');
      return;
    }

    // 既にブロックされているかチェック
    if (userBlockedCircleIds.includes(circleId)) {
      Alert.alert('既にブロック済み', 'このサークルは既にブロックされています。');
      return;
    }

    try {
      const blockData = {
        blockedCircleId: circleId,
        blockedCircleName: circleData.name,
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', user.uid, 'blocks', circleId), blockData);
      
      // ブロック操作完了（スナップショットリスナーで自動更新される）
      
      // いいね！している場合は削除
      if (isFavorite) {
        const userDocRef = doc(db, 'users', user.uid);
        const circleDocRef = doc(db, 'circles', circleId);
        await updateDoc(userDocRef, { favoriteCircleIds: arrayRemove(circleId) });
        await updateDoc(circleDocRef, { likes: increment(-1) });
        
        // グローバルお気に入り状態を更新
        global.updateFavoriteStatus(circleId, false);
      }
      
      // ローカル状態を更新
      setUserBlockedCircleIds(prev => [...prev, circleId]);
      
      Alert.alert('完了', 'サークルをブロックしました。');
      hideActionSheet();
    } catch (error) {
      console.error('Error blocking circle:', error);
      Alert.alert('エラー', 'ブロックに失敗しました');
    }
  };

  // 報告機能
  const handleReport = () => {
    navigation.navigate('共通', { screen: 'Report', params: {
      circleId: circleId,
      circleName: circleData?.name || '不明なサークル'
    }});
    hideActionSheet();
  };

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
      } else {
        await updateDoc(userDocRef, { favoriteCircleIds: arrayUnion(circleId) });
        await updateDoc(circleDocRef, { likes: increment(1) });
        
        // グローバルお気に入り状態を更新
        global.updateFavoriteStatus(circleId, true);
      }
    } catch (error) {
      console.error("Error toggling favorite: ", error);
      Alert.alert("エラー", "お気に入り操作に失敗しました。");
    }
  };

  // 横棒グラフコンポーネント
  const BarChart = ({ data, maxWidth = 200 }) => {
    if (!data || data.length === 0) return null;

    const maxCount = Math.max(...data.map(item => item.count));
    


    return (
      <View style={styles.barChartContainer}>
        {data.map((item, index) => {
          const barWidth = (item.count / maxCount) * maxWidth;

          return (
            <View key={index} style={styles.barChartRow}>
              <Text style={styles.universityName}>{item.university}</Text>
              <Text style={styles.countText}>{item.count}</Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      backgroundColor: '#007AFF',
                      width: barWidth
                    }
                  ]} 
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTopTab = () => (
    <View style={styles.tabContent}>
      {/* サークル活動画像（1枚のみ、スクロール不可） */}
      {circleData.activityImages && circleData.activityImages.length > 0 && (
        <ExpoImage
          source={{ uri: circleData.activityImages[0] }}
          style={styles.activityImage}
          cachePolicy="memory-disk"
          contentFit="cover"
        />
      )}

      {/* サークル紹介 */}
      {circleData.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サークル紹介</Text>
          <Text style={styles.description}>{circleData.description}</Text>
        </View>
      )}

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
      {circleData.activityLocation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>活動場所</Text>
          <Text style={styles.activityLocationText}>{circleData.activityLocation}</Text>
        </View>
      )}

      {/* こんな人におすすめ */}
      {circleData.recommendations && circleData.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>こんな人におすすめ</Text>
          <View style={styles.recommendList}>
            {circleData.recommendations.map((rec, idx) => (
              <View key={idx} style={styles.recommendItem}>
                <Text style={styles.recommendText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 代表者紹介 */}
      {circleData.leaderMessage && (
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
          <Text style={{borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#fff', minHeight: 60, fontSize: 16, marginBottom: 8, lineHeight: 24}}>
            {circleData.leaderMessage}
          </Text>
        </View>
      )}




      {/* 新歓スケジュール */}
      {circleData.welcome && circleData.welcome.schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新歓スケジュール</Text>
          <Text style={styles.scheduleText}>{circleData.welcome.schedule}</Text>
        </View>
      )}
    </View>
  );

  // 日付フォーマット関数
  const formatEventDate = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  // イベント詳細画面への遷移
  const handleEventDetailPress = (event) => {
    navigation.navigate('共通', {
      screen: 'CircleEventDetail',
      params: {
        event: event,
        circleName: circleData.name
      }
    });
  };

  // 締切チェック関数
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

  // 有効なイベントのみをフィルタ
  const getActiveEvents = () => {
    if (!circleData.events) return [];
    return circleData.events.filter(event => !isEventExpired(event));
  };

  const renderEventsTab = () => {
    const activeEvents = getActiveEvents();
    
    return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>新歓イベント</Text>
        {activeEvents && activeEvents.length > 0 ? (
          activeEvents.map((event, idx) => (
            <View key={idx} style={styles.eventCard}>
              {/* イベント画像 */}
              {event.image && (
                <Image source={{ uri: event.image }} style={styles.eventImage} contentFit="cover" />
              )}
              
              {/* イベント情報 */}
              <View style={styles.eventCardContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                
                {/* 開催日時 */}
                {event.eventDate && (
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.eventInfoText}>{formatEventDate(event.eventDate)}</Text>
                  </View>
                )}
                
                {/* 開催場所 */}
                {event.location && (
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.eventInfoText} numberOfLines={1}>{event.location}</Text>
                  </View>
                )}
                
                {/* 参加費 */}
                {event.fee && (
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="cash-outline" size={16} color="#666" />
                    <Text style={styles.eventInfoText}>{event.fee}</Text>
                  </View>
                )}
                
                {/* 詳細はこちらボタン */}
                <View style={styles.eventButtonContainer}>
                  <KurukatsuButton
                    title="詳細はこちら"
                    onPress={() => handleEventDetailPress(event)}
                    size="small"
                    variant="secondary"
                    hapticFeedback={true}
                    style={styles.eventDetailButton}
                  />
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.placeholderText}>新歓イベント情報は準備中です</Text>
        )}
      </View>
    </View>
  );
  };

  const renderWelcomeTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>入会募集状況</Text>
        {circleData.welcome?.isRecruiting ? (
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
      {circleData.welcome?.conditions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>入会条件</Text>
          <Text style={styles.description}>{circleData.welcome.conditions}</Text>
        </View>
      )}
      {/* 新歓LINEグループ 追加 */}
      {circleData.shinkanLineGroupLink && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新歓LINEグループ</Text>
          <TouchableOpacity style={styles.lineButton} onPress={() => Linking.openURL(circleData.shinkanLineGroupLink)}>
            <Image 
              source={require('../assets/SNS-icons/LINE_Brand_icon.png')} 
              style={styles.snsLogoImage}
            />
            <Text style={styles.lineButtonText}>LINEグループを開く</Text>
          </TouchableOpacity>
        </View>
      )}
      {circleData.welcome?.schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新歓スケジュール</Text>
          <Text style={styles.scheduleText}>{circleData.welcome.schedule}</Text>
        </View>
      )}
    </View>
  );

  // タブバー部分を元のactiveTab/setActiveTab方式に戻す
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>読み込み中...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>サークルデータの取得に失敗しました</Text>
      </View>
    );
  }
  if (!circleData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>サークルが見つかりませんでした</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader 
        title={circleData && circleData.name ? circleData.name : 'サークル詳細'} 
        showBackButton 
        onBack={() => navigation.goBack()}
        showActionButton={true}
        onActionButtonPress={showActionSheetForCircle}
      />
      
      <ScrollView 
        style={styles.scrollView}
        stickyHeaderIndices={[2]} // タブバーをスティッキーヘッダーに設定
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          // スクロール時に棒グラフの可視性をチェック
          if (global.checkBarChartVisibility) {
            global.checkBarChartVisibility();
          }
        }}
        scrollEventThrottle={100}
      >
        {/* ヘッダー画像エリア */}
        {circleData.headerImageUrl && (
          <View style={styles.headerImageContainer}>
            <ExpoImage 
              source={{ uri: circleData.headerImageUrl }} 
              style={styles.headerImage}
              cachePolicy="memory-disk"
              contentFit="cover"
            />
          </View>
        )}

        {/* サークル基本情報 */}
        <View style={styles.circleInfoSection}>
            <View style={styles.circleInfo}>
              <View style={styles.logoContainer}>
                {circleData.imageUrl ? (
                  <ExpoImage 
                    source={{ uri: circleData.imageUrl }} 
                    style={styles.circleLogo}
                    cachePolicy="memory-disk"
                    contentFit="cover"
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
          onScroll={handleScroll}
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
            {!isUserMemberOfCircle(circleId) && (
              <TouchableOpacity
                style={styles.actionMenuItemWithBorder}
                onPress={handleBlock}
              >
                <Ionicons name="ban-outline" size={20} color="#dc3545" />
                <Text style={[styles.actionMenuText, styles.actionMenuTextRed]}>ブロック</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionMenuItemWithBorder}
              onPress={handleReport}
            >
              <Ionicons name="flag-outline" size={20} color="#dc3545" />
              <Text style={[styles.actionMenuText, styles.actionMenuTextRed]}>報告する</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={hideActionSheet}
            >
              <Text style={styles.actionMenuText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 入会申請確認モーダル */}
      <Modal
        visible={showJoinConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJoinConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>入会申請</Text>
            <Text style={styles.confirmModalText}>
              {circleData?.name} に入会申請を{'\n'}
              送信しますか？
            </Text>
            <Text style={styles.confirmModalWarning}>
              申請後は取り消すことができません。
            </Text>
            <View style={styles.confirmModalButtons}>
              <KurukatsuButton
                title="キャンセル"
                onPress={() => setShowJoinConfirmModal(false)}
                size="medium"
                variant="secondary"
                hapticFeedback={true}
                style={styles.confirmModalButtonCancelContainer}
              />
              <KurukatsuButton
                title="申請する"
                onPress={handleJoinRequest}
                size="medium"
                variant="primary"
                hapticFeedback={true}
                style={styles.confirmModalButtonConfirmContainer}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* アクションボタン */}
      <SafeAreaView style={styles.actionBar}>
        <View style={styles.actionButtons}>
          <KurukatsuButton
            title=""
            onPress={toggleFavorite}
            size="medium"
            variant="secondary"
            hapticFeedback={true}
            style={styles.actionButtonKurukatsu}
          >
            <View style={styles.buttonContent}>
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={isFavorite ? "#ff6b9d" : "#666"} 
                style={styles.buttonIcon}
              />
              <Text style={[
                styles.buttonText,
                { color: isFavorite ? "#ff6b9d" : "#666" }
              ]}>
                いいね！
              </Text>
            </View>
          </KurukatsuButton>
          
          {isMember ? (
            <KurukatsuButton
              title=""
              disabled={true}
              size="medium"
              variant="primary"
              style={styles.actionButtonKurukatsu}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={[styles.buttonText, { color: "#fff" }]}>入会済み</Text>
              </View>
            </KurukatsuButton>
          ) : hasRequested ? (
            <KurukatsuButton
              title=""
              disabled={true}
              size="medium"
              variant="secondary"
              style={styles.actionButtonKurukatsu}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle" size={20} color="#6b7280" style={styles.buttonIcon} />
                <Text style={[styles.buttonText, { color: "#6b7280" }]}>申請済み</Text>
              </View>
            </KurukatsuButton>
          ) : circleData.welcome?.isRecruiting ? (
            <KurukatsuButton
              title=""
              onPress={handleJoinRequestPress}
              size="medium"
              variant="primary"
              hapticFeedback={true}
              style={styles.actionButtonKurukatsu}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="person-add" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={[styles.buttonText, { color: "#fff" }]}>入会申請</Text>
              </View>
            </KurukatsuButton>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
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
      headerImage: {
      width: '100%',
      aspectRatio: 16 / 9,
      contentFit: 'cover',
      backgroundColor: '#f0f0f0',
    },
  headerImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f0f0f0',
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
    position: 'relative',
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
  circleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    lineHeight: 30,
  },
  circleDetailsContainer: {
    gap: 4,
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
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    paddingBottom: 28,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  actionButtonKurukatsu: {
    minWidth: 140,
    maxWidth: 160,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
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
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  eventButtonContainer: {
    marginTop: 12,
  },
  eventDetailButton: {
    width: '100%',
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
  // 入会募集状況関連のスタイル
  recruitingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
  activityLocationText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  
  // アクションメニュー用のスタイル
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
  // 入会申請確認モーダル用のスタイル
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalWarning: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  confirmModalButtonCancelContainer: {
    flex: 1,
    marginRight: 8,
    minWidth: 120,
  },
  confirmModalButtonConfirmContainer: {
    flex: 1,
    marginLeft: 8,
    minWidth: 120,
  },
});
