import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage, auth } from '../firebaseConfig'; // Firebase StorageインスタンスとAuthをインポート

/**
 * 画像を指定された座標で切り抜く（画像タイプに応じたアスペクト比を保証）
 * @param {string} imageUri - 元画像のURI
 * @param {Object} crop - 切り抜き座標 {originX, originY, width, height}
 * @param {number} imageWidth - 元画像の幅
 * @param {number} imageHeight - 元画像の高さ
 * @param {string} imageType - 画像タイプ（'profile', 'circle', 'header'など）
 * @returns {Promise<string>} 切り抜き後の画像URI
 */
export const cropImage = async (imageUri, crop, imageWidth, imageHeight, imageType = 'profile') => {
  try {
    // 元画像の情報を取得
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // 操作なし
      { format: 'jpeg', compress: 1 } // qualityをcompressに変更
    );

    // 切り抜き座標を計算（元画像の実際のサイズに基づく）
    const scaleX = imageInfo.width / imageWidth;
    const scaleY = imageInfo.height / imageHeight;

    const cropX = Math.round(crop.originX * scaleX);
    const cropY = Math.round(crop.originY * scaleY);
    const cropWidth = Math.round(crop.width * scaleX);
    const cropHeight = Math.round(crop.height * scaleY);

    // 画像タイプに応じたアスペクト比で切り抜く
    let finalCropX, finalCropY, finalCropWidth, finalCropHeight;
    
    if (imageType === 'profile' || imageType === 'circle') {
      // プロフィール画像とサークルアイコンは正方形（1:1）
      const squareSize = Math.min(cropWidth, cropHeight);
      const centerX = cropX + cropWidth / 2;
      const centerY = cropY + cropHeight / 2;
      
      finalCropX = Math.round(centerX - squareSize / 2);
      finalCropY = Math.round(centerY - squareSize / 2);
      finalCropWidth = squareSize;
      finalCropHeight = squareSize;
    } else {
      // その他の画像は横長（16:9）を保証
      const targetAspectRatio = 16 / 9;
      const currentAspectRatio = cropWidth / cropHeight;
      
      if (currentAspectRatio > targetAspectRatio) {
        // 現在の画像が横長すぎる場合、高さに合わせる
        finalCropHeight = cropHeight;
        finalCropWidth = cropHeight * targetAspectRatio;
        finalCropX = cropX + (cropWidth - finalCropWidth) / 2;
        finalCropY = cropY;
      } else {
        // 現在の画像が縦長の場合、幅に合わせる
        finalCropWidth = cropWidth;
        finalCropHeight = cropWidth / targetAspectRatio;
        finalCropX = cropX;
        finalCropY = cropY + (cropHeight - finalCropHeight) / 2;
      }
    }
    
    // 画像の境界内に収める
    const adjustedCropX = Math.max(0, Math.min(finalCropX, imageInfo.width - finalCropWidth));
    const adjustedCropY = Math.max(0, Math.min(finalCropY, imageInfo.height - finalCropHeight));
    const adjustedCropWidth = Math.min(finalCropWidth, imageInfo.width - adjustedCropX);
    const adjustedCropHeight = Math.min(finalCropHeight, imageInfo.height - adjustedCropY);



    // 画像を指定されたアスペクト比で切り抜く
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{
        crop: {
          originX: adjustedCropX,
          originY: adjustedCropY,
          width: adjustedCropWidth,
          height: adjustedCropHeight,
        }
      }],
      { format: 'jpeg', compress: 0.9 } // qualityをcompressに変更
    );


    return result.uri;

  } catch (error) {
    console.error('画像切り抜きエラー:', error);
    throw new Error('画像の切り抜きに失敗しました');
  }
};

/**
 * 既存のプロフィール画像を削除する
 * @param {string} userId - ユーザーID
 * @returns {Promise<void>}
 */
export const deleteExistingProfileImages = async (userId) => {
  try {

    
    const profileImagesRef = ref(storage, `profile_images/${userId}`);
    const result = await listAll(profileImagesRef);
    
    // 既存の画像ファイルを全て削除
    const deletePromises = result.items.map(itemRef => deleteObject(itemRef));
    await Promise.all(deletePromises);
    

  } catch (error) {
    console.error('既存のプロフィール画像削除エラー:', error);
    // 削除に失敗しても処理を続行
  }
};

/**
 * 画像をFirebase Storageにアップロードする
 * @param {string} imageUri - アップロードする画像のURI
 * @param {string} path - Firebase Storage内のパス (例: 'profile_images/user123.jpg')
 * @returns {Promise<string>} アップロードされた画像のダウンロードURL
 */
export const uploadImageToFirebase = async (imageUri, path) => {
  try {

    
    // 画像URIからblobを取得
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`画像の取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();


    // Firebase Storageにアップロード
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytes(storageRef, blob);

    const snapshot = await uploadTask;

    
    // ダウンロードURLを取得
    const downloadURL = await getDownloadURL(snapshot.ref);

    
    return downloadURL;
  } catch (error) {
    console.error('Firebase Storageへのアップロードエラー:', error);
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }
};

/**
 * 画像を切り抜いてから圧縮する（Firebase Storageへのアップロードは行わない）
 * @param {string} imageUri - 元画像のURI
 * @param {Object} crop - 切り抜き座標
 * @param {number} imageWidth - 表示幅
 * @param {number} imageHeight - 表示高さ
 * @param {string} imageType - 画像タイプ（'profile', 'circle', 'header'など）
 * @returns {Promise<string>} 処理後の画像URI（ローカルファイル）
 */
export const cropAndCompressImage = async (imageUri, crop, imageWidth, imageHeight, imageType = 'profile') => {
  try {

    
    // まず切り抜き（画像タイプに応じたアスペクト比）
    const croppedUri = await cropImage(imageUri, crop, imageWidth, imageHeight, imageType);

    
    // 次に圧縮（既存のcompressImageToOneMB関数を使用）
    const { compressImageToOneMB } = await import('./imageCompression.js');
    const compressedUri = await compressImageToOneMB(croppedUri, imageType);

    
    return compressedUri;
  } catch (error) {
    console.error('画像処理エラー:', error);
    throw new Error(`画像の処理に失敗しました: ${error.message}`);
  }
};