import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageCropGuide = ({
  imageWidth,
  imageHeight,
  onCropChange,
  isCircular = true,
}) => {
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [guideSize, setGuideSize] = useState(0);

  // ガイド枠のサイズを計算（画面の80%の円）
  useEffect(() => {
    const size = Math.min(screenWidth, screenHeight) * 0.8;
    setGuideSize(size);
  }, []);

  // 画像の変形を制限する関数
  const constrainImageTransform = (offset, scale) => {
    const maxOffsetX = (imageWidth * scale - guideSize) / 2;
    const maxOffsetY = (imageHeight * scale - guideSize) / 2;
    
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y)),
    };
  };

  // 実際のクロップ座標を計算
  const calculateActualCrop = (offsetX, offsetY, scale) => {
    const imageCenterX = imageWidth / 2;
    const imageCenterY = imageHeight / 2;
    const guideCenterX = screenWidth / 2;
    const guideCenterY = screenHeight / 2;
    
    // ガイド枠の中心から画像の中心への相対位置
    const relativeX = (guideCenterX - offsetX - imageCenterX * scale) / scale;
    const relativeY = (guideCenterY - offsetY - imageCenterY * scale) / scale;
    
    // ガイド枠の半径
    const guideRadius = guideSize / 2;
    
    // クロップ座標を計算
    const cropX = Math.max(0, relativeX + guideRadius);
    const cropY = Math.max(0, relativeY + guideRadius);
    const cropSize = Math.min(guideSize / scale, imageWidth - cropX, imageHeight - cropY);
    
    return {
      x: cropX,
      y: cropY,
      width: cropSize,
      height: cropSize,
    };
  };

  // 画像移動用のPanResponder
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
    },
    onPanResponderGrant: () => {
      // タッチ開始時の処理
    },
    onPanResponderMove: (evt, gestureState) => {
      const newOffset = {
        x: imageOffset.x + gestureState.dx,
        y: imageOffset.y + gestureState.dy,
      };
      
      const constrainedOffset = constrainImageTransform(newOffset, imageScale);
      setImageOffset(constrainedOffset);
      
      // 親コンポーネントに通知
      const actualCrop = calculateActualCrop(constrainedOffset.x, constrainedOffset.y, imageScale);
      onCropChange && onCropChange({
        ...actualCrop,
        imageOffset: constrainedOffset,
        imageScale,
      });
    },
    onPanResponderRelease: () => {
      // タッチ終了時の処理
    },
  });

  // ズーム用のPinchGestureHandler
  const onPinchGestureEvent = (event) => {
    const newScale = imageScale * event.nativeEvent.scale;
    const minScale = Math.max(guideSize / imageWidth, guideSize / imageHeight);
    const maxScale = 3;
    
    const constrainedScale = Math.max(minScale, Math.min(maxScale, newScale));
    setImageScale(constrainedScale);
    
    // スケール変更時にオフセットも調整
    const constrainedOffset = constrainImageTransform(imageOffset, constrainedScale);
    setImageOffset(constrainedOffset);
    
    // 親コンポーネントに通知
    const actualCrop = calculateActualCrop(constrainedOffset.x, constrainedOffset.y, constrainedScale);
    onCropChange && onCropChange({
      ...actualCrop,
      imageOffset: constrainedOffset,
      imageScale: constrainedScale,
    });
  };

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>
      <PinchGestureHandler onGestureEvent={onPinchGestureEvent}>
        <View style={StyleSheet.absoluteFillObject} {...panResponder.panHandlers}>
          {/* 円形ガイド枠 */}
          <View style={[
            styles.guideFrame, 
            { 
              width: guideSize, 
              height: guideSize,
              top: (screenHeight - guideSize) / 2,
              left: (screenWidth - guideSize) / 2,
              borderRadius: guideSize / 2,
            }
          ]} />
        </View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  guideFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
});

export default ImageCropGuide; 