import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { Image } from 'expo-image';
import { CommonActions } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc, getDocs, collection, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { getRoleDisplayName } from '../utils/permissionUtils';
import KurukatsuButton from '../components/KurukatsuButton';
import useUsersMap from '../hooks/useUsersMap';

export default function CircleMemberMemberListScreen({ route, navigation }) {
  const { circleId } = route.params;
  
  const [circleName, setCircleName] = useState('メンバー');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState({});

  useEffect(() => {
    const fetchCircle = async () => {
      if (circleId) {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCircleName(docSnap.data().name || 'メンバー');
        }
      }
    };
    fetchCircle();
  }, [circleId]);

  // メンバー数更新関数をグローバルに登録
  React.useEffect(() => {
    global.updateCircleMemberScreenMemberCount = (targetCircleId, count) => {
      if (targetCircleId === circleId) {
        // メンバー数が変更された場合、現在のメンバーリストの長さと比較
        // 実際のリストは別途更新されるため、ここでは通知のみ
        console.log(`メンバー数が更新されました: ${count}`);
      }
    };
    
    return () => {
      delete global.updateCircleMemberScreenMemberCount;
    };
  }, [circleId]);

  // メンバー取得
  useEffect(() => {
    // データが既に存在する場合はローディングを表示しない
    if (members.length > 0) {
      setMembersLoading(false);
      return;
    }
    
    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnap = await getDocs(membersRef);
        
        const membersList = membersSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            role: data.role || 'member',
            joinedAt: data.joinedAt
          };
        });
        setMembers(membersList);
        
        // グローバルメンバー数を更新
        global.updateMemberCount(circleId, membersList.length);
      } catch (e) {
        console.error('Error fetching members:', e);
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [circleId]);

  // 役割に基づくソート関数（自分を一番上に）
  const sortMembersByRole = (memberList) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // ログアウト時は役割順のみでソート
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
    }
    
    const rolePriority = {
      'leader': 2,
      'admin': 3,
      'member': 4
    };
    
    return memberList.sort((a, b) => {
      // 自分を一番上に
      if (a.id === currentUser.uid) return -1;
      if (b.id === currentUser.uid) return 1;
      
      // その他のメンバーは役割順
      const priorityA = rolePriority[a.role] || 5;
      const priorityB = rolePriority[b.role] || 5;
      return priorityA - priorityB;
    });
  };

  // ユーザープロフィールを購読
  const memberIds = useMemo(() => members.map(m => m.id), [members]);
  const userIdToProfile = useUsersMap(memberIds);

  // ユーザープロフィールの取得状況をチェック
  const isProfileLoading = useMemo(() => {
    if (members.length === 0) return false;
    return members.some(member => !userIdToProfile[member.id]);
  }, [members, userIdToProfile]);

  // 表示用の結合データ作成＆フィルタ
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
        const q = memberSearchText.toLowerCase();
        return name.includes(q) || university.includes(q) || grade.includes(q);
      })
  );

  // 脱退処理
  const handleLeave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // 現在のユーザーが代表者かどうかをチェック
    const currentUserMember = members.find(member => member.id === user.uid);
    if (currentUserMember && currentUserMember.role === 'leader') {
      setLeaveModalVisible(false);
      Alert.alert(
        '脱退できません', 
        'あなたはこのサークルの代表者です。\n代表者を引き継いだ後、脱退してください。',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // サークルメンバーから削除
      await deleteDoc(doc(db, 'circles', circleId, 'members', user.uid));
      
      // ユーザーのjoinedCircleIdsとadminCircleIdsからサークルIDを削除
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayRemove(circleId),
        adminCircleIds: arrayRemove(circleId) // 管理者/代表者の場合も削除
      });
      
      setLeaveModalVisible(false);
      
      // ナビゲーションスタックをリセットして、前の画面履歴を完全に削除
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [
                  { name: 'ホーム' },
                  { name: '検索' },
                  { 
                    name: 'マイページ',
                    state: {
                      index: 0,
                      routes: [{ name: 'MyPage' }]
                    }
                  },
                  { name: 'サークル運営' }
                ],
                index: 0, // ホームタブをアクティブに
              },
            },
          ],
        })
      );
    } catch (e) {
      console.error('Error leaving circle:', e);
      Alert.alert('エラー', '脱退に失敗しました');
    }
  };

  return (
    <>
      <CommonHeader 
        title={circleName} 
        showBackButton={true}
        onBack={() => navigation.goBack()}
        rightButton={
          <TouchableOpacity 
            onPress={() => setLeaveModalVisible(true)}
            style={styles.leaveButton}
            activeOpacity={1}
          >
            <Ionicons name="log-out-outline" size={24} color="#374151" />
          </TouchableOpacity>
        }
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.tabContent}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="氏名、大学、学年で検索"
              value={memberSearchText}
              onChangeText={setMemberSearchText}
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
                   <TouchableOpacity 
                     style={styles.memberItem}
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
                 );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>メンバーがいません</Text>}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </SafeAreaView>

      {/* 脱退確認モーダル */}
      <Modal
        visible={leaveModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={40} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>サークルを脱退しますか？</Text>
            <Text style={styles.modalSubtitle}>
              この操作は元に戻せません。本当にこのサークルを脱退しますか？
            </Text>
            <View style={styles.modalButtons}>
              <KurukatsuButton
                title="キャンセル"
                onPress={() => setLeaveModalVisible(false)}
                size="medium"
                variant="secondary"
                hapticFeedback={true}
                style={styles.modalCancelButtonContainer}
              />
              <KurukatsuButton
                title="脱退する"
                onPress={handleLeave}
                size="medium"
                variant="primary"
                backgroundColor="#DC2626"
                hapticFeedback={true}
                style={styles.modalLeaveButtonContainer}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // 検索バーのスタイル
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: '#111827',
  },
  // リストのスタイル
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
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
    marginBottom: 2,
  },
  memberDetails: {
    fontSize: 14,
    color: '#6B7280',
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
  // モーダルのスタイル
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 320,
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButtonContainer: {
    flex: 1,
    marginRight: 8,
  },
  modalLeaveButtonContainer: {
    flex: 1,
    marginLeft: 8,
  },
  leaveButton: {
    padding: 0,
  },
});
