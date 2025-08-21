import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

export default function StudentIdCameraScreen({ navigation, route }) {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      await requestPermission();
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1, // 高画質で撮影
        });

        // 撮影した画像をクロップ画面に渡す
        navigation.navigate('ImageCrop', { 
          imageType: 'studentId',
          selectedImageUri: photo.uri,
          onCropComplete: (croppedUri) => {
            // クロップ完了後の処理をコールバックで実行
            if (route.params?.onPictureTaken) {
              route.params.onPictureTaken(croppedUri);
            }
            // カメラ画面はスタックから削除して、プロフィール編集画面に直接戻る
            navigation.pop();
          }
        });
      } catch (error) {
        console.error('写真撮影エラー:', error);
        Alert.alert('エラー', '写真の撮影に失敗しました。');
      }
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>カメラのアクセス許可が必要です。</Text>
        <Button onPress={requestPermission} title="許可する" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          {/* ガイド枠 */}
          <View style={styles.guideContainer}>
            <Image 
              source={require('../assets/StudentIdGuide.png')} 
              style={styles.guideImage}
              contentFit="contain"
            />
          </View>
          
          {/* 上部のボタン */}
          <View style={styles.topButtons}>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* 下部のボタン */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner}>
                <Ionicons name="camera" size={40} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* 説明テキスト */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              学生証を枠内に収めて撮影してください
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  guideContainer: {
    position: 'absolute',
    alignSelf: 'center',
    top: (height - (width * 0.9) / 1.6) / 2,
    width: width * 0.9,
    height: (width * 0.9) / 1.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  topButtons: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 