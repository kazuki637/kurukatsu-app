import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, ActivityIndicator, Alert, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as RNImage } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, increment, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';
import { checkStudentIdVerification } from '../utils/permissionUtils';
import useFirestoreDoc from '../hooks/useFirestoreDoc';

const { width } = Dimensions.get('window');

// const tabRoutes = [ // 削除
//   { key: 'top', title: 'トップ' },
//   { key: 'events', title: 'イベント' },
//   { key: 'welcome', title: '新歓情報' },
// ];



export default function CircleProfileScreen({ route, navigation }) {
  const { circleId } = route.params;
  // サークルデータ取得（キャッシュ30秒）
  const { data: circleData, loading, error, reload } = useFirestoreDoc(db, circleId ? `circles/${circleId}` : '', { cacheDuration: 30000 });
  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('top');
  const [leaderProfileImage, setLeaderProfileImage] = useState(null);

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

  // メンバーデータを取得
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
        }
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    };

    fetchMembers();
  }, [circleId]);

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

  const handleJoinRequest = async () => {
    if (!user) {
      Alert.alert('ログインが必要です', '入会申請にはログインが必要です。');
      return;
    }

    // 学生証認証状態を確認
    const isStudentIdVerified = await checkStudentIdVerification(user.uid);
    if (!isStudentIdVerified) {
      Alert.alert(
        '学生証認証が必要です',
        '入会申請には学生証の認証が必要です。\nプロフィール編集画面で学生証を認証してください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: 'プロフィール編集へ', 
            onPress: () => navigation.navigate('ProfileEdit')
          }
        ]
      );
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
        <Image
          source={{ uri: circleData.activityImages[0] }}
          style={styles.activityImage}
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
      {circleData.welcome && circleData.welcome.schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新歓スケジュール</Text>
          <Text style={styles.scheduleText}>{circleData.welcome.schedule}</Text>
        </View>
      )}
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>イベント</Text>
        {circleData.events && circleData.events.length > 0 ? (
          circleData.events.slice(0, 4).map((event, idx) => (
            <View key={idx} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.image && (
                <Image source={{ uri: event.image }} style={styles.eventImage} contentFit="cover" />
              )}
              <Text style={styles.eventDetail}>{event.detail}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.placeholderText}>イベント情報は準備中です</Text>
        )}
      </View>
    </View>
  );

  const renderWelcomeTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>入会募集状況</Text>
        {circleData.welcome?.isRecruiting ? (
          <View style={styles.recruitingStatusContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
            <Text style={styles.recruitingStatusText}>入会募集中</Text>
          </View>
        ) : (
          <View style={styles.recruitingStatusContainer}>
            <Ionicons name="close-circle" size={24} color="#e74c3c" />
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
            <Ionicons name="logo-whatsapp" size={24} color="#06C755" />
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
        <ActivityIndicator size="small" color="#999" />
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
    <View style={styles.container}>
              <CommonHeader title={circleData && circleData.name ? circleData.name : 'サークル詳細'} showBackButton onBack={() => navigation.goBack()} />
      
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
            <Image source={{ uri: circleData.headerImageUrl }} style={styles.headerImage} />
          </View>
        )}

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

        {/* タブバー */}
        {renderTabBar()}

        {/* タブコンテンツ */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'top' && renderTopTab()}
          {activeTab === 'events' && renderEventsTab()}
          {activeTab === 'welcome' && renderWelcomeTab()}
        </View>
      </ScrollView>

      {/* アクションボタン */}
      <SafeAreaView style={styles.actionBar}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ff6b9d" : "#666"} 
            />
            <Text style={[styles.favoriteButtonText, isFavorite && styles.favoriteButtonTextActive]}>
              {isFavorite ? "いいね！済み" : "いいね！"}
            </Text>
          </TouchableOpacity>
          
          {isMember ? (
            <View style={styles.memberButton}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.memberButtonText}>入会済み</Text>
            </View>
          ) : hasRequested ? (
            <View style={styles.requestedButton}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.requestedButtonText}>申請済み</Text>
            </View>
          ) : circleData.welcome?.isRecruiting ? (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinRequest}>
              <Text style={styles.joinButtonText}>入会申請</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
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
      headerImage: {
      width: '100%',
      aspectRatio: 16 / 9,
      contentFit: 'cover',
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
});
