import { db } from './firebaseConfig';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

// 既存メンバーにデフォルト役割を付与するスクリプト
export const updateExistingMemberRoles = async () => {
  try {
    console.log('既存メンバーの役割更新を開始します...');
    
    // すべてのサークルを取得
    const circlesSnapshot = await getDocs(collection(db, 'circles'));
    
    for (const circleDoc of circlesSnapshot.docs) {
      const circleId = circleDoc.id;
      const circleData = circleDoc.data();
      
      console.log(`サークル "${circleData.name}" (${circleId}) の処理中...`);
      
      // 各サークルのメンバーを取得
      const membersSnapshot = await getDocs(collection(db, 'circles', circleId, 'members'));
      
      for (const memberDoc of membersSnapshot.docs) {
        const memberId = memberDoc.id;
        const memberData = memberDoc.data();
        
        // 既に役割が設定されている場合はスキップ
        if (memberData.role) {
          console.log(`  メンバー ${memberId}: 既に役割が設定済み (${memberData.role})`);
          continue;
        }
        
        // 役割を決定
        let role = 'member';
        
        // サークル作成者（contactInfo一致）は代表者
        if (circleData.createdBy === memberId) {
          role = 'leader';
        }
        
        // 役割を更新
        await updateDoc(doc(db, 'circles', circleId, 'members', memberId), {
          role: role,
          assignedAt: new Date(),
          assignedBy: circleData.createdBy || memberId
        });
        
        console.log(`  メンバー ${memberId}: 役割を "${role}" に設定`);
      }
    }
    
    console.log('既存メンバーの役割更新が完了しました！');
  } catch (error) {
    console.error('役割更新エラー:', error);
  }
};

// スクリプト実行（開発時のみ）
if (typeof window !== 'undefined') {
  // ブラウザ環境では実行しない
  console.log('このスクリプトはNode.js環境で実行してください');
} else {
  // Node.js環境での実行
  updateExistingMemberRoles();
} 