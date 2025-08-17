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
  'スポーツ（球技）', 'スポーツ（球技以外）', 'アウトドア・旅行', '文化・教養', '芸術・芸能', '音楽', '学問・研究', '趣味・娯楽', '国際交流', 'ボランティア', 'イベント', 'オールラウンド', 'その他',
];
const FEATURES = [
  'イベント充実', '友達作り重視', '初心者歓迎', 'ゆるめ', '真剣', '体育会系', 'フラット', '和やか', '賑やか',
];
const FREQUENCIES = ['週１回', '週２回', '週３回', '月１回', '不定期'];
const ACTIVITY_WEEKDAYS = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日', '不定期'];
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
  const [activityDays, setActivityDays] = useState([]);
  const [members, setMembers] = useState('');
  const [genderratio, setGenderratio] = useState('');
  const [snsLink, setSnsLink] = useState('');
  const [xLink, setXLink] = useState('');
  const [shinkanLineGroupLink, setShinkanLineGroupLink] = useState('');
  const [isRecruiting, setIsRecruiting] = useState(false);
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
          setActivityDays(d.activityDays || []);
          setMembers(d.members || '');
          setGenderratio(d.genderratio || '');
          setSnsLink(d.snsLink || '');
          setXLink(d.xLink || '');
          setShinkanLineGroupLink(d.shinkanLineGroupLink || '');
          setIsRecruiting(d.welcome?.isRecruiting || false);
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
      JSON.stringify(activityDays.sort()) !== JSON.stringify((circle.activityDays || []).sort()) ||
      members !== (circle.members || '') ||
      genderratio !== (circle.genderratio || '') ||
      isRecruiting !== (circle.welcome?.isRecruiting || false) ||
      circleImage !== null;
    
    console.log('サークル設定画面: 変更検知', {
      nameChanged: name !== (circle.name || ''),
      genreChanged: genre !== (circle.genre || ''),
      featuresChanged,
      frequencyChanged: frequency !== (circle.frequency || ''),
      membersChanged: members !== (circle.members || ''),
      genderratioChanged: genderratio !== (circle.genderratio || ''),
      recruitingChanged: isRecruiting !== (circle.welcome?.isRecruiting || false),
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
        activityDays,
        members,
        genderratio,
        imageUrl,
        welcome: {
          ...circle?.welcome,
          isRecruiting,
        },
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
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="small" color="#999" /></View>;
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
            <Text style={styles.label}>活動曜日（複数選択可）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {ACTIVITY_WEEKDAYS.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, activityDays.includes(item) && styles.optionButtonActive]} onPress={() => {
                  const newActivityDays = activityDays.includes(item) ? activityDays.filter(d => d !== item) : [...activityDays, item];
                  setActivityDays(newActivityDays);
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
                    JSON.stringify(newActivityDays.sort()) !== JSON.stringify((circle.activityDays || []).sort()) ||
                    members !== (circle.members || '') ||
                    genderratio !== (circle.genderratio || '') ||
                    circleImage !== null;
                  
                  setHasUnsavedChanges(hasChanges);
                }}>
                  <Text style={[styles.optionButtonText, activityDays.includes(item) && styles.optionButtonTextActive]}>{item}</Text>
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
            {/* 入会募集状況 */}
            <Text style={styles.label}>入会募集状況</Text>
            <View style={styles.recruitingContainer}>
              <View style={styles.recruitingStatusContainer}>
                {isRecruiting ? (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                    <Text style={styles.recruitingStatusText}>入会募集中</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                    <Text style={styles.recruitingStatusText}>現在入会の募集はありません</Text>
                  </>
                )}
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, isRecruiting && styles.toggleButtonActive]}
                onPress={() => {
                  const newRecruitingStatus = !isRecruiting;
                  setIsRecruiting(newRecruitingStatus);
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
                    genderratio !== (circle.genderratio || '') ||
                    newRecruitingStatus !== (circle.welcome?.isRecruiting || false) ||
                    circleImage !== null;
                  
                  setHasUnsavedChanges(hasChanges);
                }}
              >
                <View style={[styles.toggleCircle, isRecruiting && styles.toggleCircleActive]} />
              </TouchableOpacity>
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
  // 入会募集状況関連のスタイル
  recruitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recruitingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flex: 1,
    marginRight: 16,
  },
  recruitingStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  toggleButton: {
    width: 60,
    height: 32,
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#28a745',
  },
  toggleCircle: {
    width: 28,
    height: 28,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 28 }],
  },
}); 