import * as ImageManipulator from 'expo-image-manipulator';

/**
 * 画像を指定された座標で切り抜く
 * @param {string} imageUri - 元画像のURI
 * @param {Object} crop - 切り抜き座標 {x, y, width, height}
 * @param {number} imageWidth - 元画像の幅
 * @param {number} imageHeight - 元画像の高さ
 * @returns {Promise<string>} 切り抜き後の画像URI
 */
export const cropImage = async (imageUri, crop, imageWidth, imageHeight) => {
  try {
    // 元画像の情報を取得
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // 操作なし
      { format: 'jpeg', quality: 1 }
    );

    // 切り抜き座標を計算（元画像の実際のサイズに基づく）
    const scaleX = imageInfo.width / imageWidth;
    const scaleY = imageInfo.height / imageHeight;

    const cropX = Math.round(crop.x * scaleX);
    const cropY = Math.round(crop.y * scaleY);
    const cropWidth = Math.round(crop.width * scaleX);
    const cropHeight = Math.round(crop.height * scaleY);

    console.log('切り抜き座標:', {
      original: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
      scaled: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
      imageSize: { width: imageInfo.width, height: imageInfo.height },
      displaySize: { width: imageWidth, height: imageHeight }
    });

    // 画像を切り抜く
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{
        crop: {
          originX: cropX,
          originY: cropY,
          width: cropWidth,
          height: cropHeight,
        }
      }],
      { format: 'jpeg', quality: 0.9 }
    );

    console.log('切り抜き完了:', result.uri);
    return result.uri;

  } catch (error) {
    console.error('画像切り抜きエラー:', error);
    throw new Error('画像の切り抜きに失敗しました');
  }
};

/**
 * 画像を切り抜いてから圧縮する
 * @param {string} imageUri - 元画像のURI
 * @param {Object} crop - 切り抜き座標
 * @param {number} imageWidth - 表示幅
 * @param {number} imageHeight - 表示高さ
 * @param {string} imageType - 画像タイプ（'profile', 'circle', 'header'など）
 * @returns {Promise<string>} 処理後の画像URI
 */
export const cropAndCompressImage = async (imageUri, crop, imageWidth, imageHeight, imageType = 'profile') => {
  try {
    // まず切り抜き
    const croppedUri = await cropImage(imageUri, crop, imageWidth, imageHeight);
    
    // 次に圧縮（既存のcompressImageToOneMB関数を使用）
    const { compressImageToOneMB } = await import('./imageCompression.js');
    const compressedUri = await compressImageToOneMB(croppedUri, imageType);
    
    return compressedUri;
  } catch (error) {
    console.error('画像切り抜き・圧縮エラー:', error);
    throw error;
  }
}; 