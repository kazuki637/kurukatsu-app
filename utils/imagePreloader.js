import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// アプリ内で使用される重要なassets画像のリスト
const CRITICAL_ASSETS = [
  require('../assets/icon.png'),
  require('../assets/CircleManagement.png'),
  require('../assets/HOME-Header-Title.png'),
  require('../assets/Button-icons/Calendar.png'),
  require('../assets/Button-icons/Leader.png'),
  require('../assets/Button-icons/Member.png'),
  require('../assets/Button-icons/Message.png'),
  require('../assets/Button-icons/Profile.png'),
  require('../assets/Button-icons/Setting.png'),
  require('../assets/KP.png'),
  require('../assets/StudentIdGuide.png'),
];

// オンボーディング画像は不使用のため削除

// SNSアイコン
const SNS_ASSETS = [
  require('../assets/SNS-icons/Instagram_Glyph_Gradient.png'),
  require('../assets/SNS-icons/LINE_Brand_icon.png'),
  require('../assets/SNS-icons/X_logo-black.png'),
];

class ImagePreloader {
  constructor() {
    this.preloadedImages = new Set();
    this.isPreloading = false;
    this.progressCallback = null;
  }

  // アプリ起動時に呼び出される初期プリロード（プログレス付き）
  async initializePreloading(progressCallback = null) {
    if (this.isPreloading) return;
    this.isPreloading = true;
    this.progressCallback = progressCallback;

    console.log('🚀 スプラッシュ画面でのプリロード開始');
    const startTime = Date.now();

    try {
      // プログレス更新
      this.updateProgress(0, 'アセット画像を読み込み中...');

      // 1. 重要なassets画像を最優先でプリロード
      await this.preloadAssets();
      this.updateProgress(50, 'ユーザー画像を読み込み中...');

      // 2. ユーザー関連画像をプリロード（認証後）
      if (auth.currentUser) {
        await this.preloadUserRelatedImages();
      }

      this.updateProgress(100, 'プリロード完了');
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ スプラッシュプリロード完了: ${totalTime}ms, ${this.preloadedImages.size}枚`);
    } catch (error) {
      console.warn('⚠️ スプラッシュプリロードエラー:', error);
      this.updateProgress(100, 'プリロード完了（一部エラー）');
    } finally {
      this.isPreloading = false;
      this.progressCallback = null;
    }
  }

  // プログレス更新関数
  updateProgress(progress, message) {
    if (this.progressCallback) {
      this.progressCallback(progress, message);
    }
  }

  // Assets画像のプリロード
  async preloadAssets() {
    const assetsToPreload = [...CRITICAL_ASSETS, ...SNS_ASSETS];
    let preloadedCount = 0;
    
    // ローカルassets画像も明示的にプリロードしてキャッシュを確実にする
    const preloadPromises = assetsToPreload.map(async (asset) => {
      try {
        if (typeof asset === 'number') {
          // require()で読み込まれた画像のURIを取得してプリロード
          const assetModule = Asset.fromModule(asset);
          await assetModule.downloadAsync();
          const uri = assetModule.localUri || assetModule.uri;
          await Image.prefetch(uri, { cachePolicy: 'memory-disk' });
          this.preloadedImages.add(uri);
          this.preloadedImages.add(asset); // require番号も記録
          preloadedCount++;
        }
      } catch (error) {
        console.warn('Asset preload failed:', asset, error);
      }
    });

    await Promise.all(preloadPromises);
    console.log(`📦 Assets画像プリロード完了: ${preloadedCount}/${assetsToPreload.length}枚`);
  }

  // ユーザー関連画像のプリロード
  async preloadUserRelatedImages() {
    console.log('🔍 preloadUserRelatedImages 開始');
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ 認証ユーザーなし、ユーザー画像プリロードスキップ');
        return;
      }

      console.log('👤 ユーザーID:', user.uid);

      // ユーザープロフィール画像をプリロード
      await this.preloadUserProfileImage(user.uid);

      // 所属サークルの画像をプリロード
      await this.preloadUserCircleImages(user.uid);

      console.log('✅ ユーザー関連画像プリロード完了');
    } catch (error) {
      console.warn('ユーザー関連画像プリロードエラー:', error);
    }
  }

  // ユーザープロフィール画像のプリロード
  async preloadUserProfileImage(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.profileImageUrl && userData.profileImageUrl.trim() !== '') {
          console.log('👤 ユーザープロフィール画像プリロード開始');
          await Image.prefetch(userData.profileImageUrl, { cachePolicy: 'memory-disk' });
          this.preloadedImages.add(userData.profileImageUrl);
          console.log('✅ ユーザープロフィール画像プリロード完了');
        }
      }
    } catch (error) {
      console.warn('ユーザープロフィール画像プリロードエラー:', error);
    }
  }

  // 所属サークル画像のプリロード
  async preloadUserCircleImages(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const joinedCircleIds = userData.joinedCircleIds || [];

      if (joinedCircleIds.length === 0) return;

      console.log(`🎯 所属サークル画像プリロード開始: ${joinedCircleIds.length}件`);

      // 所属サークルの情報を取得
      const circlesRef = collection(db, 'circles');
      const q = query(circlesRef, where('__name__', 'in', joinedCircleIds));
      const circlesSnapshot = await getDocs(q);

      // サークル画像を並列でプリロード
      const preloadPromises = circlesSnapshot.docs.map(async (circleDoc) => {
        const circleData = circleDoc.data();
        if (circleData.imageUrl && circleData.imageUrl.trim() !== '') {
          try {
            await Image.prefetch(circleData.imageUrl, { cachePolicy: 'memory-disk' });
            this.preloadedImages.add(circleData.imageUrl);
            return circleData.name;
          } catch (error) {
            console.warn(`サークル画像プリロードエラー (${circleData.name}):`, error);
            return null;
          }
        }
        return null;
      });

      const results = await Promise.all(preloadPromises);
      const successCount = results.filter(r => r !== null).length;
      console.log(`✅ 所属サークル画像プリロード完了: ${successCount}/${joinedCircleIds.length}件`);

    } catch (error) {
      console.warn('所属サークル画像プリロードエラー:', error);
    }
  }

  // 特定の画像がプリロード済みかチェック
  isImagePreloaded(imageUrl) {
    return this.preloadedImages.has(imageUrl);
  }

  // 追加の画像をプリロード（動的に追加）
  async preloadImage(imageUrl) {
    if (this.preloadedImages.has(imageUrl)) {
      return true; // 既にプリロード済み
    }

    try {
      await Image.prefetch(imageUrl, { cachePolicy: 'memory-disk' });
      this.preloadedImages.add(imageUrl);
      return true;
    } catch (error) {
      console.warn('追加画像プリロードエラー:', imageUrl, error);
      return false;
    }
  }

  // プリロード状況の確認（デバッグ用）
  getPreloadStatus() {
    return {
      count: this.preloadedImages.size,
      images: Array.from(this.preloadedImages),
      isPreloading: this.isPreloading
    };
  }
}

// シングルトンインスタンス
export const imagePreloader = new ImagePreloader();

// アプリ起動時に呼び出す初期化関数
export const initializeImagePreloading = async () => {
  await imagePreloader.initializePreloading();
};

// 認証状態変更時に呼び出す関数
export const preloadUserImages = async () => {
  console.log('🔍 preloadUserImages 関数呼び出し');
  if (auth.currentUser) {
    console.log('👤 認証済みユーザー検出、プリロード開始');
    await imagePreloader.preloadUserRelatedImages();
  } else {
    console.log('⚠️ 認証されていないユーザー、プリロードスキップ');
  }
};

export default imagePreloader;
