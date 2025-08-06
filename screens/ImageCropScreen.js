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
  useDerivedValue,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CROP_AREA_SIZE = screenWidth * 0.8; // クロップガイド枠のサイズ

const ImageCropScreen = ({ route, navigation }) => {
  const { imageType = 'profile', onCropComplete, selectedImageUri } = route.params;

  const [selectedImage, setSelectedImage] = useState(selectedImageUri || null);
  const [processing, setProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Reanimated Shared Values for image transformation
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Derived values for current image dimensions based on scale
  // We will explicitly calculate these in onUpdate for pinch gesture for better control
  // const currentImageWidth = useDerivedValue(() => imageDimensions.width * scale.value);
  // const currentImageHeight = useDerivedValue(() => imageDimensions.height * scale.value);

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
        // Calculate initial scale to ensure the image covers the crop area
        const initialScale = Math.max(CROP_AREA_SIZE / width, CROP_AREA_SIZE / height);
        scale.value = initialScale;
        savedScale.value = initialScale;
      }, (error) => {
        console.error('画像サイズ取得エラー:', error);
        Alert.alert('エラー', '画像の読み込みに失敗しました');
      });
    }
  }, [selectedImage]);

  // Function to clamp translation values
  const clampTranslation = (currentTx, currentTy, imgWidth, imgHeight) => {
    'worklet';
    if (imgWidth === 0 || imgHeight === 0) {
      // If image dimensions are not yet loaded, don't clamp
      return { clampedTx: currentTx, clampedTy: currentTy };
    }

    const cropHalfWidth = CROP_AREA_SIZE / 2;
    const cropHalfHeight = CROP_AREA_SIZE / 2;

    let minTx, maxTx, minTy, maxTy;

    if (imgWidth < CROP_AREA_SIZE) {
      // If image is smaller than crop area, center it horizontally
      minTx = 0;
      maxTx = 0;
    } else {
      // Image is larger, calculate boundaries
      minTx = cropHalfWidth - imgWidth / 2;
      maxTx = imgWidth / 2 - cropHalfWidth;
    }

    if (imgHeight < CROP_AREA_SIZE) {
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
        imageDimensions.width * scale.value, // Use current scaled width
        imageDimensions.height * scale.value // Use current scaled height
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

      // Clamp scale immediately
      const minScale = Math.max(CROP_AREA_SIZE / imageDimensions.width, CROP_AREA_SIZE / imageDimensions.height);
      const maxScale = 5; // Example max zoom
      scale.value = Math.min(Math.max(scale.value, minScale), maxScale);

      // Explicitly re-calculate current image dimensions based on the new clamped scale
      const currentImgW = imageDimensions.width * scale.value;
      const currentImgH = imageDimensions.height * scale.value;

      // After clamping scale, re-evaluate and adjust position to ensure it stays within bounds
      const { clampedTx, clampedTy } = clampTranslation(
        translateX.value,
        translateY.value,
        currentImgW, // Use the explicitly calculated current image width
        currentImgH  // Use the explicitly calculated current image height
      );
      translateX.value = clampedTx;
      translateY.value = clampedTy;
    })
    .onEnd(() => {
      // No need for additional clamping here if onUpdate handles it.
      // If you want a spring effect for the final snap, you can add it here.
      // For now, let's keep it simple and rely on onUpdate.
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

    // Calculate crop data based on current image transformation and crop area
    // These calculations assume the image and crop area are centered initially
    const cropXInImage = (-CROP_AREA_SIZE / 2 - (translateX.value - (imageDimensions.width * scale.value) / 2)) / scale.value;
    const cropYInImage = (-CROP_AREA_SIZE / 2 - (translateY.value - (imageDimensions.height * scale.value) / 2)) / scale.value;
    const cropWidthInImage = CROP_AREA_SIZE / scale.value;
    const cropHeightInImage = CROP_AREA_SIZE / scale.value;

    // Ensure crop coordinates are within image bounds
    const finalCropX = Math.max(0, cropXInImage);
    const finalCropY = Math.max(0, cropYInImage);
    const finalCropWidth = Math.min(imageDimensions.width - finalCropX, cropWidthInImage);
    const finalCropHeight = Math.min(imageDimensions.height - finalCropY, cropHeightInImage);

    const cropData = {
      originX: finalCropX,
      originY: finalCropY,
      width: finalCropWidth,
      height: finalCropHeight,
    };

    try {
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
        >
          <Text style={styles.applyButtonText}>適用</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {processing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>画像を処理中...</Text>
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
            {/* クロップガイド枠 */}
            <View
              style={[
                styles.cropOverlay,
                {
                  width: CROP_AREA_SIZE,
                  height: CROP_AREA_SIZE,
                  borderRadius: imageType === 'profile' ? CROP_AREA_SIZE / 2 : 0,
                },
              ]}
              pointerEvents="none" // ガイド枠がジェスチャーをブロックしないように
            />
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
  // imageスタイルはAnimated.Imageのstyle propで直接設定するため削除
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