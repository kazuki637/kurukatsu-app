import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { Ionicons } from '@expo/vector-icons';

const ImageCropPicker = ({ 
  imageType = 'profile', 
  onCropComplete, 
  onCancel 
}) => {
  
  const openImagePicker = async () => {
    try {
      let options = {
        mediaType: 'photo',
        includeBase64: false,
        includeExif: true,
      };

      // 画像タイプに応じてクロップ設定を変更
      if (imageType === 'profile' || imageType === 'circle') {
        // 円形/正方形のクロップ
        options = {
          ...options,
          width: 400,
          height: 400,
          cropperCircleOverlay: imageType === 'profile', // プロフィールの場合は円形
          cropperActiveWidgetColor: '#007AFF',
          cropperStatusBarColor: '#000',
          cropperToolbarColor: '#000',
          cropperToolbarTitle: '画像を切り抜く',
          cropperCancelText: 'キャンセル',
          cropperChooseText: '適用',
        };
      } else {
        // 自由比率のクロップ
        options = {
          ...options,
          cropperActiveWidgetColor: '#007AFF',
          cropperStatusBarColor: '#000',
          cropperToolbarColor: '#000',
          cropperToolbarTitle: '画像を切り抜く',
          cropperCancelText: 'キャンセル',
          cropperChooseText: '適用',
        };
      }

      const image = await ImagePicker.openCropper(options);
      
      if (image && onCropComplete) {
        onCropComplete(image.path);
      }
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('画像クロップエラー:', error);
        Alert.alert('エラー', '画像の切り抜きに失敗しました');
      }
    }
  };

  const openCamera = async () => {
    try {
      let options = {
        mediaType: 'photo',
        includeBase64: false,
        includeExif: true,
      };

      // 画像タイプに応じてクロップ設定を変更
      if (imageType === 'profile' || imageType === 'circle') {
        // 円形/正方形のクロップ
        options = {
          ...options,
          width: 400,
          height: 400,
          cropperCircleOverlay: imageType === 'profile', // プロフィールの場合は円形
          cropperActiveWidgetColor: '#007AFF',
          cropperStatusBarColor: '#000',
          cropperToolbarColor: '#000',
          cropperToolbarTitle: '画像を切り抜く',
          cropperCancelText: 'キャンセル',
          cropperChooseText: '適用',
        };
      } else {
        // 自由比率のクロップ
        options = {
          ...options,
          cropperActiveWidgetColor: '#007AFF',
          cropperStatusBarColor: '#000',
          cropperToolbarColor: '#000',
          cropperToolbarTitle: '画像を切り抜く',
          cropperCancelText: 'キャンセル',
          cropperChooseText: '適用',
        };
      }

      const image = await ImagePicker.openCamera(options);
      
      if (image && onCropComplete) {
        onCropComplete(image.path);
      }
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('カメラエラー:', error);
        Alert.alert('エラー', 'カメラの使用に失敗しました');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={openImagePicker}>
          <Ionicons name="images-outline" size={24} color="#007AFF" />
          <Text style={styles.buttonText}>ギャラリーから選択</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={openCamera}>
          <Ionicons name="camera-outline" size={24} color="#007AFF" />
          <Text style={styles.buttonText}>カメラで撮影</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: '80%',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ImageCropPicker; 