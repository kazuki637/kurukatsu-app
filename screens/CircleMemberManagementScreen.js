import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import CommonHeader from '../components/CommonHeader';

export default function CircleMemberManagementScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [searchText, setSearchText] = useState(''); // メンバー検索用
  const [requestSearchText, setRequestSearchText] = useState(''); // 入会申請検索用
  const [selectedTab, setSelectedTab] = useState('members'); // タブ状態

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        // membersサブコレクションからメンバーID一覧を取得
        const membersRef = collection(db, 'circles', circleId, 'members');
        const membersSnap = await getDocs(membersRef);
        const memberIds = membersSnap.docs.map(doc => doc.id);
        // メンバーIDからユーザー情報を取得
        const membersList = [];
        for (const memberId of memberIds) {
          try {
            const userDoc = await getDoc(doc(db, 'users', memberId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              membersList.push({
                id: memberId,
                name: userData.name || '氏名未設定',
                university: userData.university || '',
                grade: userData.grade || '',
                email: userData.email || '',
                profileImageUrl: userData.profileImageUrl || null,
              });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
        setMembers(membersList);
        // 入会申請も取得
        const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
        const reqSnap = await getDocs(requestsRef);
        // 各申請のuserIdからユーザーアイコンを取得
        const reqList = [];
        for (const docSnap of reqSnap.docs) {
          const data = docSnap.data();
          let profileImageUrl = null;
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', data.userId));
              if (userDoc.exists()) {
                profileImageUrl = userDoc.data().profileImageUrl || null;
              }
            } catch (e) {
              // ignore
            }
          }
          reqList.push({ id: docSnap.id, ...data, profileImageUrl });
        }
        setJoinRequests(reqList);
      } catch (e) {
        console.error('Error fetching members:', e);
        Alert.alert('エラー', 'メンバー情報の取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [circleId]);

  const handleRemove = async (memberId) => {
    Alert.alert('確認', 'このメンバーを強制退会させますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '退会', style: 'destructive', onPress: async () => {
        try {
          // membersサブコレクションから削除
          const memberDocRef = doc(db, 'circles', circleId, 'members', memberId);
          await deleteDoc(memberDocRef);
          // ユーザーのjoinedCircleIdsからも削除
          const userDocRef = doc(db, 'users', memberId);
          await updateDoc(userDocRef, {
            joinedCircleIds: arrayRemove(circleId)
          });
          setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (e) {
          console.error('Error removing member:', e);
          Alert.alert('エラー', '退会処理に失敗しました');
        }
      }}
    ]);
  };

  const handleApprove = async (request) => {
    setLoading(true);
    try {
      const auth = require('firebase/auth');
      const currentUser = auth.getAuth().currentUser;
      // membersサブコレクションに追加
      const memberDocRef = doc(db, 'circles', circleId, 'members', request.userId);
      await setDoc(memberDocRef, { joinedAt: new Date() });
      // ユーザーのjoinedCircleIdsに追加
      const userDocRef = doc(db, 'users', request.userId);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayUnion(circleId)
      });
      // 申請削除
      try {
        await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', request.id));
        setJoinRequests(prev => prev.filter(r => r.id !== request.id));
      } catch (e) {
        Alert.alert('エラー', '申請の削除に失敗しました');
        console.error('Firestoreエラー:', e);
        try {
          console.log('JSON.stringify:', JSON.stringify(e));
        } catch (jsonErr) {
          console.log('JSON.stringifyできませんでした:', jsonErr);
          console.log('e.message:', e.message);
          console.log('e.code:', e.code);
          console.log('e.name:', e.name);
          console.log('e:', e);
        }
      }
      // メンバー一覧を再取得
      const membersRef = collection(db, 'circles', circleId, 'members');
      const membersSnap = await getDocs(membersRef);
      const memberIds = membersSnap.docs.map(doc => doc.id);
      const membersList = [];
      for (const memberId of memberIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            membersList.push({
              id: memberId,
              name: userData.name || '氏名未設定',
              university: userData.university || '',
              grade: userData.grade || '',
              email: userData.email || '',
              profileImageUrl: userData.profileImageUrl || null,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setMembers(membersList);
    } catch (e) {
      console.error('Error approving request:', e);
      try {
        console.log('外側catch節JSON.stringify:', JSON.stringify(e));
      } catch (jsonErr) {
        console.log('外側catch節JSON.stringifyできませんでした:', jsonErr);
        console.log('e.message:', e.message);
        console.log('e.code:', e.code);
        console.log('e.name:', e.name);
        console.log('e:', e);
      }
      Alert.alert('エラー', '申請の許可に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setLoading(true);
    try {
      const auth = require('firebase/auth');
      const currentUser = auth.getAuth().currentUser;
      // 申請削除
      try {
        await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', requestId));
        setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      } catch (e) {
        console.error('Firestoreエラー:', e);
        try {
          console.log('JSON.stringify:', JSON.stringify(e));
        } catch (jsonErr) {
          console.log('JSON.stringifyできませんでした:', jsonErr);
          console.log('e.message:', e.message);
          console.log('e.code:', e.code);
          console.log('e.name:', e.name);
          console.log('e:', e);
        }
      }
    } catch (e) {
      console.error('外側catch節に到達');
      try {
        console.log('外側catch節JSON.stringify:', JSON.stringify(e));
      } catch (jsonErr) {
        console.log('外側catch節JSON.stringifyできませんでした:', jsonErr);
        console.log('e.message:', e.message);
        console.log('e.code:', e.code);
        console.log('e.name:', e.name);
        console.log('e:', e);
      }
      Alert.alert('エラー', '申請の却下に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 今後: 入会申請許可・管理者権限付与などの機能も追加予定

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  // 検索ワードでフィルタ
  const filteredMembers = members.filter(member => {
    const keyword = searchText.toLowerCase();
    return (
      member.name.toLowerCase().includes(keyword) ||
      (member.university && member.university.toLowerCase().includes(keyword)) ||
      (member.grade && member.grade.toLowerCase().includes(keyword)) ||
      (member.email && member.email.toLowerCase().includes(keyword))
    );
  });

  // 入会申請の検索フィルタ
  const filteredRequests = joinRequests.filter(request => {
    const keyword = requestSearchText.toLowerCase();
    return (
      (request.name && request.name.toLowerCase().includes(keyword)) ||
      (request.university && request.university.toLowerCase().includes(keyword)) ||
      (request.grade && request.grade.toLowerCase().includes(keyword)) ||
      (request.email && request.email.toLowerCase().includes(keyword))
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <CommonHeader title="メンバー管理" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* タブバー */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, selectedTab === 'members' && styles.tabItemActive]}
            onPress={() => setSelectedTab('members')}
          >
            <Text style={[styles.tabText, selectedTab === 'members' && styles.tabTextActive]}>メンバー</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, selectedTab === 'requests' && styles.tabItemActive]}
            onPress={() => setSelectedTab('requests')}
          >
            <Text style={[styles.tabText, selectedTab === 'requests' && styles.tabTextActive]}>入会申請</Text>
          </TouchableOpacity>
        </View>

        {/* タブ切り替えで表示内容を分岐 */}
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
              renderItem={({ item }) => (
                <View style={styles.memberItem}>
                  {item.profileImageUrl ? (
                    <Image 
                      source={{ uri: item.profileImageUrl }} 
                      style={styles.memberAvatar} 
                    />
                  ) : (
                    <Ionicons name="person-circle-outline" size={56} color="#007bff" style={{ marginRight: 16 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.name || '氏名未設定'}</Text>
                    <Text style={styles.memberInfo}>{item.university || ''} {item.grade || ''}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
                    <Ionicons name="remove-circle" size={36} color="#f44336" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>メンバーがいません</Text>}
              contentContainerStyle={{ padding: 20 }}
            />
          </>
        )}
        {selectedTab === 'requests' && (
          <>
            {/* 検索バー */}
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
            {/* ヒット件数表示 */}
            {requestSearchText.length > 0 && (
              <Text style={styles.hitCountText}>
                検索結果
                <Text style={styles.hitCountNumber}>{filteredRequests.length}</Text>
                件
              </Text>
            )}
            {/* 入会申請リスト */}
            {filteredRequests.length > 0 ? (
              <FlatList
                data={filteredRequests}
                keyExtractor={item => item.id}
                renderItem={({ item: request }) => (
                  <View style={styles.memberItem}>
                    {request.profileImageUrl ? (
                      <Image
                        source={{ uri: request.profileImageUrl }}
                        style={styles.memberAvatar}
                      />
                    ) : (
                      <Ionicons name="person-add" size={56} color="#007bff" style={{ marginRight: 16 }} />
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
                )}
                ListEmptyComponent={null}
                contentContainerStyle={{ padding: 20 }}
              />
            ) : (
              <Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>入会申請はありません</Text>
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, marginBottom: 14 },
  memberAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
  memberName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  memberInfo: { fontSize: 15, color: '#666' },
  removeButton: { marginLeft: 10 },
  requestSection: { marginBottom: 24, padding: 12, backgroundColor: '#fff', borderRadius: 12 },
  requestTitle: { fontSize: 16, fontWeight: 'bold', color: '#007bff', marginBottom: 8 },
  requestItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f8ff', borderRadius: 8, padding: 10, marginBottom: 8 },
  approveButton: { marginLeft: 8 },
  rejectButton: { marginLeft: 12 },
  // 検索用スタイル（SearchScreenと同じにする）
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
    height: 40,
    fontSize: 16,
  },
  hitCountText: {
    marginLeft: 20,
    marginBottom: 4,
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hitCountNumber: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
}); 