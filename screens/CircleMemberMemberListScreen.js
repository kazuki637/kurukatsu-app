import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, FlatList, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import CommonHeader from '../components/CommonHeader';
import { db } from '../firebaseConfig';
import { doc, getDoc, getDocs, collection, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { getRoleDisplayName } from '../utils/permissionUtils';

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

  const filteredMembers = sortMembersByRole(
    members.filter(member =>
      member.name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
      member.university.toLowerCase().includes(memberSearchText.toLowerCase()) ||
      member.grade.toLowerCase().includes(memberSearchText.toLowerCase())
    )
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
      Alert.alert('脱退完了', 'サークルを脱退しました', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
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
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.tabContent}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="名前・大学・学年で検索"
              value={memberSearchText}
              onChangeText={setMemberSearchText}
              clearButtonMode="while-editing"
            />
          </View>
          {memberSearchText.length > 0 && (
            <Text style={styles.hitCountText}>
              検索結果
              <Text style={styles.hitCountNumber}>{filteredMembers.length}</Text>
              件
            </Text>
          )}
          {membersLoading ? (
            <ActivityIndicator size="small" color="#999" style={{ marginTop: 40 }} />
          ) : (
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
                    {(() => {
                      const currentUser = auth.currentUser;
                      return currentUser && item.id === currentUser.uid;
                    })() && (
                      <TouchableOpacity
                        style={styles.memberLeaveButton}
                        onPress={() => setLeaveModalVisible(true)}
                      >
                        <Text style={styles.memberLeaveButtonText}>脱退する</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>メンバーがいません</Text>}
              contentContainerStyle={{ padding: 20 }}
            />
          )}
        </View>
      </SafeAreaView>

      {/* 脱退確認モーダル */}
      <Modal
        visible={leaveModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>確認</Text>
            <Text style={styles.modalSubtitle}>
              本当にサークルを脱退しますか？
            </Text>
            <Text style={styles.modalWarning}>
              あなたはサークルメンバーではなくなり、{'\n'}サークル情報にアクセスできなくなります
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setLeaveModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={handleLeave}
              >
                <Text style={styles.leaveButtonText}>脱退する</Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // メンバー関連のスタイル
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  hitCountText: {
    marginHorizontal: 15,
    marginBottom: 10,
    fontSize: 14,
    color: '#666',
  },
  hitCountNumber: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  memberInfo: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: 'bold',
  },
  memberLeaveButton: {
    backgroundColor: '#f44336',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 16,
  },
  memberLeaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalWarning: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  leaveButton: {
    flex: 1,
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
