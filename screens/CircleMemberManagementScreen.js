import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, arrayRemove, arrayUnion } from 'firebase/firestore';

export default function CircleMemberManagementScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        // サークル情報を取得してmemberIdsからメンバー情報を取得
        const circleDoc = await getDoc(doc(db, 'circles', circleId));
        if (circleDoc.exists()) {
          const circleData = circleDoc.data();
          const memberIds = circleData.memberIds || [];
          
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
        }
        
        // 入会申請も取得
        const requestsRef = collection(db, 'circles', circleId, 'joinRequests');
        const reqSnap = await getDocs(requestsRef);
        const reqList = reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
          // サークルのmemberIdsから削除
          const circleDocRef = doc(db, 'circles', circleId);
          await updateDoc(circleDocRef, {
            memberIds: arrayRemove(memberId)
          });
          
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
      // サークルのmemberIdsに追加
      const circleDocRef = doc(db, 'circles', circleId);
      await updateDoc(circleDocRef, {
        memberIds: arrayUnion(request.userId)
      });
      
      // ユーザーのjoinedCircleIdsに追加
      const userDocRef = doc(db, 'users', request.userId);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayUnion(circleId)
      });
      
      // 申請削除
      await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', request.id));
      setJoinRequests(prev => prev.filter(r => r.id !== request.id));
      
      // メンバー一覧を再取得
      const circleDoc = await getDoc(doc(db, 'circles', circleId));
      if (circleDoc.exists()) {
        const circleData = circleDoc.data();
        const memberIds = circleData.memberIds || [];
        
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
      }
    } catch (e) {
      console.error('Error approving request:', e);
      Alert.alert('エラー', '申請の許可に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'circles', circleId, 'joinRequests', requestId));
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (e) {
      Alert.alert('エラー', '申請の却下に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 今後: 入会申請許可・管理者権限付与などの機能も追加予定

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}><Text style={styles.title}>メンバー管理</Text></View>
      {/* 入会申請一覧 */}
      {joinRequests.length > 0 && (
        <View style={styles.requestSection}>
          <Text style={styles.requestTitle}>入会申請</Text>
          {joinRequests.map(request => (
            <View key={request.id} style={styles.requestItem}>
              <Ionicons name="person-add" size={28} color="#007bff" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{request.name || '申請者'}</Text>
                <Text style={styles.memberInfo}>{request.university || ''} {request.grade || ''}</Text>
                <Text style={styles.memberInfo}>{request.email || ''}</Text>
              </View>
              <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(request)}>
                <Ionicons name="checkmark-circle" size={28} color="#28a745" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(request.id)}>
                <Ionicons name="close-circle" size={28} color="#f44336" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            {item.profileImageUrl ? (
              <Image 
                source={{ uri: item.profileImageUrl }} 
                style={styles.memberAvatar} 
              />
            ) : (
              <Ionicons name="person-circle-outline" size={40} color="#007bff" style={{ marginRight: 12 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{item.name || '氏名未設定'}</Text>
              <Text style={styles.memberInfo}>{item.university || ''} {item.grade || ''}</Text>
              <Text style={styles.memberInfo}>{item.email || ''}</Text>
            </View>
            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
              <Ionicons name="remove-circle" size={28} color="#f44336" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>メンバーがいません</Text>}
        contentContainerStyle={{ padding: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, marginBottom: 14 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberInfo: { fontSize: 13, color: '#666' },
  removeButton: { marginLeft: 10 },
  requestSection: { marginBottom: 24, padding: 12, backgroundColor: '#fff', borderRadius: 12 },
  requestTitle: { fontSize: 16, fontWeight: 'bold', color: '#007bff', marginBottom: 8 },
  requestItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f8ff', borderRadius: 8, padding: 10, marginBottom: 8 },
  approveButton: { marginLeft: 8 },
  rejectButton: { marginLeft: 4 },
}); 