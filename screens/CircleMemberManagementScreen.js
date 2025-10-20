import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, TextInput, Modal, Animated, Dimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';
import { checkUserPermission, getUserRole, getRoleDisplayName } from '../utils/permissionUtils';
import useUsersMap from '../hooks/useUsersMap';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CircleMemberManagementScreen({ route, navigation }) {
  const { circleId, initialTab } = route.params;
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [requestSearchText, setRequestSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState(() => {
    // initialTabパラメータに基づいて初期タブを設定
    if (initialTab === 'requests') {
      return 'requests'; // 入会申請タブ
    }
    return 'members'; // デフォルトはメンバータブ
  });

  // 初期化時にアニメーション位置を設定
  useEffect(() => {
    const initialTabIndex = selectedTab === 'members' ? 0 : 1;
    indicatorAnim.setValue(initialTabIndex);
    setScrollProgress(initialTabIndex);
  }, []);
  const [imageErrorMap, setImageErrorMap] = useState({});
  const [roleChangeModalVisible, setRoleChangeModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [circleName, setCircleName] = useState('');
  const [membersLoading, setMembersLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  
  // アニメーション用の状態
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [scrollProgress, setScrollProgress] = useState(0);
  const horizontalScrollRef = useRef(null);

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
    setSelectedTab(tabName);
    const tabIndex = tabName === 'members' ? 0 : 1;
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
    const tabs = ['members', 'requests'];
    if (tabIndex >= 0 && tabIndex < tabs.length) {
      setSelectedTab(tabs[tabIndex]);
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
      color: isActive ? '#1380ec' : '#6B7280',
      fontWeight: isActive ? 'bold' : 'normal',
    };
  };

  // 入会申請数更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateCircleMemberManagementJoinRequests = (targetCircleId, count) => {
      if (targetCircleId === circleId) {
        // 入会申請数が変更された場合、現在の入会申請リストの長さと比較
        // 実際のリストは別途更新されるため、ここでは通知のみ
        console.log(`入会申請数が更新されました: ${count}`);
      }
    };
    
    return () => {
      delete global.updateCircleMemberManagementJoinRequests;
    };
  }, [circleId]);

  // メンバー数更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateCircleMemberManagementMemberCount = (targetCircleId, count) => {
      if (targetCircleId === circleId) {
        // メンバー数が変更された場合、現在のメンバーリストの長さと比較
        // 実際のリストは別途更新されるため、ここでは通知のみ
        console.log(`メンバー数が更新されました: ${count}`);
      }
    };
    
    return () => {
      delete global.updateCircleMemberManagementMemberCount;
    };
  }, [circleId]);

  // 通知送信処理は一時的に無効化されています

  useEffect(() => {
    const fetchMembers = async () => {
      setMembersLoading(true);
      setRequestsLoading(true);
      try {
        // サークル名を取得
        const circleDoc = await getDoc(doc(db, 'circles', circleId));
        if (circleDoc.exists()) {
          setCircleName(circleDoc.data().name || 'サークル');
        }

        // 現在のユーザーの役割を取得
        const user = auth.currentUser;
        if (user) {
          const role = await getUserRole(circleId, user.uid);
          setCurrentUserRole(role);
        }

        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnap = await getDocs(membersRef);
        
        const membersList = membersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersList);
        setMembersLoading(false);
        
        // グローバルメンバー数を更新
        global.updateMemberCount(circleId, membersList.length);
        
        const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
        const reqSnap = await getDocs(requestsRef);
        const requestsList = [];
        for (const reqDoc of reqSnap.docs) {
          const reqData = reqDoc.data();
          const userDoc = await getDoc(doc(db, 'users', reqData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            requestsList.push({
              id: reqDoc.id,
              userId: reqData.userId,
              name: userData.name || '申請者',
              university: userData.university || '',
              grade: userData.grade || '',
              profileImageUrl: userData.profileImageUrl || null,
              requestedAt: reqData.requestedAt
            });
          }
        }
        setJoinRequests(requestsList);
        setRequestsLoading(false);
      } catch (e) {
        Alert.alert('エラー', 'メンバー情報の取得に失敗しました');
        setMembersLoading(false);
        setRequestsLoading(false);
      }
    };
    fetchMembers();
  }, [circleId]);

  const handleRemove = async (memberId) => {
    const user = auth.currentUser;
    if (!user) return;

    // 権限チェック
    const hasPermission = await checkUserPermission(circleId, user.uid, 'leader');
    if (!hasPermission) {
      Alert.alert('エラー', '代表者のみメンバーを削除できます');
      return;
    }

    // 削除対象のメンバー情報を設定してモーダルを表示
    const memberToRemove = members.find(m => m.id === memberId);
    setMemberToDelete(memberToRemove);
    setDeleteConfirmModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;

    try {
      // 削除されるメンバーの情報を取得
      const memberName = memberToDelete?.name || 'メンバー';
      
      // サークルのメンバーコレクションから削除
      await deleteDoc(doc(db, 'circles', circleId, 'members', memberToDelete.id));
      
      // ユーザーのjoinedCircleIdsとadminCircleIdsからサークルIDを削除
      const userDocRef = doc(db, 'users', memberToDelete.id);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayRemove(circleId),
        adminCircleIds: arrayRemove(circleId) // 管理者/代表者の場合も削除
      });
      
      // 強制退会の通知を送信（削除されたメンバーに）
      console.log('通知送信処理は一時的に無効化されています');
      
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      
      // モーダルを閉じる
      setDeleteConfirmModalVisible(false);
      setMemberToDelete(null);
    } catch (e) {
      console.error('Error removing member:', e);
      Alert.alert('エラー', 'メンバーの削除に失敗しました');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    const user = auth.currentUser;
    if (!user) return;

    // 権限チェック
    const hasPermission = await checkUserPermission(circleId, user.uid, 'leader');
    if (!hasPermission) {
      Alert.alert('エラー', '代表者のみ役割を変更できます');
      return;
    }

    try {
      // 変更されるメンバーの情報を取得
      const memberToChange = members.find(m => m.id === memberId);
      const memberName = memberToChange?.name || 'メンバー';
      
      await updateDoc(doc(db, 'circles', circleId, 'members', memberId), {
        role: newRole,
        assignedAt: new Date(),
        assignedBy: user.uid
      });
      
      // ユーザーのadminCircleIdsを更新
      const userDocRef = doc(db, 'users', memberId);
      if (newRole === 'leader' || newRole === 'admin') {
        // 管理者/代表者に昇格時：adminCircleIdsに追加
        await updateDoc(userDocRef, {
          adminCircleIds: arrayUnion(circleId)
        });
      } else if (newRole === 'member') {
        // メンバーに降格時：adminCircleIdsから削除
        await updateDoc(userDocRef, {
          adminCircleIds: arrayRemove(circleId)
        });
      }
      
      // 役割変更の通知を送信
      console.log('通知送信処理は一時的に無効化されています');
      
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      
      setRoleChangeModalVisible(false);
      setSelectedMember(null);
    } catch (e) {
      Alert.alert('エラー', '役割の変更に失敗しました');
    }
  };

  const handleApprove = async (request) => {
    const user = auth.currentUser;
    if (!user) return;

    // 権限チェック（代表者または管理者）
    const hasPermission = await checkUserPermission(circleId, user.uid, 'leader') || 
                         await checkUserPermission(circleId, user.uid, 'admin');
    if (!hasPermission) {
      Alert.alert('権限エラー', '申請を許可する権限がありません（代表者または管理者のみ）');
      return;
    }

    try {
      // ユーザー情報を取得
      const userDoc = await getDoc(doc(db, 'users', request.userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // ユーザーIDをドキュメントIDとして使用してメンバーを追加（正規化: 埋め込み情報は保存しない）
      await setDoc(doc(db, 'circles', circleId, 'members', request.userId), {
        joinedAt: new Date(),
        role: 'member',
        assignedAt: new Date(),
        assignedBy: user.uid,
      });
      
      // ユーザーのjoinedCircleIdsにサークルIDを追加
      const userDocRef = doc(db, 'users', request.userId);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayUnion(circleId)
      });
      
      await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', request.id));
      setJoinRequests(prev => prev.filter(r => r.id !== request.id));
      
      // グローバル入会申請数を更新（-1）
      if (global.updateCircleManagementJoinRequests) {
        global.updateCircleManagementJoinRequests(circleId, -1);
      }
      // CircleManagementDetailScreen用の更新も実行
      if (global.updateCircleManagementDetailJoinRequests) {
        global.updateCircleManagementDetailJoinRequests(circleId, joinRequests.length - 1);
      }
      
      // メンバーリストを再取得
      const fetchMembers = async () => {
        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnap = await getDocs(membersRef);
        
        const membersList = membersSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '氏名未設定',
            university: data.university || '',
            grade: data.grade || '',
            email: data.email || '',
            profileImageUrl: data.profileImageUrl || null,
            role: data.role || 'member',
            joinedAt: data.joinedAt
          };
        });
        setMembers(membersList);
        
        // グローバルメンバー数を更新
        global.updateMemberCount(circleId, membersList.length);
      };
      await fetchMembers();
      
      // 入会申請を削除
      await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', request.id));
      
      // 申請者本人に承認通知を送信（通知設定に関係なく常に送信）
      console.log('通知送信処理は一時的に無効化されています');
    } catch (e) {
      console.error('Error approving request:', e);
      Alert.alert('エラー', '申請の許可に失敗しました');
    }
  };

  const handleReject = async (request) => {
    const user = auth.currentUser;
    if (!user) return;

    // 権限チェック（代表者または管理者）
    const hasPermission = await checkUserPermission(circleId, user.uid, 'leader') || 
                         await checkUserPermission(circleId, user.uid, 'admin');
    if (!hasPermission) {
      Alert.alert('権限エラー', '申請を却下する権限がありません（代表者または管理者のみ）');
      return;
    }

    // 却下対象のリクエスト情報を設定してモーダルを表示
    setRequestToReject(request);
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!requestToReject) return;

    try {
      await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', requestToReject.id));
      setJoinRequests(prev => prev.filter(r => r.id !== requestToReject.id));
      
      // グローバル入会申請数を更新（-1）
      if (global.updateCircleManagementJoinRequests) {
        global.updateCircleManagementJoinRequests(circleId, -1);
      }
      // CircleManagementDetailScreen用の更新も実行
      if (global.updateCircleManagementDetailJoinRequests) {
        global.updateCircleManagementDetailJoinRequests(circleId, joinRequests.length - 1);
      }
      
      // モーダルを閉じる
      setRejectModalVisible(false);
      setRequestToReject(null);
    } catch (e) {
      console.error('Error rejecting request:', e);
      Alert.alert('エラー', '申請の却下に失敗しました');
    }
  };

  // 役割に基づくソート関数
  const sortMembersByRole = (memberList) => {
    const rolePriority = {
      'leader': 1,
      'admin': 2,
      'member': 3
    };
    
    return memberList.sort((a, b) => {
      const priorityA = rolePriority[a.role] || 4;
      const priorityB = rolePriority[b.role] || 4;
      return priorityA - priorityB;
    });
  };

  // ユーザープロフィールの購読（正規化）
  const memberIds = useMemo(() => members.map(m => m.id), [members]);
  const userIdToProfile = useUsersMap(memberIds);

  // ユーザープロフィールの取得状況をチェック
  const isProfileLoading = useMemo(() => {
    if (members.length === 0) return false;
    return members.some(member => !userIdToProfile[member.id]);
  }, [members, userIdToProfile]);

  const filteredMembers = sortMembersByRole(
    members
      .map(m => ({
        ...m,
        profile: userIdToProfile[m.id] || null,
      }))
      .filter(({ profile }) => {
        const name = (profile?.name || '').toLowerCase();
        const university = (profile?.university || '').toLowerCase();
        const grade = (profile?.grade || '').toLowerCase();
        const q = searchText.toLowerCase();
        return name.includes(q) || university.includes(q) || grade.includes(q);
      })
  );

  const filteredRequests = joinRequests.filter(request =>
    request.name.toLowerCase().includes(requestSearchText.toLowerCase()) ||
    request.university.toLowerCase().includes(requestSearchText.toLowerCase()) ||
    request.grade.toLowerCase().includes(requestSearchText.toLowerCase())
  );

  const canManageRoles = currentUserRole === 'leader' || currentUserRole === 'admin';


  return (
    <View style={styles.container}>
      <CommonHeader 
        title="メンバー管理" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />
      <SafeAreaView style={styles.content}>
         {/* タブ切り替え */}
         <View style={styles.tabContainer}>
           <TouchableOpacity
             style={styles.tab}
             onPress={() => handleTabChange('members')}
           >
             <Text style={[styles.tabText, getTabTextStyle(0)]}>メンバー</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={styles.tab}
             onPress={() => handleTabChange('requests')}
           >
             <View style={styles.tabContent}>
               <Text style={[styles.tabText, getTabTextStyle(1)]}>入会申請</Text>
               {joinRequests.length > 0 && (
                 <View style={styles.notificationBadge}>
                   <Text style={styles.notificationBadgeText}>{joinRequests.length}</Text>
                 </View>
               )}
             </View>
           </TouchableOpacity>
           
           {/* アニメーションするインジケーター */}
           <Animated.View 
             style={[
               styles.animatedIndicator,
               {
                 transform: [{
                   translateX: indicatorAnim.interpolate({
                     inputRange: [0, 1],
                     outputRange: [0, Dimensions.get('window').width / 2],
                   })
                 }]
               }
             ]}
           />
         </View>

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
           {/* メンバータブ */}
           <View style={styles.tabContentContainer}>
             <View style={styles.searchBarContainer}>
               <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
               <TextInput
                 style={styles.searchInput}
                 placeholder="氏名、大学、学年で検索"
                 value={searchText}
                 onChangeText={setSearchText}
                 clearButtonMode="while-editing"
               />
             </View>
             {membersLoading || isProfileLoading ? (
               <ActivityIndicator size="small" color="#999" style={{ marginTop: 40 }} />
             ) : (
               <FlatList
                 data={filteredMembers}
                 keyExtractor={item => item.id}
                 renderItem={({ item }) => {
                   const hasImage = item.profile?.profileImageUrl && item.profile.profileImageUrl.trim() !== '' && !imageErrorMap[item.id];
                   const isLeader = item.role === 'leader';
                   const isAdmin = item.role === 'admin';
                   const isMember = item.role === 'member';
                   
                   return (
                     <View style={styles.memberItem}>
                       <TouchableOpacity 
                         style={styles.memberInfoTouchable}
                         onPress={() => navigation.navigate('共通', { screen: 'Profile', params: { userId: item.id } })}
                         activeOpacity={0.7}
                       >
                         {hasImage ? (
                           <Image
                             source={{ uri: item.profile.profileImageUrl }}
                             style={styles.memberAvatar}
                             onError={() => setImageErrorMap(prev => ({ ...prev, [item.id]: true }))}
                           />
                         ) : (
                           <View style={styles.memberAvatarPlaceholder}>
                             <Ionicons name="person" size={28} color="#9CA3AF" />
                           </View>
                         )}
                         <View style={styles.memberInfoContainer}>
                           <Text style={styles.memberName}>{(item.profile?.name) || '氏名未設定'}</Text>
                           <Text style={styles.memberDetails}>{item.profile?.university || ''} {item.profile?.grade || ''}</Text>
                         </View>
                         <View style={[
                           styles.roleBadge,
                           isLeader && styles.roleBadgeLeader,
                           isAdmin && styles.roleBadgeAdmin,
                           isMember && styles.roleBadgeMember
                         ]}>
                           <Text style={[
                             styles.roleBadgeText,
                             isLeader && styles.roleBadgeTextLeader,
                             isAdmin && styles.roleBadgeTextAdmin,
                             isMember && styles.roleBadgeTextMember
                           ]}>
                             {getRoleDisplayName(item.role)}
                           </Text>
                         </View>
                       </TouchableOpacity>
                       {canManageRoles && item.role !== 'leader' && (
                         <TouchableOpacity 
                           style={styles.roleButton} 
                           onPress={() => {
                             setSelectedMember(item);
                             setRoleChangeModalVisible(true);
                           }}
                         >
                           <Ionicons name="settings-outline" size={24} color="#6B7280" />
                         </TouchableOpacity>
                       )}
                       {canManageRoles && item.role !== 'leader' && (
                         <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
                           <Ionicons name="remove-circle" size={24} color="#DC2626" />
                         </TouchableOpacity>
                       )}
                     </View>
                   );
                 }}
                 ListEmptyComponent={<Text style={styles.emptyText}>メンバーがいません</Text>}
                 contentContainerStyle={styles.listContainer}
               />
             )}
           </View>

           {/* 入会申請タブ */}
           <View style={styles.tabContentContainer}>
             <View style={styles.searchBarContainer}>
               <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
               <TextInput
                 style={styles.searchInput}
                 placeholder="氏名、大学、学年で検索"
                 value={requestSearchText}
                 onChangeText={setRequestSearchText}
                 clearButtonMode="while-editing"
               />
             </View>
             {requestsLoading ? (
               <ActivityIndicator size="small" color="#999" style={{ marginTop: 40 }} />
             ) : filteredRequests.length > 0 ? (
               <FlatList
                 data={filteredRequests}
                 keyExtractor={item => item.id}
                 renderItem={({ item: request }) => {
                   const hasImage = request.profileImageUrl && request.profileImageUrl.trim() !== '' && !imageErrorMap[request.id];
                   return (
                     <View style={styles.memberItem}>
                       {hasImage ? (
                         <Image
                           source={{ uri: request.profileImageUrl }}
                           style={styles.memberAvatar}
                           onError={() => setImageErrorMap(prev => ({ ...prev, [request.id]: true }))}
                         />
                       ) : (
                         <View style={styles.memberAvatarPlaceholder}>
                           <Ionicons name="person" size={28} color="#9CA3AF" />
                         </View>
                       )}
                       <View style={styles.memberInfoContainer}>
                         <Text style={styles.memberName}>{request.name || '申請者'}</Text>
                         <Text style={styles.memberDetails}>{request.university || ''} {request.grade || ''}</Text>
                       </View>
                      <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(request)}>
                        <Ionicons name="checkmark-circle" size={32} color="#1380ec" />
                      </TouchableOpacity>
                       <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(request)}>
                         <Ionicons name="close-circle" size={32} color="#DC2626" />
                       </TouchableOpacity>
                     </View>
                   );
                 }}
                 ListEmptyComponent={null}
                 contentContainerStyle={styles.listContainer}
               />
             ) : (
               <Text style={styles.emptyText}>入会申請はありません</Text>
             )}
           </View>
         </ScrollView>
      </SafeAreaView>

      {/* 役割変更モーダル */}
      <Modal
        visible={roleChangeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRoleChangeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>役割を変更</Text>
            <Text style={styles.modalSubtitle}>
              {(userIdToProfile[selectedMember?.id]?.name) || '氏名未設定'} の役割を選択してください
            </Text>
            <KurukatsuButton
              title="メンバー"
              onPress={() => handleRoleChange(selectedMember?.id, 'member')}
              size="medium"
              variant={selectedMember?.role === 'member' ? 'primary' : 'secondary'}
              backgroundColor="#1380ec"
              hapticFeedback={true}
              style={styles.roleOptionButton}
            />
            <KurukatsuButton
              title="管理者"
              onPress={() => handleRoleChange(selectedMember?.id, 'admin')}
              size="medium"
              variant={selectedMember?.role === 'admin' ? 'primary' : 'secondary'}
              backgroundColor="#1380ec"
              hapticFeedback={true}
              style={styles.roleOptionButton}
            />
            <KurukatsuButton
              title="キャンセル"
              onPress={() => setRoleChangeModalVisible(false)}
              size="medium"
              variant="secondary"
              hapticFeedback={true}
              style={styles.modalCancelButtonKurukatsu}
            />
          </View>
        </View>
       </Modal>

       {/* メンバー削除確認モーダル */}
       <Modal
         visible={deleteConfirmModalVisible}
         transparent={true}
         animationType="fade"
         onRequestClose={() => {
           setDeleteConfirmModalVisible(false);
           setMemberToDelete(null);
         }}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>メンバー削除</Text>
            <Text style={styles.modalSubtitle}>
              {(userIdToProfile[memberToDelete?.id]?.name) || 'メンバー'} を削除しますか？
            </Text>
             <Text style={styles.modalWarning}>
               削除後は元に戻すことができません。
             </Text>
             <View style={styles.modalButtons}>
               <KurukatsuButton
                 title="キャンセル"
                 onPress={() => setDeleteConfirmModalVisible(false)}
                 size="medium"
                 variant="secondary"
                 hapticFeedback={true}
                 style={styles.modalConfirmButtonKurukatsu}
               />
               <KurukatsuButton
                 title="削除する"
                 onPress={handleConfirmDelete}
                 size="medium"
                 variant="primary"
                 backgroundColor="#DC2626"
                 hapticFeedback={true}
                 style={styles.modalConfirmButtonKurukatsu}
               />
             </View>
           </View>
         </View>
       </Modal>

       {/* 入会申請却下確認モーダル */}
       <Modal
         visible={rejectModalVisible}
         transparent={true}
         animationType="fade"
         onRequestClose={() => {
           setRejectModalVisible(false);
           setRequestToReject(null);
         }}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <View style={styles.modalIconContainer}>
               <Ionicons name="close-circle-outline" size={40} color="#DC2626" />
             </View>
             <Text style={styles.modalTitle}>入会申請を却下しますか？</Text>
             <Text style={styles.modalSubtitle}>
               {requestToReject?.name || '申請者'} の入会申請を却下します。
             </Text>
             <Text style={styles.modalWarning}>
               この操作は元に戻すことができません。
             </Text>
             <View style={styles.modalButtons}>
               <KurukatsuButton
                 title="キャンセル"
                 onPress={() => {
                   setRejectModalVisible(false);
                   setRequestToReject(null);
                 }}
                 size="medium"
                 variant="secondary"
                 hapticFeedback={true}
                 style={styles.modalConfirmButtonKurukatsu}
               />
               <KurukatsuButton
                 title="却下する"
                 onPress={handleConfirmReject}
                 size="medium"
                 variant="primary"
                 backgroundColor="#DC2626"
                 hapticFeedback={true}
                 style={styles.modalConfirmButtonKurukatsu}
               />
             </View>
           </View>
         </View>
       </Modal>
     </View>
   );
 }

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  content: { 
    flex: 1 
  },
  tabContainer: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  tab: { 
    flex: 1, 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  tabText: { 
    fontSize: 16, 
    color: '#6B7280' 
  },
  tabContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  notificationBadge: { 
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 検索バーのスタイル
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  // リストのスタイル
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
    fontSize: 16,
  },
  // メンバーアイテムのスタイル
  memberItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberInfoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    marginRight: 16 
  },
  memberAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberInfoContainer: {
    flex: 1,
  },
  memberName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#111827', 
    marginBottom: 2 
  },
  memberDetails: { 
    fontSize: 14, 
    color: '#6B7280' 
  },
  // 役割バッジのスタイル
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeLeader: {
    backgroundColor: '#DBEAFE',
  },
  roleBadgeAdmin: {
    backgroundColor: '#E5E7EB',
  },
  roleBadgeMember: {
    backgroundColor: '#E5E7EB',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  roleBadgeTextLeader: {
    color: '#2563EB',
  },
  roleBadgeTextAdmin: {
    color: '#374151',
  },
  roleBadgeTextMember: {
    color: '#6B7280',
  },
  // ボタンのスタイル
  roleButton: { 
    marginLeft: 8,
    padding: 8,
  },
  removeButton: { 
    marginLeft: 8,
    padding: 8,
  },
  approveButton: { 
    marginLeft: 8,
    padding: 8,
  },
  rejectButton: { 
    marginLeft: 8,
    padding: 8,
  },
  // モーダルのスタイル
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 24, 
    width: '90%', 
    maxWidth: 320,
    alignItems: 'center'
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 16,
    color: '#111827'
  },
  modalSubtitle: { 
    fontSize: 16, 
    color: '#111827', 
    textAlign: 'center', 
    marginBottom: 16,
    lineHeight: 22
  },
  roleOptionButton: {
    marginBottom: 12,
    width: '100%',
  },
  modalCancelButtonKurukatsu: {
    marginTop: 10,
    width: '60%',
    alignSelf: 'center',
  },
   modalButtons: {
     flexDirection: 'row',
     justifyContent: 'space-around',
     marginTop: 16,
     gap: 12,
   },
   modalConfirmButtonKurukatsu: {
     flex: 1,
   },
   modalWarning: {
     fontSize: 14,
     color: '#dc2626',
     textAlign: 'center',
     marginBottom: 20,
     fontWeight: '500',
   },
   animatedIndicator: {
     position: 'absolute',
     bottom: 0,
     width: Dimensions.get('window').width / 2,
     height: 2,
     backgroundColor: '#1380ec',
   },
   horizontalScrollView: {
     flex: 1,
   },
   horizontalScrollContent: {
     flexDirection: 'row',
   },
   tabContentContainer: {
     flex: 1,
     backgroundColor: '#F9FAFB',
     width: Dimensions.get('window').width,
   },
 }); 