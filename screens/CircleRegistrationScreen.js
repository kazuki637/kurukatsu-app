import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { db, storage, auth } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressCircleImage } from '../utils/imageCompression';

export default function CircleRegistrationScreen() {
  const navigation = useNavigation();
  const [circleName, setCircleName] = useState('');
  const [universityName, setUniversityName] = useState('');

  const [features, setFeatures] = useState([]);
  const [frequency, setFrequency] = useState('');
  const [genderratio, setGenderratio] = useState('');
  const [genre, setGenre] = useState('');
  const [members, setMembers] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [circleImage, setCircleImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setCircleImage(uri);
      console.log('サークル画像選択完了');
    }
  };

  const FREQUENCIES = [
    '週１回',
    '週２回',
    '週３回',
    '月１回',
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
    '運動系（球技）',
    '運動系（球技以外）',
    'アウトドア系',
    '文化系',
    '芸術・芸能',
    '音楽系',
    '学問系',
    'ボランティア',
    'イベント',
    'オールラウンド',
    'その他',
  ];

  const FEATURES = [
    'ワイワイ',
    '真剣',
    '初心者歓迎',
    '友達作り重視',
    'イベント充実',
    '勉強サポート',
    '国際交流',
    'アットホーム',
    'スポーツ志向',
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
        genderratio,
        genre,
        members,
        contactInfo,
        imageUrl,
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
      setGenderratio('');
      setGenre('');
      setMembers('');
      setContactInfo('');
    } catch (error) {
      console.error('Error registering circle:', error);
      Alert.alert('登録エラー', 'サークル情報の登録中にエラーが発生しました。');
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
      style={styles.fullScreenContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>サークル登録</Text>
      </View>
      <SafeAreaView style={styles.contentSafeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        

        <View style={styles.inputGroup}>
          <Text style={styles.label}>サークルアイコン</Text>
          <TouchableOpacity style={[styles.imagePicker, styles.circleImageContainer]} onPress={pickImage}>
            {circleImage ? (
              <Image source={{ uri: circleImage }} style={styles.circleImage} />
            ) : (
              <View style={styles.circleImagePlaceholder}>
                <Ionicons name="camera-outline" size={40} color="#ccc" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>サークル名</Text>
          <TextInput
            style={styles.input}
            value={circleName}
            onChangeText={setCircleName}
            placeholder=""
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>大学名</Text>
          <TextInput
            style={[styles.input, styles.uneditableInputText]}
            value={universityName}
            editable={false}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>代表者氏名</Text>
          <TextInput
            style={[styles.input, styles.uneditableInputText]}
            value={representativeName}
            editable={false}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>代表者連絡先</Text>
          <TextInput
            style={[styles.input, styles.uneditableInputText]}
            value={contactInfo}
            editable={false}
          />
        </View>



        <View style={styles.inputGroup}>
          <Text style={styles.label}>ジャンル</Text>
          <View style={styles.optionsContainer}>
            {GENRES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.optionButton, genre === item && styles.optionButtonActive]}
                onPress={() => setGenre(item)}
              >
                <Text style={[styles.optionButtonText, genre === item && styles.optionButtonTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>特色（複数選択可）</Text>
          <View style={styles.optionsContainer}>
            {FEATURES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.optionButton, features.includes(item) && styles.optionButtonActive]}
                onPress={() => {
                  setFeatures((prev) =>
                    prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                  );
                }}
              >
                <Text style={[styles.optionButtonText, features.includes(item) && styles.optionButtonTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>活動頻度</Text>
          <View style={styles.optionsContainer}>
            {FREQUENCIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.optionButton, frequency === item && styles.optionButtonActive]}
                onPress={() => setFrequency(item)}
              >
                <Text style={[styles.optionButtonText, frequency === item && styles.optionButtonTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>人数</Text>
          <View style={styles.optionsContainer}>
            {MEMBERS_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.optionButton, members === item && styles.optionButtonActive]}
                onPress={() => setMembers(item)}
              >
                <Text style={[styles.optionButtonText, members === item && styles.optionButtonTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>男女比</Text>
          <View style={styles.optionsContainer}>
            {GENDER_RATIO_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.optionButton, genderratio === item && styles.optionButtonActive]}
                onPress={() => setGenderratio(item)}
              >
                <Text style={[styles.optionButtonText, genderratio === item && styles.optionButtonTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={uploading}
        >
          <LinearGradient
            colors={['#007bff', '#0056b3']}
            style={styles.registerButtonGradient}
          >
            <Ionicons 
              name="add-circle" 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.registerButtonText}>
              {uploading ? '登録中...' : 'サークルを登録'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollViewContent: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 40, 
    textAlign: 'center',
    color: '#333',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  header: {
    width: '100%',
    height: 115,
    paddingTop: StatusBar.currentHeight,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  contentSafeArea: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff', 
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12, 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    fontSize: 16,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 5, 
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 20,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  uneditableInputText: {
    color: '#888', // 薄い灰色
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 5,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  optionButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  optionButtonTextActive: {
    color: '#1e3a8a',
  },
  selectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 50, // 固定の高さ
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectionItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedCheckmark: {
    marginLeft: 10,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 20,
  },
  circleImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden', // これを追加することで、子要素がこの境界からはみ出さないようにします
  },
  circleImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  circleImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  
});