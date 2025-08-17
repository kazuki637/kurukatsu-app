import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image, ActivityIndicator, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { db, storage, auth } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressCircleImage } from '../utils/imageCompression';
import CommonHeader from '../components/CommonHeader';

export default function CircleRegistrationScreen() {
  const navigation = useNavigation();
  const [circleName, setCircleName] = useState('');
  const [universityName, setUniversityName] = useState('');

  const [features, setFeatures] = useState([]);
  const [frequency, setFrequency] = useState('');
  const [activityDays, setActivityDays] = useState([]);
  const [genderratio, setGenderratio] = useState('');
  const [genre, setGenre] = useState('');
  const [members, setMembers] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [circleImage, setCircleImage] = useState(null);
  const [circleType, setCircleType] = useState('学内サークル'); // デフォルトは学内サークル

  const pickImage = async () => {
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
        circleName: circleName, // サークル名を渡す
        onCropComplete: (croppedUri) => {
          setCircleImage(croppedUri);
          console.log('サークル画像切り抜き完了');
        }
      });
    }
  };

  const FREQUENCIES = [
    '週１回',
    '週２回',
    '週３回',
    '月１回',
    '不定期',
  ];

  const ACTIVITY_WEEKDAYS = [
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日',
    '日曜日',
    '不定期',
  ];

  const GENDER_RATIO_OPTIONS = [
    '男性多め',
    '女性多め',
    '半々',
  ];

  const MEMBERS_OPTIONS = [
    '1-10人',
    '11-30人',
    '31-50人',
    '51-100人',
    '100人以上',
  ];

  const GENRES = [
    'スポーツ（球技）',
    'スポーツ（球技以外）',
    'アウトドア・旅行',
    '文化・教養',
    '芸術・芸能',
    '音楽',
    '学問・研究',
    '趣味・娯楽',
    '国際交流',
    'ボランティア',
    'イベント',
    'オールラウンド',
    'その他',
  ];

  const FEATURES = [
    'イベント充実',
    '友達作り重視',
    '初心者歓迎',
    'ゆるめ',
    '真剣',
    '体育会系',
    'フラット',
    '和やか',
    '賑やか',
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUniversityName(userData.university || '');
          setContactInfo(user.email || ''); // Firebase Authenticationのメールアドレスを使用
          setRepresentativeName(userData.name || '');
        }
      }
    };
    fetchUserData();
  }, []);

  const handleRegister = async () => {
    // 必須項目バリデーション
    if (!circleImage) {
      Alert.alert('入力不足', 'サークルアイコンを選択してください。');
      return;
    }
    if (!circleName || !universityName || !representativeName || !contactInfo || !genre || features.length === 0 || !frequency || !members || !genderratio) {
      Alert.alert('入力不足', '必須項目をすべて入力してください。');
      return;
    }

    setUploading(true);
    let imageUrl = null;
    if (circleImage) {
      try {
        // 画像を圧縮
        console.log('サークル画像圧縮開始...');
        const compressedUri = await compressCircleImage(circleImage);
        console.log('サークル画像圧縮完了');
        
        // 圧縮された画像をアップロード
        const response = await fetch(compressedUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `circle_images/${circleName}/icons/${Date.now()}_${circleName}`);
        const uploadTask = uploadBytes(storageRef, blob);
        await uploadTask;
        imageUrl = await getDownloadURL(storageRef);
        
        console.log('サークル画像アップロード完了');
      } catch (error) {
        console.error("Error uploading image:", error);
        Alert.alert('画像アップロードエラー', 'サークルアイコンのアップロード中にエラーが発生しました。');
        setUploading(false);
        return;
      }
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('エラー', 'ユーザー情報が取得できませんでした。');
        return;
      }

      // サークルを登録
      const circleDocRef = await addDoc(collection(db, 'circles'), {
        name: circleName,
        universityName,
        features,
        frequency,
        activityDays,
        genderratio,
        genre,
        members,
        contactInfo,
        imageUrl,
        circleType, // サークル種別を追加
        welcome: {
          isRecruiting,
        },
        createdAt: new Date(),
        leaderId: user.uid, // 代表者ID
        leaderName: representativeName, // 代表者名
      });

      // 作成者をmembersサブコレクションに追加（代表者として）
      await setDoc(doc(db, 'circles', circleDocRef.id, 'members', user.uid), { 
        joinedAt: new Date(),
        role: 'leader' // 作成者を代表者として設定
      });

      // ユーザーのjoinedCircleIdsに新しいサークルIDを追加
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        joinedCircleIds: arrayUnion(circleDocRef.id)
      });

      Alert.alert('登録完了', 'サークル情報が正常に登録されました。', [
        { text: 'OK', onPress: () => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                { name: 'CircleManagementScreen' },
              ],
            })
          );
        } }
      ]);
      // フォームをクリア
      setCircleName('');
      setUniversityName('');

      setFeatures([]);
      setFrequency('');
      setActivityDays([]);
      setGenderratio('');
      setGenre('');
      setMembers('');
      setContactInfo('');
      setCircleType('学内サークル'); // サークル種別をリセット
    } catch (error) {
      console.error('Error registering circle:', error);
      Alert.alert('登録エラー', 'サークル情報の登録中にエラーが発生しました。');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <CommonHeader title="サークル登録" showBackButton onBack={() => navigation.goBack()} />
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
              <TouchableOpacity style={[styles.circleImagePicker, {marginTop: 0, marginBottom: 0}]} onPress={pickImage}>
                {circleImage ? (
                  <Image source={{ uri: circleImage }} style={styles.circleImage} />
                ) : (
                  <View style={[styles.circleImage, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                    <Ionicons name="people-outline" size={60} color="#aaa" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* サークル種別選択 */}
            <Text style={styles.label}>サークル種別</Text>
            <View style={styles.circleTypeContainer}>
              <TouchableOpacity 
                style={styles.circleTypeButton} 
                onPress={() => setCircleType('学内サークル')}
              >
                <View style={styles.radioButton}>
                  {circleType === '学内サークル' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.circleTypeText}>学内サークル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.circleTypeButton} 
                onPress={() => setCircleType('インカレサークル')}
              >
                <View style={styles.radioButton}>
                  {circleType === 'インカレサークル' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.circleTypeText}>インカレサークル</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>サークル名</Text>
            <TextInput 
              style={styles.input} 
              value={circleName} 
              onChangeText={setCircleName} 
              placeholder="サークル名を入力してください"
            />

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
                <TouchableOpacity key={item} style={[styles.optionButton, genre === item && styles.optionButtonActive]} onPress={() => setGenre(item)}>
                  <Text style={[styles.optionButtonText, genre === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>特色（複数選択可）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {FEATURES.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, features.includes(item) && styles.optionButtonActive]} onPress={() => {
                  setFeatures((prev) =>
                    prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                  );
                }}>
                  <Text style={[styles.optionButtonText, features.includes(item) && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>活動頻度</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {FREQUENCIES.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, frequency === item && styles.optionButtonActive]} onPress={() => setFrequency(item)}>
                  <Text style={[styles.optionButtonText, frequency === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>活動曜日（複数選択可）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {ACTIVITY_WEEKDAYS.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, activityDays.includes(item) && styles.optionButtonActive]} onPress={() => {
                  setActivityDays((prev) =>
                    prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                  );
                }}>
                  <Text style={[styles.optionButtonText, activityDays.includes(item) && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>人数</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {MEMBERS_OPTIONS.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, members === item && styles.optionButtonActive]} onPress={() => setMembers(item)}>
                  <Text style={[styles.optionButtonText, members === item && styles.optionButtonTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>男女比</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {GENDER_RATIO_OPTIONS.map(item => (
                <TouchableOpacity key={item} style={[styles.optionButton, genderratio === item && styles.optionButtonActive]} onPress={() => setGenderratio(item)}>
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
                onPress={() => setIsRecruiting(!isRecruiting)}
              >
                <View style={[styles.toggleCircle, isRecruiting && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleRegister} disabled={uploading}>
              <Text style={styles.saveButtonText}>{uploading ? '登録中...' : 'サークルを登録'}</Text>
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
  // サークル種別選択関連のスタイル
  circleTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  circleTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  circleTypeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007bff',
  },
});