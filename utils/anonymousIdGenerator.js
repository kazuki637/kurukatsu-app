/**
 * 匿名ID生成ユーティリティ
 * スレッド別に8桁の英数字IDを生成し、同一ユーザーでも別スレッドでは異なるIDを提供
 */

/**
 * 8桁の英数字ランダムIDを生成
 * @returns {string} 8桁の英数字ID
 */
export const generateAnonymousId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // より安全な乱数生成（React Native環境対応）
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * ユーザーのスレッド別匿名IDを管理
 * 同一ユーザーが同じスレッド内で複数回匿名投稿する場合、同じIDを返す
 * 異なるスレッドでは異なるIDを返す
 */
class AnonymousIdManager {
  constructor() {
    // メモリ内でユーザーID + スレッドID -> 匿名IDのマッピングを保持
    this.userThreadIds = new Map();
  }

  /**
   * ユーザーのスレッド別匿名IDを取得または生成
   * @param {string} userId - ユーザーID
   * @param {string} threadId - スレッドID
   * @returns {string} 匿名ID
   */
  getOrCreateAnonymousId(userId, threadId) {
    const key = `${userId}_${threadId}`;
    
    if (!this.userThreadIds.has(key)) {
      const anonymousId = generateAnonymousId();
      this.userThreadIds.set(key, anonymousId);
    }
    
    return this.userThreadIds.get(key);
  }

  /**
   * 特定のユーザー・スレッドの匿名IDをクリア（テスト用）
   * @param {string} userId - ユーザーID
   * @param {string} threadId - スレッドID
   */
  clearAnonymousId(userId, threadId) {
    const key = `${userId}_${threadId}`;
    this.userThreadIds.delete(key);
  }

  /**
   * 全ての匿名IDをクリア（テスト用）
   */
  clearAllAnonymousIds() {
    this.userThreadIds.clear();
  }
}

// シングルトンインスタンス
const anonymousIdManager = new AnonymousIdManager();

export default anonymousIdManager;
