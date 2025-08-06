import * as ImageManipulator from 'expo-image-manipulator';

// 目標ファイルサイズ（1MB）
const TARGET_SIZE = 1024 * 1024;

// 画像タイプ別の設定
const IMAGE_SETTINGS = {
  profile: {
    width: 200,
    height: 200,
    quality: 0.8,
  },
  circle: {
    width: 300,
    height: 300,
    quality: 0.8,
  },
  header: {
    width: 800,
    height: 400,
    quality: 0.85,
  },
  event: {
    width: 800,
    height: 450,
    quality: 0.85,
  },
  activity: {
    width: 800,
    height: 450,
    quality: 0.85,
  },
};

// 最適な解像度を計算
const getOptimalDimensions = (originalWidth, originalHeight, targetSize) => {
  const aspectRatio = originalWidth / originalHeight;
  
  if (targetSize <= 100 * 1024) { // 100KB以下
    return { width: 200, height: Math.round(200 / aspectRatio) };
  } else if (targetSize <= 500 * 1024) { // 500KB以下
    return { width: 400, height: Math.round(400 / aspectRatio) };
  } else {
    return { width: 600, height: Math.round(600 / aspectRatio) };
  }
};

// ファイルサイズを取得
const getFileSize = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch (error) {
    console.error('ファイルサイズ取得エラー:', error);
    return 0;
  }
};

// 画像を1MB以下に圧縮
export const compressImageToOneMB = async (imageUri, imageType = 'profile') => {
  try {
    // 元画像の情報を取得
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // 操作なし
      { format: 'jpeg', quality: 1 }
    );
    
    // 元画像のサイズをチェック
    const originalSize = await getFileSize(imageUri);
    
    // 1MB以下ならそのまま返す
    if (originalSize <= TARGET_SIZE) {
      console.log('元画像は既に1MB以下です:', originalSize / 1024, 'KB');
      return imageUri;
    }
    
    console.log('元画像サイズ:', originalSize / 1024, 'KB');
    
    // 画像タイプに基づく初期設定
    const settings = IMAGE_SETTINGS[imageType] || IMAGE_SETTINGS.header; // デフォルトはheader設定
    
    // 圧縮率を計算
    const compressionRatio = TARGET_SIZE / originalSize;
    let quality = Math.max(0.1, compressionRatio * settings.quality);
    
    // 解像度も調整
    const dimensions = getOptimalDimensions(
      imageInfo.width, 
      imageInfo.height, 
      originalSize
    );
    
    console.log('圧縮設定:', { dimensions, quality });
    
    // 一発で圧縮
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: dimensions }],
      { format: 'jpeg', quality }
    );
    
    // 圧縮後のサイズをチェック
    const compressedSize = await getFileSize(result.uri);
    console.log('圧縮後サイズ:', compressedSize / 1024, 'KB');
    
    // まだ1MBを超えている場合は品質を下げて再圧縮
    if (compressedSize > TARGET_SIZE) {
      console.log('再圧縮が必要です');
      const finalResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: Math.round(dimensions.width * 0.8), height: Math.round(dimensions.height * 0.8) } }],
        { format: 'jpeg', quality: 0.5 }
      );
      
      const finalSize = await getFileSize(finalResult.uri);
      console.log('最終圧縮サイズ:', finalSize / 1024, 'KB');
      
      return finalResult.uri;
    }
    
    return result.uri;
    
  } catch (error) {
    console.error('画像圧縮エラー:', error);
    throw new Error('画像の圧縮に失敗しました');
  }
};

// 画像タイプ別の圧縮関数
export const compressProfileImage = (imageUri) => compressImageToOneMB(imageUri, 'profile');
export const compressCircleImage = (imageUri) => compressImageToOneMB(imageUri, 'circle');
export const compressHeaderImage = (imageUri) => compressImageToOneMB(imageUri, 'header');
export const compressEventImage = (imageUri) => compressImageToOneMB(imageUri, 'event');
export const compressActivityImage = (imageUri) => compressImageToOneMB(imageUri, 'activity'); 