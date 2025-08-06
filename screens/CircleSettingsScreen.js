import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, storage } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import { compressCircleImage } from '../utils/imageCompression';

const GENRES = [
  '運動系（球技）', '運動系（球技以外）', 'アウトドア系', '文化系', '芸術・芸能', '音楽系', '学問系', 'ボランティア', 'イベント', 'オールラウンド', 'その他',
];
const FEATURES = [
  'ワイワイ', '真剣', '初心者歓迎', '友達作り重視', 'イベント充実', '勉強サポート', '国際交流', 'アットホーム', 'スポーツ志向',
];
const FREQUENCIES = ['週１回', '週２回', '週３回', '月１回', '不定期'];
const GENDER_RATIO_OPTIONS = ['男性多め', '女性多め', '半々'];
const MEMBERS_OPTIONS = ['1-10人', '11-30人', '31-50人', '51-100人', '100人以上'];

export default function CircleSettingsScreen({ route, navigation }) {
  const { circleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState(null);
  const [name, setName] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [genre, setGenre] = useState('');
  const [features, setFeatures] = useState([]);
  const [frequency, setFrequency] = useState('');
  const [members, setMembers] = useState('');
  const [genderratio, setGenderratio] = useState('');
  const [snsLink, setSnsLink] = useState('');
  const [xLink, setXLink] = useState('');
  const [shinkanLineGroupLink, setShinkanLineGroupLink] = useState('');
  const [circleImage, setCircleImage] = useState(null);
  const [circleImageUrl, setCircleImageUrl] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCircle = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'circles', circleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          setCircle(d);
          setName(d.name || '');
          setUniversityName(d.universityName || '');
          setContactInfo(d.contactInfo || '');
          setGenre(d.genre || '');
          setFeatures(d.features || []);
          setFrequency(d.frequency || '');
          setMembers(d.members || '');
          setGenderratio(d.genderratio || '');
          setSnsLink(d.snsLink || '');
          setXLink(d.xLink || '');
          setShinkanLineGroupLink(d.shinkanLineGroupLink || '');
          setCircleImageUrl(d.imageUrl || '');
        }
      } catch (e) {
        Alert.alert('エラー', 'サークル情報の取得に失敗しました');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchCircle();
  }, [circleId]);

  // 変更を検知する関数
  const checkForChanges = () => {
    if (!circle) return false;
    
    // 配列の比較を正しく行う
    const originalFeatures = circle.features || [];
    const currentFeatures = features || [];
    const featuresChanged = 
      originalFeatures.length !== currentFeatures.length ||
      !originalFeatures.every(feature => currentFeatures.includes(feature)) ||
      !currentFeatures.every(feature => originalFeatures.includes(feature));
    
    const hasChanges = 
      name !== (circle.name || '') ||
      genre !== (circle.genre || '') ||
      featuresChanged ||
      frequency !== (circle.frequency || '') ||
      members !== (circle.members || '') ||
      genderratio !== (circle.genderratio || '') ||
      circleImage !== null;
    
    console.log('サークル設定画面: 変更検知', {
      nameChanged: name !== (circle.name || ''),
      genreChanged: genre !== (circle.genre || ''),
      featuresChanged,
      frequencyChanged: frequency !== (circle.frequency || ''),
      membersChanged: members !== (circle.members || ''),
      genderratioChanged: genderratio !== (circle.genderratio || ''),
      imageChanged: circleImage !== null,
      hasChanges
    });
    
    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  };

  // 画面遷移時のアラート表示
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (!hasUnsavedChanges || isSaving) {
          return;
        }

        // デフォルトの遷移を防ぐ
        e.preventDefault();

        Alert.alert(
          '未保存の変更があります',
          '変更を保存せずに画面を離れますか？',
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => {},
            },
            {
              text: '保存せずに離れる',
              style: 'destructive',
              onPress: () => {
                // リスナーを一時的に削除してから遷移を実行
                unsubscribe();
                navigation.dispatch(e.data.action);
              },
            },
          ]
        );
      });

      return unsubscribe;
    }, [navigation, hasUnsavedChanges])
  );

  const pickCircleImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('許可が必要です', 'サークルアイコン画像をアップロードするには、カメラロールへのアクセス許可が必要です。');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // 選択された画像でクロップ画面に遷移
      navigation.navigate('ImageCrop', {
        imageType: 'circle',
        selectedImageUri: result.assets[0].uri,
        circleName: name, // サークル名を渡す
        onCropComplete: (croppedUri) => {
          setCircleImage(croppedUri);
          setHasUnsavedChanges(true);
          console.log('サークル設定画面: 画像切り抜き完了');
        }
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setLoading(true);
    try {
      let imageUrl = circleImageUrl;
      if (circleImage) {
        try {
          // 画像を圧縮
          console.log('サークル設定画面: 画像圧縮開始...');
          const compressedUri = await compressCircleImage(circleImage);
          console.log('サークル設定画面: 画像圧縮完了');
          
          // 圧縮された画像をアップロード
          const response = await fetch(compressedUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `circle_images/${name}/icons/${circleId}`);
          await uploadBytes(storageRef, blob);
          imageUrl = await getDownloadURL(storageRef);
          
          console.log('サークル設定画面: 画像アップロード完了');
        } catch (error) {
          console.error('サークル設定画面: 画像アップロードエラー:', error);
          Alert.alert('エラー', 'サークルアイコンのアップロードに失敗しました');
          setLoading(false);
          return;
        }
      }
      const docRef = doc(db, 'circles', circleId);
      await updateDoc(docRef, {
        name,
        universityName,
        contactInfo,
        genre,
        features,
        frequency,
        members,
        genderratio,
        imageUrl,
      });
      setHasUnsavedChanges(false);
      setIsSaving(false);
      Alert.alert('保存完了', 'サークル設定を保存しました');
      // 少し遅延を入れてから画面遷移（アラートの表示を待つ）
      setTimeout(() => {
        navigation.goBack();
      }, 100);
    } catch (e) {
      Alert.alert('エラー', 'サークル設定の保存に失敗しました');
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <CommonHeader title="サークル設定" showBackButton onBack={() => navigation.goBack()} rightButtonLabel="保存" onRightButtonPress={handleSave} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 40}
        >
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* サークルアイコン画像 */}
            <Text style={styles.label}>サークルアイコン画像</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, marginBottom: 16 }}>
              <TouchableOpacity style={[styles.circleImagePicker, {marginTop: 0, marginBottom: 0}]} onPress={pickCircleImage}>
                {circleImage || circleImageUrl ? (
                  <Image source={{ uri: circleImage || circleImageUrl }} style={styles.circleImage} />
                ) : (
                  <Ionicons name="image-outline" size={100} color="#ccc" />
                )}
              </TouchableOpacity>
              {/* 必要ならここにゴミ箱ボタン等も追加可能 */}
            </View>
            <Text style={styles.label}>サークル名</Text>
            <TextInput style={styles.input} value={name} onChangeText={(text) => {
              setName(text);
              checkForChanges();
            }} />
            <Text style={styles.label}>大学名</Text>
            <TextInput 
              style={[styles.input, styles.disabledInput]} 
              value={universityName} 
              onChangeText={setUniversityName}
              editable={false}
              placeholder="登録時に設定された大学名"
            />
            <Text style={styles.label}>代表者連絡先</Text>
            <TextInput 
              style={[styles.input, styles.disabledInput]} 
              value={contactInfo} 
              onChangeText={setContactInfo}
              editable={false}
              placeholder="登録時に設定された連絡先"
            />
            <Text style={styles.label}>ジャンル</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {GENRES.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, genre === item && styles.optionButtonActive]} onPress={() => {
                  const newGenre = item;
                  setGenre(newGenre);
                  // 状態変更を即座に検知
                  if (!circle) return;
                  
                  const originalFeatures = circle.features || [];
                  const currentFeatures = features || [];
                  const featuresChanged = 
                    originalFeatures.length !== currentFeatures.length ||
                    !originalFeatures.every(feature => currentFeatures.includes(feature)) ||
                    !currentFeatures.every(feature => originalFeatures.includes(feature));
                  
                  const hasChanges = 
                    name !== (circle.name || '') ||
                    newGenre !== (circle.genre || '') ||
                    featuresChanged ||
                    frequency !== (circle.frequency || '') ||
                    members !== (circle.members || '') ||
                    genderratio !== (circle.genderratio || '') ||
                    circleImage !== null;
                  
                  setHasUnsavedChanges(hasChanges);
                }}>
                  <Text style={[styles.optionButtonText, genre === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>特色（複数選択可）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {FEATURES.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, features.includes(item) && styles.optionButtonActive]} onPress={() => {
                  const newFeatures = features.includes(item) ? features.filter(f => f !== item) : [...features, item];
                  setFeatures(newFeatures);
                  // 状態変更を即座に検知
                  if (!circle) return;
                  
                  const originalFeatures = circle.features || [];
                  const featuresChanged = 
                    originalFeatures.length !== newFeatures.length ||
                    !originalFeatures.every(feature => newFeatures.includes(feature)) ||
                    !newFeatures.every(feature => originalFeatures.includes(feature));
                  
                  const hasChanges = 
                    name !== (circle.name || '') ||
                    genre !== (circle.genre || '') ||
                    featuresChanged ||
                    frequency !== (circle.frequency || '') ||
                    members !== (circle.members || '') ||
                    genderratio !== (circle.genderratio || '') ||
                    circleImage !== null;
                  
                  setHasUnsavedChanges(hasChanges);
                }}>
                  <Text style={[styles.optionButtonText, features.includes(item) && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>活動頻度</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {FREQUENCIES.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, frequency === item && styles.optionButtonActive]} onPress={() => {
                  const newFrequency = item;
                  setFrequency(newFrequency);
                  // 状態変更を即座に検知
                  if (!circle) return;
                  
                  const originalFeatures = circle.features || [];
                  const currentFeatures = features || [];
                  const featuresChanged = 
                    originalFeatures.length !== currentFeatures.length ||
                    !originalFeatures.every(feature => currentFeatures.includes(feature)) ||
                    !currentFeatures.every(feature => originalFeatures.includes(feature));
                  
                  const hasChanges = 
                    name !== (circle.name || '') ||
                    genre !== (circle.genre || '') ||
                    featuresChanged ||
                    newFrequency !== (circle.frequency || '') ||
                    members !== (circle.members || '') ||
                    genderratio !== (circle.genderratio || '') ||
                    circleImage !== null;
                  
                  setHasUnsavedChanges(hasChanges);
                }}>
                  <Text style={[styles.optionButtonText, frequency === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>人数</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {MEMBERS_OPTIONS.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, members === item && styles.optionButtonActive]} onPress={() => {
                  const newMembers = item;
                  setMembers(newMembers);
                  // 状態変更を即座に検知
                  if (!circle) return;
                  
                  const originalFeatures = circle.features || [];
                  const currentFeatures = features || [];
                  const featuresChanged = 
                    originalFeatures.length !== currentFeatures.length ||
                    !originalFeatures.every(feature => currentFeatures.includes(feature)) ||
                    !currentFeatures.every(feature => originalFeatures.includes(feature));
                  
                  const hasChanges = 
                    name !== (circle.name || '') ||
                    genre !== (circle.genre || '') ||
                    featuresChanged ||
                    frequency !== (circle.frequency || '') ||
                    newMembers !== (circle.members || '') ||
                    genderratio !== (circle.genderratio || '') ||
                    circleImage !== null;
                  
                  setHasUnsavedChanges(hasChanges);
                }}>
                  <Text style={[styles.optionButtonText, members === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>男女比</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {GENDER_RATIO_OPTIONS.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, genderratio === item && styles.optionButtonActive]} onPress={() => {
                  const newGenderratio = item;
                  setGenderratio(newGenderratio);
                  // 状態変更を即座に検知
                  if (!circle) return;
                  
                  const originalFeatures = circle.features || [];
                  const currentFeatures = features || [];
                  const featuresChanged = 
                    originalFeatures.length !== currentFeatures.length ||
                    !originalFeatures.every(feature => currentFeatures.includes(feature)) ||
                    !currentFeatures.every(feature => originalFeatures.includes(feature));
                  
                  const hasChanges = 
                    name !== (circle.name || '') ||
                    genre !== (circle.genre || '') ||
                    featuresChanged ||
                    frequency !== (circle.frequency || '') ||
                    members !== (circle.members || '') ||
                    newGenderratio !== (circle.genderratio || '') ||
                    circleImage !== null;
                  
                  setHasUnsavedChanges(hasChanges);
                }}>
                  <Text style={[styles.optionButtonText, genderratio === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* SNSリンク（Instagram）、SNSリンク（X）、新歓LINEグループリンクを削除 */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
              <Text style={styles.saveButtonText}>{loading ? '保存中...' : '保存する'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  label: { fontSize: 16, color: '#333', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fafafa', marginBottom: 4 },
  disabledInput: { backgroundColor: '#f0f0f0', color: '#666', borderColor: '#ddd' },
  optionButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#ccc', marginRight: 8, marginBottom: 6, backgroundColor: '#fff' },
  optionButtonActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  optionButtonText: { color: '#333', fontSize: 15 },
  optionButtonTextActive: { color: '#fff', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#007bff', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  circleImagePicker: { alignItems: 'center', marginBottom: 16 },
  circleImage: { width: 100, height: 100, borderRadius: 50 },
}); 