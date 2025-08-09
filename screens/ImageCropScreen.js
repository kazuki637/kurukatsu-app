import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { cropAndCompressImage } from '../utils/imageCrop';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated,{
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CROP_AREA_SIZE = screenWidth * 0.95; // クロップガイド枠のサイズ（0.8から0.95に拡大）

// 画像タイプに応じたクロップエリアの設定
const getCropAreaConfig = (imageType) => {
  'worklet';
  if (imageType === 'profile' || imageType === 'circle') {
    // プロフィール画像とサークルアイコンは正方形（1:1）
    return {
      width: CROP_AREA_SIZE,
      height: CROP_AREA_SIZE,
      borderRadius: CROP_AREA_SIZE / 2, // 円形
    };
  } else if (imageType === 'studentId') {
    // 学生証は1.6:1の比率
    const width = CROP_AREA_SIZE;
    const height = CROP_AREA_SIZE / 1.6;
    return {
      width,
      height,
      borderRadius: 0, // 角丸なし
    };
  } else {
    // その他の画像は横長（16:9）
    const width = CROP_AREA_SIZE;
    const height = (CROP_AREA_SIZE * 9) / 16;
    return {
      width,
      height,
      borderRadius: 0, // 角丸なし
    };
  }
};

const ImageCropScreen = ({ route, navigation }) => {
  // 横スワイプによる戻る機能を無効化
  React.useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
    });
  }, [navigation]);
  const { imageType = 'profile', onCropComplete, selectedImageUri, circleName } = route.params;

  const [selectedImage, setSelectedImage] = useState(selectedImageUri || null);
  const [processing, setProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [contentLayout, setContentLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Reanimated Shared Values for image transformation
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Ref for the image component to get its layout
  const imageRef = useRef(null);
  const [imageLayout, setImageLayout] = useState(null);

  useEffect(() => {
    if (selectedImageUri && !selectedImage) {
      setSelectedImage(selectedImageUri);
    }
  }, [selectedImageUri, selectedImage]);

  useEffect(() => {
    if (selectedImage) {
      Image.getSize(selectedImage, (width, height) => {
        setImageDimensions({ width, height });
        
        // 画像タイプに応じた初期スケール計算
        const cropConfig = getCropAreaConfig(imageType);
        const cropWidth = cropConfig.width;
        const cropHeight = cropConfig.height;
        
        // 画像がクロップエリアを完全にカバーするための初期スケール
        const initialScaleX = cropWidth / width;
        const initialScaleY = cropHeight / height;
        const initialScale = Math.max(initialScaleX, initialScaleY);
        
        scale.value = initialScale;
        savedScale.value = initialScale;
      }, (error) => {
        console.error('画像サイズ取得エラー:', error);
        Alert.alert('エラー', '画像の読み込みに失敗しました');
      });
    }
  }, [selectedImage, imageType]);

  // Function to clamp translation values
  const clampTranslation = (currentTx, currentTy, imgWidth, imgHeight, currentImageType) => {
    'worklet';
    if (imgWidth === 0 || imgHeight === 0) {
      // If image dimensions are not yet loaded, don't clamp
      return { clampedTx: currentTx, clampedTy: currentTy };
    }

    const cropConfig = getCropAreaConfig(currentImageType);
    const cropHalfWidth = cropConfig.width / 2;
    const cropHalfHeight = cropConfig.height / 2;

    let minTx, maxTx, minTy, maxTy;

    if (imgWidth < cropConfig.width) {
      // If image is smaller than crop area, center it horizontally
      minTx = 0;
      maxTx = 0;
    } else {
      // Image is larger, calculate boundaries
      minTx = cropHalfWidth - imgWidth / 2;
      maxTx = imgWidth / 2 - cropHalfWidth;
    }

    if (imgHeight < cropConfig.height) {
      // If image is smaller than crop area, center it vertically
      minTy = 0;
      maxTy = 0;
    } else {
      // Image is larger, calculate boundaries
      minTy = cropHalfHeight - imgHeight / 2;
      maxTy = imgHeight / 2 - cropHalfHeight;
    }

    const clampedTx = Math.min(Math.max(currentTx, minTx), maxTx);
    const clampedTy = Math.min(Math.max(currentTy, minTy), maxTy);

    return { clampedTx, clampedTy };
  };

  // Pan Gesture for moving the image
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      let newTx = savedTranslateX.value + event.translationX;
      let newTy = savedTranslateY.value + event.translationY;

      // Clamp translation immediately during update
      const { clampedTx, clampedTy } = clampTranslation(
        newTx,
        newTy,
        imageDimensions.width * scale.value,
        imageDimensions.height * scale.value,
        imageType
      );

      translateX.value = clampedTx;
      translateY.value = clampedTy;
    })
    .onEnd(() => {
      // No need for spring animation here, as clamping is done onUpdate
      // However, if you want a spring effect when releasing, you can add it here
      // For now, we rely on the immediate clamping.
    });

  // Pinch Gesture for zooming the image
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      // Update scale
      scale.value = savedScale.value * event.scale;

      // より柔軟な最小スケール計算
      const cropConfig = getCropAreaConfig(imageType);
      const cropWidth = cropConfig.width;
      const cropHeight = cropConfig.height;
      
      // 画像がクロップエリアを完全にカバーするための最小スケール
      const minScaleX = cropWidth / imageDimensions.width;
      const minScaleY = cropHeight / imageDimensions.height;
      const minScale = Math.max(minScaleX, minScaleY);
      
      // 最大スケール（5倍までズーム可能）
      const maxScale = 5;
      
      // スケールを制限
      scale.value = Math.min(Math.max(scale.value, minScale), maxScale);

      // 現在の画像サイズを再計算
      const currentImgW = imageDimensions.width * scale.value;
      const currentImgH = imageDimensions.height * scale.value;

      // 位置を調整して境界内に収める
      const { clampedTx, clampedTy } = clampTranslation(
        translateX.value,
        translateY.value,
        currentImgW,
        currentImgH,
        imageType
      );
      translateX.value = clampedTx;
      translateY.value = clampedTy;
    })
    .onEnd(() => {
      // 必要に応じてスプリングアニメーションを追加可能
    });

  // Combine gestures
  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated style for the image
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // 画像選択
  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        // Reset transformations for new image
        scale.value = 1;
        savedScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  // クロップ完了時の処理
  const handleCropComplete = async () => {
    if (!selectedImage || imageDimensions.width === 0) {
      Alert.alert('エラー', '画像が読み込まれていないか、情報が不足しています');
      return;
    }

    setProcessing(true);

    try {
      // 画像タイプに応じたクロップエリア設定を取得
      const cropAreaConfig = getCropAreaConfig(imageType);
      
      // 画像の中心からクロップエリアの中心までの距離を計算
      const imageCenterX = (imageDimensions.width * scale.value) / 2;
      const imageCenterY = (imageDimensions.height * scale.value) / 2;
      
      // クロップエリアの中心位置（画面の中心）
      const cropCenterX = 0;
      const cropCenterY = 0;
      
      // 画像の中心とクロップエリアの中心の差分を計算
      const offsetX = cropCenterX - imageCenterX;
      const offsetY = cropCenterY - imageCenterY;
      
      // 現在の画像の位置を考慮して、クロップエリアの中心位置を画像座標系に変換
      const cropCenterInImageX = (cropCenterX - translateX.value - offsetX) / scale.value;
      const cropCenterInImageY = (cropCenterY - translateY.value - offsetY) / scale.value;
      
      // クロップエリアの左上座標を計算（中心から半分のサイズを引く）
      const cropX = cropCenterInImageX - (cropAreaConfig.width / scale.value) / 2;
      const cropY = cropCenterInImageY - (cropAreaConfig.height / scale.value) / 2;
      
      // クロップエリアのサイズ（画像座標系）
      const cropWidthInImage = cropAreaConfig.width / scale.value;
      const cropHeightInImage = cropAreaConfig.height / scale.value;
      
      // 画像の境界内に収める
      const finalCropX = Math.max(0, Math.min(cropX, imageDimensions.width - cropWidthInImage));
      const finalCropY = Math.max(0, Math.min(cropY, imageDimensions.height - cropHeightInImage));
      const finalCropWidth = Math.min(cropWidthInImage, imageDimensions.width - finalCropX);
      const finalCropHeight = Math.min(cropHeightInImage, imageDimensions.height - finalCropY);

      const cropData = {
        originX: finalCropX,
        originY: finalCropY,
        width: finalCropWidth,
        height: finalCropHeight,
      };

      console.log('クロップデータ:', {
        cropData,
        imageDimensions,
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
        cropAreaConfig,
        cropCenterInImage: { x: cropCenterInImageX, y: cropCenterInImageY }
      });

      const croppedUri = await cropAndCompressImage(
        selectedImage,
        cropData,
        imageDimensions.width,
        imageDimensions.height,
        imageType
      );

      if (onCropComplete) {
        onCropComplete(croppedUri);
      }

      navigation.goBack();
    } catch (error) {
      console.error('画像処理エラー:', error);
      Alert.alert('エラー', '画像の処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleCropComplete}
          disabled={processing}
        >
          <Text style={styles.applyButtonText}>適用</Text>
        </TouchableOpacity>
      </View>

      <View
        style={styles.content}
        onLayout={(event) => {
          const { width, height, x, y } = event.nativeEvent.layout;
          setContentLayout({ width, height, x, y });
        }}
      >
        {processing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        ) : selectedImage ? (
          <View style={styles.imageWrapper}>
            <GestureDetector gesture={composedGestures}>
              <Animated.Image
                ref={imageRef}
                source={{ uri: selectedImage }}
                style={[
                  { width: imageDimensions.width, height: imageDimensions.height }, // Base dimensions
                  animatedImageStyle,
                ]}
                onLayout={(event) => {
                  setImageLayout(event.nativeEvent.layout);
                }}
              />
            </GestureDetector>
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>画像が選択されていません</Text>
            <TouchableOpacity onPress={handleImagePick} style={styles.pickImageButton}>
              <Text style={styles.pickImageButtonText}>画像を選択</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SVGマスクを使用したオーバーレイ (contentとは兄弟要素として配置) */}
      {selectedImage && contentLayout.height > 0 && !processing && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="cropMask">
                <Rect width="100%" height="100%" fill="white" />
                {imageType === 'profile' || imageType === 'circle' ? (
                  <Circle
                    cx={screenWidth / 2}
                    cy={contentLayout.y + contentLayout.height / 2}
                    r={getCropAreaConfig(imageType).width / 2}
                    fill="black"
                  />
                ) : (
                  <Rect
                    x={(screenWidth - getCropAreaConfig(imageType).width) / 2}
                    y={contentLayout.y + (contentLayout.height - getCropAreaConfig(imageType).height) / 2}
                    width={getCropAreaConfig(imageType).width}
                    height={getCropAreaConfig(imageType).height}
                    fill="black"
                  />
                )}
              </Mask>
            </Defs>
            <Rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.7)"
              mask="url(#cropMask)"
            />
          </Svg>
          
          {/* クロップガイド枠 (白い線) */}
          <View
            style={[
              styles.cropOverlay,
              {
                width: getCropAreaConfig(imageType).width,
                height: getCropAreaConfig(imageType).height,
                borderRadius: getCropAreaConfig(imageType).borderRadius,
                top: contentLayout.y + (contentLayout.height - getCropAreaConfig(imageType).height) / 2,
                left: (screenWidth - getCropAreaConfig(imageType).width) / 2,
              },
            ]}
            pointerEvents="none"
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
    zIndex: 2, // ヘッダーを最前面に
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // 画像がはみ出さないように
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject, // 画面全体を覆う
    zIndex: 1, // オーバーレイを画像より前面に
  },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'transparent',
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  pickImageButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  pickImageButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ImageCropScreen;