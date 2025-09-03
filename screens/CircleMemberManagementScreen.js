import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Image, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';
import { checkUserPermission, getUserRole, getRoleDisplayName } from '../utils/permissionUtils';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CircleMemberManagementScreen({ route, navigation }) {
  const { circleId, initialTab } = route.params;
  const [loading, setLoading] = useState(true);
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
  const [imageErrorMap, setImageErrorMap] = useState({});
  const [roleChangeModalVisible, setRoleChangeModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [circleName, setCircleName] = useState('');

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
      setLoading(true);
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
      } catch (e) {
        Alert.alert('エラー', 'メンバー情報の取得に失敗しました');
      } finally {
        setLoading(false);
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

    Alert.alert(
      'メンバー削除',
      'このメンバーを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 削除されるメンバーの情報を取得
              const memberToRemove = members.find(m => m.id === memberId);
              const memberName = memberToRemove?.name || 'メンバー';
              
              // サークルのメンバーコレクションから削除
              await deleteDoc(doc(db, 'circles', circleId, 'members', memberId));
              
              // ユーザーのjoinedCircleIdsとadminCircleIdsからサークルIDを削除
              const userDocRef = doc(db, 'users', memberId);
              await updateDoc(userDocRef, {
                joinedCircleIds: arrayRemove(circleId),
                adminCircleIds: arrayRemove(circleId) // 管理者/代表者の場合も削除
              });
              
              // 強制退会の通知を送信（削除されたメンバーに）
              console.log('通知送信処理は一時的に無効化されています');
              
              setMembers(prev => prev.filter(m => m.id !== memberId));
              Alert.alert('削除完了', 'メンバーを削除しました');
            } catch (e) {
              console.error('Error removing member:', e);
              Alert.alert('エラー', 'メンバーの削除に失敗しました');
            }
          }
        }
      ]
    );
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
      Alert.alert('変更完了', '役割を変更しました');
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

    setLoading(true);
    try {
      // ユーザー情報を取得
      const userDoc = await getDoc(doc(db, 'users', request.userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // ユーザーIDをドキュメントIDとして使用してメンバーを追加
      await setDoc(doc(db, 'circles', circleId, 'members', request.userId), {
        joinedAt: new Date(),
        role: 'member',
        assignedAt: new Date(),
        assignedBy: user.uid,
        gender: userData.gender || '',
        university: userData.university || '',
        name: userData.name || '氏名未設定',
        grade: userData.grade || '',
        profileImageUrl: userData.profileImageUrl || null
      });
      
      // ユーザーのjoinedCircleIdsにサークルIDを追加
      const userDocRef = doc(db, 'users', request.userId);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayUnion(circleId)
      });
      
      await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', request.id));
      setJoinRequests(prev => prev.filter(r => r.id !== request.id));
      
      // グローバル入会申請数を更新
      const newCount = joinRequests.length - 1;
      global.updateJoinRequestsCount(circleId, newCount);
      
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
      
      Alert.alert('許可完了', '入会申請を許可しました');
    } catch (e) {
      console.error('Error approving request:', e);
      Alert.alert('エラー', '申請の許可に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    const user = auth.currentUser;
    if (!user) return;

    // 権限チェック（代表者または管理者）
    const hasPermission = await checkUserPermission(circleId, user.uid, 'leader') || 
                         await checkUserPermission(circleId, user.uid, 'admin');
    if (!hasPermission) {
      Alert.alert('権限エラー', '申請を却下する権限がありません（代表者または管理者のみ）');
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', requestId));
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      
      // グローバル入会申請数を更新
      const newCount = joinRequests.length - 1;
      global.updateJoinRequestsCount(circleId, newCount);
      
      Alert.alert('却下完了', '入会申請を却下しました');
    } catch (e) {
      Alert.alert('エラー', '申請の却下に失敗しました');
    } finally {
      setLoading(false);
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

  const filteredMembers = sortMembersByRole(
    members.filter(member =>
      member.name.toLowerCase().includes(searchText.toLowerCase()) ||
      member.university.toLowerCase().includes(searchText.toLowerCase()) ||
      member.grade.toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const filteredRequests = joinRequests.filter(request =>
    request.name.toLowerCase().includes(requestSearchText.toLowerCase()) ||
    request.university.toLowerCase().includes(requestSearchText.toLowerCase()) ||
    request.grade.toLowerCase().includes(requestSearchText.toLowerCase())
  );

  const canManageRoles = currentUserRole === 'leader' || currentUserRole === 'admin';

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="small" color="#999" /></View>;
  }

  return (
    <View style={styles.container}>
      <CommonHeader title="メンバー管理" />
      <SafeAreaView style={styles.content}>
        {/* タブ切り替え */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'members' && styles.activeTab]}
            onPress={() => setSelectedTab('members')}
          >
            <Text style={[styles.tabText, selectedTab === 'members' && styles.activeTabText]}>メンバー</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'requests' && styles.activeTab]}
            onPress={() => setSelectedTab('requests')}
          >
            <View style={styles.tabContent}>
              <Text style={[styles.tabText, selectedTab === 'requests' && styles.activeTabText]}>入会申請</Text>
              {joinRequests.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{joinRequests.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {selectedTab === 'members' && (
          <>
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="名前・大学・学年で検索"
                value={searchText}
                onChangeText={setSearchText}
                clearButtonMode="while-editing"
              />
            </View>
            {searchText.length > 0 && (
              <Text style={styles.hitCountText}>
                検索結果
                <Text style={styles.hitCountNumber}>{filteredMembers.length}</Text>
                件
              </Text>
            )}
            <FlatList
              data={filteredMembers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const hasImage = item.profileImageUrl && item.profileImageUrl.trim() !== '' && !imageErrorMap[item.id];
                return (
                  <View style={styles.memberItem}>
                    {hasImage ? (
                      <Image
                        source={{ uri: item.profileImageUrl }}
                        style={styles.memberAvatar}
                        onError={() => setImageErrorMap(prev => ({ ...prev, [item.id]: true }))}
                      />
                    ) : (
                      <View style={[styles.memberAvatar, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                        <Ionicons name="person-outline" size={40} color="#aaa" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{item.name || '氏名未設定'}</Text>
                      <Text style={styles.memberInfo}>{item.university || ''} {item.grade || ''}</Text>
                      <Text style={styles.memberRole}>{getRoleDisplayName(item.role)}</Text>
                    </View>
                    {canManageRoles && item.role !== 'leader' && (
                      <TouchableOpacity 
                        style={styles.roleButton} 
                        onPress={() => {
                          setSelectedMember(item);
                          setRoleChangeModalVisible(true);
                        }}
                      >
                        <Ionicons name="settings-outline" size={28} color="#007bff" />
                      </TouchableOpacity>
                    )}
                    {canManageRoles && item.role !== 'leader' && (
                      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
                        <Ionicons name="remove-circle" size={36} color="#f44336" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>メンバーがいません</Text>}
              contentContainerStyle={{ padding: 20 }}
            />
          </>
        )}

        {selectedTab === 'requests' && (
          <>
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="名前・大学・学年で検索"
                value={requestSearchText}
                onChangeText={setRequestSearchText}
                clearButtonMode="while-editing"
              />
            </View>
            {requestSearchText.length > 0 && (
              <Text style={styles.hitCountText}>
                検索結果
                <Text style={styles.hitCountNumber}>{filteredRequests.length}</Text>
                件
              </Text>
            )}
            {filteredRequests.length > 0 ? (
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
                        <View style={[styles.memberAvatar, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                          <Ionicons name="person-outline" size={40} color="#aaa" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{request.name || '申請者'}</Text>
                        <Text style={styles.memberInfo}>{request.university || ''} {request.grade || ''}</Text>
                      </View>
                      <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(request)}>
                        <Ionicons name="checkmark-circle" size={36} color="#28a745" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(request.id)}>
                        <Ionicons name="close-circle" size={36} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  );
                }}
                ListEmptyComponent={null}
                contentContainerStyle={{ padding: 20 }}
              />
            ) : (
              <Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>入会申請はありません</Text>
            )}
          </>
        )}
      </SafeAreaView>

      {/* 役割変更モーダル */}
      <Modal
        visible={roleChangeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRoleChangeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>役割を変更</Text>
            <Text style={styles.modalSubtitle}>
              {selectedMember?.name} の役割を選択してください
            </Text>
            <TouchableOpacity
              style={[
                styles.roleOption,
                selectedMember?.role === 'member' && styles.roleOptionActive
              ]}
              onPress={() => handleRoleChange(selectedMember?.id, 'member')}
            >
              <Text style={[
                styles.roleOptionText,
                selectedMember?.role === 'member' && styles.roleOptionTextActive
              ]}>メンバー</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleOption,
                selectedMember?.role === 'admin' && styles.roleOptionActive
              ]}
              onPress={() => handleRoleChange(selectedMember?.id, 'admin')}
            >
              <Text style={[
                styles.roleOptionText,
                selectedMember?.role === 'admin' && styles.roleOptionTextActive
              ]}>管理者</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setRoleChangeModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007bff' },
  tabText: { fontSize: 16, color: '#666' },
  activeTabText: { color: '#007bff', fontWeight: 'bold' },
  tabContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  notificationBadge: { 
    backgroundColor: '#ff4757',
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
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, margin: 15, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  hitCountText: { marginHorizontal: 15, marginBottom: 10, fontSize: 14, color: '#666' },
  hitCountNumber: { fontWeight: 'bold', color: '#007bff' },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, marginBottom: 14 },
  memberAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
  memberName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  memberInfo: { fontSize: 15, color: '#666', marginBottom: 2 },
  memberRole: { fontSize: 14, color: '#007bff', fontWeight: 'bold' },
  roleButton: { marginLeft: 8 },
  removeButton: { marginLeft: 16 },
  approveButton: { marginLeft: 8 },
  rejectButton: { marginLeft: 12 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%', maxWidth: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  roleOption: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12, alignItems: 'center' },
  roleOptionActive: { backgroundColor: '#007bff' },
  roleOptionText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  roleOptionTextActive: { color: '#fff' },
  cancelButton: { backgroundColor: '#ff6b6b', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 8, alignSelf: 'center', width: '60%' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
}); 