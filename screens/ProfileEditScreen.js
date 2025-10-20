import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, Platform, ScrollView, StatusBar, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, storage } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { useNavigation, useRoute, CommonActions, useFocusEffect } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import KurukatsuButton from '../components/KurukatsuButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import universitiesData from '../universities.json';
import { compressProfileImage } from '../utils/imageCompression';
import { deleteExistingProfileImages } from '../utils/imageCrop';

const { width } = Dimensions.get('window');


const GRADES = ['大学1年', '大学2年', '大学3年', '大学4年', '大学院1年', '大学院2年', 'その他'];
const GENDERS = ['男性', '女性', 'その他', '回答しない'];

export default function ProfileEditScreen(props) {
  const navigation = useNavigation();
  const route = useRoute();
  const user = auth.currentUser;
  const [name, setName] = useState(''); // 名前（非公開）
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [selfIntroduction, setSelfIntroduction] = useState('');
  const [snsLink, setSnsLink] = useState('');
  const [xLink, setXLink] = useState('');
  const [birthday, setBirthday] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // 学生証関連の状態
  const [studentIdImage, setStudentIdImage] = useState(null);
  const [studentIdUrl, setStudentIdUrl] = useState('');
  const [isIdConfirmed, setIsIdConfirmed] = useState(false);
  
  // オートコンプリート用の状態
  const [universitySuggestions, setUniversitySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // 未保存変更検知用の状態
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [saveCompleted, setSaveCompleted] = useState(false); // 保存完了フラグ
  

  // 大学名の候補をフィルタリングする関数
  const filterUniversities = (input) => {
    if (!input.trim()) {
      setUniversitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const filtered = universitiesData.filter(uni => 
      uni.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 10); // 最大10件まで表示
    
    setUniversitySuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  // 大学名が変更された時の処理
  const handleUniversityChange = (text) => {
    setUniversity(text);
    
    // 入力が空の場合は候補を非表示
    if (!text.trim()) {
      setUniversitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // 入力に応じて候補をフィルタリング
    filterUniversities(text);
  };

  // 候補を選択した時の処理
  const selectUniversity = (selectedUniversity) => {
    setUniversity(selectedUniversity);
    setUniversitySuggestions([]);
    setShowSuggestions(false);
    checkForChanges();
  };

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          setName(d.name || '');
          setUniversity(d.university || '');
          setGrade(d.grade || '');
          setGender(d.gender || '');
          setSelfIntroduction(d.selfIntroduction || '');
          setSnsLink(d.snsLink || '');
          setXLink(d.xLink || '');
          setBirthday(d.birthday ? new Date(d.birthday) : new Date(2000, 0, 1));
          setProfileImageUrl(d.profileImageUrl || '');
          setImageError(false);

          // 学生証URLの有効性チェック
          if (d.studentIdUrl) {
            try {
              const storageRef = ref(storage, d.studentIdUrl);
              await getMetadata(storageRef); // ファイルが存在するかチェック
              setStudentIdUrl(d.studentIdUrl);
            } catch (error) {
              if (error.code === 'storage/object-not-found') {
                console.log('無効な学生証URLを検出。Firestoreから削除します。');
                setStudentIdUrl(''); // 画面表示をリセット
                await updateDoc(userDocRef, { studentIdUrl: '' }); // FirestoreからURLを削除
              } else {
                console.error('学生証画像のメタデータ取得エラー:', error);
                setStudentIdUrl(''); // エラー時は非表示にする
              }
            }
          } else {
            setStudentIdUrl('');
          }

          // 元のデータを保存
          setOriginalData({
            name: d.name || '',
            university: d.university || '',
            grade: d.grade || '',
            gender: d.gender || '',
            selfIntroduction: d.selfIntroduction || '',
            snsLink: d.snsLink || '',
            xLink: d.xLink || '',
            birthday: d.birthday ? new Date(d.birthday) : new Date(2000, 0, 1),
            profileImageUrl: d.profileImageUrl || '',
            studentIdUrl: d.studentIdUrl || '',
          });
        } else {
          // Firestoreにデータがなければ空欄のまま
          setName('');
          setUniversity('');
          setGrade('');
          setGender('');
          setSelfIntroduction('');
          setSnsLink('');
          setXLink('');
          setBirthday(new Date(2000, 0, 1));
          setProfileImageUrl('');
          setStudentIdUrl('');

          // 元のデータを保存
          setOriginalData({
            name: '',
            university: '',
            grade: '',
            gender: '',
            selfIntroduction: '',
            snsLink: '',
            xLink: '',
            birthday: new Date(2000, 0, 1),
            profileImageUrl: '',
            studentIdUrl: '',
          });
        }
      } catch (error) {
        console.error('ユーザーデータの取得エラー:', error);
      }
    };

    fetchUserData();
  }, [user]);

  // カメラ画面から戻ってきた際の処理
  useEffect(() => {
    if (route.params?.studentIdImage && route.params?.fromCamera) {
      setStudentIdImage(route.params.studentIdImage);
      checkForChanges();
      // パラメータをクリア
      navigation.setParams({ studentIdImage: undefined, fromCamera: undefined });
    }
  }, [route.params?.studentIdImage, route.params?.fromCamera]);

  // 変更を検知する関数
  const checkForChanges = () => {
    if (!originalData) return false;
    
    const hasChanges = 
      name !== originalData.name ||
      university !== originalData.university ||
      grade !== originalData.grade ||
      gender !== originalData.gender ||
      selfIntroduction !== originalData.selfIntroduction ||
      snsLink !== originalData.snsLink ||
      xLink !== originalData.xLink ||
      birthday.getTime() !== originalData.birthday.getTime() ||
      profileImage !== null ||
      (profileImage === '' && originalData.profileImageUrl) ||
      studentIdImage !== null;
    
    console.log('プロフィール編集画面: 変更検知', {
      nameChanged: name !== originalData.name,
      universityChanged: university !== originalData.university,
      gradeChanged: grade !== originalData.grade,
      genderChanged: gender !== originalData.gender,
      selfIntroductionChanged: selfIntroduction !== originalData.selfIntroduction,
      snsLinkChanged: snsLink !== originalData.snsLink,
      xLinkChanged: xLink !== originalData.xLink,
      birthdayChanged: birthday.getTime() !== originalData.birthday.getTime(),
      imageChanged: profileImage !== null,
      imageDeleted: profileImage === '' && originalData.profileImageUrl,
      studentIdChanged: studentIdImage !== null,
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
    }, [navigation, hasUnsavedChanges, isSaving])
  );

  // 画像選択処理
  const pickImage = async () => {
    try {
      // 権限チェック
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限が必要', '写真ライブラリへのアクセス権限が必要です');
        return;
      }

      // 画像選択ピッカーを即座に表示
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // 編集は無効にして、ガイド枠で行う
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // 選択された画像でガイド枠画面に遷移
        navigation.navigate('ImageCrop', {
          imageType: 'profile',
          selectedImageUri: result.assets[0].uri,
          onCropComplete: (croppedUri) => {
            setProfileImage(croppedUri);
            setHasUnsavedChanges(true);
            setImageError(false);
          }
        });
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  // 学生証撮影
  const handleStudentIdCapture = async () => {
    // カスタムカメラ画面に遷移
    navigation.navigate('StudentIdCamera', {
      onPictureTaken: (uri) => {
        setStudentIdImage(uri);
        checkForChanges();
      }
    });
  };

  // 学生証アップロード
  const handleStudentIdUpload = async () => {
    if (!studentIdImage) return;
    
    try {
      setLoading(true);
      const response = await fetch(studentIdImage);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `student_ids/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      setStudentIdUrl(downloadURL);
      setStudentIdImage(null);
      setIsIdConfirmed(false); // アップロード完了時にリセット
      
      // Firestoreに保存
      await updateDoc(doc(db, 'users', user.uid), {
        studentIdUrl: downloadURL
      });
      
      Alert.alert('成功', '学生証がアップロードされました。');
    } catch (error) {
      console.error('学生証アップロードエラー:', error);
      Alert.alert('エラー', '学生証のアップロードに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 学生証削除
  const handleDeleteStudentId = async () => {
    Alert.alert(
      '確認',
      '学生証を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              if (studentIdUrl) {
                const storageRef = ref(storage, studentIdUrl);
                await deleteObject(storageRef);
              }
              setStudentIdUrl('');
              setStudentIdImage(null);
              checkForChanges();
              
              await updateDoc(doc(db, 'users', user.uid), {
                studentIdUrl: ''
              });
              
              Alert.alert('成功', '学生証が削除されました。');
            } catch (error) {
              console.error('学生証削除エラー:', error);
              Alert.alert('エラー', '学生証の削除に失敗しました。');
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    // 既に保存処理中または保存完了済みの場合は何もしない（連続押下防止）
    if (isSaving || saveCompleted) {
      return;
    }
    
    if (!name.trim() || !university.trim() || !grade || !gender || !birthday) {
      Alert.alert('エラー', '全ての必須項目を入力してください。');
      return;
    }
    
    setIsSaving(true);
    setSaveCompleted(true); // 保存開始フラグを設定
    try {
      let imageUrl = profileImageUrl;
      
      // プロフィール画像のアップロード処理
      if (profileImage) {
        try {
          // 既存のプロフィール画像を削除
          await deleteExistingProfileImages(user.uid);
          
          // 画像を圧縮
          const compressedUri = await compressProfileImage(profileImage);
          
          // 圧縮された画像をアップロード
          const response = await fetch(compressedUri);
          const blob = await response.blob();
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const fileName = `${timestamp}_${randomString}.jpg`;
          const storageRef = ref(storage, `profile_images/${user.uid}/${fileName}`);
          await uploadBytes(storageRef, blob);
          imageUrl = await getDownloadURL(storageRef);
          
          // アップロード完了後に状態を更新してプレビューを即時反映
          setProfileImageUrl(imageUrl);
          setProfileImage(null); // ローカル画像をクリア
          

        } catch (error) {
          console.error('プロフィール編集画面: 画像アップロードエラー:', error);
          Alert.alert('エラー', 'プロフィール画像のアップロードに失敗しました');
          setIsSaving(false);
          setSaveCompleted(false);
          return;
        }
      } else if (profileImage === '' && originalData && originalData.profileImageUrl) {
        // 画像が明示的に削除された場合のみ、既存の画像も削除して空文字列を設定
        try {
          await deleteExistingProfileImages(user.uid);
        } catch (error) {
          console.error('プロフィール編集画面: 画像削除エラー:', error);
          // 削除に失敗しても処理を続行
        }
        imageUrl = '';
        setProfileImageUrl(''); // 状態も更新
      }
      // profileImageがnullの場合は既存の画像をそのまま保持
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name,
        university,
        grade,
        gender,
        selfIntroduction,
        snsLink,
        xLink,
        birthday: birthday.getFullYear() + '-' + 
                 String(birthday.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(birthday.getDate()).padStart(2, '0'),
        profileImageUrl: imageUrl,
      }, { merge: true });
      
      // ユーザーが所属している全サークルのメンバーデータを更新
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const joinedCircleIds = userData.joinedCircleIds || [];
        const adminCircleIds = userData.adminCircleIds || [];
        
        // 各サークルのメンバーデータを更新
        const updatePromises = joinedCircleIds.map(async (circleId) => {
          try {
            await setDoc(doc(db, 'circles', circleId, 'members', user.uid), {
              name: name,
              university: university,
              grade: grade,
              profileImageUrl: imageUrl
            }, { merge: true });
          } catch (error) {
            console.error(`Error updating member data for circle ${circleId}:`, error);
          }
        });
        
        // 代表者（leaderId）が所属するサークルのuniversityNameも更新
        const leaderUpdatePromises = adminCircleIds.map(async (circleId) => {
          try {
            // サークルの詳細を取得してleaderIdを確認
            const circleDoc = await getDoc(doc(db, 'circles', circleId));
            if (circleDoc.exists()) {
              const circleData = circleDoc.data();
              // 現在のユーザーが代表者（leaderId）の場合のみuniversityNameを更新
              if (circleData.leaderId === user.uid) {
                await updateDoc(doc(db, 'circles', circleId), {
                  universityName: university
                });
              }
            }
          } catch (error) {
            console.error(`Error updating universityName for circle ${circleId}:`, error);
          }
        });
        
        await Promise.all([...updatePromises, ...leaderUpdatePromises]);
      }
      
      setHasUnsavedChanges(false);
      
      // プロフィール更新完了をイベントで通知
      if (global.onProfileUpdated) {
        global.onProfileUpdated();
      }
      
      // 前の画面に戻る
      navigation.goBack();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('エラー', 'プロフィールの保存に失敗しました。');
      setSaveCompleted(false); // エラー時はリセット
    } finally {
      // 成功・失敗に関わらず状態をリセット
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader 
        title="プロフィール編集" 
        showBackButton={true}
        onBack={() => navigation.goBack()}
        rightButtonLabel="保存" 
        onRightButtonPress={handleSave}
        rightButtonDisabled={isSaving || saveCompleted}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <ScrollView 
          contentContainerStyle={styles.bodyContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 16 }} />
          <View style={styles.formGroup}>
            <Text style={styles.label}>プロフィール画像<Text style={styles.optional}>(任意)</Text></Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
              <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                {(profileImage && !imageError) || (profileImageUrl && !imageError) ? (
                  <Image
                    source={{ uri: profileImage || profileImageUrl }}
                    style={styles.profileImage}
                    onError={() => setImageError(true)}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.profileImage, {backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}]}>
                    <Ionicons name="person-outline" size={60} color="#aaa" />
                  </View>
                )}
              </TouchableOpacity>
              {((profileImage && profileImage.trim() !== '') || (profileImageUrl && profileImageUrl.trim() !== '')) && !imageError && profileImage !== '' && (
                <TouchableOpacity
                  onPress={() => {
                    setProfileImage('');
                    setProfileImageUrl('');
                    setImageError(false);
                    checkForChanges();
                  }}
                  style={{ marginLeft: 12, padding: 8, backgroundColor: '#fee', borderRadius: 24 }}
                >
                  <Ionicons name="trash-outline" size={24} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* フォームフィールド */}
          <View style={styles.formSection}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>フルネーム（氏名）</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={(text) => {
                  setName(text);
                  checkForChanges();
                }} 
                placeholder="フルネーム（氏名）"
                placeholderTextColor="#a1a1aa"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>自己紹介<Text style={styles.optional}>(任意)</Text></Text>
              <TextInput 
                style={[styles.input, styles.textAreaInput]} 
                value={selfIntroduction} 
                onChangeText={(text) => {
                  setSelfIntroduction(text);
                  checkForChanges();
                }} 
                placeholder="自己紹介を入力してください"
                placeholderTextColor="#a1a1aa"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>SNSリンク<Text style={styles.optional}>(任意)</Text></Text>
              <View style={styles.snsInputContainer}>
                <View style={styles.snsInputRow}>
                  <Image 
                    source={require('../assets/SNS-icons/Instagram_Glyph_Gradient.png')} 
                    style={styles.snsIcon}
                    cachePolicy="memory-disk"
                  />
                  <TextInput
                    value={snsLink}
                    onChangeText={(text) => {
                      setSnsLink(text);
                      checkForChanges();
                    }}
                    placeholder="Instagramリンクを入力"
                    style={styles.snsInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
                <View style={styles.snsInputRow}>
                  <Image 
                    source={require('../assets/SNS-icons/X_logo-black.png')} 
                    style={styles.snsIcon}
                    cachePolicy="memory-disk"
                  />
                  <TextInput
                    value={xLink}
                    onChangeText={(text) => {
                      setXLink(text);
                      checkForChanges();
                    }}
                    placeholder="X（旧Twitter）リンクを入力"
                    style={styles.snsInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>大学名</Text>
              <View style={styles.universityInputContainer}>
                <TextInput 
                  style={styles.input} 
                  value={university} 
                  onChangeText={(text) => {
                    handleUniversityChange(text);
                    checkForChanges();
                  }}
                  placeholder="大学名を入力してください"
                  placeholderTextColor="#a1a1aa"
                />
              </View>
            </View>

            
            {/* 大学名候補 */}
            {showSuggestions && (
              <View style={styles.suggestionsContainer}>
                <ScrollView 
                  style={styles.suggestionsScrollView}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                >
                  {universitySuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.suggestionItem,
                        index === universitySuggestions.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => selectUniversity(item)}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
              <View style={styles.formGroup}>
                <Text style={styles.label}>学年</Text>
                <View style={styles.selectRow}>
                  {GRADES.map(g => (
                    <TouchableOpacity 
                      key={g} 
                      style={[styles.selectButton, grade === g && styles.selectedButton]} 
                      onPress={() => {
                        setGrade(g);
                        checkForChanges();
                      }}
                    >
                      <Text style={[styles.selectButtonText, grade === g && styles.selectedButtonText]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>性別</Text>
              <View style={styles.selectRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.selectButton, gender === g && styles.selectedButton]} 
                    onPress={() => {
                      setGender(g);
                      checkForChanges();
                    }}
                  >
                    <Text style={[styles.selectButtonText, gender === g && styles.selectedButtonText]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>生年月日</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                <Text style={styles.datePickerText}>{birthday ? birthday.toLocaleDateString('ja-JP') : '生年月日を選択してください'}</Text>
                <Ionicons name="chevron-down" size={20} color="#a1a1aa" />
              </TouchableOpacity>
              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={birthday}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    locale="ja-JP"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setBirthday(selectedDate);
                        checkForChanges();
                      }
                    }}
                    maximumDate={new Date()}
                  />
                </View>
              )}
            </View>
          </View>
            
          {/* 学生証認証セクション - コメントアウト状態を維持 */}
          {/* 
          <View style={styles.verificationSection}>
            <Text style={styles.sectionTitle}>認証</Text>
            <View style={styles.verificationCard}>
              <View style={styles.verificationIcon}>
                <Ionicons name="card-outline" size={24} color="#71717a" />
              </View>
              <View style={styles.verificationContent}>
                <Text style={styles.verificationTitle}>学生証</Text>
                <Text style={styles.verificationDescription}>認証のために学生証をアップロードしてください</Text>
              </View>
              <TouchableOpacity style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>アップロード</Text>
              </TouchableOpacity>
            </View>
          </View>
          */}
          
          {/* 保存ボタン */}
          <KurukatsuButton
            title="保存する"
            onPress={handleSave}
            disabled={isSaving || saveCompleted}
            size="medium"
            variant="primary"
            hapticFeedback={true}
            style={styles.saveButtonContainer}
          />
          
          <View style={{ height: 16 }} />
        </ScrollView>
        


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
  imagePicker: { alignItems: 'center', marginTop: 8 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  // フォームセクション
  formSection: {
    marginBottom: 24,
  },
  formGroup: { 
    marginBottom: 16 
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
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // SNS入力関連のスタイル
  snsInputContainer: {
    marginTop: 8,
  },
  snsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  snsIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  snsInput: {
    flex: 1,
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
  // 日付ピッカー関連
  datePickerButton: { 
    borderWidth: 1, 
    borderColor: '#e4e4e7', 
    borderRadius: 12, 
    paddingHorizontal: 12,
    paddingVertical: 12, 
    backgroundColor: '#ffffff', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  datePickerText: { 
    fontSize: 16, 
    fontWeight: '400',
    color: '#18181b' 
  },
  datePickerContainer: { 
    alignItems: 'center', 
    marginTop: 8 
  },
  // オートコンプリート関連のスタイル
  universityInputContainer: { 
    position: 'relative',
    zIndex: 1,
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    maxHeight: 200,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsScrollView: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
    backgroundColor: '#ffffff',
  },
  suggestionText: {
    fontSize: 15,
    color: '#18181b',
    fontWeight: '400',
  },
  // 学生証認証セクション（コメントアウト状態維持）
  verificationSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 16,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 16,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#18181b',
    marginBottom: 4,
  },
  verificationDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#71717a',
  },
  uploadButton: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 84,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#18181b',
    fontSize: 14,
    fontWeight: '500',
  },
  // 学生証関連のスタイル（既存のコードを保持）
  studentIdContainer: { marginTop: 4 },
  studentIdImageContainer: { position: 'relative' },
  studentIdImage: { width: '100%', aspectRatio: 1.6, borderRadius: 8, contentFit: 'cover' },
  deleteStudentIdButton: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    borderRadius: 20, 
    padding: 8 
  },
  studentIdPreviewContainer: { marginTop: 4 },
  studentIdPreviewButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8 
  },
  uploadStudentIdButton: { 
    flex: 1, 
    backgroundColor: '#1380ec', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginLeft: 8 
  },
  uploadStudentIdButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelStudentIdButton: { 
    flex: 1, 
    backgroundColor: '#6c757d', 
    padding: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginRight: 8 
  },
  cancelStudentIdButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  confirmationBox: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#18181b',
  },
  confirmationList: {
    marginBottom: 16,
  },
  confirmationListItem: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 8,
  },
  finalConfirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  finalConfirmationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#18181b',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  captureStudentIdButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#1380ec', 
    borderStyle: 'dashed', 
    borderRadius: 12, 
    padding: 20, 
    backgroundColor: '#f8fafc' 
  },
  captureStudentIdButtonText: { 
    color: '#1380ec', 
    fontSize: 16, 
    fontWeight: '500', 
    marginLeft: 8 
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#f0fdf4'
  },
  verifiedText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  required: {
    color: '#ef4444',
    fontWeight: '500',
  },
  optional: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '400',
  },
  saveButtonContainer: {
    marginTop: 4,
  },
});
