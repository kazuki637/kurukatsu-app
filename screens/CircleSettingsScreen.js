import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView, Animated, Dimensions } from 'react-native';
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

const { width } = Dimensions.get('window');

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
  const [circleType, setCircleType] = useState('学内サークル'); // サークル種別を追加
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // アニメーション用のstate
  const circleImageOpacity = useRef(new Animated.Value(0)).current;

  // 画像のフェードインアニメーション
  useEffect(() => {
    if (!imageLoading && (circleImage || circleImageUrl || !imageError)) {
      // 画像が読み込まれた時、またはデフォルトアイコンの時にフェードイン
      Animated.timing(circleImageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [imageLoading, circleImage, circleImageUrl, imageError]);

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
          const newImageUrl = d.imageUrl || '';
          const isImageUrlChanged = circleImageUrl !== newImageUrl;
          setCircleImageUrl(newImageUrl);
          setCircleType(d.circleType || '学内サークル'); // サークル種別を設定
          
          // 画像URLが変更された場合のみ読み込み状態をリセット
          if (isImageUrlChanged) {
            setImageLoading(true);
            setImageError(false);
            circleImageOpacity.setValue(0);
          }
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
      circleType !== (circle.circleType || '学内サークル') ||
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
          // 画像の読み込み状態をリセット
          setImageLoading(true);
          setImageError(false);
          circleImageOpacity.setValue(0);
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
        circleType, // サークル種別を追加
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
      <CommonHeader 
        title="サークル設定" 
        rightButtonLabel="保存" 
        onRightButtonPress={handleSave}
        rightButtonDisabled={isSaving || loading}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 40}
        >
          <ScrollView 
            contentContainerStyle={styles.bodyContent} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: 16 }} />
            {/* サークルアイコン画像 */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>サークルアイコン画像<Text style={styles.optional}>(任意)</Text></Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
                <TouchableOpacity onPress={pickCircleImage} style={styles.imagePicker}>
                  <Animated.View style={{ opacity: circleImageOpacity }}>
                    {circleImage || circleImageUrl ? (
                      <Image 
                        source={{ uri: circleImage || circleImageUrl }} 
                        style={styles.circleImage}
                        onLoad={() => setImageLoading(false)}
                        onError={() => {
                          setImageLoading(false);
                          setImageError(true);
                        }}
                        fadeDuration={300}
                      />
                    ) : (
                      <View style={[styles.circleImage, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                        <Ionicons name="image-outline" size={60} color="#aaa" />
                      </View>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>

            {/* サークル種別選択 */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>サークル種別</Text>
              <View style={styles.selectRow}>
                <TouchableOpacity 
                  style={[styles.selectButton, circleType === '学内サークル' && styles.selectedButton]} 
                  onPress={() => {
                    setCircleType('学内サークル');
                    checkForChanges();
                  }}
                >
                  <Text style={[styles.selectButtonText, circleType === '学内サークル' && styles.selectedButtonText]}>学内サークル</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.selectButton, circleType === 'インカレサークル' && styles.selectedButton]} 
                  onPress={() => {
                    setCircleType('インカレサークル');
                    checkForChanges();
                  }}
                >
                  <Text style={[styles.selectButtonText, circleType === 'インカレサークル' && styles.selectedButtonText]}>インカレサークル</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>サークル名</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={(text) => {
                  setName(text);
                  checkForChanges();
                }} 
                placeholder="サークル名を入力してください"
                placeholderTextColor="#a1a1aa"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>大学名</Text>
              <TextInput 
                style={[styles.input, styles.disabledInput]} 
                value={universityName} 
                onChangeText={setUniversityName}
                editable={false}
                placeholder="登録時に設定された大学名"
                placeholderTextColor="#a1a1aa"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>代表者連絡先</Text>
              <TextInput 
                style={[styles.input, styles.disabledInput]} 
                value={contactInfo} 
                onChangeText={setContactInfo}
                editable={false}
                placeholder="登録時に設定された連絡先"
                placeholderTextColor="#a1a1aa"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>ジャンル</Text>
              <View style={styles.selectRow}>
                {GENRES.map(item => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.selectButton, genre === item && styles.selectedButton]} 
                    onPress={() => {
                      const newGenre = item;
                      setGenre(newGenre);
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
                    }}
                  >
                    <Text style={[styles.selectButtonText, genre === item && styles.selectedButtonText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>特色（複数選択可）</Text>
              <View style={styles.selectRow}>
                {FEATURES.map(item => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.selectButton, features.includes(item) && styles.selectedButton]} 
                    onPress={() => {
                      const newFeatures = features.includes(item) ? features.filter(f => f !== item) : [...features, item];
                      setFeatures(newFeatures);
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
                    }}
                  >
                    <Text style={[styles.selectButtonText, features.includes(item) && styles.selectedButtonText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>活動頻度</Text>
              <View style={styles.selectRow}>
                {FREQUENCIES.map(item => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.selectButton, frequency === item && styles.selectedButton]} 
                    onPress={() => {
                      const newFrequency = item;
                      setFrequency(newFrequency);
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
                    }}
                  >
                    <Text style={[styles.selectButtonText, frequency === item && styles.selectedButtonText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>活動曜日（複数選択可）</Text>
              <View style={styles.selectRow}>
                {ACTIVITY_WEEKDAYS.map(item => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.selectButton, activityDays.includes(item) && styles.selectedButton]} 
                    onPress={() => {
                      const newActivityDays = activityDays.includes(item) ? activityDays.filter(d => d !== item) : [...activityDays, item];
                      setActivityDays(newActivityDays);
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
                    }}
                  >
                    <Text style={[styles.selectButtonText, activityDays.includes(item) && styles.selectedButtonText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>人数</Text>
              <View style={styles.selectRow}>
                {MEMBERS_OPTIONS.map(item => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.selectButton, members === item && styles.selectedButton]} 
                    onPress={() => {
                      const newMembers = item;
                      setMembers(newMembers);
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
                    }}
                  >
                    <Text style={[styles.selectButtonText, members === item && styles.selectedButtonText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>男女比</Text>
              <View style={styles.selectRow}>
                {GENDER_RATIO_OPTIONS.map(item => (
                  <TouchableOpacity 
                    key={item} 
                    style={[styles.selectButton, genderratio === item && styles.selectedButton]} 
                    onPress={() => {
                      const newGenderratio = item;
                      setGenderratio(newGenderratio);
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
                    }}
                  >
                    <Text style={[styles.selectButtonText, genderratio === item && styles.selectedButtonText]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {/* 入会募集状況 */}
            <View style={styles.formGroup}>
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
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSave} 
                disabled={isSaving || loading}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving || loading ? '保存中...' : '保存する'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  // メインコンテンツ
  bodyContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 32 
  },
  // フォームセクション
  formGroup: { 
    marginBottom: 24 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '500',
    color: '#18181b', 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e4e4e7', 
    borderRadius: 12, 
    paddingHorizontal: 12,
    paddingVertical: 12, 
    fontSize: 16, 
    fontWeight: '400',
    backgroundColor: '#ffffff',
    color: '#18181b',
    minHeight: 48,
  },
  disabledInput: { 
    backgroundColor: '#f4f4f5', 
    color: '#71717a', 
    borderColor: '#e4e4e7' 
  },
  // セレクトボタン関連
  selectRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 4 
  },
  selectButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#e4e4e7', 
    marginRight: 8, 
    marginBottom: 8,
    backgroundColor: '#ffffff',
    minHeight: 40,
    justifyContent: 'center',
  },
  selectedButton: { 
    backgroundColor: '#1380ec', 
    borderColor: '#1380ec' 
  },
  selectButtonText: { 
    color: '#71717a', 
    fontSize: 15,
    fontWeight: '400',
  },
  selectedButtonText: { 
    color: '#ffffff', 
    fontWeight: '500' 
  },
  saveButton: { 
    backgroundColor: '#1380ec', 
    borderRadius: 12, 
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center', 
    marginTop: 24 
  },
  saveButtonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  imagePicker: { 
    alignItems: 'center', 
    marginTop: 8 
  },
  circleImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 50 
  },
  optional: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '400',
  },
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