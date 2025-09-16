import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert, 
  Modal,
  Animated,
  Dimensions,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, getDocs, collection, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import CommonHeader from '../components/CommonHeader';

const { width } = Dimensions.get('window');

export default function CircleLeadershipTransferScreen({ route, navigation }) {
  const { circleId, circleName } = route.params;
  const [user, setUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [circleData, setCircleData] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  
  // アニメーション用の値
  const [scaleAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setCurrentUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching current user data:', error);
        }
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user || !circleId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // サークルデータを取得
        const circleDoc = await getDoc(doc(db, 'circles', circleId));
        if (circleDoc.exists()) {
          setCircleData(circleDoc.data());
        }

        // メンバーリストを取得
        const membersSnapshot = await getDocs(collection(db, 'circles', circleId, 'members'));
        
        const membersList = membersSnapshot.docs.map(doc => {
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

        // データ取得完了

      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('エラー', 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, circleId]);

  const handleMemberSelect = (member) => {
    if (!user) return;
    if (member.id === user.uid) {
      Alert.alert('エラー', '自分自身に権限を引き継ぐことはできません');
      return;
    }

    setSelectedMember(member);
    
    // 選択アニメーション
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();

    // 光のアニメーション
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleTransfer = async () => {
    if (!selectedMember || !user) return;

    setShowConfirmModal(false);
    setTransferring(true);

    try {
      // 新しい代表者のユーザー情報を取得
      const newLeaderUserDoc = await getDoc(doc(db, 'users', selectedMember.id));
      const newLeaderUserData = newLeaderUserDoc.exists() ? newLeaderUserDoc.data() : {};

      // 権限移譲の処理
      const currentLeaderRef = doc(db, 'circles', circleId, 'members', user.uid);
      const newLeaderRef = doc(db, 'circles', circleId, 'members', selectedMember.id);

      // サークルデータの代表者情報を更新（新しい代表者の情報で更新）
      await updateDoc(doc(db, 'circles', circleId), {
        leaderId: selectedMember.id,
        leaderName: selectedMember.name || selectedMember.nickname || 'Unknown',
        contactInfo: newLeaderUserData.email || '', // 新しい代表者の連絡先
        universityName: newLeaderUserData.university || '' // 新しい代表者の大学名
      });

      // 新しい代表者を設定
      await updateDoc(newLeaderRef, { role: 'leader' });
      
      // 新しい代表者のadminCircleIdsにサークルIDを追加
      const newLeaderUserRef = doc(db, 'users', selectedMember.id);
      await updateDoc(newLeaderUserRef, {
        adminCircleIds: arrayUnion(circleId)
      });
      
      // 現在の代表者をメンバーに変更（最後に実行）
      await updateDoc(currentLeaderRef, { role: 'member' });
      
      // 現在の代表者のadminCircleIdsからサークルIDを削除
      const currentLeaderUserRef = doc(db, 'users', user.uid);
      await updateDoc(currentLeaderUserRef, {
        adminCircleIds: arrayRemove(circleId)
      });

      setShowCompletionModal(true);
    } catch (error) {
      console.error('Error transferring leadership:', error);
      Alert.alert('エラー', '権限の引き継ぎに失敗しました');
    } finally {
      setTransferring(false);
    }
  };

  const handleCompletion = () => {
    setShowCompletionModal(false);
    // ログアウトチェックを追加
    const currentUser = auth.currentUser;
    if (currentUser) {
      // スタックをリセットしてCircleManagementScreenに遷移
      // これにより「戻る」ボタンで代表者引き継ぎ画面に戻れなくなる
      navigation.reset({
        index: 0,
        routes: [{ name: 'CircleManagementScreen' }],
      });
    } else {
      // ログアウトしている場合はホーム画面に遷移
      navigation.navigate('Home');
    }
  };

  // 検索フィルタリング
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchText.toLowerCase()) ||
    member.university.toLowerCase().includes(searchText.toLowerCase()) ||
    member.grade.toLowerCase().includes(searchText.toLowerCase())
  );

  // 役割別にソート（代表者 → 管理者 → メンバー）
  const sortedMembers = filteredMembers.sort((a, b) => {
    const rolePriority = {
      'leader': 1,
      'admin': 2,
      'member': 3
    };
    
    const priorityA = rolePriority[a.role] || 4;
    const priorityB = rolePriority[b.role] || 4;
    return priorityA - priorityB;
  });

  const renderMemberItem = (member) => {
    const isSelected = selectedMember?.id === member.id;
    const isCurrentUser = user && member.id === user.uid;

    return (
      <Animated.View
        key={member.id}
        style={[
          styles.memberItem,
          isSelected && styles.selectedMemberItem,
          isCurrentUser && styles.currentUserItem
        ]}
      >
        <TouchableOpacity
          style={styles.memberTouchable}
          onPress={() => handleMemberSelect(member)}
          disabled={isCurrentUser}
        >
          <View style={styles.memberIconContainer}>
            {member.profileImageUrl ? (
              <Image source={{ uri: member.profileImageUrl }} style={styles.memberIcon} />
            ) : (
              <View style={styles.memberIconPlaceholder}>
                <Ionicons name="person-outline" size={24} color="#9ca3af" />
              </View>
            )}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {member.name || member.nickname || 'Unknown'}
              {isCurrentUser && ' (あなた)'}
            </Text>
            <Text style={styles.memberSubtitle}>
              {member.role === 'leader' ? '代表者' : member.role === 'admin' ? '管理者' : 'サークルのメンバー'}
            </Text>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="#299cfa" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CommonHeader 
          title="代表者権限の引き継ぎ" 
          showBackButton 
          onBack={() => navigation.goBack()}
          rightButton={
            <TouchableOpacity onPress={() => setShowHelpModal(true)}>
              <Ionicons name="help-circle-outline" size={24} color="#007bff" />
            </TouchableOpacity>
          }
        />
        <SafeAreaView style={styles.content}>
          <View style={styles.loadingContainer}>
            <Ionicons name="refresh" size={48} color="#007bff" />
            <Text style={styles.loadingText}>データを読み込み中...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="代表者権限の引き継ぎ" 
        showBackButton 
        onBack={() => navigation.goBack()}
        rightButton={
          <TouchableOpacity onPress={() => setShowHelpModal(true)}>
            <Ionicons name="help-circle-outline" size={24} color="#007bff" />
          </TouchableOpacity>
        }
      />
      <SafeAreaView style={styles.content}>
        <Animated.View style={[styles.mainContent, { opacity: 1 }]}>
          {/* 現在の代表者表示 */}
          <View style={styles.currentLeaderSection}>
            <Text style={styles.sectionHeader}>現在の代表者</Text>
            <View style={styles.currentLeaderContainer}>
              <View style={styles.currentLeaderIconContainer}>
                {currentUserData?.profileImageUrl ? (
                  <Image source={{ uri: currentUserData.profileImageUrl }} style={styles.currentLeaderIcon} />
                ) : (
                  <View style={styles.currentLeaderIconPlaceholder}>
                    <Ionicons name="person-outline" size={32} color="#6b7280" />
                  </View>
                )}
              </View>
              <View style={styles.currentLeaderInfo}>
                <Text style={styles.currentLeaderName}>
                  {currentUserData?.name || currentUserData?.nickname || user?.email || 'Unknown'}
                </Text>
                <Text style={styles.currentLeaderSubtitle}>
                  {currentUserData?.university || '大学生活を楽しもう'}
                </Text>
              </View>
            </View>
          </View>

          {/* メンバーリスト */}
          <View style={styles.membersSection}>
            <Text style={styles.sectionHeader}>新しい代表者を選択</Text>
            
            {/* 検索バー */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="メンバーを検索"
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
            
            <ScrollView style={styles.membersListContainer} showsVerticalScrollIndicator={false}>
              {sortedMembers.map(renderMemberItem)}
            </ScrollView>
          </View>

          {/* 引き継ぎボタン */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[
                styles.transferButton,
                !selectedMember && styles.transferButtonDisabled
              ]}
              onPress={() => setShowConfirmModal(true)}
              disabled={!selectedMember || transferring}
            >
              <Text style={styles.transferButtonText}>
                {transferring ? '引き継ぎ中...' : '次へ'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* ヘルプモーダル */}
      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.helpModal}>
            <Text style={styles.helpModalTitle}>代表者権限の引き継ぎについて</Text>
            <Text style={styles.helpModalText}>
              代表者権限を引き継ぐと、あなたの役割は「メンバー」に変更されます。
              引き継ぎ先のメンバーが新しい代表者となり、サークルの管理権限を取得します。
            </Text>
            <TouchableOpacity
              style={styles.helpModalButton}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.helpModalButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 確認モーダル */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>確認</Text>
            <Text style={styles.confirmModalText}>
              {selectedMember?.name || selectedMember?.nickname || 'Unknown'} さんに{'\n'}
              代表者権限を引き継ぎますか？
            </Text>
            <Text style={styles.confirmModalWarning}>
              この操作は取り消すことができません。
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalButtonCancel}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmModalButtonCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalButtonConfirm}
                onPress={handleTransfer}
              >
                <Text style={styles.confirmModalButtonConfirmText}>引き継ぐ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 完了モーダル */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCompletion}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            <View style={styles.completionIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#28a745" />
            </View>
            <Text style={styles.completionModalTitle}>引き継ぎ完了</Text>
            <Text style={styles.completionModalText}>
              {selectedMember?.name || selectedMember?.nickname || 'Unknown'}さんに
              引き継ぎました。
            </Text>
            <Text style={styles.completionModalSubText}>
              あなたのは「メンバー」に変更されました。
            </Text>
            <TouchableOpacity
              style={styles.completionModalButton}
              onPress={handleCompletion}
            >
              <Text style={styles.completionModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  currentLeaderSection: {
    marginBottom: 16,
  },
  currentLeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 16,
  },
  currentLeaderIconContainer: {
    position: 'relative',
  },
  currentLeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  currentLeaderIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLeaderInfo: {
    flex: 1,
  },
  currentLeaderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  currentLeaderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  membersSection: {
    flex: 1,
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
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
  hitCountText: {
    marginBottom: 10,
    fontSize: 14,
    color: '#6b7280',
  },
  hitCountNumber: {
    fontWeight: 'bold',
    color: '#299cfa',
  },
  membersListContainer: {
    backgroundColor: '#fff',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'hidden',
    marginHorizontal: -16,
  },
  memberItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedMemberItem: {
    backgroundColor: '#eef7ff',
  },
  currentUserItem: {
    opacity: 0.5,
  },
  memberTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 16,
  },
  memberIconContainer: {
    position: 'relative',
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  memberSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  buttonSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transferButton: {
    backgroundColor: '#299cfa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transferButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  helpModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpModalText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  helpModalButton: {
    backgroundColor: '#299cfa',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  helpModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
    justifyContent: 'space-between',
  },
  confirmModalButtonCancel: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  confirmModalButtonCancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmModalButtonConfirm: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmModalButtonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completionModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  completionIconContainer: {
    marginBottom: 16,
  },
  completionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionModalText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionModalSubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  completionModalButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  completionModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
