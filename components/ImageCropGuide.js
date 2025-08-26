import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageCropGuide = ({ 
  imageWidth, 
  imageHeight, 
  onCropChange,
  initialCrop = null,
  isCircular = false
}) => {

  
  // 画面中心に固定されたガイド枠のサイズ
  const [guideSize, setGuideSize] = useState(200);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  
  const cropRef = useRef(null);

  // ガイド枠の最小・最大サイズ
  const MIN_GUIDE_SIZE = 100;
  const MAX_GUIDE_SIZE = Math.min(imageWidth, imageHeight) * 0.8;

  // 初期化時にガイドサイズを設定
  useEffect(() => {
    if (isCircular) {
      const size = Math.min(imageWidth, imageHeight) * 0.6;
      setGuideSize(size);
    } else {
      const size = Math.min(imageWidth, imageHeight) * 0.8;
      setGuideSize(size);
    }
  }, [imageWidth, imageHeight, isCircular]);

  // ガイド枠が画像の外に出ないように制限する関数
  const constrainImageTransform = (newOffset, newScale) => {
    // ガイド枠のサイズを考慮した制限
    const guideRadius = guideSize / 2;
    const maxOffsetX = (imageWidth * newScale - guideSize) / 2;
    const maxOffsetY = (imageHeight * newScale - guideSize) / 2;
    
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newOffset.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffset.y)),
      scale: Math.max(0.5, Math.min(3.0, newScale)),
    };
  };

  // 画像移動用PanResponder
  const movePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // タッチ開始時の処理
    },
    onPanResponderMove: (evt, gestureState) => {
      const newOffset = {
        x: imageOffset.x + gestureState.dx,
        y: imageOffset.y + gestureState.dy,
      };
      const constrained = constrainImageTransform(newOffset, imageScale);
      setImageOffset({ x: constrained.x, y: constrained.y });
      
      // 実際のクリップ座標を計算して親コンポーネントに通知
      const actualCrop = calculateActualCrop(constrained.x, constrained.y, imageScale);
      onCropChange && onCropChange(actualCrop);
    },
    onPanResponderRelease: () => {
      // タッチ終了時の処理
    },
  });

  // ピンチジェスチャー用のハンドラー
  const onPinchGestureEvent = (event) => {
    const newScale = imageScale * event.nativeEvent.scale;
    const constrained = constrainImageTransform(imageOffset, newScale);
    setImageScale(constrained.scale);
    
    // 実際のクリップ座標を計算して親コンポーネントに通知
    const actualCrop = calculateActualCrop(constrained.x, constrained.y, constrained.scale);
    onCropChange && onCropChange(actualCrop);
  };

  const onPinchHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // ピンチジェスチャーが終了した時の処理
    }
  };

  // 実際のクリップ座標を計算
  const calculateActualCrop = (offsetX, offsetY, scale) => {
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    
    // ガイド枠の中心位置
    const guideCenterX = centerX;
    const guideCenterY = centerY;
    
    // 画像の中心位置（オフセットとスケールを考慮）
    const imageCenterX = centerX + offsetX;
    const imageCenterY = centerY + offsetY;
    
    // ガイド枠の中心から画像の中心への相対位置
    const relativeX = (guideCenterX - imageCenterX) / scale;
    const relativeY = (guideCenterY - imageCenterY) / scale;
    
    // 実際の画像座標系でのクリップ位置
    const actualX = (imageWidth / 2) - (guideSize / 2) - relativeX;
    const actualY = (imageHeight / 2) - (guideSize / 2) - relativeY;
    
    return {
      x: Math.max(0, Math.min(actualX, imageWidth - guideSize)),
      y: Math.max(0, Math.min(actualY, imageHeight - guideSize)),
      width: guideSize,
      height: guideSize,
    };
  };




  
  // ガイド枠の中心位置を計算
  const guideCenterX = imageWidth / 2;
  const guideCenterY = imageHeight / 2;
  const guideLeft = guideCenterX - guideSize / 2;
  const guideTop = guideCenterY - guideSize / 2;
  
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* 画像移動・ズーム用の透明なオーバーレイ */}
      <View
        style={styles.imageOverlay}
        {...movePanResponder.panHandlers}
      />
      
      {/* 固定されたガイド枠 */}
      <View
        ref={cropRef}
        style={[
          styles.cropGuide,
          isCircular && styles.circularGuide,
          {
            left: guideLeft,
            top: guideTop,
            width: guideSize,
            height: guideSize,
          },
        ]}
      />
      
      {/* ピンチジェスチャー用のオーバーレイ */}
      <PinchGestureHandler
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchHandlerStateChange}
      >
        <View style={styles.pinchOverlay} />
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  pinchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  cropGuide: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circularGuide: {
    borderRadius: 9999, // 円形にする
  },
});

export default ImageCropGuide; 