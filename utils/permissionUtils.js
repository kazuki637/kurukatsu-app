import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// 権限チェック関数
export const checkUserPermission = async (circleId, userId, requiredRole = 'member') => {
  try {
    const memberDoc = await getDoc(doc(db, 'circles', circleId, 'members', userId));
    if (!memberDoc.exists()) return false;
    
    const userRole = memberDoc.data().role || 'member'; // デフォルトはmember
    const roleHierarchy = { 'leader': 3, 'admin': 2, 'member': 1 };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

// ユーザーの役割を取得
export const getUserRole = async (circleId, userId) => {
  try {
    const memberDoc = await getDoc(doc(db, 'circles', circleId, 'members', userId));
    if (!memberDoc.exists()) return null;
    
    return memberDoc.data().role || 'member';
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
};

// 役割の表示名を取得
export const getRoleDisplayName = (role) => {
  const roleNames = {
    'leader': '代表者',
    'admin': '管理者',
    'member': 'メンバー'
  };
  return roleNames[role] || 'メンバー';
}; 